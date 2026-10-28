import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { DriverStats } from "@/types/f1";
import { pilotsData } from "@/data/pilotsData";

/**
 * Estadísticas oficiales de la temporada actual construidas directamente desde src/data/pilotsData.ts
 */
export const DEFAULT_DRIVERS_STATS: Record<string, DriverStats> = Object.fromEntries(
  pilotsData.map((p) => [
    p.codigo,
    {
      driverId: p.codigo,
      posicion_campeonato: p.posicion,
      puntos_campeonato: p.puntos,
      h2h_qualy: {
        victorias: p.h2hVictorias,
        derrotas: p.h2hDerrotas,
        companero: p.companero,
        companeroId: p.companeroCodigo,
      },
      veces_q1: p.frecuenciaQ1,
      veces_q2: p.frecuenciaQ2,
      veces_q3: p.frecuenciaQ3,
      poles_anio: p.poles,
      victorias_anio: p.victoriasTemp,
      dnfs_anio: p.dnfs,
      ultimas_carreras: [
        {
          gpNombre: "Azerbaiyán",
          gpBandera: "🇦🇿",
          posicion: p.ultimosResultados.AZ,
        },
        {
          gpNombre: "Bahréin",
          gpBandera: "🇧🇭",
          posicion: p.ultimosResultados.BH,
        },
        {
          gpNombre: "Singapur",
          gpBandera: "🇸🇬",
          posicion: p.ultimosResultados.SG,
        },
      ],
    },
  ])
);

/**
 * Obtiene las estadísticas oficiales para un piloto desde pilotsData.ts
 */
export function getDefaultDriverStats(driverId: string): DriverStats {
  const upper = (driverId || "").toUpperCase();
  if (DEFAULT_DRIVERS_STATS[upper]) {
    return { ...DEFAULT_DRIVERS_STATS[upper] };
  }
  return {
    driverId: upper,
    posicion_campeonato: 0,
    puntos_campeonato: 0,
    h2h_qualy: {
      victorias: 0,
      derrotas: 0,
      companero: "Compañero",
      companeroId: "COMP",
    },
    veces_q1: 0,
    veces_q2: 0,
    veces_q3: 0,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 0,
    ultimas_carreras: [],
  };
}

/**
 * Sincroniza y devuelve las estadísticas actualizadas del piloto desde Firestore ('drivers_stats'),
 * con fallback a pilotsData.ts si aún no existe en base de datos.
 */
export async function fetchDriverStats(driverId: string): Promise<DriverStats> {
  const upperId = (driverId || "").toUpperCase();
  const fallbackStats = getDefaultDriverStats(upperId);

  try {
    if (db) {
      const docRef = doc(db, "drivers_stats", upperId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as DriverStats;
      } else if (DEFAULT_DRIVERS_STATS[upperId]) {
        // Inicializar por primera vez en Firestore si no existe
        setDoc(docRef, fallbackStats, { merge: true }).catch(() => {});
      }
    }
  } catch (error) {
    console.warn(`[fetchDriverStats] Aviso al consultar ${upperId}:`, error);
  }

  return fallbackStats;
}
