import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Piloto, DriverStats } from "@/types/f1";
import { pilotsData } from "@/data/pilotsData";
import { getDefaultDriverStats } from "@/services/driverStatsService";

// Puntos oficiales FIA F1
export const MAIN_RACE_POINTS_MAP: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

export const SPRINT_POINTS_MAP: Record<number, number> = {
  1: 8,
  2: 7,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
};

export interface RacePositionItem {
  driverId: string;
  isDnf: boolean;
}

export interface UpdateDriverStatsPayload {
  gpId: string;
  gpNombre: string;
  gpBandera: string;
  isSprint: boolean;
  qualyPositions: string[]; // 22 pilotos ordenados P1 a P22
  racePositions: RacePositionItem[]; // 22 pilotos ordenados P1 a P22 con toggle DNF
  sprintTop8?: string[]; // Hasta 8 pilotos P1 a P8 de sprint
}

export interface DriverPointsAwarded {
  driverId: string;
  nombre: string;
  escuderiaId: string;
  puntosCarrera: number;
  puntosSprint: number;
  puntosSumados: number;
  puntosTotal: number;
  posicionAnterior: number;
  posicionNueva: number;
}

export interface UpdateDriverStatsResult {
  success: boolean;
  gpId: string;
  updatedDriversCount: number;
  poleDriver: string;
  winnerDriver: string;
  podiumDrivers: string[];
  dnfDrivers: string[];
  pointsAwarded: DriverPointsAwarded[];
}

/**
 * Actualiza en Firestore las estadísticas de los 22 pilotos tras un Gran Premio.
 * - Perfil Biográfico en 'pilotos': carreras_totales (+1 a los 22), victorias_totales (+1 a P1), podios_totales (+1 a P1-P3).
 * - Rendimiento Temporada en 'drivers_stats': puntos (carrera + sprint), ranking de campeonato reordenado,
 *   victorias_anio, dnfs_anio, poles_anio, H2H clasificación con compañero, frecuencias Q1/Q2/Q3,
 *   y racha FIFO de últimas 3 carreras.
 * - Idempotencia: marca 'driverStatsProcessed: true' en grand_prix/{gpId}.
 */
export async function updateDriverStatsForGrandPrix(
  payload: UpdateDriverStatsPayload
): Promise<UpdateDriverStatsResult> {
  if (!db) {
    throw new Error("Base de datos Firestore no inicializada.");
  }

  const {
    gpId,
    gpNombre,
    gpBandera,
    isSprint,
    qualyPositions,
    racePositions,
    sprintTop8 = [],
  } = payload;

  if (!qualyPositions || qualyPositions.length < 22) {
    throw new Error("La Clasificación debe contener los 22 pilotos ordenados.");
  }
  if (!racePositions || racePositions.length < 22) {
    throw new Error("La Carrera debe contener los 22 puestos ordenados.");
  }

  // 1. Obtener los documentos actuales de 'pilotos' y 'drivers_stats'
  const [pilotosSnap, statsSnap] = await Promise.all([
    getDocs(collection(db, "pilotos")),
    getDocs(collection(db, "drivers_stats")),
  ]);

  const existingPilotosMap = new Map<string, Partial<Piloto>>();
  pilotosSnap.docs.forEach((d) => {
    existingPilotosMap.set(d.id.toUpperCase(), d.data() as Piloto);
  });

  const existingStatsMap = new Map<string, DriverStats>();
  statsSnap.docs.forEach((d) => {
    existingStatsMap.set(d.id.toUpperCase(), d.data() as DriverStats);
  });

  // Mapa de pilotos estático para datos de compañero y escudería
  const pilotsMetaMap = new Map<string, (typeof pilotsData)[0]>();
  pilotsData.forEach((p) => {
    pilotsMetaMap.set(p.codigo.toUpperCase(), p);
  });

  const poleDriverId = qualyPositions[0].toUpperCase();
  const winnerDriverId = racePositions[0].driverId.toUpperCase();
  const podiumDriverIds = racePositions
    .slice(0, 3)
    .map((r) => r.driverId.toUpperCase());
  const dnfDriverIds = racePositions
    .filter((r) => r.isDnf)
    .map((r) => r.driverId.toUpperCase());

  // Preparar arrays para cálculo de H2H
  // 11 equipos de 2 pilotos. Determinamos quién clasificó por delante de su compañero
  const teammatesDuelingDone = new Set<string>();
  const h2hDuelingResult = new Map<
    string,
    { victoriasDelta: number; derrotasDelta: number }
  >();

  pilotsData.forEach((p) => {
    const codA = p.codigo.toUpperCase();
    const codB = (p.companeroCodigo || "").toUpperCase();

    const pairKey = [codA, codB].sort().join("_");
    if (!teammatesDuelingDone.has(pairKey) && codA && codB) {
      teammatesDuelingDone.add(pairKey);

      const posA = qualyPositions.indexOf(codA);
      const posB = qualyPositions.indexOf(codB);

      if (posA !== -1 && posB !== -1) {
        if (posA < posB) {
          // A clasificó por delante de B
          h2hDuelingResult.set(codA, { victoriasDelta: 1, derrotasDelta: 0 });
          h2hDuelingResult.set(codB, { victoriasDelta: 0, derrotasDelta: 1 });
        } else {
          // B clasificó por delante de A
          h2hDuelingResult.set(codB, { victoriasDelta: 1, derrotasDelta: 0 });
          h2hDuelingResult.set(codA, { victoriasDelta: 0, derrotasDelta: 1 });
        }
      }
    }
  });

  // Estructura temporal para calcular nuevos puntos de todos los pilotos
  interface DriverTempCalculation {
    driverId: string;
    nombre: string;
    escuderiaId: string;
    pilotoDocUpdates: Partial<Piloto>;
    statsDoc: DriverStats;
    puntosSumadosCarrera: number;
    puntosSumadosSprint: number;
    puntosSumadosTotal: number;
    puntosTotalNuevo: number;
    posicionAnterior: number;
  }

  const driverCalculations: DriverTempCalculation[] = [];

  // 2. Iterar por los 22 pilotos de pilotsData
  for (const pilotMeta of pilotsData) {
    const driverId = pilotMeta.codigo.toUpperCase();

    // A. Perfil Biográfico en 'pilotos'
    const currentPiloto = existingPilotosMap.get(driverId) || {};
    const carrerasTotales = (currentPiloto.carreras_totales ?? pilotMeta.carreras) + 1;
    let victoriasTotales = currentPiloto.victorias_totales ?? pilotMeta.victorias;
    let podiosTotales = currentPiloto.podios_totales ?? pilotMeta.podios;

    if (driverId === winnerDriverId) {
      victoriasTotales += 1;
    }
    if (podiumDriverIds.includes(driverId)) {
      podiosTotales += 1;
    }

    const pilotoDocUpdates: Partial<Piloto> = {
      carreras_totales: carrerasTotales,
      victorias_totales: victoriasTotales,
      podios_totales: podiosTotales,
    };

    // B. Rendimiento Temporada en 'drivers_stats'
    const fallbackStats = getDefaultDriverStats(driverId);
    const currentStats = existingStatsMap.get(driverId) || fallbackStats;

    // 1) Puntos de Carrera Principal
    const raceIndex = racePositions.findIndex(
      (r) => r.driverId.toUpperCase() === driverId
    );
    const racePos = raceIndex !== -1 ? raceIndex + 1 : 22;
    const isDnf = raceIndex !== -1 ? racePositions[raceIndex].isDnf : false;
    const puntosCarrera = !isDnf ? MAIN_RACE_POINTS_MAP[racePos] || 0 : 0;

    // 2) Puntos de Sprint (si aplica)
    let puntosSprint = 0;
    if (isSprint && sprintTop8.length > 0) {
      const sprintIndex = sprintTop8
        .map((s) => s.toUpperCase())
        .indexOf(driverId);
      if (sprintIndex !== -1 && sprintIndex < 8) {
        const sprintPos = sprintIndex + 1;
        puntosSprint = SPRINT_POINTS_MAP[sprintPos] || 0;
      }
    }

    const puntosSumados = puntosCarrera + puntosSprint;
    const puntosTotalNuevo =
      (currentStats.puntos_campeonato || 0) + puntosSumados;

    // 3) Victorias en el año
    const victoriasAnio =
      (currentStats.victorias_anio || 0) + (driverId === winnerDriverId ? 1 : 0);

    // 4) DNF en el año
    const dnfsAnio = (currentStats.dnfs_anio || 0) + (isDnf ? 1 : 0);

    // 5) Poles en el año
    const polesAnio =
      (currentStats.poles_anio || 0) + (driverId === poleDriverId ? 1 : 0);

    // 6) Cortes clasificatorios (Q1, Q2, Q3)
    const qualyIndex = qualyPositions.indexOf(driverId);
    const qualyPos = qualyIndex !== -1 ? qualyIndex + 1 : 22;

    let vecesQ1 = currentStats.veces_q1 || 0;
    let vecesQ2 = currentStats.veces_q2 || 0;
    let vecesQ3 = currentStats.veces_q3 || 0;

    if (qualyPos <= 10) {
      vecesQ3 += 1;
    } else if (qualyPos <= 16) {
      vecesQ2 += 1;
    } else {
      vecesQ1 += 1;
    }

    // 7) H2H con compañero
    const h2hDelta = h2hDuelingResult.get(driverId) || {
      victoriasDelta: 0,
      derrotasDelta: 0,
    };
    const currentH2H = currentStats.h2h_qualy || {
      victorias: pilotMeta.h2hVictorias,
      derrotas: pilotMeta.h2hDerrotas,
      companero: pilotMeta.companero,
      companeroId: pilotMeta.companeroCodigo,
    };

    const newH2H = {
      victorias: (currentH2H.victorias || 0) + h2hDelta.victoriasDelta,
      derrotas: (currentH2H.derrotas || 0) + h2hDelta.derrotasDelta,
      companero: currentH2H.companero || pilotMeta.companero,
      companeroId: currentH2H.companeroId || pilotMeta.companeroCodigo,
    };

    // 8) Racha de Últimas 3 Carreras (Cola FIFO)
    const currentRacha = Array.isArray(currentStats.ultimas_carreras)
      ? [...currentStats.ultimas_carreras]
      : [];

    const nuevoResultadoCarrera = {
      gpNombre: gpNombre || "Gran Premio",
      gpBandera: gpBandera || "🏁",
      posicion: (isDnf ? "DNF" : racePos) as number | "DNF",
    };

    let nuevaRacha = [];
    if (currentRacha.length >= 3) {
      nuevaRacha = [...currentRacha.slice(-2), nuevoResultadoCarrera];
    } else {
      nuevaRacha = [...currentRacha, nuevoResultadoCarrera];
    }

    const updatedStatsDoc: DriverStats = {
      ...currentStats,
      driverId,
      puntos_campeonato: puntosTotalNuevo,
      victorias_anio: victoriasAnio,
      dnfs_anio: dnfsAnio,
      poles_anio: polesAnio,
      veces_q1: vecesQ1,
      veces_q2: vecesQ2,
      veces_q3: vecesQ3,
      h2h_qualy: newH2H,
      ultimas_carreras: nuevaRacha,
    };

    driverCalculations.push({
      driverId,
      nombre: pilotMeta.nombreCompleto,
      escuderiaId: pilotMeta.escuderiaId,
      pilotoDocUpdates,
      statsDoc: updatedStatsDoc,
      puntosSumadosCarrera: puntosCarrera,
      puntosSumadosSprint: puntosSprint,
      puntosSumadosTotal: puntosSumados,
      puntosTotalNuevo,
      posicionAnterior: currentStats.posicion_campeonato || pilotMeta.posicion,
    });
  }

  // 3. Reordenar el Campeonato de Pilotos (1º al 22º)
  // Criterio: Puntos totales (mayor a menor). Desempate por victorias_anio
  driverCalculations.sort((a, b) => {
    if (b.puntosTotalNuevo !== a.puntosTotalNuevo) {
      return b.puntosTotalNuevo - a.puntosTotalNuevo;
    }
    return (b.statsDoc.victorias_anio || 0) - (a.statsDoc.victorias_anio || 0);
  });

  // Asignar nueva posicion_campeonato
  driverCalculations.forEach((item, index) => {
    item.statsDoc.posicion_campeonato = index + 1;
  });

  // 4. Escribir en Firestore mediante un WriteBatch atómico
  const batch = writeBatch(db);

  // A. Actualizar los 22 documentos de 'pilotos'
  driverCalculations.forEach((item) => {
    const pilotoRef = doc(db, "pilotos", item.driverId);
    batch.set(pilotoRef, item.pilotoDocUpdates, { merge: true });
  });

  // B. Actualizar los 22 documentos de 'drivers_stats'
  driverCalculations.forEach((item) => {
    const statsRef = doc(db, "drivers_stats", item.driverId);
    batch.set(statsRef, item.statsDoc, { merge: true });
  });

  // C. Marcar el Gran Premio como procesado para Idempotencia
  const gpRef = doc(db, "grand_prix", gpId);
  batch.set(
    gpRef,
    {
      driverStatsProcessed: true,
      driverStatsProcessedAt: new Date().toISOString(),
      driverStatsData: {
        qualyPositions,
        racePositions,
        sprintTop8,
        poleDriver: poleDriverId,
        winnerDriver: winnerDriverId,
        podiumDrivers: podiumDriverIds,
        dnfDrivers: dnfDriverIds,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  // 5. Preparar reporte detallado de salida
  const pointsAwarded: DriverPointsAwarded[] = driverCalculations.map((item) => ({
    driverId: item.driverId,
    nombre: item.nombre,
    escuderiaId: item.escuderiaId,
    puntosCarrera: item.puntosSumadosCarrera,
    puntosSprint: item.puntosSumadosSprint,
    puntosSumados: item.puntosSumadosTotal,
    puntosTotal: item.puntosTotalNuevo,
    posicionAnterior: item.posicionAnterior,
    posicionNueva: item.statsDoc.posicion_campeonato,
  }));

  return {
    success: true,
    gpId,
    updatedDriversCount: driverCalculations.length,
    poleDriver: poleDriverId,
    winnerDriver: winnerDriverId,
    podiumDrivers: podiumDriverIds,
    dnfDrivers: dnfDriverIds,
    pointsAwarded,
  };
}
