import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./config";
import { UserProfile, UserRole } from "@/types/auth";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Verifica si un correo está configurado como Administrador inicial
 */
function isInitialAdmin(email: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Obtiene el perfil de usuario desde Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error al obtener perfil desde Firestore:", error);
    return null;
  }
}

/**
 * Sincroniza o crea el perfil en Firestore con rol 'Participante' o 'Administrador'
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  if (!db) {
    // Si no está inicializado Firestore, devolver un perfil provisional
    return {
      uid: user.uid,
      nombre: user.displayName || "Usuario",
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: isInitialAdmin(user.email) ? "Administrador" : "Participante",
      puntaje_global: 0,
      piloto_favorito_id: null,
      escuderia_favorita_id: null,
    };
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    // Si la lista de admin contiene su email pero aún figuraba como Participante, podemos ascenderlo
    let currentRole = data.role;
    if (currentRole !== "Administrador" && isInitialAdmin(user.email)) {
      currentRole = "Administrador";
    }

    // Actualizar última fecha de login y datos de perfil
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      nombre: user.displayName || data.nombre || "Usuario",
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: currentRole,
    });

    return {
      ...data,
      nombre: user.displayName || data.nombre || "Usuario",
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: currentRole,
      puntaje_global: data.puntaje_global ?? 0,
      piloto_favorito_id: data.piloto_favorito_id ?? null,
      escuderia_favorita_id: data.escuderia_favorita_id ?? null,
    };
  } else {
    // Nuevo usuario: asignar rol 'Administrador' si está en la lista admin, o 'Participante' por defecto
    const assignedRole: UserRole = isInitialAdmin(user.email)
      ? "Administrador"
      : "Participante";

    const newProfile: UserProfile = {
      uid: user.uid,
      nombre: user.displayName || "Usuario",
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: assignedRole,
      puntaje_global: 0,
      piloto_favorito_id: null,
      escuderia_favorita_id: null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

/**
 * Inicia sesión exclusivamente mediante Google Sign-In
 */
export async function signInWithGoogle(): Promise<{
  user: User;
  profile: UserProfile;
}> {
  if (!auth) {
    throw new Error(
      "Firebase no está inicializado. Por favor configura las variables en .env.local."
    );
  }

  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const profile = await syncUserProfile(user);

  return { user, profile };
}

/**
 * Cierra la sesión activa
 */
export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}
