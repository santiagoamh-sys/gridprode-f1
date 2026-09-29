import {
  DesglosePuntos,
  RespuestasPrediccion,
  ResultadosOficiales,
} from "@/types/f1";

/**
 * Normaliza un campo Q1, Q2 o Q3 a un arreglo de IDs de pilotos limpios
 */
export function normalizeDriverList(
  val: string[] | string | null | undefined
): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Normaliza el campo DNF a un número entero (cantidad exacta de abandonos) o null
 */
export function normalizeDnfCount(
  val: number | string[] | string | null | undefined
): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && !isNaN(val)) return val;
  if (Array.isArray(val)) return val.filter(Boolean).length;
  const parsed = Number(val);
  if (!isNaN(parsed)) return parsed;
  return null;
}

/**
 * Motor de Puntajes Oficial de GridProde F1:
 *
 * - Q1 (6 eliminados): 1 pt por cada piloto acertado (sin importar el orden).
 * - Q2 (6 eliminados): 1 pt por cada piloto acertado (sin importar el orden).
 * - Q3 (Grilla final 1 al 10):
 *     * 1 pt por cada piloto acertado dentro del Top 10.
 *     * +1 pt extra si acierta la posición exacta (P2 a P10).
 *     * Excepción Pole Position (P1): acertar el P1 exacto otorga +2 pts extras (1 pt Top 10 + 2 pts extras = 3 pts).
 * - Carrera Principal: P1 (3 pts), P2 (2 pts), P3 (1 pt).
 * - Carrera Sprint (si isSprint): Pole Sprint (1 pt), P1 (3 pts), P2 (2 pts), P3 (1 pt).
 * - Especiales Carrera:
 *     * Cantidad exacta de DNF (1 pt)
 *     * Escudería ganadora (1 pt)
 *     * Piloto del día / DOTD (1 pt)
 *     * Posición final exacta de Franco Colapinto (2 pts)
 */
export function calcularPuntajePrediccion(
  pred: RespuestasPrediccion,
  oficial: ResultadosOficiales,
  isSprint: boolean
): {
  puntos_totales: number;
  desglose_puntos: DesglosePuntos;
} {
  // 1. Q1: 1 pt por cada piloto eliminado acertado (sin importar orden)
  const predQ1 = Array.from(new Set(normalizeDriverList(pred.q1))).slice(0, 6);
  const oficQ1 = new Set(normalizeDriverList(oficial.q1));
  let ptsQ1 = 0;
  for (const driverId of predQ1) {
    if (oficQ1.has(driverId)) {
      ptsQ1 += 1;
    }
  }

  // 2. Q2: 1 pt por cada piloto eliminado acertado (sin importar orden)
  const predQ2 = Array.from(new Set(normalizeDriverList(pred.q2))).slice(0, 6);
  const oficQ2 = new Set(normalizeDriverList(oficial.q2));
  let ptsQ2 = 0;
  for (const driverId of predQ2) {
    if (oficQ2.has(driverId)) {
      ptsQ2 += 1;
    }
  }

  // 3. Q3: Top 10 ordenado (índice 0 = P1 Pole Position, índice 9 = P10)
  const predQ3 = normalizeDriverList(pred.q3).slice(0, 10);
  const oficQ3 = normalizeDriverList(oficial.q3).slice(0, 10);
  const oficQ3Set = new Set(oficQ3);

  let q3_top10 = 0;
  let q3_exactos = 0;
  let q3_pole_bonus = 0;

  const seenInPredQ3 = new Set<string>();
  predQ3.forEach((driverId, index) => {
    if (!driverId || seenInPredQ3.has(driverId)) return;
    seenInPredQ3.add(driverId);

    // 1 punto por estar dentro del Top 10 de Q3
    if (oficQ3Set.has(driverId)) {
      q3_top10 += 1;
    }

    // Posición exacta en la grilla del 1 al 10
    if (oficQ3[index] && oficQ3[index] === driverId) {
      if (index === 0) {
        // Excepción: Acertar la Pole Position (P1) otorga 2 puntos extras
        q3_pole_bonus += 2;
      } else {
        // P2 a P10: suma 1 punto extra por posición exacta
        q3_exactos += 1;
      }
    }
  });

  const q3_total = q3_top10 + q3_exactos + q3_pole_bonus;

  // 4. Carrera Principal: P1 (3 pts), P2 (2 pts), P3 (1 pt)
  const carrera_p1 =
    pred.p1 && oficial.p1 && pred.p1 === oficial.p1 ? 3 : 0;
  const carrera_p2 =
    pred.p2 && oficial.p2 && pred.p2 === oficial.p2 ? 2 : 0;
  const carrera_p3 =
    pred.p3 && oficial.p3 && pred.p3 === oficial.p3 ? 1 : 0;
  const carrera_total = carrera_p1 + carrera_p2 + carrera_p3;

  // 5. Carrera Sprint (solo si isSprint es true)
  let sprint_pole = 0;
  let sprint_p1 = 0;
  let sprint_p2 = 0;
  let sprint_p3 = 0;

  if (isSprint) {
    sprint_pole =
      pred.sprintPole &&
      oficial.sprintPole &&
      pred.sprintPole === oficial.sprintPole
        ? 1
        : 0;
    sprint_p1 =
      pred.sprintP1 && oficial.sprintP1 && pred.sprintP1 === oficial.sprintP1
        ? 3
        : 0;
    sprint_p2 =
      pred.sprintP2 && oficial.sprintP2 && pred.sprintP2 === oficial.sprintP2
        ? 2
        : 0;
    sprint_p3 =
      pred.sprintP3 && oficial.sprintP3 && pred.sprintP3 === oficial.sprintP3
        ? 1
        : 0;
  }
  const sprint_total = sprint_pole + sprint_p1 + sprint_p2 + sprint_p3;

  // 6. Especiales Carrera:
  // - Cantidad exacta de DNF: 1 pt
  const predDnf = normalizeDnfCount(pred.dnf);
  const oficDnf = normalizeDnfCount(oficial.dnf);
  const dnf =
    predDnf !== null && oficDnf !== null && predDnf === oficDnf ? 1 : 0;

  // - Escudería ganadora: 1 pt
  const escuderia =
    pred.escuderia && oficial.escuderia && pred.escuderia === oficial.escuderia
      ? 1
      : 0;

  // - Piloto del día (DOTD): 1 pt
  const piloto_del_dia =
    pred.piloto_del_dia &&
    oficial.piloto_del_dia &&
    pred.piloto_del_dia === oficial.piloto_del_dia
      ? 1
      : 0;

  // - Posición final exacta de Franco Colapinto: 2 pts
  const predCol =
    pred.posicion_colapinto !== null && pred.posicion_colapinto !== undefined
      ? Number(pred.posicion_colapinto)
      : null;
  const oficCol =
    oficial.posicion_colapinto !== null &&
    oficial.posicion_colapinto !== undefined
      ? Number(oficial.posicion_colapinto)
      : null;
  const posicion_colapinto =
    predCol !== null &&
    oficCol !== null &&
    !isNaN(predCol) &&
    !isNaN(oficCol) &&
    predCol === oficCol
      ? 2
      : 0;

  const especiales_total =
    dnf + escuderia + piloto_del_dia + posicion_colapinto;

  const desglose_puntos: DesglosePuntos = {
    q1: ptsQ1,
    q2: ptsQ2,
    q3_top10,
    q3_exactos,
    q3_pole_bonus,
    q3_total,
    carrera_p1,
    carrera_p2,
    carrera_p3,
    carrera_total,
    sprint_pole,
    sprint_p1,
    sprint_p2,
    sprint_p3,
    sprint_total,
    dnf,
    escuderia,
    piloto_del_dia,
    posicion_colapinto,
    especiales_total,
  };

  const puntos_totales =
    ptsQ1 + ptsQ2 + q3_total + carrera_total + sprint_total + especiales_total;

  return {
    puntos_totales,
    desglose_puntos,
  };
}
