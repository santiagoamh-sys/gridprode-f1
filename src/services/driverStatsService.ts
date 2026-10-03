import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { DriverStats } from "@/types/f1";

// Mapeo de banderas según país o nombre de circuito en la API oficial de la F1
const GP_FLAGS: Record<string, string> = {
  australian: "🇦🇺",
  australia: "🇦🇺",
  chinese: "🇨🇳",
  china: "🇨🇳",
  japanese: "🇯🇵",
  japan: "🇯🇵",
  bahrain: "🇧🇭",
  "saudi arabian": "🇸🇦",
  "saudi arabia": "🇸🇦",
  miami: "🇺🇸",
  "emilia romagna": "🇮🇹",
  monaco: "🇲🇨",
  canadian: "🇨🇦",
  canada: "🇨🇦",
  spanish: "🇪🇸",
  spain: "🇪🇸",
  austrian: "🇦🇹",
  austria: "🇦🇹",
  british: "🇬🇧",
  hungarian: "🇭🇺",
  hungary: "🇭🇺",
  belgian: "🇧🇪",
  belgium: "🇧🇪",
  dutch: "🇳🇱",
  netherlands: "🇳🇱",
  italian: "🇮🇹",
  italy: "🇮🇹",
  azerbaijan: "🇦🇿",
  singapore: "🇸🇬",
  "united states": "🇺🇸",
  mexican: "🇲🇽",
  mexico: "🇲🇽",
  brazilian: "🇧🇷",
  brazil: "🇧🇷",
  "las vegas": "🇺🇸",
  qatar: "🇶🇦",
  "abu dhabi": "🇦🇪",
};

function getGpFlag(raceName: string): string {
  const lower = (raceName || "").toLowerCase();
  for (const [key, flag] of Object.entries(GP_FLAGS)) {
    if (lower.includes(key)) return flag;
  }
  return "🏁";
}

function cleanGpName(raceName: string): string {
  return (raceName || "")
    .replace(/grand prix/i, "")
    .replace(/gp/i, "")
    .trim();
}

// Estadísticas base realistas y personalizadas para la colección 'drivers_stats'
export const DEFAULT_DRIVERS_STATS: Record<string, DriverStats> = {
  VER: {
    driverId: "VER",
    posicion_campeonato: 1,
    puntos_campeonato: 332,
    h2h_qualy: { victorias: 16, derrotas: 1, companero: "Isack Hadjar", companeroId: "HAD" },
    veces_q1: 0,
    veces_q2: 1,
    veces_q3: 16,
    poles_anio: 8,
    victorias_anio: 9,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 1 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 2 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 1 },
    ],
  },
  HAD: {
    driverId: "HAD",
    posicion_campeonato: 14,
    puntos_campeonato: 22,
    h2h_qualy: { victorias: 1, derrotas: 16, companero: "Max Verstappen", companeroId: "VER" },
    veces_q1: 4,
    veces_q2: 8,
    veces_q3: 5,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 3,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 11 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 9 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: "DNF" },
    ],
  },
  NOR: {
    driverId: "NOR",
    posicion_campeonato: 2,
    puntos_campeonato: 298,
    h2h_qualy: { victorias: 11, derrotas: 6, companero: "Oscar Piastri", companeroId: "PIA" },
    veces_q1: 0,
    veces_q2: 1,
    veces_q3: 16,
    poles_anio: 6,
    victorias_anio: 3,
    dnfs_anio: 0,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 2 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 1 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 2 },
    ],
  },
  PIA: {
    driverId: "PIA",
    posicion_campeonato: 4,
    puntos_campeonato: 245,
    h2h_qualy: { victorias: 6, derrotas: 11, companero: "Lando Norris", companeroId: "NOR" },
    veces_q1: 0,
    veces_q2: 3,
    veces_q3: 14,
    poles_anio: 1,
    victorias_anio: 2,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 3 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 4 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 3 },
    ],
  },
  LEC: {
    driverId: "LEC",
    posicion_campeonato: 3,
    puntos_campeonato: 260,
    h2h_qualy: { victorias: 12, derrotas: 5, companero: "Lewis Hamilton", companeroId: "HAM" },
    veces_q1: 0,
    veces_q2: 1,
    veces_q3: 16,
    poles_anio: 3,
    victorias_anio: 2,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 1 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 3 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 4 },
    ],
  },
  HAM: {
    driverId: "HAM",
    posicion_campeonato: 5,
    puntos_campeonato: 205,
    h2h_qualy: { victorias: 5, derrotas: 12, companero: "Charles Leclerc", companeroId: "LEC" },
    veces_q1: 1,
    veces_q2: 2,
    veces_q3: 14,
    poles_anio: 1,
    victorias_anio: 1,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 5 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 5 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 6 },
    ],
  },
  RUS: {
    driverId: "RUS",
    posicion_campeonato: 6,
    puntos_campeonato: 178,
    h2h_qualy: { victorias: 13, derrotas: 4, companero: "Kimi Antonelli", companeroId: "ANT" },
    veces_q1: 0,
    veces_q2: 2,
    veces_q3: 15,
    poles_anio: 1,
    victorias_anio: 1,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 4 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 6 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 5 },
    ],
  },
  ANT: {
    driverId: "ANT",
    posicion_campeonato: 9,
    puntos_campeonato: 64,
    h2h_qualy: { victorias: 4, derrotas: 13, companero: "George Russell", companeroId: "RUS" },
    veces_q1: 2,
    veces_q2: 6,
    veces_q3: 9,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 10 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 7 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 8 },
    ],
  },
  SAI: {
    driverId: "SAI",
    posicion_campeonato: 7,
    puntos_campeonato: 98,
    h2h_qualy: { victorias: 10, derrotas: 7, companero: "Alexander Albon", companeroId: "ALB" },
    veces_q1: 1,
    veces_q2: 4,
    veces_q3: 12,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 7 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 8 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 9 },
    ],
  },
  ALB: {
    driverId: "ALB",
    posicion_campeonato: 11,
    puntos_campeonato: 44,
    h2h_qualy: { victorias: 7, derrotas: 10, companero: "Carlos Sainz", companeroId: "SAI" },
    veces_q1: 3,
    veces_q2: 7,
    veces_q3: 7,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 8 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 10 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 12 },
    ],
  },
  ALO: {
    driverId: "ALO",
    posicion_campeonato: 8,
    puntos_campeonato: 86,
    h2h_qualy: { victorias: 14, derrotas: 3, companero: "Lance Stroll", companeroId: "STR" },
    veces_q1: 1,
    veces_q2: 5,
    veces_q3: 11,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 9 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 7 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 7 },
    ],
  },
  STR: {
    driverId: "STR",
    posicion_campeonato: 13,
    puntos_campeonato: 28,
    h2h_qualy: { victorias: 3, derrotas: 14, companero: "Fernando Alonso", companeroId: "ALO" },
    veces_q1: 6,
    veces_q2: 8,
    veces_q3: 3,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 12 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 12 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 11 },
    ],
  },
  COL: {
    driverId: "COL",
    posicion_campeonato: 10,
    puntos_campeonato: 52,
    h2h_qualy: { victorias: 10, derrotas: 7, companero: "Pierre Gasly", companeroId: "GAS" },
    veces_q1: 2,
    veces_q2: 6,
    veces_q3: 9,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 6 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 8 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 10 },
    ],
  },
  GAS: {
    driverId: "GAS",
    posicion_campeonato: 12,
    puntos_campeonato: 36,
    h2h_qualy: { victorias: 7, derrotas: 10, companero: "Franco Colapinto", companeroId: "COL" },
    veces_q1: 3,
    veces_q2: 8,
    veces_q3: 6,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 13 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 11 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 13 },
    ],
  },
  LAW: {
    driverId: "LAW",
    posicion_campeonato: 15,
    puntos_campeonato: 18,
    h2h_qualy: { victorias: 10, derrotas: 7, companero: "Arvid Lindblad", companeroId: "LIN" },
    veces_q1: 5,
    veces_q2: 9,
    veces_q3: 3,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 14 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 13 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: "DNF" },
    ],
  },
  LIN: {
    driverId: "LIN",
    posicion_campeonato: 18,
    puntos_campeonato: 6,
    h2h_qualy: { victorias: 7, derrotas: 10, companero: "Liam Lawson", companeroId: "LAW" },
    veces_q1: 8,
    veces_q2: 7,
    veces_q3: 2,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 3,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 15 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 15 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 14 },
    ],
  },
  OCO: {
    driverId: "OCO",
    posicion_campeonato: 16,
    puntos_campeonato: 16,
    h2h_qualy: { victorias: 9, derrotas: 8, companero: "Oliver Bearman", companeroId: "BEA" },
    veces_q1: 6,
    veces_q2: 8,
    veces_q3: 3,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 1,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 16 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 14 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 15 },
    ],
  },
  BEA: {
    driverId: "BEA",
    posicion_campeonato: 17,
    puntos_campeonato: 12,
    h2h_qualy: { victorias: 8, derrotas: 9, companero: "Esteban Ocon", companeroId: "OCO" },
    veces_q1: 7,
    veces_q2: 8,
    veces_q3: 2,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 17 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: "DNF" },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 16 },
    ],
  },
  HUL: {
    driverId: "HUL",
    posicion_campeonato: 19,
    puntos_campeonato: 4,
    h2h_qualy: { victorias: 11, derrotas: 6, companero: "Gabriel Bortoleto", companeroId: "BOR" },
    veces_q1: 9,
    veces_q2: 7,
    veces_q3: 1,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 18 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 16 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 17 },
    ],
  },
  BOR: {
    driverId: "BOR",
    posicion_campeonato: 20,
    puntos_campeonato: 2,
    h2h_qualy: { victorias: 6, derrotas: 11, companero: "Nico Hülkenberg", companeroId: "HUL" },
    veces_q1: 10,
    veces_q2: 6,
    veces_q3: 1,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 3,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 19 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 17 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 18 },
    ],
  },
  BOT: {
    driverId: "BOT",
    posicion_campeonato: 21,
    puntos_campeonato: 1,
    h2h_qualy: { victorias: 9, derrotas: 8, companero: "Checo Perez", companeroId: "PER" },
    veces_q1: 11,
    veces_q2: 5,
    veces_q3: 1,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 3,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: 20 },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 18 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 19 },
    ],
  },
  PER: {
    driverId: "PER",
    posicion_campeonato: 22,
    puntos_campeonato: 1,
    h2h_qualy: { victorias: 8, derrotas: 9, companero: "Valtteri Bottas", companeroId: "BOT" },
    veces_q1: 11,
    veces_q2: 5,
    veces_q3: 1,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 2,
    ultimas_carreras: [
      { gpNombre: "Italia", gpBandera: "🇮🇹", posicion: "DNF" },
      { gpNombre: "Azerbaiyán", gpBandera: "🇦🇿", posicion: 19 },
      { gpNombre: "Singapur", gpBandera: "🇸🇬", posicion: 20 },
    ],
  },
};

/**
 * Obtiene las estadísticas de respaldo predeterminadas para un piloto
 */
export function getDefaultDriverStats(driverId: string): DriverStats {
  if (DEFAULT_DRIVERS_STATS[driverId]) {
    return { ...DEFAULT_DRIVERS_STATS[driverId] };
  }
  return {
    driverId,
    posicion_campeonato: 0,
    puntos_campeonato: 0,
    h2h_qualy: { victorias: 0, derrotas: 0, companero: "Compañero", companeroId: "COMP" },
    veces_q1: 0,
    veces_q2: 0,
    veces_q3: 0,
    poles_anio: 0,
    victorias_anio: 0,
    dnfs_anio: 0,
    ultimas_carreras: [],
  };
}

// Caché en memoria para evitar llamadas redundantes a la API pública
let standingsCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Consulta la API pública gratuita (Jolpica / Ergast F1 compatible)
 * para obtener datos generales: Posición en campeonato, Puntos y Resultados recientes.
 */
async function fetchApiGeneralStats(
  driverId: string
): Promise<Partial<DriverStats> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const now = Date.now();
    let driverStandings: any[] = [];

    if (standingsCache && now - standingsCache.timestamp < CACHE_TTL_MS) {
      driverStandings = standingsCache.data;
    } else {
      const response = await fetch(
        "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en driverStandings API`);
      }

      const json = await response.json();
      const list =
        json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
      driverStandings = list;
      standingsCache = { data: list, timestamp: now };
    }

    clearTimeout(timeoutId);

    // Buscar al piloto en el listado oficial por código (ej: VER, COL)
    const upperId = driverId.toUpperCase();
    const entry = driverStandings.find(
      (s: any) =>
        s.Driver?.code?.toUpperCase() === upperId ||
        s.Driver?.driverId?.toUpperCase().includes(upperId)
    );

    if (!entry) {
      return null;
    }

    const pos = parseInt(entry.position, 10);
    const pts = parseFloat(entry.points);
    const wins = parseInt(entry.wins || "0", 10);

    // Intentar obtener resultados recientes de este piloto desde la API
    let ultimas_carreras: DriverStats["ultimas_carreras"] | undefined = undefined;

    try {
      const resController = new AbortController();
      const resTimeout = setTimeout(() => resController.abort(), 2500);

      // Usar driverId normalizado de Jolpica (ej: "max_verstappen", "colapinto")
      const apiSlug = entry.Driver?.driverId || driverId.toLowerCase();
      const resultsRes = await fetch(
        `https://api.jolpi.ca/ergast/f1/current/drivers/${apiSlug}/results.json`,
        { signal: resController.signal }
      );
      clearTimeout(resTimeout);

      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        const races = resultsJson?.MRData?.RaceTable?.Races || [];
        if (Array.isArray(races) && races.length > 0) {
          // Tomar las últimas 3 carreras
          const lastRaces = races.slice(-3);
          ultimas_carreras = lastRaces.map((r: any) => {
            const rawResult = r.Results?.[0];
            const posText = rawResult?.positionText || "";
            const isDnf =
              posText === "R" ||
              rawResult?.status?.toLowerCase().includes("retired") ||
              rawResult?.status?.toLowerCase().includes("collision");

            const finalPos: number | "DNF" = isDnf
              ? "DNF"
              : parseInt(rawResult?.position, 10) || "DNF";

            return {
              gpNombre: cleanGpName(r.raceName),
              gpBandera: getGpFlag(r.raceName),
              posicion: finalPos,
            };
          });
        }
      }
    } catch (raceErr) {
      // Si falla la consulta de carreras recientes, continuamos con los puntos y posición
      console.warn("No se pudieron cargar resultados recientes desde la API:", raceErr);
    }

    return {
      posicion_campeonato: !isNaN(pos) ? pos : undefined,
      puntos_campeonato: !isNaN(pts) ? pts : undefined,
      victorias_anio: !isNaN(wins) ? wins : undefined,
      ...(ultimas_carreras && ultimas_carreras.length > 0 ? { ultimas_carreras } : {}),
    };
  } catch (error) {
    console.warn(`[DriverStats API] Falló llamada a API pública para ${driverId}:`, error);
    return null;
  }
}

/**
 * Consulta Firestore en la colección 'drivers_stats' para el documento driverId
 */
async function fetchFirestoreDriverStats(driverId: string): Promise<DriverStats | null> {
  try {
    if (!db) {
      console.warn("[DriverStats Firestore] db no inicializado, usando default");
      return getDefaultDriverStats(driverId);
    }

    const docRef = doc(db, "drivers_stats", driverId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        driverId,
        posicion_campeonato: data.posicion_campeonato ?? 0,
        puntos_campeonato: data.puntos_campeonato ?? 0,
        h2h_qualy: data.h2h_qualy || { victorias: 0, derrotas: 0, companero: "Compañero", companeroId: "COMP" },
        veces_q1: data.veces_q1 ?? 0,
        veces_q2: data.veces_q2 ?? 0,
        veces_q3: data.veces_q3 ?? 0,
        poles_anio: data.poles_anio ?? 0,
        victorias_anio: data.victorias_anio ?? 0,
        dnfs_anio: data.dnfs_anio ?? 0,
        ultimas_carreras: Array.isArray(data.ultimas_carreras) ? data.ultimas_carreras : [],
      };
    }

    // Si el documento aún no existe en Firestore, lo persistimos de fondo con los valores base
    const defaultData = getDefaultDriverStats(driverId);
    try {
      setDoc(docRef, defaultData, { merge: true }).catch(() => {});
    } catch {
      // Ignorar fallo de escritura si no hay permisos de admin
    }

    return defaultData;
  } catch (error) {
    console.warn(`[DriverStats Firestore] Error al consultar drivers_stats/${driverId}:`, error);
    return null;
  }
}

/**
 * Función principal con sistema robusto de fallback combinando API pública y Firestore:
 * 1. Consulta en paralelo la API pública gratuita y Firebase Firestore.
 * 2. Utiliza Firebase como fuente EXCLUSIVA para estadísticas personalizadas (H2H, veces en Q1/Q2/Q3, poles, dnfs).
 * 3. Utiliza Firebase como RESPALDO (fallback) para los puntos, posición y carreras si la API falla.
 * 4. Envuelto en try/catch para que si ambas fallan, devuelva valores por defecto sin romper la app.
 */
export async function fetchDriverStats(driverId: string): Promise<DriverStats> {
  try {
    // Latencia mínima de 1 segundo para mostrar el spinner según requisito técnico
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 1000));

    // Consultas paralelas a la API pública y a Firebase Firestore
    const [apiResult, firestoreResult] = await Promise.allSettled([
      fetchApiGeneralStats(driverId),
      fetchFirestoreDriverStats(driverId),
      delayPromise,
    ]);

    const apiStats = apiResult.status === "fulfilled" ? apiResult.value : null;
    const firestoreStats =
      firestoreResult.status === "fulfilled" && firestoreResult.value
        ? firestoreResult.value
        : getDefaultDriverStats(driverId);

    // ========================================================
    // LÓGICA DE FUSIÓN (MERGE) EXIGIDA POR LA ESPECIFICACIÓN:
    // ========================================================

    // 1. Estadísticas personalizadas: FUENTE EXCLUSIVA FIREBASE
    const h2h_qualy = firestoreStats.h2h_qualy || {
      victorias: 0,
      derrotas: 0,
      companero: "Compañero",
      companeroId: "COMP",
    };
    const veces_q1 = firestoreStats.veces_q1 ?? 0;
    const veces_q2 = firestoreStats.veces_q2 ?? 0;
    const veces_q3 = firestoreStats.veces_q3 ?? 0;
    const poles_anio = firestoreStats.poles_anio ?? 0;
    const dnfs_anio = firestoreStats.dnfs_anio ?? 0;

    // 2. Estadísticas generales: API como fuente primaria, FIREBASE como respaldo
    const posicion_campeonato =
      apiStats?.posicion_campeonato !== undefined
        ? apiStats.posicion_campeonato
        : firestoreStats.posicion_campeonato;

    const puntos_campeonato =
      apiStats?.puntos_campeonato !== undefined
        ? apiStats.puntos_campeonato
        : firestoreStats.puntos_campeonato;

    const victorias_anio =
      apiStats?.victorias_anio !== undefined
        ? apiStats.victorias_anio
        : firestoreStats.victorias_anio;

    const ultimas_carreras =
      apiStats?.ultimas_carreras && apiStats.ultimas_carreras.length > 0
        ? apiStats.ultimas_carreras
        : firestoreStats.ultimas_carreras || [];

    return {
      driverId,
      posicion_campeonato,
      puntos_campeonato,
      h2h_qualy,
      veces_q1,
      veces_q2,
      veces_q3,
      poles_anio,
      victorias_anio,
      dnfs_anio,
      ultimas_carreras,
    };
  } catch (error) {
    console.error(`[fetchDriverStats] Error crítico en obtención de datos para ${driverId}:`, error);
    // Si ambas fuentes fallan, devolver valores por defecto seguros sin romper la interfaz
    return getDefaultDriverStats(driverId);
  }
}
