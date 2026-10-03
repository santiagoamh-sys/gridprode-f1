import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./config";
import {
  Escuderia,
  Piloto,
  GrandPrix,
  Prediccion,
  RespuestasPrediccion,
  ResultadosOficiales,
} from "@/types/f1";
import { UserProfile } from "@/types/auth";
import {
  INITIAL_ESCUDERIAS,
  INITIAL_PILOTOS,
  INITIAL_GRAND_PRIX,
  CIRCUIT_IMAGES,
} from "@/data/f1InitialData";
import { calcularPuntajePrediccion } from "@/lib/scoringEngine";
import { DEFAULT_DRIVERS_STATS } from "@/services/driverStatsService";

/**
 * Popula Firestore con las 11 escuderías, 22 pilotos y el calendario oficial de carreras
 */
export async function seedFirestoreF1Data(): Promise<{
  escuderiasCount: number;
  pilotosCount: number;
  grandPrixCount: number;
}> {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica .env.local");
  }

  const batch = writeBatch(db);

  // 1. Escuderías
  INITIAL_ESCUDERIAS.forEach((escuderia) => {
    const ref = doc(db, "escuderias", escuderia.id);
    batch.set(ref, escuderia, { merge: true });
  });

  // 2. Pilotos
  INITIAL_PILOTOS.forEach((piloto) => {
    const ref = doc(db, "pilotos", piloto.id);
    batch.set(ref, piloto, { merge: true });
  });

  // 3. Grand Prix iniciales
  INITIAL_GRAND_PRIX.forEach((gp) => {
    const ref = doc(db, "grand_prix", gp.id);
    batch.set(ref, gp, { merge: true });
  });

  // 4. Estadísticas de pilotos (drivers_stats)
  Object.values(DEFAULT_DRIVERS_STATS).forEach((stats) => {
    const ref = doc(db, "drivers_stats", stats.driverId);
    batch.set(ref, stats, { merge: true });
  });

  await batch.commit();

  return {
    escuderiasCount: INITIAL_ESCUDERIAS.length,
    pilotosCount: INITIAL_PILOTOS.length,
    grandPrixCount: INITIAL_GRAND_PRIX.length,
  };
}

/**
 * Obtiene todas las escuderías (desde Firestore con fallback a constantes)
 */
export async function getEscuderias(): Promise<Escuderia[]> {
  if (!db) return INITIAL_ESCUDERIAS;
  try {
    const snapshot = await getDocs(collection(db, "escuderias"));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => d.data() as Escuderia);
    }
    return INITIAL_ESCUDERIAS;
  } catch (err) {
    console.warn("No se pudieron cargar escuderías desde Firestore, usando datos iniciales:", err);
    return INITIAL_ESCUDERIAS;
  }
}

/**
 * Obtiene todos los pilotos (desde Firestore con fallback a constantes).
 * Si algún registro en Firestore conserva una URL antigua de Wikipedia/Wikimedia,
 * se normaliza automáticamente al headshot oficial de formula1.com.
 */
export async function getPilotos(): Promise<Piloto[]> {
  if (!db) return INITIAL_PILOTOS;
  try {
    const snapshot = await getDocs(collection(db, "pilotos"));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => {
        const data = d.data() as Piloto;
        const initialDriver = INITIAL_PILOTOS.find((p) => p.id === data.id);
        if (
          initialDriver &&
          (!data.foto_url ||
            data.foto_url.includes("wikimedia.org") ||
            data.foto_url.includes("wikipedia.org"))
        ) {
          return {
            ...data,
            foto_url: initialDriver.foto_url,
          };
        }
        return data;
      });
    }
    return INITIAL_PILOTOS;
  } catch (err) {
    console.warn("No se pudieron cargar pilotos desde Firestore, usando datos iniciales:", err);
    return INITIAL_PILOTOS;
  }
}

/**
 * Obtiene la lista completa de Grand Prix combinando Firestore con el calendario inicial
 * para garantizar que el calendario desde Singapur esté siempre disponible.
 */
export async function getGrandPrixList(): Promise<GrandPrix[]> {
  if (!db) return INITIAL_GRAND_PRIX;
  try {
    const snapshot = await getDocs(collection(db, "grand_prix"));
    if (!snapshot.empty) {
      const firestoreMap = new Map<string, GrandPrix>();
      snapshot.docs.forEach((d) => {
        const gp = d.data() as GrandPrix;
        const id = gp.id || d.id;
        const circuito_img_url = CIRCUIT_IMAGES[id] || gp.circuito_img_url;
        firestoreMap.set(id, {
          ...gp,
          id,
          ...(circuito_img_url ? { circuito_img_url } : {}),
        });
      });

      // Combinar con INITIAL_GRAND_PRIX por si faltan las carreras desde Singapur en Firestore
      INITIAL_GRAND_PRIX.forEach((initialGp) => {
        if (!firestoreMap.has(initialGp.id)) {
          firestoreMap.set(initialGp.id, initialGp);
        }
      });

      return Array.from(firestoreMap.values()).sort(
        (a, b) =>
          new Date(a.qualyStartTime).getTime() -
          new Date(b.qualyStartTime).getTime()
      );
    }
    return INITIAL_GRAND_PRIX;
  } catch (err) {
    console.warn("No se pudieron cargar carreras desde Firestore, usando datos iniciales:", err);
    return INITIAL_GRAND_PRIX;
  }
}

/**
 * Guarda o actualiza la predicción de un usuario para un Grand Prix determinado
 */
export async function guardarPrediccion(
  usuarioId: string,
  grandPrixId: string,
  respuestas: RespuestasPrediccion
): Promise<Prediccion> {
  if (!db) {
    throw new Error("Firestore no disponible");
  }

  const id = `${usuarioId}_${grandPrixId}`;
  const prediccionRef = doc(db, "predicciones", id);
  const snap = await getDoc(prediccionRef);

  const prediccionData: Prediccion = {
    id,
    usuario_id: usuarioId,
    grand_prix_id: grandPrixId,
    respuestas,
    updatedAt: serverTimestamp(),
    ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(prediccionRef, prediccionData, { merge: true });
  return prediccionData;
}

/**
 * Obtiene la predicción de un usuario para un Grand Prix
 */
export async function getPrediccionUsuario(
  usuarioId: string,
  grandPrixId: string
): Promise<Prediccion | null> {
  if (!db) return null;
  try {
    const id = `${usuarioId}_${grandPrixId}`;
    const snap = await getDoc(doc(db, "predicciones", id));
    if (snap.exists()) {
      return snap.data() as Prediccion;
    }
    return null;
  } catch (err) {
    console.error("Error al obtener predicción:", err);
    return null;
  }
}

/**
 * Obtiene todas las predicciones guardadas por un usuario en Firestore
 */
export async function getPrediccionesPorUsuario(
  usuarioId: string
): Promise<Prediccion[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "predicciones"),
      where("usuario_id", "==", usuarioId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Prediccion);
  } catch (err) {
    console.error("Error al obtener predicciones del usuario:", err);
    return [];
  }
}

/**
 * Obtiene todas las predicciones de todos los usuarios (para Ranking y Admin)
 */
export async function getAllPredicciones(): Promise<Prediccion[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "predicciones"));
    return snap.docs.map((d) => d.data() as Prediccion);
  } catch (err) {
    console.error("Error al obtener todas las predicciones:", err);
    return [];
  }
}

/**
 * Obtiene todos los perfiles de usuario registrados para el Leaderboard / Ranking
 */
export async function getAllUsuariosRanking(): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    const users = snap.docs.map((d) => d.data() as UserProfile);
    return users.sort(
      (a, b) => (b.puntaje_global ?? 0) - (a.puntaje_global ?? 0)
    );
  } catch (err) {
    console.error("Error al obtener usuarios para el ranking:", err);
    return [];
  }
}

/**
 * Guarda los Resultados Oficiales de un Grand Prix y ejecuta el Motor de Puntajes:
 * 1. Actualiza `grand_prix/{grandPrixId}` con `resultados_oficiales` y `estado: "finalizado"`.
 * 2. Cruza los resultados con todas las predicciones de ese GP en `predicciones`.
 * 3. Actualiza `puntos_totales` y `desglose_puntos` en cada predicción evaluada.
 * 4. Recalcula y actualiza el `puntaje_global` de cada usuario en la colección `users`.
 */
export async function guardarResultadosYCalcularPuntajes(
  gp: GrandPrix,
  resultados: ResultadosOficiales
): Promise<{
  prediccionesEvaluadas: number;
  usuariosActualizados: number;
  resumenUsuarios: Array<{
    usuario_id: string;
    puntos_gp: number;
    nuevo_puntaje_global: number;
  }>;
}> {
  if (!db) {
    throw new Error("Firestore no está inicializado.");
  }

  // 1. Guardar resultados oficiales en el documento del GP
  const gpRef = doc(db, "grand_prix", gp.id);
  await setDoc(
    gpRef,
    {
      ...gp,
      estado: "finalizado",
      resultados_oficiales: resultados,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 2. Obtener todas las predicciones del sistema para calcular el GP actual y el acumulado global
  const allPredsSnap = await getDocs(collection(db, "predicciones"));
  const allPreds = allPredsSnap.docs.map((d) => d.data() as Prediccion);

  const batch = writeBatch(db);
  let prediccionesEvaluadas = 0;

  // Mapa de usuario_id -> suma total de puntos en todos los GPs
  const totalPorUsuario = new Map<string, number>();
  const puntosGpPorUsuario = new Map<string, number>();

  for (const pred of allPreds) {
    let puntosDeEstaPred = pred.puntos_totales ?? 0;

    if (pred.grand_prix_id === gp.id) {
      const calc = calcularPuntajePrediccion(
        pred.respuestas,
        resultados,
        gp.isSprint
      );
      puntosDeEstaPred = calc.puntos_totales;
      prediccionesEvaluadas += 1;
      puntosGpPorUsuario.set(pred.usuario_id, calc.puntos_totales);

      const predRef = doc(db, "predicciones", pred.id);
      batch.set(
        predRef,
        {
          puntos_totales: calc.puntos_totales,
          desglose_puntos: calc.desglose_puntos,
          calculadoAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const prevTotal = totalPorUsuario.get(pred.usuario_id) ?? 0;
    totalPorUsuario.set(pred.usuario_id, prevTotal + puntosDeEstaPred);
  }

  // 3. Actualizar puntaje_global de cada usuario en la colección `users`
  const resumenUsuarios: Array<{
    usuario_id: string;
    puntos_gp: number;
    nuevo_puntaje_global: number;
  }> = [];

  for (const [uid, nuevoTotal] of Array.from(totalPorUsuario.entries())) {
    const userRef = doc(db, "users", uid);
    batch.set(
      userRef,
      {
        puntaje_global: nuevoTotal,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    resumenUsuarios.push({
      usuario_id: uid,
      puntos_gp: puntosGpPorUsuario.get(uid) ?? 0,
      nuevo_puntaje_global: nuevoTotal,
    });
  }

  await batch.commit();

  return {
    prediccionesEvaluadas,
    usuariosActualizados: resumenUsuarios.length,
    resumenUsuarios,
  };
}

/**
 * Actualiza el piloto y la escudería favorita de un usuario en Firestore
 */
export async function actualizarFavoritosUsuario(
  uid: string,
  pilotoId: string | null,
  escuderiaId: string | null
): Promise<void> {
  if (!db) return;
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      piloto_favorito_id: pilotoId,
      escuderia_favorita_id: escuderiaId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Sube un headshot oficial (PNG transparente) a Firebase Storage en avatars_pilotos/{pilotoId}.png
 * y actualiza el campo foto_url en el documento del piloto en Firestore.
 */
export async function subirAvatarPiloto(
  pilotoId: string,
  imageBlobOrFile: Blob | Uint8Array,
  contentType = "image/png"
): Promise<string> {
  if (!storage || !db) {
    throw new Error("Firebase Storage o Firestore no están inicializados");
  }

  const avatarRef = storageRef(storage, `avatars_pilotos/${pilotoId}.png`);
  await uploadBytes(avatarRef, imageBlobOrFile, { contentType });
  const downloadUrl = await getDownloadURL(avatarRef);

  // Actualizar en Firestore
  const pilotoDocRef = doc(db, "pilotos", pilotoId);
  await setDoc(
    pilotoDocRef,
    {
      foto_url: downloadUrl,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return downloadUrl;
}
