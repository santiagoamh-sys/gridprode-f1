export interface CircuitApexConfig {
  id: number; // 1 al 8
  name: string;
  x: number;
  y: number;
  idealTime: number; // Tiempo ideal en segundos (0 a 15)
  idealTimeMs: number; // Tiempo ideal en milisegundos (0 a 15000)
  labelOffsetX: number;
  labelOffsetY: number;
}

export interface CircuitConfig {
  id: string;
  name: string;
  grandPrix: string;
  viewBox: string;
  startPoint: { x: number; y: number; angleDeg: number };
  pathD: string;
  apexes: CircuitApexConfig[];
}

/**
 * Configuración del circuito de la semana: GP de Estados Unidos - Circuito de las Américas (COTA).
 * La silueta respeta fielmente el trazado real de Austin:
 * - Recta principal en subida hacia la horquilla aguda de la Curva 1 (85, 235)
 * - Secuencia en zig-zag de Las Esses (Curvas 2 a 9)
 * - Recta hacia la horquilla extrema Este en la Curva 11 (730, 95)
 * - Larga recta opuesta diagonal hasta la fuerte frenada de la Curva 12 (340, 275)
 * - Sector trabado del Estadio (Curvas 13 a 15 en 335, 360)
 * - Carrusel de la Torre de Observación (Triple derecha Curvas 16-18 en 490, 385)
 * - Doble izquierda final (Curvas 19 y 20 en 330, 455) hacia la recta principal.
 *
 * Cada uno de los 8 APEX tiene sus coordenadas (x, y) exactamente sobre el vértice del <path>
 * y su idealTime / idealTimeMs calibrado exactamente con la longitud de arco acumulada sobre 15s.
 */
export const currentCircuit: CircuitConfig = {
  id: "austin_cota_2026",
  name: "Circuito de las Américas (COTA)",
  grandPrix: "GP de Estados Unidos • Austin",
  viewBox: "0 0 800 500",
  startPoint: { x: 210, y: 350, angleDeg: -47 },
  pathD:
    "M 210 350 " +
    "L 85 235 " +
    "L 155 265 " +
    "L 190 225 " +
    "L 225 240 " +
    "L 260 195 " +
    "L 305 210 " +
    "L 345 165 " +
    "L 395 185 " +
    "L 430 145 " +
    "L 565 115 " +
    "L 730 95 " +
    "L 340 275 " +
    "L 395 315 " +
    "L 420 285 " +
    "L 450 305 " +
    "L 335 360 " +
    "L 435 330 " +
    "L 475 345 " +
    "L 490 385 " +
    "L 445 425 " +
    "L 375 410 " +
    "L 330 455 " +
    "Z",
  apexes: [
    {
      id: 1,
      name: "Curva 1 (Subida)",
      x: 85,
      y: 235,
      idealTime: 1.18,
      idealTimeMs: 1180,
      labelOffsetX: 0,
      labelOffsetY: -22,
    },
    {
      id: 2,
      name: "Curva 5 (Las Esses)",
      x: 260,
      y: 195,
      idealTime: 2.74,
      idealTimeMs: 2740,
      labelOffsetX: -10,
      labelOffsetY: -22,
    },
    {
      id: 3,
      name: "Curva 8 (Sector Esses)",
      x: 395,
      y: 185,
      idealTime: 3.862,
      idealTimeMs: 3862,
      labelOffsetX: 8,
      labelOffsetY: -22,
    },
    {
      id: 4,
      name: "Curva 11 (Horquilla Este)",
      x: 730,
      y: 95,
      idealTime: 6.348,
      idealTimeMs: 6348,
      labelOffsetX: 0,
      labelOffsetY: -22,
    },
    {
      id: 5,
      name: "Curva 12 (Fin Recta Opuesta)",
      x: 340,
      y: 275,
      idealTime: 9.333,
      idealTimeMs: 9333,
      labelOffsetX: -48,
      labelOffsetY: -6,
    },
    {
      id: 6,
      name: "Curva 15 (Estadio)",
      x: 335,
      y: 360,
      idealTime: 11.214,
      idealTimeMs: 11214,
      labelOffsetX: -46,
      labelOffsetY: 14,
    },
    {
      id: 7,
      name: "Curvas 16-18 (Torre)",
      x: 490,
      y: 385,
      idealTime: 12.534,
      idealTimeMs: 12534,
      labelOffsetX: 48,
      labelOffsetY: 4,
    },
    {
      id: 8,
      name: "Curva 20 (Última Curva)",
      x: 330,
      y: 455,
      idealTime: 13.892,
      idealTimeMs: 13892,
      labelOffsetX: 0,
      labelOffsetY: 24,
    },
  ],
};
