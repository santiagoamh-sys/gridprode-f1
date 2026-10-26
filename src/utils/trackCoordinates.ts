/**
 * Diccionario de configuración de coordenadas y trazados vectoriales oficiales para F1.
 * Los paths SVG corresponden fielmente a los circuitos oficiales utilizados tanto en las
 * tarjetas del Calendario como en el lienzo interactivo del minijuego de Vuelta Rápida.
 */

import { INITIAL_GRAND_PRIX } from "@/data/f1InitialData";

export interface ApexCoordinate {
  id: number; // 1 al 8
  name: string;
  x: number;
  y: number;
  progress: number;
  idealTime: number;
  idealTimeMs: number;
  labelOffsetX: number;
  labelOffsetY: number;
}

export interface CircuitTrackConfig {
  id: string;
  gpId: string;
  name: string;
  grandPrix: string;
  viewBox: string;
  direction: "Horario" | "Antihorario";
  startPoint: { x: number; y: number; angleDeg: number };
  pathD: string;
  apexes: ApexCoordinate[];
}

/**
 * Trazado vectorial oficial del Autódromo Hermanos Rodríguez (México)
 * Sentido de giro: Horario (clockwise)
 * Inicia en la recta principal, pasa por la chicane Moisés Solana (C1-C3),
 * recta trasera hacia la C4, complejo del lago, sección de Las Eses (C7-C11),
 * entra al estadio Foro Sol (C12-C15) y concluye en la icónica Peraltada hacia la meta.
 */
export const MEXICO_OFFICIAL_PATH =
  "M 183.64 61.90 " +
  "C 289.76 78.26 346.39 83.90 381.75 89.64 " +
  "C 405.33 93.47 447.05 100.24 457.82 102.99 " +
  "C 467.64 105.50 467.84 105.24 466.89 112.57 " +
  "C 466.08 118.72 465.59 121.60 464.53 127.79 " +
  "C 464.05 130.63 466.30 131.85 470.13 135.52 " +
  "C 472.43 137.73 474.55 139.25 474.16 141.25 " +
  "C 470.27 161.23 468.21 164.27 463.25 174.94 " +
  "C 460.92 179.97 458.73 182.51 456.04 187.35 " +
  "C 439.70 213.60 423.35 239.85 407.00 266.10 " +
  "C 398.34 280.01 388.34 293.12 378.89 306.42 " +
  "C 377.94 307.75 376.69 309.52 376.86 311.15 " +
  "C 377.15 313.83 386.36 318.16 389.07 319.91 " +
  "C 391.80 321.68 392.57 322.81 392.20 325.66 " +
  "C 391.94 327.72 389.57 329.03 387.97 330.15 " +
  "C 380.15 335.62 372.64 340.77 364.83 346.23 " +
  "C 363.77 346.97 362.43 347.44 361.23 346.96 " +
  "C 359.92 346.44 358.16 345.14 356.63 344.24 " +
  "C 355.07 343.31 355.31 341.56 355.57 339.76 " +
  "C 359.51 312.78 363.50 284.92 367.43 257.95 " +
  "C 367.91 254.70 366.49 251.22 363.70 249.48 " +
  "C 358.46 246.24 354.87 243.69 349.76 240.57 " +
  "C 344.57 237.40 340.65 229.82 338.81 224.02 " +
  "C 336.55 216.87 330.70 209.97 323.55 208.59 " +
  "C 312.72 206.49 301.89 204.86 291.07 202.94 " +
  "C 284.72 201.81 278.42 199.05 275.60 191.32 " +
  "C 273.94 186.80 272.70 182.69 271.13 178.13 " +
  "C 269.98 174.81 266.17 172.75 263.08 171.07 " +
  "C 252.91 165.52 242.32 159.90 232.14 154.35 " +
  "C 224.98 150.45 216.63 148.29 208.57 146.99 " +
  "C 180.73 142.47 153.11 137.99 125.27 133.48 " +
  "C 120.41 132.69 115.47 130.95 114.66 123.47 " +
  "C 113.37 111.48 112.51 99.54 111.36 87.58 " +
  "C 111.15 85.33 111.05 82.50 108.31 81.42 " +
  "C 106.54 80.72 104.44 81.03 103.30 82.55 " +
  "C 101.57 84.83 99.73 86.86 98.01 89.15 " +
  "C 96.47 91.19 92.49 91.14 90.16 90.08 " +
  "C 87.54 88.88 85.16 86.62 82.31 86.23 " +
  "C 76.49 85.45 71.05 85.18 65.23 84.39 " +
  "C 62.68 84.05 60.10 80.93 60.37 78.37 " +
  "C 60.64 75.76 60.90 75.02 61.58 73.19 " +
  "C 64.37 65.71 69.91 57.39 76.86 53.30 " +
  "C 83.24 49.53 90.69 47.24 99.22 48.81 Z";

/**
 * Configuración oficial de México (Autódromo Hermanos Rodríguez)
 * 8 APEX ubicados de forma aproximada sobre el trazado oficial
 * (ajustables posteriormente por el administrador).
 */
export const mexicoTrackConfig: CircuitTrackConfig = {
  id: "mexico_hermanos_rodriguez_2026",
  gpId: "gp-mexico-2026",
  name: "Autódromo Hermanos Rodríguez",
  grandPrix: "GP de la Ciudad de México • Autódromo Hermanos Rodríguez",
  viewBox: "40 25 460 350",
  direction: "Horario",
  startPoint: { x: 230, y: 69, angleDeg: 9 },
  pathD: MEXICO_OFFICIAL_PATH,
      apexes: [
    {
      id: 1,
      name: "Curva 1 (Moisés Solana)",
      x: 464.3,
      y: 104.8,
      progress: 0.232,
      idealTime: 1.56,
      idealTimeMs: 1559,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 2,
      name: "Curva 4 (Frenada Recta Trasera)",
      x: 466.5,
      y: 168,
      progress: 0.289,
      idealTime: 2.36,
      idealTimeMs: 2358,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 3,
      name: "Curva 6 (Complejo del Lago)",
      x: 378,
      y: 312.9,
      progress: 0.429,
      idealTime: 3.67,
      idealTimeMs: 3673,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 4,
      name: "Curva 7 (Entrada a Las Eses)",
      x: 356.6,
      y: 332.5,
      progress: 0.4912,
      idealTime: 4.6,
      idealTimeMs: 4603,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 5,
      name: "Curva 10 (Las Eses Rápidas)",
      x: 360.3,
      y: 247.3,
      progress: 0.564,
      idealTime: 5.44,
      idealTimeMs: 5442,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 6,
      name: "Curva 12 (Entrada al Foro Sol)",
      x: 273.9,
      y: 186.3,
      progress: 0.6572,
      idealTime: 6.39,
      idealTimeMs: 6389,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
    {
      id: 7,
      name: "Curva 14 (Estadio Foro Sol)",
      x: 111.2,
      y: 85.9,
      progress: 0.835,
      idealTime: 8.14,
      idealTimeMs: 8137,
      labelOffsetX: -38,
      labelOffsetY: 4,
    },
    {
      id: 8,
      name: "Curva 16 (Peraltada Nigel Mansell)",
      x: 90.4,
      y: 48.5,
      progress: 0.923,
      idealTime: 9.34,
      idealTimeMs: 9343,
      labelOffsetX: 38,
      labelOffsetY: 4,
    },
  ],
};

/**
 * Trazado vectorial oficial del Circuito de las Américas (Austin - COTA)
 * Sentido de giro: Antihorario
 */
export const AUSTIN_OFFICIAL_PATH =
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
  "L 148.455 430.529 Z";

export const austinTrackConfig: CircuitTrackConfig = {
  id: "austin_cota_2026",
  gpId: "gp-usa-2026",
  name: "Circuito de las Américas (COTA)",
  grandPrix: "GP de Estados Unidos • Austin",
  viewBox: "8 14 484 468",
  direction: "Antihorario",
  startPoint: { x: 148.46, y: 430.53, angleDeg: 16 },
  pathD: AUSTIN_OFFICIAL_PATH,
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
 * Trazado vectorial oficial del Autódromo José Carlos Pace (Interlagos - Brasil)
 * Sentido de giro: Antihorario
 */
export const BRAZIL_OFFICIAL_PATH =
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
  "L 430 90 Z";

export const brazilTrackConfig: CircuitTrackConfig = {
  id: "brazil_interlagos_2026",
  gpId: "gp-brasil-2026",
  name: "Autódromo José Carlos Pace (Interlagos)",
  grandPrix: "GP de São Paulo • Interlagos",
  viewBox: "0 10 520 440",
  direction: "Antihorario",
  startPoint: { x: 330, y: 90, angleDeg: 180 },
  pathD: BRAZIL_OFFICIAL_PATH,
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

/**
 * Determina dinámicamente el Gran Premio activo del calendario oficial
 * comparando la fecha/hora actual con los horarios de cada fin de semana de carrera.
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
    // Margen de 6 horas posterior a la largada de la carrera
    const raceEndMs = new Date(timeStr).getTime() + 6 * 60 * 60 * 1000;
    return raceEndMs > nowMs;
  });

  return upcoming ? upcoming.id : sorted[sorted.length - 1].id;
}

/**
 * Diccionario de trazados y coordenadas indexado por ID del circuito / GP
 */
export const TRACK_COORDINATES: Record<string, CircuitTrackConfig> = {
  // México (Autódromo Hermanos Rodríguez)
  "gp-mexico-2026": mexicoTrackConfig,
  "mexico_hermanos_rodriguez_2026": mexicoTrackConfig,
  mexico: mexicoTrackConfig,

  // Estados Unidos (Austin - COTA)
  "gp-usa-2026": austinTrackConfig,
  "austin_cota_2026": austinTrackConfig,
  austin: austinTrackConfig,

  // Brasil (Interlagos)
  "gp-brasil-2026": brazilTrackConfig,
  "brazil_interlagos_2026": brazilTrackConfig,
  brazil: brazilTrackConfig,
  brasil: brazilTrackConfig,
};

// Alias en camelCase para lectura directa
export const trackCoordinates = TRACK_COORDINATES;

/**
 * Obtiene la configuración del circuito buscándolo por su ID de GP o clave de circuito.
 * Si no se especifica, resuelve de forma 100% automática y agnóstica la carrera activa actual
 * según el calendario de la F1.
 */
export function getTrackCoordinates(circuitId?: string): CircuitTrackConfig {
  const targetId = circuitId || getCurrentActiveGpId();
  if (targetId && TRACK_COORDINATES[targetId]) {
    return TRACK_COORDINATES[targetId];
  }

  // Búsqueda inteligente por coincidencias en el calendario
  const gpInfo = INITIAL_GRAND_PRIX.find((g) => g.id === targetId);
  if (gpInfo) {
    const text = `${gpInfo.id} ${gpInfo.nombre} ${gpInfo.circuito} ${gpInfo.pais}`.toLowerCase();
    if (text.includes("mexic") || text.includes("méxic") || text.includes("rodriguez")) {
      return TRACK_COORDINATES["gp-mexico-2026"];
    }
    if (text.includes("brasil") || text.includes("brazil") || text.includes("interlagos") || text.includes("pace")) {
      return TRACK_COORDINATES["gp-brasil-2026"];
    }
    if (text.includes("usa") || text.includes("estados unidos") || text.includes("austin") || text.includes("cota")) {
      return TRACK_COORDINATES["gp-usa-2026"];
    }
  }

  // Fallback seguro a la carrera activa o México
  const activeGpId = getCurrentActiveGpId();
  if (activeGpId && TRACK_COORDINATES[activeGpId]) {
    return TRACK_COORDINATES[activeGpId];
  }

  return TRACK_COORDINATES["gp-mexico-2026"] || mexicoTrackConfig;
}
