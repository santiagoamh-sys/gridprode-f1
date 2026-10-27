export type BadgeTier = "bloqueado" | "bronce" | "plata" | "oro";

export interface BadgeThresholds {
  bronce: number;
  plata: number;
  oro: number;
}

export interface BadgeDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: "Acierto" | "Clasificación" | "Carrera" | "Comunidad" | "Especial";
  icono: string;
  umbrales: BadgeThresholds;
}

export interface BadgeProgressInfo {
  tier: BadgeTier;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  progressText: string;
  isLocked: boolean;
  color: string;
  glowColor: string;
  nextTierName: string;
}

/**
 * Catálogo con las 16 insignias oficiales de GridProde F1
 * con sistema progresivo de umbrales { bronce, plata, oro }
 * y descripciones exactas y literales del sistema de juego.
 */
export const BADGES_DATA: BadgeDefinition[] = [
  {
    id: "ojo_clinico",
    nombre: "Ojo Clínico",
    descripcion: "Acertar podio exacto P1, P2 y P3.",
    categoria: "Acierto",
    icono: "Crosshair",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "el_estratega",
    nombre: "El Estratega",
    descripcion: "Acertar Piloto del Día y Escudería Ganadora.",
    categoria: "Especial",
    icono: "Brain",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "asistencia_perfecta",
    nombre: "Asistencia Perfecta",
    descripcion: "Cargar pronóstico del GP.",
    categoria: "Comunidad",
    icono: "CalendarCheck",
    umbrales: { bronce: 5, plata: 15, oro: 24 },
  },
  {
    id: "oraculo_del_caos",
    nombre: "Oráculo del Caos",
    descripcion: "Acertar exactamente la cantidad de DNF.",
    categoria: "Carrera",
    icono: "Flame",
    umbrales: { bronce: 3, plata: 6, oro: 10 },
  },
  {
    id: "rey_del_sabado",
    nombre: "Rey del Sábado",
    descripcion: "Acertar la Pole Position.",
    categoria: "Clasificación",
    icono: "Sparkles",
    umbrales: { bronce: 3, plata: 8, oro: 15 },
  },
  {
    id: "pulso_argento",
    nombre: "Pulso Argento",
    descripcion: "Acertar la posición final exacta de Colapinto.",
    categoria: "Especial",
    icono: "Flag",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "contra_la_corriente",
    nombre: "Contra la Corriente",
    descripcion: "Acertar un podio que no sea Red Bull, Ferrari, McLaren o Mercedes.",
    categoria: "Comunidad",
    icono: "TrendingUp",
    umbrales: { bronce: 1, plata: 3, oro: 5 },
  },
  {
    id: "pleno_perfecto",
    nombre: "Pleno Perfecto",
    descripcion: "Acertar todos los puntos posibles en el fin de semana.",
    categoria: "Especial",
    icono: "Star",
    umbrales: { bronce: 1, plata: 2, oro: 3 },
  },
  {
    id: "fidelidad_absoluta",
    nombre: "Fidelidad Absoluta",
    descripcion: "Elegir al mismo piloto como ganador en 3 carreras consecutivas.",
    categoria: "Comunidad",
    icono: "HeartHandshake",
    umbrales: { bronce: 1, plata: 7, oro: 15 },
  },
  {
    id: "monopolio",
    nombre: "Monopolio",
    descripcion: "Acertar el 1-2 de la misma escudería.",
    categoria: "Carrera",
    icono: "Layers",
    umbrales: { bronce: 1, plata: 3, oro: 8 },
  },
  {
    id: "el_mufa",
    nombre: "El Mufa",
    descripcion: "Que el piloto elegido como ganador (P1) abandone.",
    categoria: "Especial",
    icono: "Skull",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "voto_popular",
    nombre: "Voto Popular",
    descripcion: "Acertar el Piloto del Día pero que este no haya quedado en el podio P1-P3.",
    categoria: "Comunidad",
    icono: "Users",
    umbrales: { bronce: 1, plata: 5, oro: 10 },
  },
  {
    id: "carrera_limpia",
    nombre: "Carrera Limpia",
    descripcion: "Acertar que hubo 0 DNF.",
    categoria: "Carrera",
    icono: "ShieldCheck",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "caos_ordenado",
    nombre: "Caos Ordenado",
    descripcion: "Acertar los 3 pilotos del podio en desorden.",
    categoria: "Carrera",
    icono: "Shuffle",
    umbrales: { bronce: 1, plata: 5, oro: 10 },
  },
  {
    id: "maestro_del_sprint",
    nombre: "Maestro del Sprint",
    descripcion: "En fines de semana de Sprint, acertar Pole, P1, P2 y P3.",
    categoria: "Especial",
    icono: "Zap",
    umbrales: { bronce: 1, plata: 3, oro: 5 },
  },
  {
    id: "vueltas_perfectas",
    nombre: "Vuelta Perfecta (40/40)",
    descripcion: "Lograr 40 puntos (8/8 Apex en violeta) en el minijuego de Vuelta Rápida.",
    categoria: "Especial",
    icono: "Sparkles",
    umbrales: { bronce: 1, plata: 3, oro: 5 },
  },
];

/**
 * Obtiene el valor numérico de progreso para una insignia desde badges_progress
 * con soporte para distintas variantes de claves (snake_case, camelCase, nombre).
 */
export function getBadgeProgressValue(
  badge: BadgeDefinition,
  badgesProgress?: Record<string, number> | null
): number {
  if (!badgesProgress) return 0;

  // Intenta por ID directo
  if (typeof badgesProgress[badge.id] === "number") {
    return badgesProgress[badge.id];
  }

  // Intenta por ID sin guiones bajos (camelCase / compacto)
  const compactId = badge.id.replace(/_/g, "");
  for (const [key, val] of Object.entries(badgesProgress)) {
    if (key.toLowerCase().replace(/[-_]/g, "") === compactId.toLowerCase()) {
      return Number(val) || 0;
    }
  }

  // Intenta por nombre
  if (typeof badgesProgress[badge.nombre] === "number") {
    return badgesProgress[badge.nombre];
  }

  return 0;
}

/**
 * Calcula el nivel alcanzado (bloqueado/bronce/plata/oro), textos y porcentajes
 * para una insignia en función del valor numérico del usuario.
 */
export function calculateBadgeProgress(
  badge: BadgeDefinition,
  rawValue: number
): BadgeProgressInfo {
  const value = Math.max(0, rawValue);
  const { bronce, plata, oro } = badge.umbrales;

  // 1. Bloqueado absoluto (valor 0)
  if (value === 0) {
    return {
      tier: "bloqueado",
      currentValue: 0,
      targetValue: bronce,
      progressPercent: 0,
      progressText: `0/${bronce} logrados para Bronce`,
      isLocked: true,
      color: "#6B7280", // gris
      glowColor: "rgba(107, 114, 128, 0.2)",
      nextTierName: "Bronce",
    };
  }

  // 2. En progreso hacia Bronce (0 < valor < bronce)
  if (value < bronce) {
    const percent = Math.min(99, Math.round((value / bronce) * 100));
    return {
      tier: "bloqueado",
      currentValue: value,
      targetValue: bronce,
      progressPercent: percent,
      progressText: `${value}/${bronce} logrados para Bronce`,
      isLocked: false,
      color: "#9CA3AF",
      glowColor: "rgba(156, 163, 175, 0.25)",
      nextTierName: "Bronce",
    };
  }

  // 3. Nivel Bronce alcanzado (#cd7f32), en camino hacia Plata
  if (value < plata) {
    const percent = Math.min(99, Math.round((value / plata) * 100));
    return {
      tier: "bronce",
      currentValue: value,
      targetValue: plata,
      progressPercent: percent,
      progressText: `${value}/${plata} logrados para Plata`,
      isLocked: false,
      color: "#cd7f32",
      glowColor: "rgba(205, 127, 50, 0.4)",
      nextTierName: "Plata",
    };
  }

  // 4. Nivel Plata alcanzado (#c0c0c0), en camino hacia Oro
  if (value < oro) {
    const percent = Math.min(99, Math.round((value / oro) * 100));
    return {
      tier: "plata",
      currentValue: value,
      targetValue: oro,
      progressPercent: percent,
      progressText: `${value}/${oro} logrados para Oro`,
      isLocked: false,
      color: "#c0c0c0",
      glowColor: "rgba(192, 192, 192, 0.4)",
      nextTierName: "Oro",
    };
  }

  // 5. Nivel Oro alcanzado (#ffd700) (Máximo nivel)
  return {
    tier: "oro",
    currentValue: value,
    targetValue: oro,
    progressPercent: 100,
    progressText: `${value}/${oro} logrados ¡Nivel Oro!`,
    isLocked: false,
    color: "#ffd700",
    glowColor: "rgba(255, 215, 0, 0.5)",
    nextTierName: "Oro",
  };
}
