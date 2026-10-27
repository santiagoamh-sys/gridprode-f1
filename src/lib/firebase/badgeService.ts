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

  // a) Recuperar las predicciones para esta carrera y todas las predicciones para historial
  const [predSnap, allPredSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "predicciones"),
        where("grand_prix_id", "==", grandPrixId)
      )
    ),
    getDocs(collection(db, "predicciones")),
  ]);

  if (predSnap.empty) {
    return {
      totalPredictions: 0,
      updatedUsersCount: 0,
      usersSummary: [],
    };
  }

  const predictions = predSnap.docs.map((d) => d.data() as Prediccion);

  // Mapear predicción más reciente por cada usuario_id único para este GP
  const predsByUserId = new Map<string, Prediccion>();
  for (const p of predictions) {
    if (p.usuario_id) {
      predsByUserId.set(p.usuario_id, p);
    }
  }

  // Historial de predicciones por usuario para evaluar rachas (ej. fidelidad_absoluta)
  const historyByUserId = new Map<string, Prediccion[]>();
  allPredSnap.docs.forEach((d) => {
    const data = d.data() as Prediccion;
    if (data.usuario_id) {
      const list = historyByUserId.get(data.usuario_id) || [];
      list.push(data);
      historyByUserId.set(data.usuario_id, list);
    }
  });

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

      const currentProgress: Record<string, number> = {
        ...(userData?.badges_progress || {}),
      };

      // Preservar vueltas_perfectas si ya existía en el perfil o en vueltasPerfectas
      if (typeof (userData as any)?.vueltasPerfectas === "number") {
        currentProgress.vueltas_perfectas = Math.max(
          currentProgress.vueltas_perfectas ?? 0,
          Number((userData as any).vueltasPerfectas)
        );
        currentProgress.vueltasperfectas = currentProgress.vueltas_perfectas;
      }

      // Evaluar si el usuario tiene racha de 3 GPs consecutivos con el mismo P1
      const userHistory = historyByUserId.get(userId) || [];
      userHistory.sort((a, b) => {
        const getTimestamp = (p: any) => {
          if (p?.createdAt?.toMillis) return p.createdAt.toMillis();
          if (p?.createdAt?.seconds) return p.createdAt.seconds * 1000;
          if (p?.createdAt) return new Date(p.createdAt).getTime();
          if (p?.created_at) return new Date(p.created_at).getTime();
          return 0;
        };
        return getTimestamp(a) - getTimestamp(b);
      });

      let isFidelidadStreak = false;
      let previousPrediction: Prediccion | null = null;
      if (userHistory.length >= 2) {
        previousPrediction = userHistory[userHistory.length - 2];
      }
      if (userHistory.length >= 3) {
        const last3 = userHistory.slice(-3);
        const p1_0 = (last3[0].respuestas?.p1 || (last3[0] as any).p1 || "").trim().toUpperCase();
        const p1_1 = (last3[1].respuestas?.p1 || (last3[1] as any).p1 || "").trim().toUpperCase();
        const p1_2 = (last3[2].respuestas?.p1 || (last3[2] as any).p1 || "").trim().toUpperCase();
        if (p1_0 && p1_0 === p1_1 && p1_1 === p1_2) {
          isFidelidadStreak = true;
        }
      }

      const { detailed } = evaluateRaceBadgesDetailed(
        officialResults,
        prediction.respuestas || prediction,
        currentProgress,
        {
          isFidelidadStreak,
          previousPrediction: previousPrediction
            ? previousPrediction.respuestas || previousPrediction
            : null,
        }
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
