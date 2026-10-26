import { INITIAL_GRAND_PRIX } from "@/data/f1InitialData";
import {
  TRACK_COORDINATES,
  mexicoTrackConfig,
  austinTrackConfig,
  brazilTrackConfig,
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
export const brazilCircuit: CircuitConfig = brazilTrackConfig;


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
