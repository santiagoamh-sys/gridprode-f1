import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export interface SemaforoRecord {
  userId: string;
  nombre: string;
  tiempoMs: number;
  fecha: string;
  updatedAt?: any;
}

/**
 * Obtiene la lista ordenada del Leaderboard del Semáforo de Largada.
 * Ordena de menor a mayor tiempo de reacción en ms (el más rápido primero).
 */
export async function getSemaforoLeaderboard(
  maxResults: number = 10
): Promise<SemaforoRecord[]> {
  if (!db) return [];

  try {
    const colRef = collection(db, "leaderboard_semaforo");
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return [];
    }

    const records: SemaforoRecord[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const tiempoMs = Number(data.tiempoMs || data.tiempoReaccion || 0);

      // Descartar tiempos inválidos o penalizados
      if (tiempoMs > 0) {
        records.push({
          userId: data.userId || d.id,
          nombre: data.nombre || data.nombreUsuario || "Piloto F1",
          tiempoMs,
          fecha: data.fecha || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      }
    });

    // Ordenar de menor a mayor (el tiempo más bajo primero)
    records.sort((a, b) => a.tiempoMs - b.tiempoMs);

    return records.slice(0, maxResults);
  } catch (error) {
    console.error("Error al obtener el leaderboard del semáforo:", error);
    return [];
  }
}

/**
 * Obtiene el récord personal de un usuario en el Semáforo de Largada.
 */
export async function getUserSemaforoRecord(
  userId: string
): Promise<SemaforoRecord | null> {
  if (!db || !userId) return null;

  try {
    const docRef = doc(db, "leaderboard_semaforo", userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const tiempoMs = Number(data.tiempoMs || data.tiempoReaccion || 0);
      if (tiempoMs > 0) {
        return {
          userId: data.userId || userId,
          nombre: data.nombre || "Piloto F1",
          tiempoMs,
          fecha: data.fecha || new Date().toISOString(),
          updatedAt: data.updatedAt,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error al obtener el récord de semáforo del usuario:", error);
    return null;
  }
}

/**
 * Evalúa y registra el tiempo de reacción de un usuario en el Semáforo.
 * Descarta penalizaciones (<= 0 ms) y actualiza únicamente si es su primer intento
 * o si mejora su récord personal anterior.
 */
export async function recordReactionTime(
  userId: string,
  nombre: string,
  reactionMs: number
): Promise<{
  isNewPersonalBest: boolean;
  previousBestMs: number | null;
  record: SemaforoRecord;
}> {
  if (!db || !userId) {
    throw new Error("Base de datos o usuario no disponible.");
  }

  // Descartar penalizaciones (jump start / tiempo no válido)
  if (!reactionMs || reactionMs <= 0) {
    throw new Error("Tiempo de reacción inválido. No se registra en el ranking.");
  }

  const existingRecord = await getUserSemaforoRecord(userId);
  const previousBestMs = existingRecord ? existingRecord.tiempoMs : null;

  const isBetter = previousBestMs === null || reactionMs < previousBestMs;

  if (isBetter) {
    const newRecord: SemaforoRecord = {
      userId,
      nombre: nombre || existingRecord?.nombre || "Piloto F1",
      tiempoMs: reactionMs,
      fecha: new Date().toISOString(),
    };

    // 1. Guardar en la colección global de leaderboard
    const recordRef = doc(db, "leaderboard_semaforo", userId);
    await setDoc(
      recordRef,
      {
        ...newRecord,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Actualizar también en el perfil del usuario para coherencia
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          mejor_tiempo_semaforo: reactionMs,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (userUpdateErr) {
      console.warn("No se pudo actualizar mejor_tiempo_semaforo en users:", userUpdateErr);
    }

    return {
      isNewPersonalBest: true,
      previousBestMs,
      record: newRecord,
    };
  }

  return {
    isNewPersonalBest: false,
    previousBestMs,
    record: existingRecord!,
  };
}
