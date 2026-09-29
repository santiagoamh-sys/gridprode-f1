import { INITIAL_PILOTOS, INITIAL_ESCUDERIAS } from "@/data/f1InitialData";
import { GrandPrix } from "@/types/f1";

const JOLPI_BASE_URL = "https://api.jolpi.ca/ergast/f1";

/**
 * Mapeo de nuestros IDs de GrandPrix al circuitId oficial de Ergast / Jolpi API
 */
const GP_TO_CIRCUIT_ID: Record<string, string> = {
  "gp-australia-2026": "albert_park",
  "gp-azerbaiyan-2026": "baku",
  "gp-singapur-2026": "marina_bay",
  "gp-usa-2026": "americas",
  "gp-mexico-2026": "rodriguez",
  "gp-brasil-2026": "interlagos",
  "gp-las-vegas-2026": "vegas",
  "gp-catar-2026": "losail",
  "gp-abu-dabi-2026": "yas_marina",
};

/**
 * Mapeo de driverId / code de Ergast/Jolpi/OpenF1 al ID de nuestro catálogo de 22 pilotos
 */
const API_DRIVER_TO_LOCAL_ID: Record<string, string> = {
  // Por driverId de Ergast/Jolpi
  max_verstappen: "VER",
  verstappen: "VER",
  hadjar: "HAD",
  isack_hadjar: "HAD",
  leclerc: "LEC",
  charles_leclerc: "LEC",
  hamilton: "HAM",
  lewis_hamilton: "HAM",
  norris: "NOR",
  lando_norris: "NOR",
  piastri: "PIA",
  oscar_piastri: "PIA",
  russell: "RUS",
  george_russell: "RUS",
  antonelli: "ANT",
  kimi_antonelli: "ANT",
  andrea_kimi_antonelli: "ANT",
  alonso: "ALO",
  fernando_alonso: "ALO",
  stroll: "STR",
  lance_stroll: "STR",
  albon: "ALB",
  alexander_albon: "ALB",
  sainz: "SAI",
  carlos_sainz: "SAI",
  colapinto: "COL",
  franco_colapinto: "COL",
  gasly: "GAS",
  pierre_gasly: "GAS",
  lawson: "LAW",
  liam_lawson: "LAW",
  arvid_lindblad: "LIN",
  lindblad: "LIN",
  ocon: "OCO",
  esteban_ocon: "OCO",
  bearman: "BEA",
  oliver_bearman: "BEA",
  hulkenberg: "HUL",
  nico_hulkenberg: "HUL",
  bortoleto: "BOR",
  gabriel_bortoleto: "BOR",
  bottas: "BOT",
  valtteri_bottas: "BOT",
  perez: "PER",
  sergio_perez: "PER",
};

/**
 * Mapeo de constructorId de Ergast/Jolpi al ID de nuestra colección de 11 escuderías
 */
const API_CONSTRUCTOR_TO_LOCAL_ID: Record<string, string> = {
  red_bull: "RBR",
  ferrari: "FER",
  mclaren: "MCL",
  mercedes: "MER",
  aston_martin: "AMR",
  williams: "WIL",
  alpine: "ALP",
  rb: "VCARB",
  alphatauri: "VCARB",
  haas: "HAA",
  audi: "AUD",
  sauber: "AUD",
  kick_sauber: "AUD",
  cadillac: "CAD",
};

const VALID_DRIVER_IDS = new Set(INITIAL_PILOTOS.map((p) => p.id));
const VALID_TEAM_IDS = new Set(INITIAL_ESCUDERIAS.map((e) => e.id));

/**
 * Normaliza un objeto Driver de la API al ID local (ej. "VER", "COL")
 */
export function mapApiDriverToLocalId(apiDriver: any): string | null {
  if (!apiDriver) return null;

  // 1. Por código de 3 letras (VER, COL, LEC, etc.)
  const code = String(apiDriver.code || apiDriver.name_acronym || "")
    .trim()
    .toUpperCase();
  if (code && VALID_DRIVER_IDS.has(code)) {
    return code;
  }

  // 2. Por driverId de Ergast/Jolpi
  const driverId = String(apiDriver.driverId || "")
    .trim()
    .toLowerCase();
  if (driverId && API_DRIVER_TO_LOCAL_ID[driverId]) {
    return API_DRIVER_TO_LOCAL_ID[driverId];
  }

  // 3. Por apellido
  const familyName = String(apiDriver.familyName || apiDriver.last_name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (familyName && API_DRIVER_TO_LOCAL_ID[familyName]) {
    return API_DRIVER_TO_LOCAL_ID[familyName];
  }

  return null;
}

/**
 * Normaliza un objeto Constructor de la API al ID local (ej. "RBR", "MER", "ALP")
 */
export function mapApiConstructorToLocalId(apiConstructor: any): string | null {
  if (!apiConstructor) return null;
  const cid = String(apiConstructor.constructorId || "")
    .trim()
    .toLowerCase();
  if (cid && API_CONSTRUCTOR_TO_LOCAL_ID[cid]) {
    return API_CONSTRUCTOR_TO_LOCAL_ID[cid];
  }
  const name = String(apiConstructor.name || "")
    .trim()
    .toLowerCase();
  for (const [key, val] of Object.entries(API_CONSTRUCTOR_TO_LOCAL_ID)) {
    if (name.includes(key.replace("_", " "))) {
      return val;
    }
  }
  return null;
}

/**
 * Determina si el estado de carrera de un piloto en Ergast/Jolpi corresponde a un abandono (DNF)
 */
function isResultDnf(resultItem: any): boolean {
  const posText = String(resultItem?.positionText || "")
    .trim()
    .toUpperCase();
  const status = String(resultItem?.status || "")
    .trim()
    .toLowerCase();

  // En Ergast/Jolpi, positionText === "R" indica Retired (DNF)
  if (posText === "R" || posText === "DNF") return true;

  // Si finalizó en la vuelta del líder o con vueltas perdidas (+1 Lap, Lapped, Finished), no es DNF
  if (
    status === "finished" ||
    status === "lapped" ||
    status.startsWith("+")
  ) {
    return false;
  }

  // Si no tiene posición numérica final o su estado es retiro mecánico/accidente
  return true;
}

export interface F1ApiSyncedResults {
  sourceLabel: string;
  sessionRaceName: string;
  sessionDate: string;
  isFallbackLatestSession: boolean;
  q1Eliminated: string[]; // 6 pilotos (posiciones 17 a 22 de Qualy)
  q2Eliminated: string[]; // 6 pilotos (posiciones 11 a 16 de Qualy)
  q3Grid: string[]; // 10 pilotos en orden (posiciones 1 Pole a 10 de Qualy)
  p1: string;
  p2: string;
  p3: string;
  dnfCount: number;
  escuderiaGanadora: string;
  posicionColapinto: number; // 1..22 o 0 si fue DNF
  colapintoFoundInApi: boolean;
  pilotoDelDiaSuggested: string; // Sugerido (ej. Vuelta Rápida o mayor remontada), editable manualmente
  sprintPole?: string;
  sprintP1?: string;
  sprintP2?: string;
  sprintP3?: string;
}

async function fetchJsonSafe(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Consulta la API pública de F1 (Jolpi / Ergast) para obtener los resultados oficiales
 * del Gran Premio seleccionado (o de la sesión más reciente disponible de la temporada 2026)
 * y los mapea a los 22 pilotos y 11 escuderías del sistema para pre-visualización en /admin.
 */
export async function fetchOfficialResultsFromF1Api(
  gp: GrandPrix
): Promise<F1ApiSyncedResults> {
  const circuitId = GP_TO_CIRCUIT_ID[gp.id] || "marina_bay";

  // 1. Intentar obtener la sesión 2026 específica del circuito seleccionado
  let qualyRaceObj: any = null;
  let raceObj: any = null;
  let sprintRaceObj: any = null;
  let isFallbackLatestSession = false;

  const [circuitQualyData, circuitRaceData] = await Promise.all([
    fetchJsonSafe(`${JOLPI_BASE_URL}/2026/circuits/${circuitId}/qualifying.json`),
    fetchJsonSafe(`${JOLPI_BASE_URL}/2026/circuits/${circuitId}/results.json`),
  ]);

  qualyRaceObj = circuitQualyData?.MRData?.RaceTable?.Races?.[0] || null;
  raceObj = circuitRaceData?.MRData?.RaceTable?.Races?.[0] || null;

  // 2. Si el GP seleccionado aún no se corrió en 2026, consultar la sesión más reciente de 2026 (current/last)
  if (!qualyRaceObj || !raceObj) {
    isFallbackLatestSession = true;
    const [latestQualyData, latestRaceData] = await Promise.all([
      fetchJsonSafe(`${JOLPI_BASE_URL}/current/last/qualifying.json`),
      fetchJsonSafe(`${JOLPI_BASE_URL}/current/last/results.json`),
    ]);

    if (!qualyRaceObj) {
      qualyRaceObj = latestQualyData?.MRData?.RaceTable?.Races?.[0] || null;
    }
    if (!raceObj) {
      raceObj = latestRaceData?.MRData?.RaceTable?.Races?.[0] || null;
    }
  }

  if (!qualyRaceObj && !raceObj) {
    throw new Error(
      "No fue posible conectar con la API pública de F1 (api.jolpi.ca). Verifica tu conexión a internet."
    );
  }

  // 3. Si el GP tiene formato Sprint, obtener los resultados Sprint del circuito o el Sprint más reciente de 2026
  if (gp.isSprint) {
    const circuitSprintData = await fetchJsonSafe(
      `${JOLPI_BASE_URL}/2026/circuits/${circuitId}/sprint.json`
    );
    sprintRaceObj = circuitSprintData?.MRData?.RaceTable?.Races?.[0] || null;

    if (!sprintRaceObj) {
      const seasonSprintsData = await fetchJsonSafe(
        `${JOLPI_BASE_URL}/2026/sprint.json?limit=100`
      );
      const allSprintRaces =
        seasonSprintsData?.MRData?.RaceTable?.Races || [];
      if (allSprintRaces.length > 0) {
        sprintRaceObj = allSprintRaces[allSprintRaces.length - 1];
      }
    }
  }

  // =========================================================================
  // MAPEO DE CLASIFICACIÓN: Q3 (Top 10), Q2 (11 al 16), Q1 (17 al 22)
  // =========================================================================
  const rawQualyList: any[] = qualyRaceObj?.QualifyingResults || [];
  const orderedQualyDrivers: string[] = [];
  const seenQualy = new Set<string>();

  // Ordenar por posición numérica ascendente
  const sortedQualy = [...rawQualyList].sort(
    (a, b) => Number(a.position || 99) - Number(b.position || 99)
  );

  for (const item of sortedQualy) {
    const localId = mapApiDriverToLocalId(item.Driver);
    if (localId && !seenQualy.has(localId)) {
      seenQualy.add(localId);
      orderedQualyDrivers.push(localId);
    }
  }

  // Si no hubo sesión de Qualifying separada, usar el atributo `grid` de la carrera
  if (orderedQualyDrivers.length === 0 && raceObj?.Results) {
    const byGrid = [...raceObj.Results].sort((a, b) => {
      const ga = Number(a.grid || 99);
      const gb = Number(b.grid || 99);
      return (ga === 0 ? 99 : ga) - (gb === 0 ? 99 : gb);
    });
    for (const item of byGrid) {
      const localId = mapApiDriverToLocalId(item.Driver);
      if (localId && !seenQualy.has(localId)) {
        seenQualy.add(localId);
        orderedQualyDrivers.push(localId);
      }
    }
  }

  // Garantizar que los 22 pilotos de nuestra parrilla estén presentes sin duplicados
  for (const p of INITIAL_PILOTOS) {
    if (!seenQualy.has(p.id)) {
      seenQualy.add(p.id);
      orderedQualyDrivers.push(p.id);
    }
  }

  // En formato de 22 autos:
  // - Posiciones 1 a 10 (índices 0..9): Top 10 Q3
  // - Posiciones 11 a 16 (índices 10..15): 6 eliminados en Q2
  // - Posiciones 17 a 22 (índices 16..21): 6 eliminados en Q1
  const q3Grid = orderedQualyDrivers.slice(0, 10);
  const q2Eliminated = orderedQualyDrivers.slice(10, 16);
  const q1Eliminated = orderedQualyDrivers.slice(16, 22);

  // =========================================================================
  // MAPEO DE CARRERA PRINCIPAL: PODIO (P1, P2, P3), DNF, ESCUDERÍA Y COLAPINTO
  // =========================================================================
  const rawRaceResults: any[] = raceObj?.Results || [];
  const sortedRace = [...rawRaceResults].sort(
    (a, b) => Number(a.position || 99) - Number(b.position || 99)
  );

  const orderedRaceDrivers: string[] = [];
  const seenRace = new Set<string>();
  let dnfCount = 0;
  let posicionColapinto = 10;
  let colapintoFoundInApi = false;
  let fastestLapDriverId: string | null = null;

  // Acumulador de puntos por escudería en la carrera para determinar la escudería ganadora
  const teamPointsMap = new Map<string, number>();

  for (const item of sortedRace) {
    const localId = mapApiDriverToLocalId(item.Driver);
    const teamId = mapApiConstructorToLocalId(item.Constructor);
    const pts = Number(item.points || 0);

    if (teamId && VALID_TEAM_IDS.has(teamId)) {
      teamPointsMap.set(teamId, (teamPointsMap.get(teamId) || 0) + pts);
    }

    const isDnf = isResultDnf(item);
    if (isDnf) {
      dnfCount += 1;
    }

    if (item?.FastestLap?.rank === "1" && localId) {
      fastestLapDriverId = localId;
    }

    if (localId === "COL") {
      colapintoFoundInApi = true;
      posicionColapinto = isDnf ? 0 : Number(item.position || 0);
    }

    if (localId && !seenRace.has(localId)) {
      seenRace.add(localId);
      orderedRaceDrivers.push(localId);
    }
  }

  // Asegurar al menos 3 pilotos para el podio
  for (const id of q3Grid) {
    if (!seenRace.has(id)) {
      seenRace.add(id);
      orderedRaceDrivers.push(id);
    }
  }

  const p1 = orderedRaceDrivers[0] || "VER";
  const p2 = orderedRaceDrivers[1] || "NOR";
  const p3 = orderedRaceDrivers[2] || "LEC";

  // Escudería ganadora: la del ganador P1 o la que más puntos sumó
  const p1Constructor = mapApiConstructorToLocalId(
    sortedRace[0]?.Constructor
  );
  let escuderiaGanadora = p1Constructor || "";
  if (!escuderiaGanadora && teamPointsMap.size > 0) {
    const sortedTeams = Array.from(teamPointsMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    escuderiaGanadora = sortedTeams[0][0];
  }
  if (!escuderiaGanadora) {
    const p1DriverObj = INITIAL_PILOTOS.find((d) => d.id === p1);
    escuderiaGanadora = p1DriverObj?.escuderia_id || "RBR";
  }

  // Sugerencia inicial para Piloto del Día (DOTD): quien hizo la Vuelta Rápida o ganó la carrera
  // (El administrador puede editarlo manualmente antes de guardar)
  const pilotoDelDiaSuggested = fastestLapDriverId || p1;

  // =========================================================================
  // MAPEO DE SPRINT (SI CORRESPONDE)
  // =========================================================================
  let sprintPole: string | undefined;
  let sprintP1: string | undefined;
  let sprintP2: string | undefined;
  let sprintP3: string | undefined;

  if (gp.isSprint) {
    const rawSprintResults: any[] = sprintRaceObj?.SprintResults || [];
    const sortedSprint = [...rawSprintResults].sort(
      (a, b) => Number(a.position || 99) - Number(b.position || 99)
    );

    const sprintDrivers: string[] = [];
    const seenSprint = new Set<string>();
    let detectedSprintPole: string | null = null;

    for (const item of sortedSprint) {
      const localId = mapApiDriverToLocalId(item.Driver);
      if (String(item.grid) === "1" && localId) {
        detectedSprintPole = localId;
      }
      if (localId && !seenSprint.has(localId)) {
        seenSprint.add(localId);
        sprintDrivers.push(localId);
      }
    }

    sprintP1 = sprintDrivers[0] || p1;
    sprintP2 = sprintDrivers[1] || p2;
    sprintP3 = sprintDrivers[2] || p3;
    sprintPole = detectedSprintPole || sprintP1;
  }

  const sessionRaceName =
    raceObj?.raceName || qualyRaceObj?.raceName || gp.nombre;
  const sessionSeason =
    raceObj?.season || qualyRaceObj?.season || "2026";
  const sessionDate = raceObj?.date || qualyRaceObj?.date || "";

  return {
    sourceLabel: "Jolpi / Ergast F1 Public API (api.jolpi.ca)",
    sessionRaceName: `${sessionSeason} ${sessionRaceName}`,
    sessionDate,
    isFallbackLatestSession,
    q1Eliminated,
    q2Eliminated,
    q3Grid,
    p1,
    p2,
    p3,
    dnfCount,
    escuderiaGanadora,
    posicionColapinto,
    colapintoFoundInApi,
    pilotoDelDiaSuggested,
    sprintPole,
    sprintP1,
    sprintP2,
    sprintP3,
  };
}
