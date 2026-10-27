import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import {
  TriviaConfig,
  DEFAULT_MEXICO_TRIVIA,
  MEXICO_TRIVIA_QUESTIONS,
} from "@/data/triviaData";

/**
 * Obtiene la configuración de la trivia activa desde Firestore.
 * Si no existe en la base de datos, devuelve la configuración oficial de México por defecto.
 */
export async function getActiveTrivia(): Promise<TriviaConfig> {
  if (!db) return DEFAULT_MEXICO_TRIVIA;

  try {
    // 1. Intentar leer desde documento específico de México
    const mexicoDocRef = doc(db, "trivias", "mexico_2026");
    const snap = await getDoc(mexicoDocRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: data.id || "mexico_2026",
        grandPrixId: data.grandPrixId || "gp-mexico-2026",
        titulo: data.titulo || "Gran Premio de la Ciudad de México",
        circuito: data.circuito || "Autódromo Hermanos Rodríguez",
        estado: data.estado || "activa",
        totalPreguntas: data.totalPreguntas || MEXICO_TRIVIA_QUESTIONS.length,
        tiempoPorPreguntaMs: data.tiempoPorPreguntaMs || 15000,
        preguntas: (data.preguntas && data.preguntas.length > 0)
          ? data.preguntas
          : MEXICO_TRIVIA_QUESTIONS,
      };
    }

    // 2. Intentar leer desde documento global 'actual'
    const actualDocRef = doc(db, "trivias", "actual");
    const actualSnap = await getDoc(actualDocRef);
    if (actualSnap.exists()) {
      const data = actualSnap.data();
      return {
        id: data.id || "mexico_2026",
        grandPrixId: data.grandPrixId || "gp-mexico-2026",
        titulo: data.titulo || "Gran Premio de la Ciudad de México",
        circuito: data.circuito || "Autódromo Hermanos Rodríguez",
        estado: data.estado || "activa",
        totalPreguntas: data.totalPreguntas || MEXICO_TRIVIA_QUESTIONS.length,
        tiempoPorPreguntaMs: data.tiempoPorPreguntaMs || 15000,
        preguntas: (data.preguntas && data.preguntas.length > 0)
          ? data.preguntas
          : MEXICO_TRIVIA_QUESTIONS,
      };
    }

    return DEFAULT_MEXICO_TRIVIA;
  } catch (err) {
    console.warn("No se pudo obtener la trivia desde Firestore, usando predeterminada:", err);
    return DEFAULT_MEXICO_TRIVIA;
  }
}

/**
 * Resetea y activa la trivia semanal en Firebase para el GP de México.
 * Guarda las 5 preguntas oficiales, la respuesta correcta de cada una y establece el estado en 'activa'.
 * Opcionalmente borra participaciones previas si se solicita un reset total.
 */
export async function resetAndPublishTrivia(
  config?: Partial<TriviaConfig>,
  resetUserCompletions: boolean = false
): Promise<TriviaConfig> {
  if (!db) {
    throw new Error("Firestore no está disponible.");
  }

  const triviaPayload: TriviaConfig = {
    id: config?.id || "mexico_2026",
    grandPrixId: config?.grandPrixId || "gp-mexico-2026",
    titulo: config?.titulo || "Gran Premio de la Ciudad de México",
    circuito: config?.circuito || "Autódromo Hermanos Rodríguez",
    estado: "activa",
    totalPreguntas: config?.totalPreguntas || MEXICO_TRIVIA_QUESTIONS.length,
    tiempoPorPreguntaMs: config?.tiempoPorPreguntaMs || 15000,
    preguntas: config?.preguntas || MEXICO_TRIVIA_QUESTIONS,
  };

  // Guardar en 'trivias/mexico_2026'
  const mexicoRef = doc(db, "trivias", triviaPayload.id);
  await setDoc(
    mexicoRef,
    {
      ...triviaPayload,
      updatedAt: serverTimestamp(),
      activadaAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Guardar también en 'trivias/actual' para acceso canónico
  const actualRef = doc(db, "trivias", "actual");
  await setDoc(
    actualRef,
    {
      ...triviaPayload,
      updatedAt: serverTimestamp(),
      activadaAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Opcional: Si se solicita resetear participaciones de usuarios para este ID de trivia
  if (resetUserCompletions) {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of usersSnap.docs) {
        try {
          const userTriviaRef = doc(db, "users", uDoc.id, "trivias", triviaPayload.id);
          await deleteDoc(userTriviaRef);
        } catch {}
      }
    } catch (e) {
      console.warn("Advertencia al resetear subcolecciones de usuarios:", e);
    }
  }

  return triviaPayload;
}

/**
 * Verifica si un usuario ya jugó a la trivia especificada.
 */
export async function checkUserTriviaStatus(
  userId: string,
  triviaId: string
): Promise<{ hasPlayed: boolean; score: number | null }> {
  if (!db || !userId) return { hasPlayed: false, score: null };

  try {
    const triviaDocRef = doc(db, "users", userId, "trivias", triviaId);
    const snap = await getDoc(triviaDocRef);

    if (snap.exists()) {
      const data = snap.data();
      const score =
        typeof data.score === "number"
          ? data.score
          : typeof data.puntaje === "number"
          ? data.puntaje
          : 0;
      return { hasPlayed: true, score };
    }

    return { hasPlayed: false, score: null };
  } catch (err) {
    console.error("Error al verificar estado de trivia del usuario:", err);
    return { hasPlayed: false, score: null };
  }
}

/**
 * Guarda el resultado final de la trivia para un usuario en Firestore.
 */
export async function saveUserTriviaResult(
  userId: string,
  triviaId: string,
  score: number,
  totalQuestions: number,
  answersSummary?: any[]
): Promise<void> {
  if (!db || !userId) return;

  const userTriviaRef = doc(db, "users", userId, "trivias", triviaId);
  await setDoc(
    userTriviaRef,
    {
      triviaId,
      score,
      totalQuestions,
      answersSummary: answersSummary || [],
      fecha: new Date().toISOString(),
      completedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Registrar también en la subcolección de participantes de la trivia
  try {
    const partRef = doc(db, "trivias", triviaId, "participantes", userId);
    await setDoc(
      partRef,
      {
        userId,
        score,
        totalQuestions,
        completedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("No se pudo registrar en trivias/participantes:", err);
  }
}
