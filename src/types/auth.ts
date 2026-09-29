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
  createdAt?: any;
  lastLoginAt?: any;
}
