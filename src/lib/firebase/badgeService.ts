import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Prediccion } from "@/types/f1";
import { UserProfile } from "@/types/auth";
import {
  evaluateRaceBadgesDetailed,
  OfficialRaceResults,
} from "@/utils/badgeEvaluator";

export interface UserBadgeAwardSummary {
  uid: string;
  nombre?: string | null;
  email?: string | null;
  awardedBadges: string[];
  newProgress: Record<string, number>;
}

export interface ProcessBadgesResult {
  totalPredictions: number;
  updatedUsersCount: number;
  usersSummary: UserBadgeAwardSummary[];
}

/**
 * Procesa las insignias de todos los usuarios que enviaron un pronóstico para una carrera determinada.
 * Utiliza writeBatch de Firestore para actualizar atómicamente todos los perfiles de usuario.
 *
 * @param grandPrixId ID del Gran Premio a evaluar
 * @param officialResults Resultados oficiales reales de la carrera
 * @returns Resumen con cantidad de pronósticos evaluados y usuarios actualizados
 */
export async function processRaceBadgesBatch(
  grandPrixId: string,
  officialResults: OfficialRaceResults
): Promise<ProcessBadgesResult> {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica tus credenciales.");
  }

  // a) Recuperar todas las predicciones de los usuarios para esa carrera
  const predQuery = query(
    collection(db, "predicciones"),
    where("grand_prix_id", "==", grandPrixId)
  );
  const predSnap = await getDocs(predQuery);

  if (predSnap.empty) {
    return {
      totalPredictions: 0,
      updatedUsersCount: 0,
      usersSummary: [],
    };
  }

  const predictions = predSnap.docs.map((d) => d.data() as Prediccion);

  // Mapear predicción más reciente por cada usuario_id único
  const predsByUserId = new Map<string, Prediccion>();
  for (const p of predictions) {
    if (p.usuario_id) {
      predsByUserId.set(p.usuario_id, p);
    }
  }

  const usersSummary: UserBadgeAwardSummary[] = [];

  // b) Recuperar el documento de cada usuario para obtener su badges_progress actual
  // y c) Pasar los datos por evaluateRaceBadges
  const userUpdates: Array<{
    uid: string;
    newProgress: Record<string, number>;
  }> = [];

  for (const [userId, prediction] of Array.from(predsByUserId.entries())) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists()
        ? (userSnap.data() as UserProfile)
        : null;

      const currentProgress = userData?.badges_progress || {};

      const { detailed } = evaluateRaceBadgesDetailed(
        officialResults,
        prediction.respuestas || prediction,
        currentProgress
      );

      userUpdates.push({
        uid: userId,
        newProgress: detailed.newProgress,
      });

      usersSummary.push({
        uid: userId,
        nombre: userData?.nombre || userData?.displayName || null,
        email: userData?.email || null,
        awardedBadges: detailed.awardedBadges,
        newProgress: detailed.newProgress,
      });
    } catch (userErr) {
      console.error(`Error al evaluar insignias para el usuario ${userId}:`, userErr);
    }
  }

  // d) Utilizar writeBatch de Firestore para actualizar todos los documentos simultáneamente
  // Firestore limita los lotes a 500 operaciones por batch, por lo que agrupamos en bloques de 400.
  const BATCH_CHUNK_SIZE = 400;
  for (let i = 0; i < userUpdates.length; i += BATCH_CHUNK_SIZE) {
    const chunk = userUpdates.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const update of chunk) {
      const userRef = doc(db, "users", update.uid);
      batch.set(
        userRef,
        {
          badges_progress: update.newProgress,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Opcionalmente registrar en el GP la última evaluación de insignias
    if (i === 0) {
      const gpRef = doc(db, "grand_prix", grandPrixId);
      batch.set(
        gpRef,
        {
          badges_evaluated_at: serverTimestamp(),
          badges_evaluated: true,
        },
        { merge: true }
      );
    }

    await batch.commit();
  }

  return {
    totalPredictions: predictions.length,
    updatedUsersCount: userUpdates.length,
    usersSummary,
  };
}
