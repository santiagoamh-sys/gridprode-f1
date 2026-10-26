import { INITIAL_GRAND_PRIX } from "@/data/f1InitialData";
import {
  TRACK_COORDINATES,
  mexicoTrackConfig,
  austinTrackConfig,
  type ApexCoordinate,
  type CircuitTrackConfig,
} from "@/utils/trackCoordinates";

export type CircuitApexConfig = ApexCoordinate;
export type CircuitConfig = CircuitTrackConfig;

/**
 * Silueta vectorial oficial del Circuito de las Américas (Austin - COTA)
 * Sentido: Antihorario
 */
export const austinCircuit: CircuitConfig = austinTrackConfig;

/**
 * Silueta vectorial oficial del Autódromo Hermanos Rodríguez (México)
 * Sentido: Horario
 */
export const mexicoCircuit: CircuitConfig = mexicoTrackConfig;

/**
 * Silueta vectorial oficial del Autódromo José Carlos Pace (Interlagos - Brasil)
 * Sentido: Antihorario
 */
export const brazilCircuit: CircuitConfig = {
  id: "brazil_interlagos_2026",
  gpId: "gp-brasil-2026",
  name: "Autódromo José Carlos Pace (Interlagos)",
  grandPrix: "GP de São Paulo • Interlagos",
  viewBox: "0 10 520 440",
  direction: "Antihorario",
  startPoint: { x: 330, y: 90, angleDeg: 180 },
  pathD:
    "M 430 90 " +
    "L 220 90 " +
    "c -25 0 -45 18 -45 42 " +
    "l 0 45 " +
    "c 0 24 18 42 42 42 " +
    "l 35 0 " +
    "c 22 0 40 18 40 40 " +
    "l 0 30 " +
    "L 292 320 " +
    "c 0 25 -18 45 -45 45 " +
    "l -60 0 " +
    "c -25 0 -45 -18 -45 -45 " +
    "l 0 -35 " +
    "c 0 -22 18 -40 40 -40 " +
    "l 75 0 " +
    "c 25 0 45 20 45 45 " +
    "l 0 35 " +
    "c 0 25 20 45 45 45 " +
    "l 50 0 " +
    "c 20 0 35 -15 35 -35 " +
    "l 0 -40 " +
    "c 0 -20 -15 -35 -35 -35 " +
    "l -45 0 " +
    "c -20 0 -35 15 -35 35 " +
    "l 0 25 " +
    "c 0 20 16 38 38 38 " +
    "l 55 0 " +
    "c 25 0 45 -20 45 -45 " +
    "l 0 -115 " +
    "c 0 -25 -20 -45 -45 -45 " +
    "L 430 90 Z",
  apexes: [
    {
      id: 1,
      name: "Curva 1 (S de Senna - Frenada)",
      x: 175,
      y: 135,
      progress: 0.125,
      idealTime: 1.25,
      idealTimeMs: 1250,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 2,
      name: "Curva 2 (S de Senna - Salida)",
      x: 215,
      y: 218,
      progress: 0.215,
      idealTime: 2.15,
      idealTimeMs: 2150,
      labelOffsetX: -36,
      labelOffsetY: 12,
    },
    {
      id: 3,
      name: "Curva 4 (Descida do Lago)",
      x: 245,
      y: 365,
      progress: 0.355,
      idealTime: 3.55,
      idealTimeMs: 3550,
      labelOffsetX: -40,
      labelOffsetY: 14,
    },
    {
      id: 4,
      name: "Curva 5 (Salida do Lago)",
      x: 180,
      y: 275,
      progress: 0.455,
      idealTime: 4.55,
      idealTimeMs: 4550,
      labelOffsetX: -38,
      labelOffsetY: -12,
    },
    {
      id: 5,
      name: "Curvas 6-7 (Ferradura)",
      x: 340,
      y: 310,
      progress: 0.585,
      idealTime: 5.85,
      idealTimeMs: 5850,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 6,
      name: "Curva 8 (Pinheirinho)",
      x: 390,
      y: 240,
      progress: 0.695,
      idealTime: 6.95,
      idealTimeMs: 6950,
      labelOffsetX: 38,
      labelOffsetY: -8,
    },
    {
      id: 7,
      name: "Curva 9 (Bico de Pato)",
      x: 345,
      y: 165,
      progress: 0.805,
      idealTime: 8.05,
      idealTimeMs: 8050,
      labelOffsetX: -38,
      labelOffsetY: -8,
    },
    {
      id: 8,
      name: "Curva 11 (Junção / Subida dos Boxes)",
      x: 440,
      y: 180,
      progress: 0.915,
      idealTime: 9.15,
      idealTimeMs: 9150,
      labelOffsetX: 42,
      labelOffsetY: 4,
    },
  ],
};

// Compatibilidad retroactiva
export const currentCircuit: CircuitConfig = austinCircuit;

/**
 * Mapeo de configuraciones vectoriales de circuitos por ID de Gran Premio.
 */
export const CIRCUITS_BY_GP: Record<string, CircuitConfig> = {
  ...TRACK_COORDINATES,
  "gp-usa-2026": austinCircuit,
  "gp-mexico-2026": mexicoCircuit,
  "gp-brasil-2026": brazilCircuit,
};

/**
 * Determina dinámicamente el Gran Premio activo para la Vuelta Rápida semanal.
 * La semana de un GP comienza el lunes y culmina el domingo con el fin de la carrera (con margen post-carrera).
 * Al comenzar el lunes siguiente, avanza automáticamente al siguiente Gran Premio del calendario.
 */
export function getCurrentActiveGpId(now: Date = new Date()): string {
  const nowMs = now.getTime();
  const sorted = [...INITIAL_GRAND_PRIX].sort(
    (a, b) =>
      new Date(a.carreraStartTime || a.qualyStartTime || 0).getTime() -
      new Date(b.carreraStartTime || b.qualyStartTime || 0).getTime()
  );

  const upcoming = sorted.find((gp) => {
    const timeStr = gp.carreraStartTime || gp.qualyStartTime;
    if (!timeStr) return false;
    // 6 horas de margen luego de la largada de la carrera
    const raceEndMs = new Date(timeStr).getTime() + 6 * 60 * 60 * 1000;
    return raceEndMs > nowMs;
  });

  return upcoming ? upcoming.id : sorted[sorted.length - 1].id;
}

/**
 * Obtiene la configuración del circuito para el Gran Premio activo de la semana (o el gpId especificado).
 * Si aún no hay un trazado vectorial individualizado, usa el trazado más afín aislando el gpId y nombre
 * para que los registros e intentos semanales inicien en cero para la nueva semana.
 */
export function getCurrentCircuit(gpId?: string): CircuitConfig {
  const targetGpId = gpId || getCurrentActiveGpId();
  if (TRACK_COORDINATES[targetGpId]) {
    return TRACK_COORDINATES[targetGpId];
  }
  if (CIRCUITS_BY_GP[targetGpId]) {
    return CIRCUITS_BY_GP[targetGpId];
  }
  const gpInfo = INITIAL_GRAND_PRIX.find((g) => g.id === targetGpId);
  const fallback = TRACK_COORDINATES["gp-mexico-2026"] || mexicoCircuit;
  return {
    ...fallback,
    id: `${targetGpId}_circuit`,
    gpId: targetGpId,
    grandPrix: gpInfo
      ? `${gpInfo.nombre} • ${gpInfo.circuito}`
      : fallback.grandPrix,
  };
}
