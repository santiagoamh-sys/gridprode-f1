export interface Escuderia {
  id: string;
  nombre: string;
  color_hex: string;
}

export interface Piloto {
  id: string;
  nombre: string;
  escuderia_id: string;
  foto_url?: string;
}

export interface ResultadosOficiales {
  // Q1: 6 pilotos eliminados (sin orden)
  q1: string[] | string | null;
  // Q2: 6 pilotos eliminados (sin orden)
  q2: string[] | string | null;
  // Q3: 10 pilotos ordenados del 1 (Pole Position) al 10
  q3: string[] | string | null;
  // Podio Carrera Principal
  p1: string | null;
  p2: string | null;
  p3: string | null;
  // Cantidad exacta de abandonos (DNF) en la carrera (0 a 22)
  dnf: number | string[] | string | null;
  vuelta_rapida?: string | null;
  piloto_del_dia: string | null;
  escuderia: string | null;
  // Posición final de Franco Colapinto (1 a 22, o 0 si es DNF)
  posicion_colapinto: number | null;

  // Campos exclusivos si el Grand Prix tiene formato Sprint (isSprint: true)
  sprintPole?: string | null;
  sprintP1?: string | null;
  sprintP2?: string | null;
  sprintP3?: string | null;
}

export type GrandPrixEstado = "proximo" | "en_curso" | "finalizado" | "cancelado";

export interface GrandPrix {
  id: string;
  nombre: string;
  circuito?: string;
  circuito_img_url?: string;
  pais?: string;
  bandera?: string;
  ronda?: number;
  estado: GrandPrixEstado;
  qualyStartTime: string; // ISO string
  carreraStartTime?: string;
  isSprint: boolean;
  resultados_oficiales: ResultadosOficiales;
  createdAt?: any;
  updatedAt?: any;
}

export interface RespuestasPrediccion {
  q1?: string[] | string | null;
  q2?: string[] | string | null;
  q3?: string[] | string | null;
  p1?: string | null;
  p2?: string | null;
  p3?: string | null;
  dnf?: number | string[] | string | null;
  vuelta_rapida?: string | null;
  piloto_del_dia?: string | null;
  escuderia?: string | null;
  posicion_colapinto?: number | null;

  // Si isSprint es true
  sprintPole?: string | null;
  sprintP1?: string | null;
  sprintP2?: string | null;
  sprintP3?: string | null;
}

export interface DesglosePuntos {
  q1: number;
  q2: number;
  q3_top10: number;
  q3_exactos: number;
  q3_pole_bonus: number;
  q3_total: number;
  carrera_p1: number;
  carrera_p2: number;
  carrera_p3: number;
  carrera_total: number;
  sprint_pole: number;
  sprint_p1: number;
  sprint_p2: number;
  sprint_p3: number;
  sprint_total: number;
  dnf: number;
  escuderia: number;
  piloto_del_dia: number;
  posicion_colapinto: number;
  especiales_total: number;
}

export interface Prediccion {
  id: string; // ${usuario_id}_${grand_prix_id}
  usuario_id: string;
  grand_prix_id: string;
  respuestas: RespuestasPrediccion;
  puntos_totales?: number;
  desglose_puntos?: DesglosePuntos | Record<string, number>;
  calculadoAt?: any;
  createdAt?: any;
  updatedAt?: any;
}
