import { Escuderia, Piloto, GrandPrix, ResultadosOficiales } from "@/types/f1";

export const INITIAL_ESCUDERIAS: Escuderia[] = [
  { id: "RBR", nombre: "Red Bull Racing", color_hex: "#3671C6" },
  { id: "FER", nombre: "Scuderia Ferrari", color_hex: "#E8002D" },
  { id: "MCL", nombre: "McLaren", color_hex: "#FF8000" },
  { id: "MER", nombre: "Mercedes Benz", color_hex: "#27F4D2" },
  { id: "AMR", nombre: "Aston Martin", color_hex: "#229971" },
  { id: "WIL", nombre: "Williams", color_hex: "#00A0DE" },
  { id: "ALP", nombre: "Alpine", color_hex: "#FF87BC" },
  { id: "VCARB", nombre: "Racing Bull", color_hex: "#6692FF" },
  { id: "HAA", nombre: "Haas", color_hex: "#B6BABD" },
  { id: "AUD", nombre: "Audi", color_hex: "#F50537" },
  { id: "CAD", nombre: "Cadillac", color_hex: "#D4A017" },
];

export const INITIAL_PILOTOS: Piloto[] = [
  { id: "VER", nombre: "Max Verstappen", escuderia_id: "RBR", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.png" },
  { id: "HAD", nombre: "Isack Hadjar", escuderia_id: "RBR", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.png" },
  { id: "LEC", nombre: "Charles Leclerc", escuderia_id: "FER", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.png" },
  { id: "HAM", nombre: "Lewis Hamilton", escuderia_id: "FER", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.png" },
  { id: "NOR", nombre: "Lando Norris", escuderia_id: "MCL", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.png" },
  { id: "PIA", nombre: "Oscar Piastri", escuderia_id: "MCL", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.png" },
  { id: "RUS", nombre: "George Russell", escuderia_id: "MER", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.png" },
  { id: "ANT", nombre: "Kimi Antonelli", escuderia_id: "MER", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.png" },
  { id: "ALO", nombre: "Fernando Alonso", escuderia_id: "AMR", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.png" },
  { id: "STR", nombre: "Lance Stroll", escuderia_id: "AMR", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.png" },
  { id: "ALB", nombre: "Alexander Albon", escuderia_id: "WIL", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/alealb01/2026williamsalealb01right.png" },
  { id: "SAI", nombre: "Carlos Sainz", escuderia_id: "WIL", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/carsai01/2026williamscarsai01right.png" },
  { id: "COL", nombre: "Franco Colapinto", escuderia_id: "ALP", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/fracol01/2026alpinefracol01right.png" },
  { id: "GAS", nombre: "Pierre Gasly", escuderia_id: "ALP", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.png" },
  { id: "LAW", nombre: "Liam Lawson", escuderia_id: "VCARB", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.png" },
  { id: "LIN", nombre: "Arvid Lindblad", escuderia_id: "VCARB", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.png" },
  { id: "OCO", nombre: "Esteban Ocon", escuderia_id: "HAA", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01right.png" },
  { id: "BEA", nombre: "Oliver Bearman", escuderia_id: "HAA", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01right.png" },
  { id: "HUL", nombre: "Nico Hülkenberg", escuderia_id: "AUD", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.png" },
  { id: "BOR", nombre: "Gabriel Bortoleto", escuderia_id: "AUD", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/gabbor01/2026audigabbor01right.png" },
  { id: "BOT", nombre: "Valtteri Bottas", escuderia_id: "CAD", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.png" },
  { id: "PER", nombre: "Checo Perez", escuderia_id: "CAD", foto_url: "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.png" },
];

const createEmptyResultados = (isSprint: boolean): ResultadosOficiales => ({
  q1: null,
  q2: null,
  q3: null,
  p1: null,
  p2: null,
  p3: null,
  dnf: null,
  vuelta_rapida: null,
  piloto_del_dia: null,
  escuderia: null,
  posicion_colapinto: null,
  ...(isSprint
    ? {
        sprintPole: null,
        sprintP1: null,
        sprintP2: null,
        sprintP3: null,
      }
    : {}),
});

// URLs oficiales de siluetas de circuitos (blancas, sin fondo, estilo contorno) alojadas en el CDN de formula1.com
export const CIRCUIT_IMAGES: Record<string, string> = {
  "gp-australia-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Australia.png",
  "gp-azerbaiyan-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Azerbaijan.png",
  "gp-singapur-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Singapore.png",
  "gp-usa-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/United%20States.png",
  "gp-mexico-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Mexico.png",
  "gp-brasil-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Brazil.png",
  "gp-las-vegas-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Las%20Vegas.png",
  "gp-catar-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Qatar.png",
  "gp-abu-dabi-2026":
    "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png",
};

export function getCircuitImageUrl(
  gp?: { id?: string; circuito_img_url?: string } | null
): string | undefined {
  if (!gp) return undefined;
  if (gp.id && CIRCUIT_IMAGES[gp.id]) return CIRCUIT_IMAGES[gp.id];
  if (gp.circuito_img_url) return gp.circuito_img_url;
  return undefined;
}

// Fecha de corte de inicio oficial para pronósticos: Gran Premio de Singapur
export const SINGAPORE_START_DATE = "2026-09-25T00:00:00Z";

export const INITIAL_GRAND_PRIX: GrandPrix[] = [
  // Grandes Premios previos a Singapur (se ocultan mediante el filtro de calendario y fecha del sistema)
  {
    id: "gp-australia-2026",
    nombre: "Gran Premio de Australia",
    circuito: "Albert Park Circuit, Melbourne",
    circuito_img_url: CIRCUIT_IMAGES["gp-australia-2026"],
    pais: "Australia",
    bandera: "🇦🇺",
    ronda: 1,
    estado: "finalizado",
    qualyStartTime: "2026-03-14T05:00:00Z",
    carreraStartTime: "2026-03-15T04:00:00Z",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(false),
  },
  {
    id: "gp-azerbaiyan-2026",
    nombre: "Gran Premio de Azerbaiyán",
    circuito: "Baku City Circuit",
    circuito_img_url: CIRCUIT_IMAGES["gp-azerbaiyan-2026"],
    pais: "Azerbaiyán",
    bandera: "🇦🇿",
    ronda: 17,
    estado: "finalizado",
    qualyStartTime: "2026-09-19T12:00:00Z",
    carreraStartTime: "2026-09-20T11:00:00Z",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(false),
  },

  // === CALENDARIO ACTIVO A PARTIR DEL GRAN PREMIO DE SINGAPUR ===
  {
    id: "gp-singapur-2026",
    nombre: "Gran Premio de Singapur",
    circuito: "Marina Bay Street Circuit",
    circuito_img_url: CIRCUIT_IMAGES["gp-singapur-2026"],
    pais: "Singapur",
    bandera: "🇸🇬",
    ronda: 18,
    estado: "proximo",
    qualyStartTime: "2026-10-09T09:30:00-03:00",
    carreraStartTime: "2026-10-11T09:00:00-03:00",
    isSprint: true,
    resultados_oficiales: createEmptyResultados(true),
  },
  {
    id: "gp-usa-2026",
    nombre: "Gran Premio de Estados Unidos",
    circuito: "Circuit of the Americas, Austin",
    circuito_img_url: CIRCUIT_IMAGES["gp-usa-2026"],
    pais: "Estados Unidos",
    bandera: "🇺🇸",
    ronda: 19,
    estado: "proximo",
    qualyStartTime: "2026-10-24T18:00:00-03:00",
    carreraStartTime: "2026-10-25T17:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(false),
  },
  {
    id: "gp-mexico-2026",
    nombre: "Gran Premio de la Ciudad de México",
    circuito: "Autódromo Hermanos Rodríguez",
    circuito_img_url: CIRCUIT_IMAGES["gp-mexico-2026"],
    pais: "México",
    bandera: "🇲🇽",
    ronda: 20,
    estado: "proximo",
    qualyStartTime: "2026-10-31T18:00:00-03:00",
    carreraStartTime: "2026-11-01T17:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(true),
  },
  {
    id: "gp-brasil-2026",
    nombre: "Gran Premio de São Paulo",
    circuito: "Autódromo José Carlos Pace, Interlagos",
    circuito_img_url: CIRCUIT_IMAGES["gp-brasil-2026"],
    pais: "Brasil",
    bandera: "🇧🇷",
    ronda: 21,
    estado: "proximo",
    qualyStartTime: "2026-11-07T15:00:00-03:00",
    carreraStartTime: "2026-11-08T14:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(true),
  },
  {
    id: "gp-las-vegas-2026",
    nombre: "Gran Premio de Las Vegas",
    circuito: "Las Vegas Strip Circuit",
    circuito_img_url: CIRCUIT_IMAGES["gp-las-vegas-2026"],
    pais: "Estados Unidos",
    bandera: "🇺🇸",
    ronda: 22,
    estado: "proximo",
    qualyStartTime: "2026-11-21T01:00:00-03:00",
    carreraStartTime: "2026-11-22T01:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(true),
  },
  {
    id: "gp-catar-2026",
    nombre: "Gran Premio de Catar",
    circuito: "Lusail International Circuit",
    circuito_img_url: CIRCUIT_IMAGES["gp-catar-2026"],
    pais: "Catar",
    bandera: "🇶🇦",
    ronda: 23,
    estado: "proximo",
    qualyStartTime: "2026-11-28T15:00:00-03:00",
    carreraStartTime: "2026-11-29T13:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(true),
  },
  {
    id: "gp-abu-dabi-2026",
    nombre: "Gran Premio de Abu Dabi",
    circuito: "Yas Marina Circuit",
    circuito_img_url: CIRCUIT_IMAGES["gp-abu-dabi-2026"],
    pais: "Emiratos Árabes Unidos",
    bandera: "🇦🇪",
    ronda: 24,
    estado: "proximo",
    qualyStartTime: "2026-12-05T11:00:00-03:00",
    carreraStartTime: "2026-12-06T10:00:00-03:00",
    isSprint: false,
    resultados_oficiales: createEmptyResultados(true),
  },
];

// Funciones de utilidad para búsqueda rápida
export function getPilotoById(id: string | null | undefined): Piloto | undefined {
  if (!id) return undefined;
  return INITIAL_PILOTOS.find((p) => p.id === id);
}

export function getEscuderiaById(id: string | null | undefined): Escuderia | undefined {
  if (!id) return undefined;
  return INITIAL_ESCUDERIAS.find((e) => e.id === id);
}

export function getPilotosByEscuderia(escuderiaId: string): Piloto[] {
  return INITIAL_PILOTOS.filter((p) => p.escuderia_id === escuderiaId);
}

export function getEscuderiaColor(escuderiaId: string | null | undefined): string {
  const escuderia = getEscuderiaById(escuderiaId);
  return escuderia ? escuderia.color_hex : "#6b7280";
}

export function getPilotoColor(pilotoId: string | null | undefined): string {
  const piloto = getPilotoById(pilotoId);
  if (!piloto) return "#6b7280";
  return getEscuderiaColor(piloto.escuderia_id);
}
