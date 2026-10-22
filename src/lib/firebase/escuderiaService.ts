import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { CarModelId, CarDesignId, CarColors } from "@/types/auth";

/**
 * Normaliza un nombre de escudería para usar como ID único en Firestore:
 * - Remueve acentos y diacríticos
 * - Convierte a minúsculas
 * - Reemplaza espacios y caracteres especiales por guiones bajos
 * - Remueve guiones bajos repetidos o en los extremos
 * Ejemplo: "  Scudería Ferrari GP !  " -> "scuderia_ferrari_gp"
 */
export function normalizeEscuderiaName(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Verifica si un nombre de escudería está disponible para ser registrado.
 */
export async function verificarDisponibilidadEscuderia(
  nombre: string,
  currentUserId?: string
): Promise<{ disponible: boolean; error?: string; normalizedId?: string }> {
  if (!db) {
    return { disponible: false, error: "Base de datos no inicializada" };
  }

  const cleanName = nombre.trim();
  if (cleanName.length < 3) {
    return {
      disponible: false,
      error: "El nombre debe tener al menos 3 caracteres.",
    };
  }
  if (cleanName.length > 30) {
    return {
      disponible: false,
      error: "El nombre no puede superar los 30 caracteres.",
    };
  }

  const normId = normalizeEscuderiaName(cleanName);
  if (!normId || normId.length < 2) {
    return {
      disponible: false,
      error: "El nombre contiene caracteres no permitidos.",
    };
  }

  try {
    const docRef = doc(db, "nombres_escuderias", normId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (currentUserId && data?.userId === currentUserId) {
        return { disponible: true, normalizedId: normId };
      }
      return {
        disponible: false,
        error: "El nombre de la escudería ya está en uso",
        normalizedId: normId,
      };
    }

    return { disponible: true, normalizedId: normId };
  } catch (err: any) {
    console.error("Error al verificar disponibilidad de escudería:", err);
    return {
      disponible: false,
      error: "Error al consultar disponibilidad.",
    };
  }
}

/**
 * Guarda y reserva atómicamente el nombre de escudería y la configuración visual del auto.
 * Si el usuario ya tenía un nombre registrado anteriormente, libera el documento anterior.
 */
export async function guardarEscuderiaYAuto(
  userId: string,
  data: {
    nombre_escuderia: string;
    modeloAuto: CarModelId;
    disenoAuto: CarDesignId;
    coloresAuto: CarColors;
  },
  oldNombreEscuderia?: string | null
): Promise<void> {
  if (!db) throw new Error("Base de datos no conectada");
  if (!userId) throw new Error("Usuario no autenticado");

  const cleanName = data.nombre_escuderia.trim();
  if (cleanName.length < 3) {
    throw new Error("El nombre de la escudería debe tener al menos 3 caracteres.");
  }
  if (cleanName.length > 30) {
    throw new Error("El nombre de la escudería no puede superar los 30 caracteres.");
  }

  const newNormId = normalizeEscuderiaName(cleanName);
  if (!newNormId || newNormId.length < 2) {
    throw new Error("El nombre de la escudería no es válido.");
  }

  const oldNormId = oldNombreEscuderia
    ? normalizeEscuderiaName(oldNombreEscuderia)
    : null;

  const newDocRef = doc(db, "nombres_escuderias", newNormId);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    // 1. Si el nombre cambió, chequear si el nuevo nombre está tomado
    if (newNormId !== oldNormId) {
      const targetSnap = await transaction.get(newDocRef);
      if (targetSnap.exists()) {
        const owner = targetSnap.data();
        if (owner?.userId !== userId) {
          throw new Error("El nombre de la escudería ya está en uso");
        }
      }

      // Reservar el nuevo nombre
      transaction.set(newDocRef, {
        userId,
        nombreOriginal: cleanName,
        createdAt: serverTimestamp(),
      });

      // Si tenía un nombre previo y es distinto, liberarlo
      if (oldNormId && oldNormId !== newNormId) {
        const oldDocRef = doc(db, "nombres_escuderias", oldNormId);
        transaction.delete(oldDocRef);
      }
    } else {
      // Mismo nombre normalizado: actualizar nombre original con mayúsculas/minúsculas
      transaction.set(
        newDocRef,
        {
          userId,
          nombreOriginal: cleanName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 2. Guardar en el perfil del usuario
    transaction.set(
      userRef,
      {
        nombre_escuderia: cleanName,
        modeloAuto: data.modeloAuto,
        disenoAuto: data.disenoAuto,
        coloresAuto: data.coloresAuto,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}
