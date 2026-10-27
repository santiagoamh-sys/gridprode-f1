import {
  RespuestasPrediccion,
  ResultadosOficiales,
  Prediccion,
} from "@/types/f1";
import { INITIAL_PILOTOS } from "@/data/f1InitialData";
import { normalizeDriverList, normalizeDnfCount } from "@/lib/scoringEngine";

/**
 * Representa los resultados oficiales de la carrera necesarios para evaluar insignias.
 */
export interface OfficialRaceResults {
  p1: string | null;
  p2: string | null;
  p3: string | null;
  pole?: string | null;
  q3?: string[] | string | null;
  piloto_del_dia?: string | null;
  escuderia?: string | null;
  dnf?: number | string[] | string | null;
  dnfCount?: number | null;
  dnfDrivers?: string[] | null;
  dnf_drivers?: string[] | null;
  posicion_colapinto?: number | null;
  vuelta_rapida?: string | null;
  isSprint?: boolean;
  sprintPole?: string | null;
  sprintP1?: string | null;
  sprintP2?: string | null;
  sprintP3?: string | null;
}

/**
 * Representa el pronóstico de un usuario (acepta RespuestasPrediccion, Prediccion o campos sueltos).
 */
export interface UserRacePrediction {
  respuestas?: RespuestasPrediccion;
  p1?: string | null;
  p2?: string | null;
  p3?: string | null;
  pole?: string | null;
  q3?: string[] | string | null;
  piloto_del_dia?: string | null;
  escuderia?: string | null;
  dnf?: number | string[] | string | null;
  dnfCount?: number | null;
  posicion_colapinto?: number | null;
  vuelta_rapida?: string | null;
  sprintPole?: string | null;
  sprintP1?: string | null;
  sprintP2?: string | null;
  sprintP3?: string | null;
}

/**
 * Opciones adicionales para el evaluador de insignias.
 */
export interface BadgeEvaluatorOptions {
  driverTeamMap?: Record<string, string>;
  previousPrediction?: UserRacePrediction | null;
  isFidelidadStreak?: boolean;
  vueltaPerfectaEarned?: boolean;
}

/**
 * Mapa de escuderías por defecto (ID piloto -> ID escudería).
 */
export const DEFAULT_DRIVER_TEAM_MAP: Record<string, string> = {
  VER: "RBR",
  HAD: "RBR",
  LEC: "FER",
  HAM: "FER",
  NOR: "MCL",
  PIA: "MCL",
  RUS: "MER",
  ANT: "MER",
  ALO: "AMR",
  STR: "AMR",
  ALB: "WIL",
  SAI: "WIL",
  GAS: "ALP",
  COL: "ALP",
  TSU: "VCARB",
  LAW: "VCARB",
  HUL: "HAA",
  BEA: "HAA",
  BOR: "AUD",
  BOT: "AUD",
  PER: "CAD",
  MAL: "CAD",
};

// Cargar automáticamente cualquier piloto adicional definido en INITIAL_PILOTOS
INITIAL_PILOTOS.forEach((p) => {
  if (p.id && p.escuderia_id) {
    DEFAULT_DRIVER_TEAM_MAP[p.id.toUpperCase()] = p.escuderia_id.toUpperCase();
  }
});

/**
 * Escuderías Top 4 (Red Bull, Mercedes, Ferrari, McLaren)
 */
export const TOP_TEAMS = new Set(["RBR", "MER", "FER", "MCL"]);

/**
 * Mapeo de alias para mantener sincronizados los nombres cortos requeridos
 * con los IDs canónicos definidos en badgesData.ts.
 */
export const BADGE_ALIASES: Record<string, string[]> = {
  ojo_clinico: ["ojo_clinico"],
  estratega: ["estratega", "el_estratega"],
  el_estratega: ["estratega", "el_estratega"],
  asistencia_perfecta: ["asistencia_perfecta"],
  oraculo_caos: ["oraculo_caos", "oraculo_del_caos"],
  oraculo_del_caos: ["oraculo_caos", "oraculo_del_caos"],
  rey_sabado: ["rey_sabado", "rey_del_sabado"],
  rey_del_sabado: ["rey_sabado", "rey_del_sabado"],
  pulso_argento: ["pulso_argento"],
  contra_corriente: ["contra_corriente", "contra_la_corriente"],
  contra_la_corriente: ["contra_corriente", "contra_la_corriente"],
  pleno_perfecto: ["pleno_perfecto"],
  fidelidad_absoluta: ["fidelidad_absoluta"],
  monopolio: ["monopolio"],
  el_mufa: ["el_mufa"],
  voto_popular: ["voto_popular"],
  carrera_limpia: ["carrera_limpia"],
  caos_ordenado: ["caos_ordenado"],
  maestro_sprint: ["maestro_sprint", "maestro_del_sprint"],
  maestro_del_sprint: ["maestro_sprint", "maestro_del_sprint"],
  vueltas_perfectas: ["vueltas_perfectas", "vueltasperfectas"],
  vueltasperfectas: ["vueltas_perfectas", "vueltasperfectas"],
};

/**
 * Extrae y normaliza las respuestas de la predicción de usuario.
 */
function extractPredictionData(userPrediction: UserRacePrediction) {
  const resp = (userPrediction.respuestas || userPrediction) as any;

  const p1 = resp.p1 ? String(resp.p1).trim().toUpperCase() : null;
  const p2 = resp.p2 ? String(resp.p2).trim().toUpperCase() : null;
  const p3 = resp.p3 ? String(resp.p3).trim().toUpperCase() : null;

  // Pole puede venir en resp.pole o como el primer clasificado de Q3 (q3[0])
  let pole = resp.pole ? String(resp.pole).trim().toUpperCase() : null;
  if (!pole && resp.q3) {
    const q3List = normalizeDriverList(resp.q3);
    if (q3List.length > 0 && q3List[0]) {
      pole = q3List[0].toUpperCase();
    }
  }

  const piloto_del_dia = resp.piloto_del_dia
    ? String(resp.piloto_del_dia).trim().toUpperCase()
    : null;

  const escuderia = resp.escuderia
    ? String(resp.escuderia).trim().toUpperCase()
    : null;

  const dnf = normalizeDnfCount(resp.dnf ?? resp.dnfCount);

  let posicion_colapinto: number | null = null;
  if (
    resp.posicion_colapinto !== undefined &&
    resp.posicion_colapinto !== null
  ) {
    const parsed = Number(resp.posicion_colapinto);
    if (!isNaN(parsed)) posicion_colapinto = parsed;
  }

  const sprintPole = resp.sprintPole
    ? String(resp.sprintPole).trim().toUpperCase()
    : null;
  const sprintP1 = resp.sprintP1
    ? String(resp.sprintP1).trim().toUpperCase()
    : null;
  const sprintP2 = resp.sprintP2
    ? String(resp.sprintP2).trim().toUpperCase()
    : null;
  const sprintP3 = resp.sprintP3
    ? String(resp.sprintP3).trim().toUpperCase()
    : null;

  const vuelta_rapida = resp.vuelta_rapida
    ? String(resp.vuelta_rapida).trim().toUpperCase()
    : null;

  return {
    p1,
    p2,
    p3,
    pole,
    piloto_del_dia,
    escuderia,
    dnf,
    posicion_colapinto,
    vuelta_rapida,
    sprintPole,
    sprintP1,
    sprintP2,
    sprintP3,
  };
}

/**
 * Extrae y normaliza los resultados oficiales de la carrera.
 */
function extractOfficialData(officialResults: OfficialRaceResults) {
  const p1 = officialResults.p1
    ? String(officialResults.p1).trim().toUpperCase()
    : null;
  const p2 = officialResults.p2
    ? String(officialResults.p2).trim().toUpperCase()
    : null;
  const p3 = officialResults.p3
    ? String(officialResults.p3).trim().toUpperCase()
    : null;

  let pole = officialResults.pole
    ? String(officialResults.pole).trim().toUpperCase()
    : null;
  if (!pole && officialResults.q3) {
    const q3List = normalizeDriverList(officialResults.q3);
    if (q3List.length > 0 && q3List[0]) {
      pole = q3List[0].toUpperCase();
    }
  }

  const piloto_del_dia = officialResults.piloto_del_dia
    ? String(officialResults.piloto_del_dia).trim().toUpperCase()
    : null;

  const escuderia = officialResults.escuderia
    ? String(officialResults.escuderia).trim().toUpperCase()
    : null;

  const dnf = normalizeDnfCount(
    officialResults.dnf ?? officialResults.dnfCount
  );

  let posicion_colapinto: number | null = null;
  if (
    officialResults.posicion_colapinto !== undefined &&
    officialResults.posicion_colapinto !== null
  ) {
    const parsed = Number(officialResults.posicion_colapinto);
    if (!isNaN(parsed)) posicion_colapinto = parsed;
  }

  // Lista de pilotos con DNF
  const rawDnfDrivers =
    officialResults.dnfDrivers ||
    officialResults.dnf_drivers ||
    (Array.isArray(officialResults.dnf) ? officialResults.dnf : []);

  const dnfDrivers = normalizeDriverList(rawDnfDrivers).map((d) =>
    d.toUpperCase()
  );

  // Si Colapinto abandonó oficialmente (posición 0), asegurar que figure en DNF drivers
  if (posicion_colapinto === 0 && !dnfDrivers.includes("COL")) {
    dnfDrivers.push("COL");
  }

  const vuelta_rapida = officialResults.vuelta_rapida
    ? String(officialResults.vuelta_rapida).trim().toUpperCase()
    : null;

  const isSprint = Boolean(officialResults.isSprint);

  const sprintPole = officialResults.sprintPole
    ? String(officialResults.sprintPole).trim().toUpperCase()
    : null;
  const sprintP1 = officialResults.sprintP1
    ? String(officialResults.sprintP1).trim().toUpperCase()
    : null;
  const sprintP2 = officialResults.sprintP2
    ? String(officialResults.sprintP2).trim().toUpperCase()
    : null;
  const sprintP3 = officialResults.sprintP3
    ? String(officialResults.sprintP3).trim().toUpperCase()
    : null;

  return {
    p1,
    p2,
    p3,
    pole,
    piloto_del_dia,
    escuderia,
    dnf,
    dnfDrivers,
    posicion_colapinto,
    vuelta_rapida,
    isSprint,
    sprintPole,
    sprintP1,
    sprintP2,
    sprintP3,
  };
}

/**
 * Evalúa las 15 insignias para un usuario en una carrera y devuelve el progreso actualizado.
 *
 * @param officialResults Resultados oficiales reales de la carrera.
 * @param userPrediction Pronóstico enviado por el usuario.
 * @param currentProgress Objeto con el progreso actual de insignias (badges_progress).
 * @param options Opciones adicionales (driverTeamMap personalizado, historial de predicción previa, etc.)
 * @returns Nuevo objeto con los contadores de progreso actualizados (+1 o inicializados en 1).
 */
export function evaluateRaceBadges(
  officialResults: OfficialRaceResults,
  userPrediction: UserRacePrediction,
  currentProgress?: Record<string, number> | null,
  options?: BadgeEvaluatorOptions
): Record<string, number> {
  const { detailed } = evaluateRaceBadgesDetailed(
    officialResults,
    userPrediction,
    currentProgress,
    options
  );
  return detailed.newProgress;
}

/**
 * Versión detallada que además devuelve la lista de insignias obtenidas en esta evaluación.
 */
export function evaluateRaceBadgesDetailed(
  officialResults: OfficialRaceResults,
  userPrediction: UserRacePrediction,
  currentProgress?: Record<string, number> | null,
  options?: BadgeEvaluatorOptions
): {
  detailed: {
    newProgress: Record<string, number>;
    awardedBadges: string[];
    evaluations: Record<string, boolean>;
  };
} {
  const updatedProgress: Record<string, number> = {
    ...(currentProgress || {}),
  };

  const awardedBadges: string[] = [];
  const evaluations: Record<string, boolean> = {};

  if (!userPrediction || Object.keys(userPrediction).length === 0) {
    return {
      detailed: {
        newProgress: updatedProgress,
        awardedBadges,
        evaluations,
      },
    };
  }

  const u = extractPredictionData(userPrediction);
  const o = extractOfficialData(officialResults);

  // Mapeo de escuderías
  const driverToTeam: Record<string, string> = {
    ...DEFAULT_DRIVER_TEAM_MAP,
    ...(options?.driverTeamMap || {}),
  };

  const getTeam = (driverId: string | null): string | null => {
    if (!driverId) return null;
    return driverToTeam[driverId.toUpperCase()] || null;
  };

  // Helper para verificar y otorgar una insignia
  const applyBadge = (badgeKey: string, condition: boolean) => {
    evaluations[badgeKey] = condition;
    if (!condition) return;

    awardedBadges.push(badgeKey);
    const aliases = BADGE_ALIASES[badgeKey] || [badgeKey];

    // Buscar el valor actual más alto entre los alias posibles
    let currentVal = 0;
    for (const alias of aliases) {
      const v = updatedProgress[alias];
      if (typeof v === "number" && !isNaN(v)) {
        currentVal = Math.max(currentVal, v);
      }
    }

    const nextVal = currentVal + 1;
    for (const alias of aliases) {
      updatedProgress[alias] = nextVal;
    }
  };

  // -------------------------------------------------------------------------
  // 1. ojo_clinico: prediction P1, P2, P3 coinciden exactamente con official
  // -------------------------------------------------------------------------
  const isOjoClinico = Boolean(
    u.p1 &&
      u.p2 &&
      u.p3 &&
      o.p1 &&
      o.p2 &&
      o.p3 &&
      u.p1 === o.p1 &&
      u.p2 === o.p2 &&
      u.p3 === o.p3
  );
  applyBadge("ojo_clinico", isOjoClinico);

  // -------------------------------------------------------------------------
  // 2. estratega: prediction DriverOfDay y Constructor coinciden con official
  // -------------------------------------------------------------------------
  const isEstratega = Boolean(
    u.piloto_del_dia &&
      u.escuderia &&
      o.piloto_del_dia &&
      o.escuderia &&
      u.piloto_del_dia === o.piloto_del_dia &&
      u.escuderia === o.escuderia
  );
  applyBadge("estratega", isEstratega);

  // -------------------------------------------------------------------------
  // 3. asistencia_perfecta: Se suma +1 por haber enviado la predicción
  // -------------------------------------------------------------------------
  const isAsistenciaPerfecta = Boolean(
    u.p1 ||
      u.p2 ||
      u.p3 ||
      u.pole ||
      u.piloto_del_dia ||
      u.escuderia ||
      u.dnf !== null ||
      u.posicion_colapinto !== null
  );
  applyBadge("asistencia_perfecta", isAsistenciaPerfecta);

  // -------------------------------------------------------------------------
  // 4. oraculo_caos: prediction DNFs (cantidad) coincide con official DNFs
  // -------------------------------------------------------------------------
  const isOraculoCaos = Boolean(
    u.dnf !== null && o.dnf !== null && u.dnf === o.dnf
  );
  applyBadge("oraculo_caos", isOraculoCaos);

  // -------------------------------------------------------------------------
  // 5. rey_sabado: prediction Pole coincide con official Pole
  // -------------------------------------------------------------------------
  const isReySabado = Boolean(
    u.pole && o.pole && u.pole === o.pole
  );
  applyBadge("rey_sabado", isReySabado);

  // -------------------------------------------------------------------------
  // 6. pulso_argento: prediction posición de Colapinto coincide con official
  // -------------------------------------------------------------------------
  const isPulsoArgento = Boolean(
    u.posicion_colapinto !== null &&
      o.posicion_colapinto !== null &&
      u.posicion_colapinto === o.posicion_colapinto
  );
  applyBadge("pulso_argento", isPulsoArgento);

  // -------------------------------------------------------------------------
  // 7. contra_corriente: Un piloto en el podio (prediction) coincide con el
  //    official, y no es de Red Bull, Mercedes, Ferrari ni McLaren.
  // -------------------------------------------------------------------------
  const predPodium = [u.p1, u.p2, u.p3].filter(Boolean) as string[];
  const oficPodium = [o.p1, o.p2, o.p3].filter(Boolean) as string[];
  const isContraCorriente = predPodium.some((driverId) => {
    if (!oficPodium.includes(driverId)) return false;
    const team = getTeam(driverId);
    return Boolean(team && !TOP_TEAMS.has(team));
  });
  applyBadge("contra_corriente", isContraCorriente);

  // -------------------------------------------------------------------------
  // 8. pleno_perfecto: Acertó P1, P2, P3, Pole, DriverOfDay, Constructor,
  //    DNFs y Colapinto.
  // -------------------------------------------------------------------------
  const isPlenoPerfecto = Boolean(
    u.p1 &&
      u.p2 &&
      u.p3 &&
      o.p1 &&
      o.p2 &&
      o.p3 &&
      u.p1 === o.p1 &&
      u.p2 === o.p2 &&
      u.p3 === o.p3 &&
      u.pole &&
      o.pole &&
      u.pole === o.pole &&
      u.piloto_del_dia &&
      o.piloto_del_dia &&
      u.piloto_del_dia === o.piloto_del_dia &&
      u.escuderia &&
      o.escuderia &&
      u.escuderia === o.escuderia &&
      u.dnf !== null &&
      o.dnf !== null &&
      u.dnf === o.dnf &&
      u.posicion_colapinto !== null &&
      o.posicion_colapinto !== null &&
      u.posicion_colapinto === o.posicion_colapinto
  );
  applyBadge("pleno_perfecto", isPlenoPerfecto);

  // -------------------------------------------------------------------------
  // 9. fidelidad_absoluta: Mismo piloto ganador en 3 carreras consecutivas (+1)
  // -------------------------------------------------------------------------
  const prevP1 = options?.previousPrediction
    ? extractPredictionData(options.previousPrediction).p1
    : null;
  const isFidelidadAbsoluta = Boolean(
    options?.isFidelidadStreak ||
      (prevP1 && u.p1 && u.p1 === prevP1)
  );
  applyBadge("fidelidad_absoluta", isFidelidadAbsoluta);

  // -------------------------------------------------------------------------
  // 10. monopolio: P1 y P2 de la predicción son de la misma escudería y
  //     acertó ambos.
  // -------------------------------------------------------------------------
  const teamP1 = getTeam(u.p1);
  const teamP2 = getTeam(u.p2);
  const isMonopolio = Boolean(
    u.p1 &&
      u.p2 &&
      o.p1 &&
      o.p2 &&
      u.p1 === o.p1 &&
      u.p2 === o.p2 &&
      u.p1 !== u.p2 &&
      teamP1 &&
      teamP2 &&
      teamP1 === teamP2
  );
  applyBadge("monopolio", isMonopolio);

  // -------------------------------------------------------------------------
  // 11. el_mufa: El piloto elegido como P1 en la predicción aparece en el
  //     arreglo de pilotos DNF oficiales.
  // -------------------------------------------------------------------------
  const isElMufa = Boolean(
    u.p1 && o.dnfDrivers.includes(u.p1)
  );
  applyBadge("el_mufa", isElMufa);

  // -------------------------------------------------------------------------
  // 12. voto_popular: Piloto del Día pero no quedó en podio P1-P3 (+1)
  // -------------------------------------------------------------------------
  const isVotoPopular = Boolean(
    u.piloto_del_dia &&
      o.piloto_del_dia &&
      u.piloto_del_dia === o.piloto_del_dia &&
      o.piloto_del_dia !== o.p1 &&
      o.piloto_del_dia !== o.p2 &&
      o.piloto_del_dia !== o.p3
  );
  applyBadge("voto_popular", isVotoPopular);

  // -------------------------------------------------------------------------
  // 13. carrera_limpia: prediction DNFs es 0 y official DNFs es 0.
  // -------------------------------------------------------------------------
  const isCarreraLimpia = Boolean(
    u.dnf === 0 && o.dnf === 0
  );
  applyBadge("carrera_limpia", isCarreraLimpia);

  // -------------------------------------------------------------------------
  // 14. caos_ordenado: Los pilotos elegidos en P1, P2 y P3 son los correctos
  //     (están en el podio oficial), pero en distinto orden.
  // -------------------------------------------------------------------------
  const predPodiumSet = new Set([u.p1, u.p2, u.p3].filter(Boolean));
  const oficPodiumSet = new Set([o.p1, o.p2, o.p3].filter(Boolean));
  const isSame3Drivers =
    predPodiumSet.size === 3 &&
    oficPodiumSet.size === 3 &&
    Array.from(predPodiumSet).every((d) => oficPodiumSet.has(d as string));
  const isExactOrder = Boolean(
    u.p1 === o.p1 && u.p2 === o.p2 && u.p3 === o.p3
  );
  const isCaosOrdenado = Boolean(isSame3Drivers && !isExactOrder);
  applyBadge("caos_ordenado", isCaosOrdenado);

  // -------------------------------------------------------------------------
  // 15. maestro_sprint: Si officialResults.isSprint es true, y acertó Pole,
  //     P1, P2 y P3 (ya sea en sesión principal o sprint).
  // -------------------------------------------------------------------------
  const isSprintMatchStandard = Boolean(
    u.pole &&
      o.pole &&
      u.pole === o.pole &&
      u.p1 &&
      o.p1 &&
      u.p1 === o.p1 &&
      u.p2 &&
      o.p2 &&
      u.p2 === o.p2 &&
      u.p3 &&
      o.p3 &&
      u.p3 === o.p3
  );
  const isSprintMatchSprintSession = Boolean(
    u.sprintPole &&
      o.sprintPole &&
      u.sprintPole === o.sprintPole &&
      u.sprintP1 &&
      o.sprintP1 &&
      u.sprintP1 === o.sprintP1 &&
      u.sprintP2 &&
      o.sprintP2 &&
      u.sprintP2 === o.sprintP2 &&
      u.sprintP3 &&
      o.sprintP3 &&
      u.sprintP3 === o.sprintP3
  );
  const isMaestroSprint = Boolean(
    o.isSprint && (isSprintMatchStandard || isSprintMatchSprintSession)
  );
  applyBadge("maestro_sprint", isMaestroSprint);

  // -------------------------------------------------------------------------
  // 16. vueltas_perfectas: Vuelta Perfecta (40 pts en Vuelta Rápida) (+1)
  // -------------------------------------------------------------------------
  if (options?.vueltaPerfectaEarned) {
    applyBadge("vueltas_perfectas", true);
  }

  return {
    detailed: {
      newProgress: updatedProgress,
      awardedBadges,
      evaluations,
    },
  };
}
