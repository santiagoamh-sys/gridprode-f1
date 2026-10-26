import { INITIAL_GRAND_PRIX } from "@/data/f1InitialData";

export interface CircuitApexConfig {
  id: number; // 1 al 8
  name: string;
  x: number;
  y: number;
  /** Progreso normalizado de longitud de arco (0 a 1) a lo largo del <path> oficial */
  progress: number;
  /** Tiempo ideal en segundos dentro de la vuelta de 10.0s */
  idealTime: number;
  /** Tiempo ideal en milisegundos dentro de la vuelta de 10000ms */
  idealTimeMs: number;
  labelOffsetX: number;
  labelOffsetY: number;
}

export interface CircuitConfig {
  id: string;
  gpId: string;
  name: string;
  grandPrix: string;
  viewBox: string;
  direction?: "Horario" | "Antihorario";
  startPoint: { x: number; y: number; angleDeg: number };
  pathD: string;
  apexes: CircuitApexConfig[];
}

/**
 * Silueta vectorial oficial del Circuito de las Américas (Austin - COTA)
 * Sentido: Antihorario
 */
export const austinCircuit: CircuitConfig = {
  id: "austin_cota_2026",
  gpId: "gp-usa-2026",
  name: "Circuito de las Américas (COTA)",
  grandPrix: "GP de Estados Unidos • Austin",
  viewBox: "8 14 484 468",
  direction: "Antihorario",
  startPoint: { x: 148.46, y: 430.53, angleDeg: 16 },
  pathD:
    "M 148.455 430.529 " +
    "L 254.188 460.926 " +
    "c 0.8 0.23 1.623 0.349 2.44 0.349 " +
    "h 0.004 " +
    "c 3.202 0 6.146 -1.782 7.68 -4.652 " +
    "c 1.537 -2.871 1.379 -6.22 -0.42 -8.954 " +
    "c -4.86 -7.388 -12.923 -18.609 -23.722 -30.107 " +
    "c -15.686 -16.704 -17.69 -29.534 -6.913 -44.286 " +
    "c 8.675 -11.876 21.268 -28.367 28.003 -37.141 " +
    "a 19.362 19.362 0 0 0 4.016 -11.282 " +
    "l 0.466 -15.142 " +
    "a 19.583 19.583 0 0 1 6.562 -14.018 " +
    "l 0.715 -0.63 " +
    "c 7.37 -6.527 10.504 -16.54 8.18 -26.134 " +
    "l -3.371 -13.905 " +
    "c -0.474 -1.951 -0.171 -4.007 0.844 -5.789 " +
    "c 2.62 -4.578 8.053 -13.095 15.02 -18.7 " +
    "c 1.572 -1.26 3.69 -1.957 5.968 -1.957 " +
    "l 26.805 1.295 " +
    "l 0.957 0.022 " +
    "c 8.28 0 15.724 -5.263 18.53 -13.093 " +
    "l 8.343 -23.295 " +
    "c 1.584 -4.427 5.797 -7.398 10.481 -7.398 " +
    "c 1.941 0 3.789 0.498 5.5 1.482 " +
    "l 7.665 4.404 " +
    "c 3.18 1.826 7.308 1.64 10.303 -0.463 " +
    "l 40.179 -28.161 " +
    "a 14.041 14.041 0 0 0 5.38 -7.511 " +
    "L 464.63 50.736 " +
    "c 0.84 -2.853 0.317 -5.836 -1.429 -8.185 " +
    "c -3.095 -4.166 -9.585 -4.959 -13.542 -1.491 " +
    "c -105.774 92.51 -189.942 140.467 -271.342 186.844 " +
    "l -1.43 0.818 " +
    "a 8.786 8.786 0 0 0 -4.448 7.319 " +
    "a 8.868 8.868 0 0 0 3.861 7.726 " +
    "c 10.004 6.86 18.037 11.893 24.491 15.937 " +
    "c 9.44 5.913 15.39 9.643 19.06 13.81 " +
    "l -12.113 5.437 " +
    "c -1.335 0.598 -2.524 0.903 -3.537 0.903 " +
    "c -1.238 0 -2.939 -0.402 -5.131 -3.54 " +
    "l -4.563 -6.535 " +
    "a 13.107 13.107 0 0 0 -5.448 -4.483 " +
    "l -11.76 -5.206 " +
    "a 13.065 13.065 0 0 0 -9.396 -0.459 " +
    "l -11.38 3.769 " +
    "c -3.1 1.023 -5.339 3.555 -5.99 6.772 " +
    "a 9.12 9.12 0 0 0 2.897 8.64 " +
    "c 6.81 5.996 14.065 10.876 21.083 15.595 " +
    "c 7.814 5.256 15.205 10.224 20.324 15.78 " +
    "c 1.003 1.77 5.673 10.775 4.745 22.995 " +
    "a 9.66 9.66 0 0 1 -2.139 5.317 " +
    "c -3.422 4.198 -9.976 11.888 -15.405 16.219 " +
    "a 9.094 9.094 0 0 1 -3.476 1.72 " +
    "c -2.734 0.69 -8.336 1.847 -15.156 1.847 " +
    "c -3.105 0 -6.165 -0.238 -9.102 -0.709 " +
    "c -0.999 -0.161 -2.029 -0.56 -3.066 -1.183 " +
    "l -47.373 -28.484 " +
    "c -5.617 -3.377 -13.355 -2.265 -17.802 2.544 " +
    "l -48.214 52.06 " +
    "a 10.688 10.688 0 0 0 -2.47 10.18 " +
    "c 1 3.624 3.746 6.404 7.344 7.44 " +
    "L 148.455 430.529 Z",
  apexes: [
    {
      id: 1,
      name: "Curva 1 (Subida)",
      x: 264.31,
      y: 456.62,
      progress: 0.07594,
      idealTime: 0.85,
      idealTimeMs: 850,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 2,
      name: "Curvas 4-5 (Las Esses)",
      x: 281.2,
      y: 268.93,
      progress: 0.21121,
      idealTime: 2.05,
      idealTimeMs: 2050,
      labelOffsetX: 40,
      labelOffsetY: 4,
    },
    {
      id: 3,
      name: "Curvas 8-9 (Sector Esses)",
      x: 370.28,
      y: 187.59,
      progress: 0.30274,
      idealTime: 3.05,
      idealTimeMs: 3050,
      labelOffsetX: 42,
      labelOffsetY: 12,
    },
    {
      id: 4,
      name: "Curva 11 (Horquilla Este)",
      x: 463.2,
      y: 42.55,
      progress: 0.42504,
      idealTime: 4.3,
      idealTimeMs: 4300,
      labelOffsetX: -42,
      labelOffsetY: -6,
    },
    {
      id: 5,
      name: "Curva 12 (Fin Recta Opuesta)",
      x: 172.44,
      y: 236.04,
      progress: 0.64675,
      idealTime: 6.1,
      idealTimeMs: 6100,
      labelOffsetX: -36,
      labelOffsetY: -18,
    },
    {
      id: 6,
      name: "Curva 15 (Estadio)",
      x: 150.53,
      y: 270.17,
      progress: 0.73667,
      idealTime: 7.25,
      idealTimeMs: 7250,
      labelOffsetX: -42,
      labelOffsetY: 4,
    },
    {
      id: 7,
      name: "Curvas 16-18 (Torre)",
      x: 197.44,
      y: 338.5,
      progress: 0.79347,
      idealTime: 8.2,
      idealTimeMs: 8200,
      labelOffsetX: 42,
      labelOffsetY: 4,
    },
    {
      id: 8,
      name: "Curva 20 (Última Curva)",
      x: 35.38,
      y: 392.69,
      progress: 0.92467,
      idealTime: 9.3,
      idealTimeMs: 9300,
      labelOffsetX: 28,
      labelOffsetY: -22,
    },
  ],
};

/**
 * Silueta vectorial oficial del Autódromo Hermanos Rodríguez (México)
 * Sentido: Horario
 */
export const mexicoCircuit: CircuitConfig = {
  id: "mexico_hermanos_rodriguez_2026",
  gpId: "gp-mexico-2026",
  name: "Autódromo Hermanos Rodríguez",
  grandPrix: "GP de la Ciudad de México • Autódromo Hermanos Rodríguez",
  viewBox: "0 10 540 440",
  direction: "Horario",
  startPoint: { x: 230, y: 395, angleDeg: 0 },
  pathD:
    "M 120 395 " +
    "L 445 395 " +
    "c 12 0 22 -8 22 -20 " +
    "l 0 -45 " +
    "c 0 -14 -10 -22 -22 -22 " +
    "l -30 0 " +
    "c -12 0 -20 -10 -20 -22 " +
    "l 0 -90 " +
    "c 0 -16 -12 -26 -26 -26 " +
    "l -55 0 " +
    "c -16 0 -26 12 -26 26 " +
    "l 0 35 " +
    "c 0 16 12 26 26 26 " +
    "l 65 0 " +
    "c 16 0 26 -12 26 -26 " +
    "l 0 -30 " +
    "c 0 -16 -12 -26 -26 -26 " +
    "l -55 0 " +
    "c -16 0 -26 -12 -26 -26 " +
    "l 0 -20 " +
    "c 0 -16 -12 -26 -26 -26 " +
    "l -85 0 " +
    "c -20 0 -35 15 -35 35 " +
    "l 0 115 " +
    "c 0 20 -16 35 -35 35 " +
    "l -30 0 " +
    "c -20 0 -35 15 -35 35 " +
    "l 0 45 " +
    "c 0 25 20 45 45 45 " +
    "L 120 395 Z",
  apexes: [
    {
      id: 1,
      name: "Curva 1 (Moisés Solana)",
      x: 467,
      y: 365,
      progress: 0.165,
      idealTime: 1.65,
      idealTimeMs: 1650,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 2,
      name: "Curva 3 (Salida Chicane)",
      x: 395,
      y: 275,
      progress: 0.258,
      idealTime: 2.6,
      idealTimeMs: 2600,
      labelOffsetX: 40,
      labelOffsetY: 4,
    },
    {
      id: 3,
      name: "Curva 4 (Horquilla Norte)",
      x: 335,
      y: 135,
      progress: 0.385,
      idealTime: 3.85,
      idealTimeMs: 3850,
      labelOffsetX: 42,
      labelOffsetY: -12,
    },
    {
      id: 4,
      name: "Curva 6 (Complejo del Lago)",
      x: 300,
      y: 220,
      progress: 0.485,
      idealTime: 4.85,
      idealTimeMs: 4850,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 5,
      name: "Curvas 7-8 (Las Esses)",
      x: 390,
      y: 165,
      progress: 0.595,
      idealTime: 5.95,
      idealTimeMs: 5950,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 6,
      name: "Curva 11 (Fin de Esses)",
      x: 230,
      y: 95,
      progress: 0.705,
      idealTime: 7.05,
      idealTimeMs: 7050,
      labelOffsetX: -38,
      labelOffsetY: -12,
    },
    {
      id: 7,
      name: "Curva 12 (Entrada al Foro Sol)",
      x: 110,
      y: 215,
      progress: 0.815,
      idealTime: 8.15,
      idealTimeMs: 8150,
      labelOffsetX: -42,
      labelOffsetY: 4,
    },
    {
      id: 8,
      name: "Curva 16 (Peraltada Mansell)",
      x: 45,
      y: 350,
      progress: 0.925,
      idealTime: 9.25,
      idealTimeMs: 9250,
      labelOffsetX: -32,
      labelOffsetY: 18,
    },
  ],
};

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
  if (CIRCUITS_BY_GP[targetGpId]) {
    return CIRCUITS_BY_GP[targetGpId];
  }
  const gpInfo = INITIAL_GRAND_PRIX.find((g) => g.id === targetGpId);
  const fallback = CIRCUITS_BY_GP["gp-mexico-2026"] || austinCircuit;
  return {
    ...fallback,
    id: `${targetGpId}_circuit`,
    gpId: targetGpId,
    grandPrix: gpInfo
      ? `${gpInfo.nombre} • ${gpInfo.circuito}`
      : fallback.grandPrix,
  };
}
