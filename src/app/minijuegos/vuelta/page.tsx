"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import {
  ArrowLeft,
  Flag,
  Flame,
  Gamepad2,
  Gauge,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

const LAP_DURATION_MS = 15000; // 15 segundos exactos para completar la vuelta
const MAX_DAILY_ATTEMPTS = 3;
const MAX_POSSIBLE_POINTS = 40; // 8 curvas * 5 pts

/**
 * Trazado SVG cerrado (viewBox="0 0 800 500") que representa el Circuito de las Américas (Austin - COTA).
 * Comienza en la recta principal (230, 410), sube hacia la Curva 1 (95, 220),
 * enlaza las Esses (Curvas 3-9), llega a la horquilla de la Curva 11 (705, 105),
 * recorre la larga recta opuesta hasta la Curva 12 (415, 245), atraviesa el Estadio (Curva 15),
 * rodea la triple derecha (Curvas 16-18) y cierra en la Curva 20 (380, 455) hacia la meta.
 */
const COTA_TRACK_PATH =
  "M 230 410 " +
  "L 95 220 " +
  "C 82 198, 112 182, 145 190 " +
  "C 185 200, 215 135, 255 145 " +
  "C 300 156, 335 195, 380 165 " +
  "C 415 142, 425 110, 455 115 " +
  "C 510 124, 610 92, 705 105 " +
  "C 732 109, 730 135, 695 148 " +
  "L 415 245 " +
  "C 382 256, 365 215, 325 225 " +
  "C 285 235, 248 282, 275 305 " +
  "C 305 330, 360 285, 420 275 " +
  "C 485 265, 535 305, 515 345 " +
  "C 495 385, 440 365, 415 390 " +
  "C 392 412, 405 448, 380 455 " +
  "C 340 465, 275 435, 230 410 Z";

export type HitTier = "violeta" | "verde" | "amarillo" | "rojo";

export interface ApexDefinition {
  id: number; // 1..8
  name: string;
  anchorX: number;
  anchorY: number;
  labelOffsetX: number;
  labelOffsetY: number;
  defaultIdealTimeMs: number;
}

export interface ComputedApex extends ApexDefinition {
  x: number;
  y: number;
  idealTimeMs: number;
  progress: number;
}

/**
 * Los 8 indicadores de APEX obligatorios sobre el trazado de Austin.
 * Sus coordenadas y tiempos ideales exactos se sincronizan con getPointAtLength()
 * al montar el SVG para garantizar precisión milimétrica.
 */
const INITIAL_APEX_DEFINITIONS: ApexDefinition[] = [
  {
    id: 1,
    name: "Curva 1 (Subida)",
    anchorX: 95,
    anchorY: 220,
    labelOffsetX: -42,
    labelOffsetY: -18,
    defaultIdealTimeMs: 1680,
  },
  {
    id: 2,
    name: "Las Esses",
    anchorX: 255,
    anchorY: 145,
    labelOffsetX: 0,
    labelOffsetY: -22,
    defaultIdealTimeMs: 3250,
  },
  {
    id: 3,
    name: "Sector Técnico",
    anchorX: 455,
    anchorY: 115,
    labelOffsetX: 0,
    labelOffsetY: -22,
    defaultIdealTimeMs: 5050,
  },
  {
    id: 4,
    name: "Horquilla C11",
    anchorX: 705,
    anchorY: 105,
    labelOffsetX: 12,
    labelOffsetY: -22,
    defaultIdealTimeMs: 6950,
  },
  {
    id: 5,
    name: "Frenada C12",
    anchorX: 415,
    anchorY: 245,
    labelOffsetX: 38,
    labelOffsetY: 22,
    defaultIdealTimeMs: 9450,
  },
  {
    id: 6,
    name: "Estadio C15",
    anchorX: 275,
    anchorY: 305,
    labelOffsetX: -44,
    labelOffsetY: 16,
    defaultIdealTimeMs: 11100,
  },
  {
    id: 7,
    name: "Triple Derecha",
    anchorX: 515,
    anchorY: 345,
    labelOffsetX: 46,
    labelOffsetY: 6,
    defaultIdealTimeMs: 12800,
  },
  {
    id: 8,
    name: "Curva 20",
    anchorX: 380,
    anchorY: 455,
    labelOffsetX: 10,
    labelOffsetY: 26,
    defaultIdealTimeMs: 14050,
  },
];

interface FloatingFeedback {
  key: string;
  apexId: number;
  x: number;
  y: number;
  text: string;
  subtext: string;
  tier: HitTier;
}

interface LeaderboardEntry {
  userId: string;
  nombre: string;
  puntaje: number;
  fecha?: string;
}

/**
 * Devuelve la fecha local en formato YYYY-MM-DD
 */
function getLocalDateFormatted(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Devuelve el identificador único de la semana actual (basado en el lunes de esa semana)
 */
function getCurrentWeekId(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");
  return `semana_${year}_${month}_${dayStr}`;
}

export default function VueltaRapidaPage() {
  const { user, profile, loading: authLoading } = useAuth();

  // Validación de día (Lunes=1 a Jueves=4) e intentos diarios en Firestore
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [isDayAllowed, setIsDayAllowed] = useState<boolean>(true);
  const [dailyAttempts, setDailyAttempts] = useState<number>(0);
  const [weeklyRecord, setWeeklyRecord] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSavingLap, setIsSavingLap] = useState<boolean>(false);

  // Estados del juego ("idle" | "running" | "finished")
  const [gameState, setGameState] = useState<"idle" | "running" | "finished">(
    "idle"
  );
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>({
    x: 230,
    y: 410,
  });

  // Geometría sincronizada de los 8 APEX sobre el SVG path
  const [apexList, setApexList] = useState<ComputedApex[]>(() =>
    INITIAL_APEX_DEFINITIONS.map((def) => ({
      ...def,
      x: def.anchorX,
      y: def.anchorY,
      idealTimeMs: def.defaultIdealTimeMs,
      progress: def.defaultIdealTimeMs / LAP_DURATION_MS,
    }))
  );

  // Resultados por cada uno de los 8 APEX en la vuelta actual
  const [apexResults, setApexResults] = useState<Record<number, HitTier>>({});
  const [floatingFeedbacks, setFloatingFeedbacks] = useState<
    FloatingFeedback[]
  >([]);
  const [isNewWeeklyBest, setIsNewWeeklyBest] = useState<boolean>(false);

  // Referencias para animación de alta precisión con requestAnimationFrame
  const trackPathRef = useRef<SVGPathElement | null>(null);
  const totalPathLengthRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const apexListRef = useRef<ComputedApex[]>(apexList);
  const apexResultsRef = useRef<Record<number, HitTier>>({});
  const hasFinishedLapRef = useRef<boolean>(false);

  useEffect(() => {
    apexListRef.current = apexList;
  }, [apexList]);

  // Calcular desglose de puntos y aciertos en tiempo real desde apexResults
  const counts = React.useMemo(() => {
    const summary = {
      violeta: 0,
      verde: 0,
      amarillo: 0,
      rojo: 0,
      totalPoints: 0,
    };
    Object.values(apexResults).forEach((tier) => {
      if (tier === "violeta") {
        summary.violeta += 1;
        summary.totalPoints += 5;
      } else if (tier === "verde") {
        summary.verde += 1;
        summary.totalPoints += 3;
      } else if (tier === "amarillo") {
        summary.amarillo += 1;
        summary.totalPoints += 1;
      } else if (tier === "rojo") {
        summary.rojo += 1;
      }
    });
    return summary;
  }, [apexResults]);

  // Obtener el leaderboard semanal desde Firestore
  const fetchWeeklyLeaderboard = useCallback(
    async (
      semanaId: string,
      fallbackUserEntry?: LeaderboardEntry
    ): Promise<LeaderboardEntry[]> => {
      if (!db) {
        return fallbackUserEntry ? [fallbackUserEntry] : [];
      }
      try {
        const colRef = collection(
          db,
          "vuelta_rapida_semanal",
          semanaId,
          "participantes"
        );
        const snap = await getDocs(colRef);
        const entries: LeaderboardEntry[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (typeof data.puntaje === "number") {
            entries.push({
              userId: data.userId || docSnap.id,
              nombre: data.nombre || "Piloto GridProde",
              puntaje: data.puntaje,
              fecha: data.fecha,
            });
          }
        });

        // Asegurar que el registro del usuario actual esté reflejado
        if (fallbackUserEntry) {
          const idx = entries.findIndex(
            (e) => e.userId === fallbackUserEntry.userId
          );
          if (idx >= 0) {
            if (fallbackUserEntry.puntaje > entries[idx].puntaje) {
              entries[idx] = fallbackUserEntry;
            }
          } else {
            entries.push(fallbackUserEntry);
          }
        }

        entries.sort((a, b) => b.puntaje - a.puntaje);
        return entries;
      } catch (err) {
        console.warn("No se pudo cargar el leaderboard semanal:", err);
        return fallbackUserEntry ? [fallbackUserEntry] : [];
      }
    },
    []
  );

  // 1. Verificar día de la semana (Lunes a Jueves) e intentos diarios en Firestore
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Lun, 2 = Mar, 3 = Mié, 4 = Jue, 5 = Vie, 6 = Sáb
    const validDay = dayOfWeek >= 1 && dayOfWeek <= 4;
    setIsDayAllowed(validDay);

    if (!validDay) {
      setCheckingAccess(false);
      return;
    }

    if (authLoading) return;

    if (!user?.uid || !db) {
      setCheckingAccess(false);
      return;
    }

    let isMounted = true;

    const verifyAccessAndRecords = async () => {
      try {
        setCheckingAccess(true);
        const fechaActual = getLocalDateFormatted(now);
        const semanaId = getCurrentWeekId(now);

        const intentosRef = doc(
          db,
          "users",
          user.uid,
          "intentosVuelta",
          fechaActual
        );
        const recordRef = doc(db, "users", user.uid, "recordsVuelta", semanaId);

        const [intentosSnap, recordSnap] = await Promise.all([
          getDoc(intentosRef),
          getDoc(recordRef),
        ]);

        if (!isMounted) return;

        const currentCount = intentosSnap.exists()
          ? typeof intentosSnap.data().contador === "number"
            ? intentosSnap.data().contador
            : 0
          : 0;
        setDailyAttempts(currentCount);

        let userBest: number | null = null;
        if (recordSnap.exists() && typeof recordSnap.data().puntaje === "number") {
          userBest = recordSnap.data().puntaje;
          setWeeklyRecord(userBest);
        }

        const displayName =
          profile?.nombre ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "Piloto";

        const board = await fetchWeeklyLeaderboard(
          semanaId,
          userBest !== null
            ? {
                userId: user.uid,
                nombre: displayName,
                puntaje: userBest,
              }
            : undefined
        );

        if (isMounted) {
          setLeaderboard(board);
        }
      } catch (error) {
        console.error(
          "Error al verificar intentos diarios de Vuelta Rápida:",
          error
        );
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    };

    verifyAccessAndRecords();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.displayName, user?.email, profile?.nombre, authLoading, fetchWeeklyLeaderboard]);

  // 2. Medir el <path> del circuito al montarse y calcular tiempos ideales exactos de cada APEX
  const syncPathGeometry = useCallback(() => {
    const pathEl = trackPathRef.current;
    if (!pathEl) return;

    try {
      const totalLen = pathEl.getTotalLength();
      if (!totalLen || totalLen <= 0) return;
      totalPathLengthRef.current = totalLen;

      // Posición inicial en la largada (distancia 0)
      const startPt = pathEl.getPointAtLength(0);
      if (gameState === "idle") {
        setDotPos({ x: startPt.x, y: startPt.y });
      }

      // Encontrar el punto exacto sobre el SVG path para cada uno de los 8 APEX
      const sampleSteps = 1500;
      const computed: ComputedApex[] = INITIAL_APEX_DEFINITIONS.map((def) => {
        let bestDistSq = Infinity;
        let bestLen = (def.defaultIdealTimeMs / LAP_DURATION_MS) * totalLen;

        for (let i = 0; i <= sampleSteps; i++) {
          const len = (i / sampleSteps) * totalLen;
          const pt = pathEl.getPointAtLength(len);
          const dx = pt.x - def.anchorX;
          const dy = pt.y - def.anchorY;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestLen = len;
          }
        }

        const exactPt = pathEl.getPointAtLength(bestLen);
        const progress = bestLen / totalLen;
        const idealTimeMs = Math.round(progress * LAP_DURATION_MS);

        return {
          ...def,
          x: exactPt.x,
          y: exactPt.y,
          progress,
          idealTimeMs,
        };
      });

      computed.sort((a, b) => a.idealTimeMs - b.idealTimeMs);
      setApexList(computed);
      apexListRef.current = computed;
    } catch (err) {
      console.warn("No se pudo medir la geometría del SVG:", err);
    }
  }, [gameState]);

  useEffect(() => {
    syncPathGeometry();
  }, [syncPathGeometry, checkingAccess, isDayAllowed]);

  // Disparar un cartel flotante efímero sobre el circuito
  const spawnFloatingFeedback = useCallback(
    (apex: ComputedApex, tier: HitTier, customSubtext?: string) => {
      const config: Record<
        HitTier,
        { text: string; defaultSub: string }
      > = {
        violeta: { text: "¡VIOLETA! +5", defaultSub: "APEX PERFECTO" },
        verde: { text: "¡VERDE! +3", defaultSub: "BUENA TRAZADA" },
        amarillo: { text: "¡AMARILLO! +1", defaultSub: "TRAZADA ABIERTA" },
        rojo: { text: "¡ROJO! +0", defaultSub: "FUERA DE TIEMPO" },
      };

      const item: FloatingFeedback = {
        key: `${apex.id}-${Date.now()}-${Math.random()}`,
        apexId: apex.id,
        x: apex.x,
        y: apex.y,
        text: config[tier].text,
        subtext: customSubtext || config[tier].defaultSub,
        tier,
      };

      setFloatingFeedbacks((prev) => [...prev, item]);

      setTimeout(() => {
        setFloatingFeedbacks((prev) => prev.filter((f) => f.key !== item.key));
      }, 1150);
    },
    []
  );

  // Registrar resultado de un APEX de forma sincrónica y en estado React
  const recordApexOutcome = useCallback(
    (apex: ComputedApex, tier: HitTier, subtext?: string) => {
      if (apexResultsRef.current[apex.id]) return;
      apexResultsRef.current = {
        ...apexResultsRef.current,
        [apex.id]: tier,
      };
      setApexResults({ ...apexResultsRef.current });
      spawnFloatingFeedback(apex, tier, subtext);
    },
    [spawnFloatingFeedback]
  );

  // 4. Finalizar vuelta y guardar intento + récord semanal en Firestore
  const handleFinishLap = useCallback(async () => {
    if (hasFinishedLapRef.current) return;
    hasFinishedLapRef.current = true;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Cualquier APEX que haya quedado sin presionar se marca como ROJO (0 pts)
    const currentApexes = apexListRef.current;
    const finalMap: Record<number, HitTier> = { ...apexResultsRef.current };
    currentApexes.forEach((ap) => {
      if (!finalMap[ap.id]) {
        finalMap[ap.id] = "rojo";
      }
    });
    apexResultsRef.current = finalMap;
    setApexResults(finalMap);

    // Calcular puntaje final obtenido sobre 40 puntos posibles
    let finalScore = 0;
    Object.values(finalMap).forEach((tier) => {
      if (tier === "violeta") finalScore += 5;
      else if (tier === "verde") finalScore += 3;
      else if (tier === "amarillo") finalScore += 1;
    });

    const nextAttempts = dailyAttempts + 1;
    setDailyAttempts(nextAttempts);

    const prevBest = weeklyRecord;
    const achievedNewBest = prevBest === null || finalScore > prevBest;
    const bestScoreToKeep =
      prevBest === null ? finalScore : Math.max(prevBest, finalScore);

    setWeeklyRecord(bestScoreToKeep);
    setIsNewWeeklyBest(achievedNewBest);
    setIsSavingLap(true);

    const now = new Date();
    const fechaActual = getLocalDateFormatted(now);
    const semanaId = getCurrentWeekId(now);
    const displayName =
      profile?.nombre ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Piloto GridProde";

    try {
      if (db && user?.uid) {
        // 4.1 Incrementar en +1 el contador de intentos diarios del usuario
        const intentosRef = doc(
          db,
          "users",
          user.uid,
          "intentosVuelta",
          fechaActual
        );
        await setDoc(
          intentosRef,
          {
            contador: nextAttempts,
            fecha: fechaActual,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 4.2 Guardar Récord Semanal solo si no tenía registro o si superó su récord previo
        if (achievedNewBest) {
          const userRecordRef = doc(
            db,
            "users",
            user.uid,
            "recordsVuelta",
            semanaId
          );
          const leaderboardParticipantRef = doc(
            db,
            "vuelta_rapida_semanal",
            semanaId,
            "participantes",
            user.uid
          );

          const recordPayload = {
            userId: user.uid,
            nombre: displayName,
            puntaje: finalScore,
            semanaId,
            fecha: now.toISOString(),
            updatedAt: serverTimestamp(),
          };

          await Promise.all([
            setDoc(userRecordRef, recordPayload, { merge: true }),
            setDoc(leaderboardParticipantRef, recordPayload, { merge: true }),
          ]);
        }

        const updatedBoard = await fetchWeeklyLeaderboard(semanaId, {
          userId: user.uid,
          nombre: displayName,
          puntaje: bestScoreToKeep,
          fecha: now.toISOString(),
        });
        setLeaderboard(updatedBoard);
      }
    } catch (error) {
      console.error(
        "Error al guardar intento y récord semanal en Firestore:",
        error
      );
    } finally {
      setIsSavingLap(false);
      setGameState("finished");
    }
  }, [
    dailyAttempts,
    weeklyRecord,
    profile?.nombre,
    user?.uid,
    user?.displayName,
    user?.email,
    fetchWeeklyLeaderboard,
  ]);

  // Bucle de animación de la vuelta (15 segundos exactos)
  useEffect(() => {
    if (gameState !== "running") return;

    const pathEl = trackPathRef.current;
    if (pathEl && totalPathLengthRef.current <= 0) {
      totalPathLengthRef.current = pathEl.getTotalLength();
    }

    startTimeRef.current = performance.now();
    hasFinishedLapRef.current = false;

    const step = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const clampedElapsed = Math.min(elapsed, LAP_DURATION_MS);
      setElapsedMs(clampedElapsed);

      // Actualizar posición milimétrica del punto luminoso sobre el SVG path
      const currentPath = trackPathRef.current;
      const totalLen =
        totalPathLengthRef.current ||
        (currentPath ? currentPath.getTotalLength() : 0);

      if (currentPath && totalLen > 0) {
        const progress = clampedElapsed / LAP_DURATION_MS;
        const pt = currentPath.getPointAtLength(progress * totalLen);
        setDotPos({ x: pt.x, y: pt.y });
      }

      // Verificar si algún APEX fue pasado de largo sin presionar (> 1.0s después del tiempo ideal)
      const list = apexListRef.current;
      for (let i = 0; i < list.length; i++) {
        const ap = list[i];
        if (!apexResultsRef.current[ap.id]) {
          const nextAp = list[i + 1];
          const sectorLimitMs = nextAp
            ? Math.min(
                ap.idealTimeMs + 1000,
                (ap.idealTimeMs + nextAp.idealTimeMs) / 2 + 250
              )
            : ap.idealTimeMs + 1000;

          if (clampedElapsed > sectorLimitMs) {
            recordApexOutcome(ap, "rojo", "PASADO DE LARGO");
          }
        }
      }

      if (elapsed >= LAP_DURATION_MS) {
        handleFinishLap();
        return;
      }

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [gameState, handleFinishLap, recordApexOutcome]);

  // Iniciar la vuelta al presionar "¡ARRANCAR!"
  const handleStartLap = useCallback(() => {
    if (dailyAttempts >= MAX_DAILY_ATTEMPTS) return;

    syncPathGeometry();
    apexResultsRef.current = {};
    setApexResults({});
    setFloatingFeedbacks([]);
    setElapsedMs(0);
    setIsNewWeeklyBest(false);
    hasFinishedLapRef.current = false;

    const pathEl = trackPathRef.current;
    if (pathEl) {
      const startPt = pathEl.getPointAtLength(0);
      setDotPos({ x: startPt.x, y: startPt.y });
    }

    setGameState("running");
  }, [dailyAttempts, syncPathGeometry]);

  // Evaluar la pulsación del botón "¡DOBLAR!"
  const handleTurnAction = useCallback(() => {
    if (gameState !== "running") return;

    const currentElapsed = Math.min(
      performance.now() - startTimeRef.current,
      LAP_DURATION_MS
    );

    const list = apexListRef.current;
    const pendingApexes = list.filter((ap) => !apexResultsRef.current[ap.id]);
    if (pendingApexes.length === 0) return;

    // Identificar el APEX pendiente más cercano al instante de la pulsación
    let closestApex = pendingApexes[0];
    let minDiffMs = Math.abs(currentElapsed - closestApex.idealTimeMs);

    for (let i = 1; i < pendingApexes.length; i++) {
      const candidate = pendingApexes[i];
      const diff = Math.abs(currentElapsed - candidate.idealTimeMs);
      if (diff < minDiffMs) {
        minDiffMs = diff;
        closestApex = candidate;
      }
    }

    // Si había algún APEX anterior sin evaluar antes del más cercano, marcarlo como ROJO (pasado)
    for (const ap of pendingApexes) {
      if (ap.id < closestApex.id) {
        recordApexOutcome(ap, "rojo", "PASADO DE LARGO");
      }
    }

    const diffSeconds = minDiffMs / 1000;
    const deltaLabel = `${diffSeconds.toFixed(3)}s`;

    if (diffSeconds <= 0.2) {
      recordApexOutcome(closestApex, "violeta", `Δ ${deltaLabel}`);
    } else if (diffSeconds <= 0.5) {
      recordApexOutcome(closestApex, "verde", `Δ ${deltaLabel}`);
    } else if (diffSeconds <= 1.0) {
      recordApexOutcome(closestApex, "amarillo", `Δ ${deltaLabel}`);
    } else {
      recordApexOutcome(closestApex, "rojo", `Δ ${deltaLabel}`);
    }
  }, [gameState, recordApexOutcome]);

  // Reiniciar para otro intento (si le quedan intentos del día)
  const handleResetToIdle = useCallback(() => {
    if (dailyAttempts >= MAX_DAILY_ATTEMPTS) return;
    apexResultsRef.current = {};
    setApexResults({});
    setFloatingFeedbacks([]);
    setElapsedMs(0);
    const pathEl = trackPathRef.current;
    if (pathEl) {
      const startPt = pathEl.getPointAtLength(0);
      setDotPos({ x: startPt.x, y: startPt.y });
    }
    setGameState("idle");
  }, [dailyAttempts]);

  // Encontrar cuál es el próximo APEX activo para indicarlo en la telemetría
  const nextPendingApex = React.useMemo(() => {
    return apexList.find((ap) => !apexResults[ap.id]) || null;
  }, [apexList, apexResults]);

  const fastestLapHolder = leaderboard.length > 0 ? leaderboard[0] : null;
  const attemptsRemaining = Math.max(0, MAX_DAILY_ATTEMPTS - dailyAttempts);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col select-none">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Barra superior de retorno + Indicador de Intentos Diarios */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/minijuegos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F27]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-[#D0D0D2] hover:text-white hover:border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Volver al Hub de Minijuegos</span>
            </Link>

            {!checkingAccess && isDayAllowed && (
              <div className="flex items-center gap-2.5">
                {weeklyRecord !== null && (
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1F1F27]/80 border border-purple-500/30 text-xs font-bold text-purple-300">
                    <Trophy className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      Récord Semanal:{" "}
                      <strong className="text-white font-mono">
                        {weeklyRecord} pts
                      </strong>
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-xs sm:text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <span>
                    Intentos diarios: {Math.min(dailyAttempts, MAX_DAILY_ATTEMPTS)} de{" "}
                    {MAX_DAILY_ATTEMPTS}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* 1. PANTALLA DE CARGA                                            */}
          {/* =============================================================== */}
          {checkingAccess ? (
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-10 sm:p-14 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Cargando telemetría del circuito...
                </h2>
                <p className="text-xs sm:text-sm text-[#8E8E93]">
                  Verificando disponibilidad de pista y tus intentos diarios en Firestore.
                </p>
              </div>
            </div>
          ) : !isDayAllowed ? (
            /* =============================================================== */
            /* 2. BLOQUEO POR DÍA DE SEMANA (VIERNES A DOMINGO)                */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl text-center space-y-7">
              <div className="w-20 h-20 rounded-3xl bg-[#E10600]/15 border border-[#E10600]/40 flex items-center justify-center text-[#E10600] mx-auto shadow-[0_0_30px_rgba(225,6,0,0.25)]">
                <Lock className="w-10 h-10" />
              </div>

              <div className="space-y-3 max-w-lg mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E10600]/15 border border-[#E10600]/30 text-[#E10600] text-xs font-black uppercase tracking-wider">
                  <Flag className="w-3.5 h-3.5" />
                  <span>Pista Cerrada • Parque Cerrado FIA</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  El circuito está cerrado. La Vuelta Rápida solo se corre de lunes a jueves
                </h1>
                <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed">
                  Durante el fin de semana de Gran Premio la actividad se traslada a la pista real. Regresa el lunes para marcar el récord semanal.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-center">
                <Link
                  href="/minijuegos"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-[#E10600] hover:bg-[#b80500] text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(225,6,0,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : dailyAttempts >= MAX_DAILY_ATTEMPTS && gameState !== "finished" ? (
            /* =============================================================== */
            /* 3. BLOQUEO POR LÍMITE DE 3 INTENTOS DIARIOS AGOTADOS            */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl text-center space-y-7">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <Lock className="w-10 h-10" />
              </div>

              <div className="space-y-3 max-w-lg mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Intentos diarios: 3 de 3</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  ¡Ya agotaste tus 3 intentos de hoy! Volvé mañana para mejorar tu marca.
                </h1>
                {weeklyRecord !== null && (
                  <p className="text-sm font-bold text-purple-300 pt-1">
                    Tu récord de la semana actual:{" "}
                    <span className="font-mono text-white">{weeklyRecord} pts</span> /{" "}
                    {MAX_POSSIBLE_POINTS} pts
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-center">
                <Link
                  href="/minijuegos"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : gameState === "finished" ? (
            /* =============================================================== */
            /* 4. PANTALLA FINAL DE RESUMEN Y MINI LEADERBOARD SEMANAL         */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/85 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 mx-auto shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <Flag className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isNewWeeklyBest
                      ? "¡Nuevo Récord Personal de la Semana!"
                      : "Bandera a Cuadros • Vuelta Completada"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Resumen de tu Vuelta Rápida
                </h1>
              </div>

              {/* Tarjetas de Puntaje de la Vuelta y Récord de la Semana */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 text-center space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#8E8E93]">
                    Puntaje de la Vuelta
                  </p>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-white">
                    {counts.totalPoints}{" "}
                    <span className="text-base text-[#8E8E93]">
                      / {MAX_POSSIBLE_POINTS} pts
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-purple-950/60 to-[#15151E] border border-purple-500/40 p-5 text-center space-y-1 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
                  <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                    Mejor Marca Semanal
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-purple-300">
                    Tu récord de la semana: {weeklyRecord ?? counts.totalPoints} pts
                  </p>
                </div>
              </div>

              {/* Desglose de Sectores / Curvas de la vuelta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                <div className="rounded-xl bg-purple-950/40 border border-purple-500/30 p-3 text-center">
                  <p className="text-[11px] font-black uppercase text-purple-300">
                    🟣 Violeta (+5)
                  </p>
                  <p className="text-xl font-black font-mono text-white mt-0.5">
                    {counts.violeta}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 text-center">
                  <p className="text-[11px] font-black uppercase text-emerald-300">
                    🟢 Verde (+3)
                  </p>
                  <p className="text-xl font-black font-mono text-white mt-0.5">
                    {counts.verde}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-3 text-center">
                  <p className="text-[11px] font-black uppercase text-amber-300">
                    🟡 Amarillo (+1)
                  </p>
                  <p className="text-xl font-black font-mono text-white mt-0.5">
                    {counts.amarillo}
                  </p>
                </div>
                <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-center">
                  <p className="text-[11px] font-black uppercase text-red-300">
                    🔴 Rojo (0)
                  </p>
                  <p className="text-xl font-black font-mono text-white mt-0.5">
                    {counts.rojo}
                  </p>
                </div>
              </div>

              {/* Mini Leaderboard Semanal (Poseedor de la Vuelta Rápida) */}
              <div className="max-w-2xl mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Leaderboard • Vuelta Rápida de la Semana
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                    GP de Austin
                  </span>
                </div>

                {fastestLapHolder ? (
                  <div className="space-y-3">
                    {/* Tarjeta destacada del líder actual */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-[#1F1F27] to-[#1F1F27] border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500 text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
                          P1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                              🟣 Récord de Vuelta Rápida
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-white">
                            {fastestLapHolder.nombre}
                            {fastestLapHolder.userId === user?.uid && (
                              <span className="ml-2 text-xs font-bold text-cyan-400">
                                (Tú)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl sm:text-2xl font-black font-mono text-purple-300">
                          {fastestLapHolder.puntaje} pts
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">
                           de {MAX_POSSIBLE_POINTS} posibles
                        </p>
                      </div>
                    </div>

                    {/* Top 5 adicional si hay más participantes */}
                    {leaderboard.slice(1, 5).map((entry, idx) => (
                      <div
                        key={entry.userId}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1F1F27]/70 border border-white/5 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-[#8E8E93] w-6">
                            P{idx + 2}
                          </span>
                          <span className="font-bold text-white">
                            {entry.nombre}
                            {entry.userId === user?.uid && (
                              <span className="ml-1.5 text-cyan-400 font-bold">
                                (Tú)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="font-mono font-black text-[#D0D0D2]">
                          {entry.puntaje} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8E93] text-center py-3">
                    Aún no hay registros semanales cargados.
                  </p>
                )}
              </div>

              {/* Botones de Acción: Reiniciar (si quedan intentos hoy) o Volver al Hub */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
                {attemptsRemaining > 0 ? (
                  <button
                    type="button"
                    disabled={isSavingLap}
                    onClick={handleResetToIdle}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      Reiniciar Vuelta ({attemptsRemaining}{" "}
                      {attemptsRemaining === 1
                        ? "intento disponible"
                        : "intentos disponibles"}
                      )
                    </span>
                  </button>
                ) : (
                  <div className="px-5 py-3 rounded-2xl bg-[#15151E] border border-white/10 text-xs font-bold text-amber-300">
                    ¡Ya agotaste tus 3 intentos de hoy! Volvé mañana para mejorar tu marca.
                  </div>
                )}

                <Link
                  href="/minijuegos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-[#15151E] hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all"
                >
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* 5. INTERFAZ PRINCIPAL DEL JUEGO (HUD + SVG COTA + BOTÓN)        */
            /* =============================================================== */
            <div className="space-y-5">
              {/* HUD Superior: Puntuación Acumulada y Desglose en Tiempo Real */}
              <div className="rounded-3xl bg-[#1F1F27]/85 backdrop-blur-xl border border-white/10 p-4 sm:p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Título y Cronómetro de Vuelta */}
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <Gauge className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block">
                          GP de Estados Unidos • COTA (15.0s)
                        </span>
                        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                          Vuelta Rápida
                        </h1>
                      </div>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-[#15151E] border border-white/10 font-mono text-xs sm:text-sm font-black text-cyan-300">
                      {(elapsedMs / 1000).toFixed(2)}s / 15.00s
                    </div>
                  </div>

                  {/* Puntos en tiempo real y desglose por color */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-[#15151E] border border-cyan-400/40 text-sm sm:text-base font-black text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                      Puntos:{" "}
                      <span className="text-cyan-400 font-mono">
                        {counts.totalPoints}
                      </span>{" "}
                      pts
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-black font-mono">
                      <span className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300">
                        🟣 Violeta: {counts.violeta}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        🟢 Verde: {counts.verde}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300">
                        🟡 Amarillo: {counts.amarillo}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300">
                        🔴 Rojo: {counts.rojo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenedor Interactivo del Trazado SVG 2D (800x500) */}
              <div className="relative rounded-3xl bg-[#111118]/90 backdrop-blur-xl border border-white/10 p-3 sm:p-6 shadow-2xl overflow-hidden">
                {/* Luz ambiental de fondo */}
                <div className="absolute -top-24 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Sub-barra informativa dentro del visor de telemetría */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2 px-2 text-[11px] font-bold text-[#8E8E93]">
                  <span>
                    Presiona <strong className="text-white">¡DOBLAR!</strong> justo
                    cuando el punto luminoso pase por el centro de cada{" "}
                    <strong className="text-cyan-400">APEX (1 al 8)</strong>
                  </span>
                  {nextPendingApex && (
                    <span className="text-cyan-300 font-mono">
                      Próximo objetivo: APEX {nextPendingApex.id} (
                      {(nextPendingApex.idealTimeMs / 1000).toFixed(2)}s)
                    </span>
                  )}
                </div>

                {/* Lienzo SVG 800x500 */}
                <div className="relative w-full aspect-[8/5] max-h-[460px] mx-auto">
                  <svg
                    viewBox="0 0 800 500"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      {/* Resplandor LED para el móvil (Punto Luminoso) */}
                      <filter
                        id="dot-led-glow"
                        x="-150%"
                        y="-150%"
                        width="400%"
                        height="400%"
                      >
                        <feGaussianBlur stdDeviation="4" result="blur1" />
                        <feGaussianBlur stdDeviation="8" result="blur2" />
                        <feMerge>
                          <feMergeNode in="blur2" />
                          <feMergeNode in="blur1" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Resplandor Cian para los 8 indicadores de APEX */}
                      <filter
                        id="apex-cyan-glow"
                        x="-100%"
                        y="-100%"
                        width="300%"
                        height="300%"
                      >
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Borde exterior del asfalto */}
                    <path
                      d={COTA_TRACK_PATH}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="28"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Pista principal gris oscuro semi-translúcido (Path de referencia para getPointAtLength) */}
                    <path
                      ref={trackPathRef}
                      d={COTA_TRACK_PATH}
                      fill="none"
                      stroke="rgba(55, 58, 70, 0.85)"
                      strokeWidth="22"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Línea de trazada central sutil */}
                    <path
                      d={COTA_TRACK_PATH}
                      fill="none"
                      stroke="rgba(6, 182, 212, 0.18)"
                      strokeWidth="2"
                      strokeDasharray="6 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Línea de Largada / Meta en (230, 410) */}
                    <g transform="translate(230, 410) rotate(-54)">
                      <rect
                        x="-3"
                        y="-14"
                        width="6"
                        height="28"
                        rx="1.5"
                        fill="#FFFFFF"
                        opacity="0.9"
                      />
                      <line
                        x1="0"
                        y1="-14"
                        x2="0"
                        y2="14"
                        stroke="#E10600"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    </g>
                    <text
                      x="212"
                      y="442"
                      fill="#9CA3AF"
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="middle"
                      className="uppercase tracking-widest font-mono"
                    >
                      LARGADA / META
                    </text>

                    {/* Los 8 Indicadores Fijos de APEX (Círculos brillantes azul/cian con palabra APEX + número 1..8) */}
                    {apexList.map((apex) => {
                      const tier = apexResults[apex.id];
                      const isNext =
                        gameState === "running" &&
                        nextPendingApex?.id === apex.id;

                      let ringColor = "#22D3EE"; // Cian brillante por defecto
                      let badgeBg = "rgba(8, 51, 68, 0.92)";
                      let badgeBorder = "#22D3EE";
                      let badgeText = "#67E8F9";

                      if (tier === "violeta") {
                        ringColor = "#C084FC";
                        badgeBg = "rgba(88, 28, 135, 0.92)";
                        badgeBorder = "#C084FC";
                        badgeText = "#E9D5FF";
                      } else if (tier === "verde") {
                        ringColor = "#34D399";
                        badgeBg = "rgba(6, 78, 59, 0.92)";
                        badgeBorder = "#34D399";
                        badgeText = "#A7F3D0";
                      } else if (tier === "amarillo") {
                        ringColor = "#FBBF24";
                        badgeBg = "rgba(120, 53, 15, 0.92)";
                        badgeBorder = "#FBBF24";
                        badgeText = "#FDE68A";
                      } else if (tier === "rojo") {
                        ringColor = "#F87171";
                        badgeBg = "rgba(127, 29, 29, 0.92)";
                        badgeBorder = "#F87171";
                        badgeText = "#FECACA";
                      }

                      const labelX = apex.x + apex.labelOffsetX;
                      const labelY = apex.y + apex.labelOffsetY;

                      return (
                        <g key={apex.id}>
                          {/* Halo pulsante para el siguiente APEX activo */}
                          {isNext && (
                            <circle
                              cx={apex.x}
                              cy={apex.y}
                              r="14"
                              fill="none"
                              stroke="#22D3EE"
                              strokeWidth="2"
                              opacity="0.65"
                              className="animate-ping"
                            />
                          )}

                          {/* Círculo brillante azul/cian fijo sobre el centro del APEX */}
                          <circle
                            cx={apex.x}
                            cy={apex.y}
                            r="7"
                            fill="rgba(6, 182, 212, 0.28)"
                            stroke={ringColor}
                            strokeWidth="2.5"
                            filter="url(#apex-cyan-glow)"
                          />
                          <circle
                            cx={apex.x}
                            cy={apex.y}
                            r="2.2"
                            fill="#ECFEFF"
                          />

                          {/* Etiqueta con la palabra 'APEX' y su número (1 al 8) */}
                          <g transform={`translate(${labelX}, ${labelY})`}>
                            <rect
                              x="-28"
                              y="-10"
                              width="56"
                              height="19"
                              rx="5"
                              fill={badgeBg}
                              stroke={badgeBorder}
                              strokeWidth="1.2"
                            />
                            <text
                              x="0"
                              y="3"
                              fill={badgeText}
                              fontSize="9.5"
                              fontWeight="900"
                              textAnchor="middle"
                              className="font-mono tracking-wider"
                            >
                              APEX {apex.id}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* El Móvil: Punto Luminoso muy pequeño (7px de diámetro = r 3.5) con efecto glow/LED */}
                    <g>
                      <circle
                        cx={dotPos.x}
                        cy={dotPos.y}
                        r="6"
                        fill="rgba(34, 211, 238, 0.35)"
                        filter="url(#dot-led-glow)"
                      />
                      <circle
                        cx={dotPos.x}
                        cy={dotPos.y}
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#22D3EE"
                        strokeWidth="1.5"
                        filter="url(#dot-led-glow)"
                      />
                    </g>

                    {/* Feedback visual efímero y flotante justo sobre la curva evaluada */}
                    {floatingFeedbacks.map((fb) => {
                      const colorMap: Record<HitTier, string> = {
                        violeta: "#D8B4FE",
                        verde: "#6EE7B7",
                        amarillo: "#FCD34D",
                        rojo: "#FCA5A5",
                      };
                      const strokeMap: Record<HitTier, string> = {
                        violeta: "#7E22CE",
                        verde: "#047857",
                        amarillo: "#B45309",
                        rojo: "#B91C1C",
                      };
                      return (
                        <g
                          key={fb.key}
                          transform={`translate(${fb.x}, ${fb.y - 28})`}
                          className=" pointer-events-none"
                        >
                          <rect
                            x="-68"
                            y="-22"
                            width="136"
                            height="34"
                            rx="8"
                            fill="rgba(15, 15, 23, 0.92)"
                            stroke={colorMap[fb.tier]}
                            strokeWidth="1.8"
                          />
                          <text
                            x="0"
                            y="-5"
                            fill={colorMap[fb.tier]}
                            stroke={strokeMap[fb.tier]}
                            strokeWidth="0.4"
                            fontSize="13"
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono uppercase tracking-wider"
                          >
                            {fb.text}
                          </text>
                          <text
                            x="0"
                            y="7"
                            fill="#E5E7EB"
                            fontSize="8.5"
                            fontWeight="700"
                            textAnchor="middle"
                            className="font-mono uppercase"
                          >
                            APEX {fb.apexId} • {fb.subtext}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Leyenda de tolerancias de tiempo */}
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-[#8E8E93]">
                  <span>
                    🟣 <strong className="text-purple-300">≤ 0.2s:</strong> +5 pts
                  </span>
                  <span>
                    🟢 <strong className="text-emerald-300">≤ 0.5s:</strong> +3 pts
                  </span>
                  <span>
                    🟡 <strong className="text-amber-300">≤ 1.0s:</strong> +1 pt
                  </span>
                  <span>
                    🔴 <strong className="text-red-300">&gt; 1.0s / Pasado:</strong>{" "}
                    0 pts
                  </span>
                </div>
              </div>

              {/* Botón Grande, Destacado y Centrado: "¡ARRANCAR!" / "¡DOBLAR!" */}
              <div className="flex justify-center pt-1">
                {gameState === "idle" ? (
                  <button
                    type="button"
                    onClick={handleStartLap}
                    className="w-full max-w-md py-5 sm:py-6 px-8 rounded-3xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] text-white font-black text-xl sm:text-2xl uppercase tracking-widest shadow-[0_0_35px_rgba(6,182,212,0.45)] border border-cyan-300/40 flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <span>¡ARRANCAR!</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleTurnAction();
                    }}
                    onClick={(e) => {
                      // Soporte para teclado (Enter / Space) donde detail === 0
                      if (e.detail === 0) {
                        handleTurnAction();
                      }
                    }}
                    className="w-full max-w-md py-6 sm:py-7 px-8 rounded-3xl bg-gradient-to-r from-[#E10600] via-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 active:scale-95 text-white font-black text-2xl sm:text-3xl uppercase tracking-widest shadow-[0_0_45px_rgba(225,6,0,0.55)] border-2 border-white/30 flex items-center justify-center gap-3 transition-transform cursor-pointer select-none touch-manipulation"
                  >
                    <Zap className="w-7 h-7 fill-current animate-pulse" />
                    <span>¡DOBLAR!</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
