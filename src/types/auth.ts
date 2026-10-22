export type UserRole = "Participante" | "Administrador";

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
  createdAt?: any;
  lastLoginAt?: any;
  [key: string]: any;
}
