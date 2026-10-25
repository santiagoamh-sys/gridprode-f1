export type UserRole = "Participante" | "Administrador";

export type CarModelId =
  | "clasico_fangio"
  | "retro_senna"
  | "v10_schumacher"
  | "actual_2026";

export type CarDesignId =
  | "diseno_1"
  | "diseno_2"
  | "diseno_3"
  | "diseno_4";

export interface CarColors {
  colorPrincipal: string; // HEX ej. #E10600
  colorSecundario: string; // HEX ej. #15151E
  colorDetalle: string; // HEX ej. #FFFFFF
}

export const DEFAULT_CAR_CONFIG = {
  modeloAuto: "actual_2026" as CarModelId,
  disenoAuto: "diseno_1" as CarDesignId,
  coloresAuto: {
    colorPrincipal: "#E10600",
    colorSecundario: "#15151E",
    colorDetalle: "#FFFFFF",
  } as CarColors,
};

export interface UserProfile {
  uid: string;
  nombre: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  puntaje_global: number;
  piloto_favorito_id: string | null;
  escuderia_favorita_id: string | null;
  nombre_escuderia?: string | null;
  modeloAuto?: CarModelId | null;
  disenoAuto?: CarDesignId | null;
  coloresAuto?: CarColors | null;
  badges_progress?: Record<string, number>;
  vueltasPerfectas?: number;
  puntosTotales?: number;
  puntosBase?: number;
  puntos_base?: number;
  puntosHistoricos?: number;
  puntos_historicos?: number;
  puntos_totales?: number;
  puntaje_historico?: number;
  puntajeHistorico?: number;
  puntosPrevios?: number;
  puntos_previos?: number;
  puntos_pronosticos_gp?: number;
  createdAt?: any;
  lastLoginAt?: any;
  [key: string]: any;
}
