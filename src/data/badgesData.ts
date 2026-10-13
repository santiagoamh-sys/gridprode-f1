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
 * Catálogo con las 15 insignias oficiales de GridProde F1
 * con sistema progresivo de umbrales { bronce, plata, oro }
 * y descripciones exactas y literales del sistema de juego.
 */
export const BADGES_DATA: BadgeDefinition[] = [
  {
    id: "ojo_clinico",
    nombre: "Ojo Clínico",
    descripcion: "Acertar el podio exacto (P1, P2 y P3 en el orden correcto).",
    categoria: "Acierto",
    icono: "Crosshair",
    umbrales: { bronce: 1, plata: 5, oro: 12 },
  },
  {
    id: "el_estratega",
    nombre: "El Estratega",
    descripcion: "Acertar al Piloto del Día y a la escudería ganadora en el mismo fin de semana.",
    categoria: "Especial",
    icono: "Brain",
    umbrales: { bronce: 1, plata: 3, oro: 7 },
  },
  {
    id: "asistencia_perfecta",
    nombre: "Asistencia Perfecta",
    descripcion: "Cargar el pronóstico en 5 Grandes Premios consecutivos.",
    categoria: "Comunidad",
    icono: "CalendarCheck",
    umbrales: { bronce: 5, plata: 15, oro: 24 },
  },
  {
    id: "oraculo_del_caos",
    nombre: "Oráculo del Caos",
    descripcion: "Acertar la cantidad exacta de abandonos (DNFs) en la carrera.",
    categoria: "Carrera",
    icono: "Flame",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "rey_del_sabado",
    nombre: "Rey del Sábado",
    descripcion: "Acertar al ganador de la Pole Position en 3 clasificaciones consecutivas.",
    categoria: "Clasificación",
    icono: "Sparkles",
    umbrales: { bronce: 2, plata: 6, oro: 12 },
  },
  {
    id: "pulso_argento",
    nombre: "Pulso Argento",
    descripcion: "Acertar la posición final exacta de Franco Colapinto en la carrera.",
    categoria: "Especial",
    icono: "Flag",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "contra_la_corriente",
    nombre: "Contra la Corriente",
    descripcion: "Tener en tu podio a un piloto que no pertenezca a Red Bull, Mercedes, Ferrari ni McLaren, y que efectivamente suba al podio.",
    categoria: "Comunidad",
    icono: "TrendingUp",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "pleno_perfecto",
    nombre: "Pleno Perfecto",
    descripcion: "Acertar absolutamente todo en un solo fin de semana.",
    categoria: "Especial",
    icono: "Star",
    umbrales: { bronce: 1, plata: 2, oro: 4 },
  },
  {
    id: "fidelidad_absoluta",
    nombre: "Fidelidad Absoluta",
    descripcion: "Elegir al mismo piloto como ganador (P1) durante 3 carreras consecutivas.",
    categoria: "Comunidad",
    icono: "HeartHandshake",
    umbrales: { bronce: 3, plata: 8, oro: 16 },
  },
  {
    id: "monopolio",
    nombre: "Monopolio",
    descripcion: "Predecir un 1-2 exacto (P1 y P2) de los pilotos de una misma escudería y que efectivamente logren ese resultado.",
    categoria: "Carrera",
    icono: "Layers",
    umbrales: { bronce: 1, plata: 3, oro: 6 },
  },
  {
    id: "el_mufa",
    nombre: "El Mufa",
    descripcion: "Que el piloto al que elegiste para ganar la carrera (P1) termine abandonando (DNF).",
    categoria: "Especial",
    icono: "Skull",
    umbrales: { bronce: 1, plata: 3, oro: 5 },
  },
  {
    id: "voto_popular",
    nombre: "Voto Popular",
    descripcion: "Acertar al 'Piloto del Día', pero con la condición de que ese piloto no esté entre tus tres elegidos del podio.",
    categoria: "Comunidad",
    icono: "Users",
    umbrales: { bronce: 3, plata: 10, oro: 20 },
  },
  {
    id: "carrera_limpia",
    nombre: "Carrera Limpia",
    descripcion: "Apostar a que habrá exactamente '0' abandonos (DNFs) en toda la carrera y que efectivamente suceda.",
    categoria: "Carrera",
    icono: "ShieldCheck",
    umbrales: { bronce: 2, plata: 6, oro: 12 },
  },
  {
    id: "caos_ordenado",
    nombre: "Caos Ordenado",
    descripcion: "Elegir a los 3 pilotos correctos que subirán al podio, pero errar en el orden final.",
    categoria: "Carrera",
    icono: "Shuffle",
    umbrales: { bronce: 1, plata: 4, oro: 8 },
  },
  {
    id: "maestro_del_sprint",
    nombre: "Maestro del Sprint",
    descripcion: "Acertar la Pole Position y el podio exacto (P1, P2 y P3) en un fin de semana que incluya formato Sprint.",
    categoria: "Especial",
    icono: "Zap",
    umbrales: { bronce: 1, plata: 2, oro: 4 },
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
