"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import { ThemedTrophy } from "@/components/ThemedTrophy";
import { BadgeTier } from "@/data/badgesData";
import {
  ArrowLeft,
  Award,
  Check,
  Copy,
  Edit3,
  FileCode,
  Flag,
  Flame,
  Gamepad2,
  Gauge,
  Loader2,
  Lock,
  Medal,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Undo2,
  X,
  Zap,
} from "lucide-react";

import {
  getCurrentCircuit,
  type CircuitApexConfig,
  type CircuitConfig,
} from "@/data/circuits";
import {
  trackCoordinates,
  TRACK_COORDINATES,
  getTrackCoordinates,
  getCurrentActiveGpId,
  type CircuitTrackConfig,
  type ApexCoordinate,
} from "@/utils/trackCoordinates";
import {
  computeCurvatureSpeedProfile,
  getProgressFromTime,
  getTimeFromProgress,
  type CurvatureSpeedProfile,
} from "@/utils/trackPhysics";

const LAP_DURATION_MS = 10000; // 10.0 segundos exactos para la vuelta completa
const MAX_WEEKLY_ATTEMPTS = 5; // 5 intentos en total por semana (Lunes a Jueves)
const MAX_POSSIBLE_POINTS = 40; // 8 curvas * 5 pts
const MISS_PENALTY_MS = 1000; // Penalización en ms para curvas no presionadas o pasadas de largo

// Dificultad Extrema (Hitbox milimétrica en segundos)
const TOLERANCE_VIOLETA_S = 0.025; // <= 25ms -> +5 pts
const TOLERANCE_VERDE_S = 0.05;    // <= 50ms -> +3 pts
const TOLERANCE_AMARILLO_S = 0.1;  // <= 100ms -> +1 pt

type HitTier = "violeta" | "verde" | "amarillo" | "rojo";

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
  puntajeTotal: number;
  tiempoReaccionTotal: number;
  fecha?: string;
}

interface TelemetryWaypoint {
  timeMs: number;
  progress: number;
}

interface UnlockedMedalAlert {
  tier: "bronce" | "plata" | "oro";
  title: string;
  subtitle: string;
  vueltasPerfectas: number;
}

const PERFECT_MEDAL_TIERS: Array<{
  tier: "bronce" | "plata" | "oro";
  label: string;
  threshold: number;
  reqText: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  glowClass: string;
}> = [
  {
    tier: "bronce",
    label: "Bronce",
    threshold: 1,
    reqText: "1 Vuelta Perfecta (40 pts)",
    borderClass: "border-[#cd7f32]/50",
    bgClass: "from-[#cd7f32]/20 via-[#181822]/90 to-[#12121A]/95",
    textClass: "text-[#cd7f32]",
    glowClass: "shadow-[0_0_25px_rgba(205,127,50,0.25)]",
  },
  {
    tier: "plata",
    label: "Plata",
    threshold: 5,
    reqText: "5 Vueltas Perfectas (40 pts)",
    borderClass: "border-[#c0c0c0]/50",
    bgClass: "from-[#c0c0c0]/20 via-[#181822]/90 to-[#12121A]/95",
    textClass: "text-[#e2e8f0]",
    glowClass: "shadow-[0_0_25px_rgba(192,192,192,0.28)]",
  },
  {
    tier: "oro",
    label: "Oro",
    threshold: 10,
    reqText: "10 Vueltas Perfectas (40 pts)",
    borderClass: "border-[#ffd700]/60",
    bgClass: "from-[#ffd700]/25 via-[#181822]/90 to-[#12121A]/95",
    textClass: "text-[#ffd700]",
    glowClass: "shadow-[0_0_30px_rgba(255,215,0,0.35)]",
  },
];

function getPerfectLapMedalTier(count: number): BadgeTier {
  if (count >= 10) return "oro";
  if (count >= 5) return "plata";
  if (count >= 1) return "bronce";
  return "bloqueado";
}

/**
 * Simulación de físicas de F1 (Velocidad Variable):
 * Interpolación de Hermite por tramos entre cada waypoint (Largada -> APEX 1..8 -> Meta).
 * - Acelera progresivamente al salir de cada curva (pendiente inicial baja),
 * - Alcanza velocidad punta máxima en mitad de las rectas (> 5x la velocidad de paso por curva),
 * - Frena visiblemente al entrar en la zona de frenado justo antes de cada APEX,
 * - Garantiza matemáticamente que en elapsedMs === apex.idealTimeMs el punto esté en el centro exacto del APEX.
 */
function computeF1VariableProgress(
  elapsedMs: number,
  waypoints: TelemetryWaypoint[]
): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= LAP_DURATION_MS) return 1;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const w0 = waypoints[i];
    const w1 = waypoints[i + 1];

    if (elapsedMs >= w0.timeMs && elapsedMs <= w1.timeMs) {
      const duration = Math.max(1, w1.timeMs - w0.timeMs);
      const u = (elapsedMs - w0.timeMs) / duration; // 0..1 dentro del sector
      const isFinalStraight = i === waypoints.length - 2;

      // m0 = velocidad relativa de tracción a la salida de la curva previa
      // m1 = velocidad relativa de frenada al llegar al centro del APEX (o cruce de meta a fondo)
      const m0 = i === 0 ? 0.45 : 0.34;
      const m1 = isFinalStraight ? 1.45 : 0.22;

      // Polinomio cúbico de Hermite f(u) con f(0)=0, f(1)=1, f'(0)=m0, f'(1)=m1
      const u2 = u * u;
      const u3 = u2 * u;
      const easedU =
        (m0 + m1 - 2) * u3 + (3 - 2 * m0 - m1) * u2 + m0 * u;

      return w0.progress + (w1.progress - w0.progress) * easedU;
    }
  }

  return 1;
}

function VueltaRapidaContent() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const gpParam = searchParams?.get("gp") || searchParams?.get("gpId");

  // Cero Estados Intermedios: se lee directamente en el cuerpo del componente sin useState
  const activeGpId = gpParam || getCurrentActiveGpId();
  const carreraActiva: CircuitTrackConfig =
    trackCoordinates[activeGpId] || getTrackCoordinates(activeGpId);
  const currentCircuit = carreraActiva;
  const SEMANA_GP_ID = carreraActiva.gpId;

  // Lectura directa estricta desde el diccionario sin estados intermedios
  const currentApexes =
    trackCoordinates[carreraActiva.id]?.apexes ||
    trackCoordinates[carreraActiva.gpId]?.apexes ||
    carreraActiva.apexes;

  const apexesDependencyKey = JSON.stringify(currentApexes);

  // Validación de día (Lunes=1 a Jueves=4) e intentos semanales (máx. 5) en Firestore
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [isDayAllowed, setIsDayAllowed] = useState<boolean>(true);
  const [weeklyAttempts, setWeeklyAttempts] = useState<number>(0);
  const [weeklyRecord, setWeeklyRecord] = useState<number | null>(null);
  const [weeklyBestReactionMs, setWeeklyBestReactionMs] = useState<number | null>(null);
  const [lastLapReactionMs, setLastLapReactionMs] = useState<number>(0);
  const [vueltasPerfectas, setVueltasPerfectas] = useState<number>(0);
  const [unlockedMedalAlert, setUnlockedMedalAlert] =
    useState<UnlockedMedalAlert | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSavingLap, setIsSavingLap] = useState<boolean>(false);

  // Estados del juego: hasStarted se activa instantáneamente con 0ms de delay
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Resultados por cada uno de los 8 APEX en la vuelta actual
  const [apexResults, setApexResults] = useState<Record<number, HitTier>>({});
  const [floatingFeedbacks, setFloatingFeedbacks] = useState<
    FloatingFeedback[]
  >([]);
  const [isNewWeeklyBest, setIsNewWeeklyBest] = useState<boolean>(false);

  // =========================================================================
  // ESTADOS Y REFERENCIAS PARA MODO EDICIÓN VISUAL APEX (SOLO ADMIN)
  // =========================================================================
  const isAdmin =
    profile?.role === "Administrador" || isEmailInInitialAdmins(user?.email);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editedApexes, setEditedApexes] = useState<ApexCoordinate[]>([]);
  const [hoverPoint, setHoverPoint] = useState<{
    x: number;
    y: number;
    progress: number;
  } | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const svgCanvasRef = useRef<SVGSVGElement | null>(null);

  // Referencias DOM directas para animación a 120fps con 0ms de delay de arranque
  const trackPathRef = useRef<SVGPathElement | null>(null);
  const totalPathLengthRef = useRef<number>(0);
  const dotGlowRef = useRef<SVGCircleElement | null>(null);
  const dotCoreRef = useRef<SVGCircleElement | null>(null);
  const timerDisplayRef = useRef<HTMLSpanElement | null>(null);
  const calibratedApexesRef = useRef<CircuitApexConfig[]>([...currentApexes]);
  const curvatureProfileRef = useRef<CurvatureSpeedProfile | null>(null);
  const [pathNodeReady, setPathNodeReady] = useState<number>(0);

  // Waypoints precalculados para la física de velocidad variable (Largada -> 8 APEX -> Meta)
  const waypointsRef = useRef<TelemetryWaypoint[]>([
    { timeMs: 0, progress: 0 },
    ...currentApexes.map((ap) => ({
      timeMs: ap.idealTimeMs,
      progress: ap.progress,
    })),
    { timeMs: LAP_DURATION_MS, progress: 1 },
  ]);

  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const hasFinishedLapRef = useRef<boolean>(false);
  const apexResultsRef = useRef<Record<number, HitTier>>({});
  const apexReactionMsRef = useRef<Record<number, number>>({});

  // Callback ref para asociar el nodo <path> apenas se monta en el DOM
  const setTrackPathNode = useCallback((node: SVGPathElement | null) => {
    trackPathRef.current = node;
    if (node) {
      try {
        totalPathLengthRef.current = node.getTotalLength();
      } catch {}
      setPathNodeReady((prev) => prev + 1);
    }
  }, []);

  // Posicionar el punto luminoso (6-8px) en (x, y) directamente sobre el DOM sin re-renderizar React
  const setDotDomPosition = useCallback((x: number, y: number) => {
    const cx = String(x);
    const cy = String(y);
    if (dotGlowRef.current) {
      dotGlowRef.current.setAttribute("cx", cx);
      dotGlowRef.current.setAttribute("cy", cy);
    }
    if (dotCoreRef.current) {
      dotCoreRef.current.setAttribute("cx", cx);
      dotCoreRef.current.setAttribute("cy", cy);
    }
  }, []);

  // MOTOR DINÁMICO Y AGNÓSTICO:
  // Se ejecuta reactivamente ante cualquier cambio en 'carreraActiva' (y al montarse el nodo SVG).
  // Recalcula getTotalLength(), proyecta dinámicamente las coordenadas (x, y) de cada APEX
  // sobre el nuevo trazado oficial del calendario y reposiciona los hit zones sin requerir cambios de código semana a semana.
  useEffect(() => {
    const pathEl = trackPathRef.current;
    if (!pathEl) {
      waypointsRef.current = [
        { timeMs: 0, progress: 0 },
        ...currentApexes.map((ap) => ({
          timeMs: ap.idealTimeMs,
          progress: ap.progress,
        })),
        { timeMs: LAP_DURATION_MS, progress: 1 },
      ];
      calibratedApexesRef.current = [...currentApexes];
      setDotDomPosition(carreraActiva.startPoint.x, carreraActiva.startPoint.y);
      return;
    }

    try {
      const totalLen = pathEl.getTotalLength();
      totalPathLengthRef.current = totalLen;

      if (totalLen > 0) {
        // 1. Evaluación dinámica de curvatura del SVG (Independiente de los APEX):
        // Analiza tangentes, cambio de ángulo, desaceleración en curvas y aceleración en rectas
        const profile = computeCurvatureSpeedProfile(pathEl, LAP_DURATION_MS, 600);
        curvatureProfileRef.current = profile;

        // 2. Muestreo denso global de 1000 puntos para proyectar cada APEX sobre el trazado oficial
        const SAMPLES = 1000;
        const sampledPoints: Array<{ p: number; x: number; y: number }> = [];
        for (let s = 0; s <= SAMPLES; s++) {
          const p = s / SAMPLES;
          const pt = pathEl.getPointAtLength(p * totalLen);
          sampledPoints.push({ p, x: pt.x, y: pt.y });
        }

        // 3. Mapeo de APEX y calibración de tiempos ideales según la física real de la pista
        const calibratedApexes: CircuitApexConfig[] = currentApexes.map(
          (ap) => {
            let bestP = typeof ap.progress === "number" ? ap.progress : 0;
            let posX = ap.x;
            let posY = ap.y;

            if (typeof ap.progress === "number" && totalLen > 0) {
              const pt = pathEl.getPointAtLength(ap.progress * totalLen);
              posX = Math.round(pt.x * 10) / 10;
              posY = Math.round(pt.y * 10) / 10;
            } else {
              // Búsqueda global del progreso más cercano al punto (x, y) del APEX
              let minSq = Infinity;
              for (let i = 0; i < sampledPoints.length; i++) {
                const sp = sampledPoints[i];
                const dx = sp.x - ap.x;
                const dy = sp.y - ap.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minSq) {
                  minSq = distSq;
                  bestP = sp.p;
                }
              }

              // Refinamiento fino local (±0.02 con 50 pasos) para máxima precisión
              const localSteps = 50;
              const searchHalfWidth = 0.02;
              const minSearch = Math.max(0, bestP - searchHalfWidth);
              const maxSearch = Math.min(1, bestP + searchHalfWidth);
              for (let j = 0; j <= localSteps; j++) {
                const p = minSearch + ((maxSearch - minSearch) * j) / localSteps;
                const pt = pathEl.getPointAtLength(p * totalLen);
                const dx = pt.x - ap.x;
                const dy = pt.y - ap.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minSq) {
                  minSq = distSq;
                  bestP = p;
                }
              }
            }

            // El idealTimeMs se calcula directamente del perfil de físicas por curvatura
            const idealTimeMs = getTimeFromProgress(profile, bestP);

            return {
              ...ap,
              x: posX,
              y: posY,
              progress: bestP,
              idealTime: idealTimeMs / 1000,
              idealTimeMs,
            };
          }
        );

        // Ordenar los waypoints por progreso para garantizar la monotonicidad física
        const sortedApexes = [...calibratedApexes].sort(
          (a, b) => a.progress - b.progress
        );

        waypointsRef.current = [
          { timeMs: 0, progress: 0 },
          ...sortedApexes.map((ap) => ({
            timeMs: ap.idealTimeMs,
            progress: ap.progress,
          })),
          { timeMs: LAP_DURATION_MS, progress: 1 },
        ];
        calibratedApexesRef.current = sortedApexes;
      }
    } catch (err) {
      console.error(
        "Error al calcular getTotalLength y mapear hit zones para carreraActiva:",
        err
      );
    }

    // Reposicionar móvil en la largada oficial y resetear estado de vuelta limpia
    setDotDomPosition(carreraActiva.startPoint.x, carreraActiva.startPoint.y);
    isRunningRef.current = false;
    hasFinishedLapRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setHasStarted(false);
    setIsFinished(false);
    setApexResults({});
    apexResultsRef.current = {};
    apexReactionMsRef.current = {};
    if (timerDisplayRef.current) {
      timerDisplayRef.current.textContent = "0.00s / 10.00s";
    }
  }, [
    currentCircuit.id,
    currentCircuit.pathD,
    apexesDependencyKey,
    pathNodeReady,
    setDotDomPosition,
  ]);

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

  // Obtener el leaderboard semanal desde Firestore ordenado por puntajeTotal DESC y tiempoReaccionTotal ASC
  const fetchWeeklyLeaderboard = useCallback(
    async (
      semanaGpId: string,
      fallbackUserEntry?: LeaderboardEntry
    ): Promise<LeaderboardEntry[]> => {
      if (!db) {
        return fallbackUserEntry ? [fallbackUserEntry] : [];
      }
      try {
        const colRef = collection(
          db,
          "vuelta_rapida_semanal",
          semanaGpId,
          "participantes"
        );
        const snap = await getDocs(colRef);
        const entries: LeaderboardEntry[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const score =
            typeof data.puntajeTotal === "number"
              ? data.puntajeTotal
              : typeof data.puntaje === "number"
              ? data.puntaje
              : null;
          const reactionMs =
            typeof data.tiempoReaccionTotal === "number"
              ? data.tiempoReaccionTotal
              : 8000;

          if (score !== null) {
            entries.push({
              userId: data.userId || docSnap.id,
              nombre: data.nombre || "Piloto GridProde",
              puntajeTotal: score,
              tiempoReaccionTotal: reactionMs,
              fecha: data.fecha,
            });
          }
        });

        if (fallbackUserEntry) {
          const idx = entries.findIndex(
            (e) => e.userId === fallbackUserEntry.userId
          );
          if (idx >= 0) {
            const current = entries[idx];
            const isBetter =
              fallbackUserEntry.puntajeTotal > current.puntajeTotal ||
              (fallbackUserEntry.puntajeTotal === current.puntajeTotal &&
                fallbackUserEntry.tiempoReaccionTotal <
                  current.tiempoReaccionTotal);
            if (isBetter) {
              entries[idx] = fallbackUserEntry;
            }
          } else {
            entries.push(fallbackUserEntry);
          }
        }

        // Ordenar por mayor puntajeTotal y desempatar por menor tiempoReaccionTotal (ms)
        entries.sort((a, b) => {
          if (b.puntajeTotal !== a.puntajeTotal) {
            return b.puntajeTotal - a.puntajeTotal;
          }
          return a.tiempoReaccionTotal - b.tiempoReaccionTotal;
        });
        return entries;
      } catch (err) {
        console.warn("No se pudo cargar el leaderboard semanal:", err);
        return fallbackUserEntry ? [fallbackUserEntry] : [];
      }
    },
    []
  );

  // 1. Verificar día de la semana (Lunes a Jueves), intentos semanales (5 máx.) y medallas en Firestore
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

        const intentosRef = doc(
          db,
          "users",
          user.uid,
          "intentosVuelta",
          SEMANA_GP_ID
        );
        const recordRef = doc(
          db,
          "users",
          user.uid,
          "recordsVuelta",
          SEMANA_GP_ID
        );
        const userRef = doc(db, "users", user.uid);

        const [intentosSnap, recordSnap, userSnap] = await Promise.all([
          getDoc(intentosRef),
          getDoc(recordRef),
          getDoc(userRef),
        ]);

        if (!isMounted) return;

        const currentCount = intentosSnap.exists()
          ? typeof intentosSnap.data().contador === "number"
            ? intentosSnap.data().contador
            : 0
          : 0;
        setWeeklyAttempts(currentCount);

        // Cargar contador histórico de Vueltas Perfectas (40/40)
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const perfectCount =
            typeof userData.vueltasPerfectas === "number"
              ? userData.vueltasPerfectas
              : typeof userData.badges_progress?.vueltas_perfectas === "number"
              ? userData.badges_progress.vueltas_perfectas
              : 0;
          setVueltasPerfectas(perfectCount);
        } else if (typeof profile?.vueltasPerfectas === "number") {
          setVueltasPerfectas(profile.vueltasPerfectas);
        }

        let userBestScore: number | null = null;
        let userBestMs: number | null = null;
        if (recordSnap.exists()) {
          const rData = recordSnap.data();
          const scoreVal =
            typeof rData.puntajeTotal === "number"
              ? rData.puntajeTotal
              : typeof rData.puntaje === "number"
              ? rData.puntaje
              : null;
          const msVal =
            typeof rData.tiempoReaccionTotal === "number"
              ? rData.tiempoReaccionTotal
              : null;

          if (scoreVal !== null) {
            userBestScore = scoreVal;
            setWeeklyRecord(scoreVal);
          }
          if (msVal !== null) {
            userBestMs = msVal;
            setWeeklyBestReactionMs(msVal);
          }
        }

        const displayName =
          profile?.nombre ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "Piloto";

        const board = await fetchWeeklyLeaderboard(
          SEMANA_GP_ID,
          userBestScore !== null
            ? {
                userId: user.uid,
                nombre: displayName,
                puntajeTotal: userBestScore,
                tiempoReaccionTotal: userBestMs ?? 8000,
              }
            : undefined
        );

        if (isMounted) {
          setLeaderboard(board);
        }
      } catch (error) {
        console.error(
          "Error al verificar intentos semanales de Vuelta Rápida:",
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
  }, [
    user?.uid,
    user?.displayName,
    user?.email,
    profile?.nombre,
    profile?.vueltasPerfectas,
    authLoading,
    fetchWeeklyLeaderboard,
    SEMANA_GP_ID,
  ]);

  // Disparar cartel flotante efímero sobre el APEX evaluado
  const spawnFloatingFeedback = useCallback(
    (apex: CircuitApexConfig, tier: HitTier, customSubtext?: string) => {
      const config: Record<HitTier, { text: string; defaultSub: string }> = {
        violeta: { text: "¡VIOLETA! +5", defaultSub: "≤ 25ms • MILIMÉTRICO" },
        verde: { text: "¡VERDE! +3", defaultSub: "≤ 50ms • GRAN TRAZADA" },
        amarillo: { text: "¡AMARILLO! +1", defaultSub: "≤ 100ms • AL LÍMITE" },
        rojo: { text: "¡ROJO! +0", defaultSub: "> 100ms • FUERA DE TIEMPO" },
      };

      const item: FloatingFeedback = {
        key: `${apex.id}-${performance.now()}`,
        apexId: apex.id,
        x: Math.min(410, Math.max(85, apex.x)),
        y: Math.max(48, apex.y),
        text: config[tier].text,
        subtext: customSubtext || config[tier].defaultSub,
        tier,
      };

      setFloatingFeedbacks((prev) => [...prev, item]);

      setTimeout(() => {
        setFloatingFeedbacks((prev) => prev.filter((f) => f.key !== item.key));
      }, 950);
    },
    []
  );

  // Registrar resultado y milisegundos de reacción de un APEX de forma sincrónica y en estado React
  const recordApexOutcome = useCallback(
    (
      apex: CircuitApexConfig,
      tier: HitTier,
      reactionMs: number,
      subtext?: string
    ) => {
      if (apexResultsRef.current[apex.id]) return;
      apexResultsRef.current = {
        ...apexResultsRef.current,
        [apex.id]: tier,
      };
      apexReactionMsRef.current = {
        ...apexReactionMsRef.current,
        [apex.id]: Math.max(0, Math.round(reactionMs)),
      };
      setApexResults({ ...apexResultsRef.current });
      spawnFloatingFeedback(apex, tier, subtext);
    },
    [spawnFloatingFeedback]
  );

  // Finalizar vuelta y guardar intento semanal + récord con desempate en ms + medallas 40/40 en Firestore
  const handleFinishLap = useCallback(async () => {
    if (hasFinishedLapRef.current) return;
    hasFinishedLapRef.current = true;
    isRunningRef.current = false;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Cualquier APEX no presionado al concluir la vuelta queda como ROJO (0 pts) y MISS_PENALTY_MS
    const finalMap: Record<number, HitTier> = { ...apexResultsRef.current };
    const finalReactionMap: Record<number, number> = {
      ...apexReactionMsRef.current,
    };

    const activeApexes = calibratedApexesRef.current.length > 0
      ? calibratedApexesRef.current
      : currentApexes;

    activeApexes.forEach((ap) => {
      if (!finalMap[ap.id]) {
        finalMap[ap.id] = "rojo";
      }
      if (typeof finalReactionMap[ap.id] !== "number") {
        finalReactionMap[ap.id] = MISS_PENALTY_MS;
      }
    });
    apexResultsRef.current = finalMap;
    apexReactionMsRef.current = finalReactionMap;
    setApexResults(finalMap);

    let puntajeTotal = 0;
    Object.values(finalMap).forEach((tier) => {
      if (tier === "violeta") puntajeTotal += 5;
      else if (tier === "verde") puntajeTotal += 3;
      else if (tier === "amarillo") puntajeTotal += 1;
    });

    const tiempoReaccionTotal = activeApexes.reduce(
      (acc, ap) => acc + (finalReactionMap[ap.id] ?? MISS_PENALTY_MS),
      0
    );
    setLastLapReactionMs(tiempoReaccionTotal);

    const nextAttempts = weeklyAttempts + 1;
    setWeeklyAttempts(nextAttempts);

    // Solo actualizar el récord semanal si el nuevo puntajeTotal es mayor,
    // O si el puntajeTotal es igual y el nuevo tiempoReaccionTotal es menor (más rápido)
    const prevBestScore = weeklyRecord;
    const prevBestMs = weeklyBestReactionMs;
    const achievedNewBest =
      prevBestScore === null ||
      puntajeTotal > prevBestScore ||
      (puntajeTotal === prevBestScore &&
        (prevBestMs === null || tiempoReaccionTotal < prevBestMs));

    const bestScoreToKeep = achievedNewBest
      ? puntajeTotal
      : prevBestScore ?? puntajeTotal;
    const bestMsToKeep = achievedNewBest
      ? tiempoReaccionTotal
      : prevBestMs ?? tiempoReaccionTotal;

    setWeeklyRecord(bestScoreToKeep);
    setWeeklyBestReactionMs(bestMsToKeep);
    setIsNewWeeklyBest(achievedNewBest);

    // Verificar si clavó Puntaje Perfecto Histórico (40 / 40 puntos)
    const isPerfectLap = puntajeTotal === MAX_POSSIBLE_POINTS;
    let nextPerfectCount = vueltasPerfectas;
    if (isPerfectLap) {
      nextPerfectCount = vueltasPerfectas + 1;
      setVueltasPerfectas(nextPerfectCount);

      if (nextPerfectCount === 1) {
        setUnlockedMedalAlert({
          tier: "bronce",
          title: "¡Medalla de Bronce Desbloqueada!",
          subtitle:
            "Conseguiste tu primera Vuelta Perfecta histórica (40/40 puntos) clavando los 8 sectores en violeta.",
          vueltasPerfectas: nextPerfectCount,
        });
      } else if (nextPerfectCount === 5) {
        setUnlockedMedalAlert({
          tier: "plata",
          title: "¡Medalla de Plata Desbloqueada!",
          subtitle:
            "Alcanzaste 5 Vueltas Perfectas históricas (40/40 puntos). Precisión de ingeniero de telemetría.",
          vueltasPerfectas: nextPerfectCount,
        });
      } else if (nextPerfectCount === 10) {
        setUnlockedMedalAlert({
          tier: "oro",
          title: "¡Medalla de Oro Desbloqueada!",
          subtitle:
            "¡Hazaña legendaria! Lograste 10 Vueltas Perfectas históricas (40/40 puntos) en GridProde F1.",
          vueltasPerfectas: nextPerfectCount,
        });
      }
    }

    setIsFinished(true);
    setIsSavingLap(true);

    const now = new Date();
    const displayName =
      profile?.nombre ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Piloto GridProde";

    try {
      if (db && user?.uid) {
        // 1. Guardar contador de intentos de la semana (máx. 5)
        const intentosRef = doc(
          db,
          "users",
          user.uid,
          "intentosVuelta",
          SEMANA_GP_ID
        );
        await setDoc(
          intentosRef,
          {
            contador: nextAttempts,
            semanaId: SEMANA_GP_ID,
            circuitoId: currentCircuit.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 2. Si superó su marca semanal (o empató en puntos con menor tiempoReaccionTotal), actualizar récord
        if (achievedNewBest) {
          const userRecordRef = doc(
            db,
            "users",
            user.uid,
            "recordsVuelta",
            SEMANA_GP_ID
          );
          const leaderboardParticipantRef = doc(
            db,
            "vuelta_rapida_semanal",
            SEMANA_GP_ID,
            "participantes",
            user.uid
          );

          const recordPayload = {
            userId: user.uid,
            nombre: displayName,
            puntajeTotal,
            puntaje: puntajeTotal,
            tiempoReaccionTotal,
            circuitoId: currentCircuit.id,
            semanaId: SEMANA_GP_ID,
            fecha: now.toISOString(),
            updatedAt: serverTimestamp(),
          };

          await Promise.all([
            setDoc(userRecordRef, recordPayload, { merge: true }),
            setDoc(leaderboardParticipantRef, recordPayload, { merge: true }),
          ]);
        }

        // 3. Si logró puntaje perfecto (40 pts), incrementar vueltasPerfectas en users/{userId}
        if (isPerfectLap) {
          const userDocRef = doc(db, "users", user.uid);
          const currentBadges = profile?.badges_progress || {};
          await setDoc(
            userDocRef,
            {
              vueltasPerfectas: nextPerfectCount,
              badges_progress: {
                ...currentBadges,
                vueltas_perfectas: nextPerfectCount,
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          await refreshProfile();
        }

        const updatedBoard = await fetchWeeklyLeaderboard(SEMANA_GP_ID, {
          userId: user.uid,
          nombre: displayName,
          puntajeTotal: bestScoreToKeep,
          tiempoReaccionTotal: bestMsToKeep,
          fecha: now.toISOString(),
        });
        setLeaderboard(updatedBoard);
      }
    } catch (error) {
      console.error(
        "Error al guardar intento semanal y récord en Firestore:",
        error
      );
    } finally {
      setIsSavingLap(false);
    }
  }, [
    weeklyAttempts,
    weeklyRecord,
    weeklyBestReactionMs,
    vueltasPerfectas,
    profile?.nombre,
    profile?.badges_progress,
    user?.uid,
    user?.displayName,
    user?.email,
    refreshProfile,
    fetchWeeklyLeaderboard,
    currentCircuit,
    SEMANA_GP_ID,
  ]);

  const handleFinishLapRef = useRef(handleFinishLap);
  useEffect(() => {
    handleFinishLapRef.current = handleFinishLap;
  }, [handleFinishLap]);

  const recordApexOutcomeRef = useRef(recordApexOutcome);
  useEffect(() => {
    recordApexOutcomeRef.current = recordApexOutcome;
  }, [recordApexOutcome]);

  // Bucle imperativo de alta frecuencia (10 segundos, velocidad variable F1 y sentido antihorario)
  const startImmediateLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const pathEl = trackPathRef.current;
    if (pathEl && totalPathLengthRef.current <= 0) {
      totalPathLengthRef.current = pathEl.getTotalLength();
    }

    const startTimestamp = performance.now();
    startTimeRef.current = startTimestamp;
    isRunningRef.current = true;
    hasFinishedLapRef.current = false;

    const missToleranceMs = TOLERANCE_AMARILLO_S * 1000; // 100ms

    const tick = (now: number) => {
      if (!isRunningRef.current) return;

      const elapsed = Math.max(0, now - startTimeRef.current);
      const clampedElapsed = Math.min(elapsed, LAP_DURATION_MS);

      // Actualizar cronómetro directamente en el DOM (10.00s)
      if (timerDisplayRef.current) {
        timerDisplayRef.current.textContent = `${(clampedElapsed / 1000).toFixed(2)}s / 10.00s`;
      }

      // Calcular posición mediante física F1 basada en curvatura (Curvature-based speed)
      const currentPath = trackPathRef.current;
      const totalLen =
        totalPathLengthRef.current ||
        (currentPath ? currentPath.getTotalLength() : 0);

      if (currentPath && totalLen > 0) {
        const profile = curvatureProfileRef.current;
        const variableProgress = profile
          ? getProgressFromTime(profile, clampedElapsed)
          : computeF1VariableProgress(clampedElapsed, waypointsRef.current);
        const pt = currentPath.getPointAtLength(variableProgress * totalLen);
        setDotDomPosition(pt.x, pt.y);
      }

      // Marcar automáticamente como ROJO (0 pts) cualquier APEX no presionado tras > 0.1s (100ms)
      const apexes = calibratedApexesRef.current.length > 0
        ? calibratedApexesRef.current
        : currentApexes;
      for (let i = 0; i < apexes.length; i++) {
        const ap = apexes[i];
        if (!apexResultsRef.current[ap.id]) {
          if (clampedElapsed > ap.idealTimeMs + missToleranceMs) {
            recordApexOutcomeRef.current(
              ap,
              "rojo",
              MISS_PENALTY_MS,
              "NO PRESIONADO"
            );
          }
        }
      }

      if (elapsed >= LAP_DURATION_MS) {
        handleFinishLapRef.current();
        return;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Ejecutar el primer paso de inmediato (0ms de espera)
    tick(startTimestamp);
  }, [setDotDomPosition, currentCircuit]);

  // Limpiar animación al desmontar el componente
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Acción "¡ARRANCAR!" con respuesta instantánea (0ms delay)
  const handleStartLap = useCallback(() => {
    if (weeklyAttempts >= MAX_WEEKLY_ATTEMPTS || isRunningRef.current) return;

    apexResultsRef.current = {};
    apexReactionMsRef.current = {};
    setApexResults({});
    setFloatingFeedbacks([]);
    setIsNewWeeklyBest(false);
    setIsFinished(false);
    setHasStarted(true);

    setDotDomPosition(
      currentCircuit.startPoint.x,
      currentCircuit.startPoint.y
    );

    startImmediateLoop();
  }, [weeklyAttempts, setDotDomPosition, startImmediateLoop, currentCircuit]);

  // Acción "¡DOBLAR!" con Dificultad Extrema (Hitbox milimétrica: 25ms / 50ms / 100ms)
  const handleTurnAction = useCallback(() => {
    if (!isRunningRef.current) return;

    const currentElapsedMs = Math.min(
      Math.max(0, performance.now() - startTimeRef.current),
      LAP_DURATION_MS
    );

    const activeApexes = calibratedApexesRef.current.length > 0
      ? calibratedApexesRef.current
      : currentApexes;
    const pendingApexes = activeApexes.filter(
      (ap) => !apexResultsRef.current[ap.id]
    );
    if (pendingApexes.length === 0) return;

    // Identificar el APEX pendiente más cercano al instante exacto de la pulsación
    let closestApex = pendingApexes[0];
    let minDiffMs = Math.abs(currentElapsedMs - closestApex.idealTimeMs);

    for (let i = 1; i < pendingApexes.length; i++) {
      const candidate = pendingApexes[i];
      const diff = Math.abs(currentElapsedMs - candidate.idealTimeMs);
      if (diff < minDiffMs) {
        minDiffMs = diff;
        closestApex = candidate;
      }
    }

    // Si algún APEX anterior quedó sin evaluar, marcarlo como ROJO (0 pts) y MISS_PENALTY_MS
    for (const ap of pendingApexes) {
      if (ap.id < closestApex.id) {
        recordApexOutcome(ap, "rojo", MISS_PENALTY_MS, "PASADO DE LARGO");
      }
    }

    const roundedDiffMs = Math.max(0, Math.round(minDiffMs));
    const diffSeconds = minDiffMs / 1000;
    const deltaMsText = `${roundedDiffMs}ms`;

    if (diffSeconds <= TOLERANCE_VIOLETA_S) {
      // <= 0.025s (25ms): VIOLETA 🟣 (+5 pts)
      recordApexOutcome(closestApex, "violeta", roundedDiffMs, `Δ ${deltaMsText}`);
    } else if (diffSeconds <= TOLERANCE_VERDE_S) {
      // <= 0.05s (50ms): VERDE 🟢 (+3 pts)
      recordApexOutcome(closestApex, "verde", roundedDiffMs, `Δ ${deltaMsText}`);
    } else if (diffSeconds <= TOLERANCE_AMARILLO_S) {
      // <= 0.1s (100ms): AMARILLO 🟡 (+1 pt)
      recordApexOutcome(closestApex, "amarillo", roundedDiffMs, `Δ ${deltaMsText}`);
    } else {
      // > 0.1s (100ms): ROJO 🔴 (0 pts)
      recordApexOutcome(closestApex, "rojo", roundedDiffMs, `Δ ${deltaMsText}`);
    }
  }, [recordApexOutcome, currentCircuit]);

  // Reiniciar para otro intento (si le quedan intentos de la semana)
  const handleResetToIdle = useCallback(() => {
    if (weeklyAttempts >= MAX_WEEKLY_ATTEMPTS) return;
    isRunningRef.current = false;
    hasFinishedLapRef.current = false;
    apexResultsRef.current = {};
    apexReactionMsRef.current = {};
    setApexResults({});
    setFloatingFeedbacks([]);
    setHasStarted(false);
    setIsFinished(false);
    setDotDomPosition(
      currentCircuit.startPoint.x,
      currentCircuit.startPoint.y
    );
    if (timerDisplayRef.current) {
      timerDisplayRef.current.textContent = "0.00s / 10.00s";
    }
  }, [weeklyAttempts, setDotDomPosition, currentCircuit]);

  // Próximo APEX pendiente para resaltarlo en pista
  const nextPendingApex = React.useMemo(() => {
    const activeApexes = calibratedApexesRef.current.length > 0
      ? calibratedApexesRef.current
      : currentApexes;
    return activeApexes.find((ap) => !apexResults[ap.id]) || null;
  }, [apexResults, currentApexes]);

  // =========================================================================
  // MODO EDICIÓN VISUAL DE APEX (HERRAMIENTA EXCLUSIVA PARA ADMINISTRADORES)
  // =========================================================================
  const handleUndoApex = useCallback(() => {
    setEditedApexes((prev) => prev.slice(0, -1));
  }, []);

  const handleResetApexes = useCallback(() => {
    setEditedApexes([]);
    setHoverPoint(null);
  }, []);

  const handleLoadCurrentApexes = useCallback(() => {
    setEditedApexes([...currentApexes]);
  }, [currentApexes]);

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isEditMode || !svgCanvasRef.current || !trackPathRef.current) return;
      if (editedApexes.length >= 8) {
        setShowExportModal(true);
        return;
      }

      const svgEl = svgCanvasRef.current;
      const pathEl = trackPathRef.current;

      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return;
      const svgCoords = pt.matrixTransform(ctm.inverse());
      const clickX = svgCoords.x;
      const clickY = svgCoords.y;

      const totalLen =
        totalPathLengthRef.current > 0
          ? totalPathLengthRef.current
          : pathEl.getTotalLength();
      if (totalLen <= 0) return;

      // 1. Muestreo denso de 1000 puntos para hallar el progreso más cercano en la pista
      const SAMPLES = 1000;
      let bestP = 0;
      let minSq = Infinity;
      for (let i = 0; i <= SAMPLES; i++) {
        const p = i / SAMPLES;
        const pathPoint = pathEl.getPointAtLength(p * totalLen);
        const dx = pathPoint.x - clickX;
        const dy = pathPoint.y - clickY;
        const distSq = dx * dx + dy * dy;
        if (distSq < minSq) {
          minSq = distSq;
          bestP = p;
        }
      }

      // 2. Refinamiento fino local (±0.02 con 50 pasos)
      const localSteps = 50;
      const searchHalfWidth = 0.02;
      const minSearch = Math.max(0, bestP - searchHalfWidth);
      const maxSearch = Math.min(1, bestP + searchHalfWidth);
      for (let j = 0; j <= localSteps; j++) {
        const p = minSearch + ((maxSearch - minSearch) * j) / localSteps;
        const pathPoint = pathEl.getPointAtLength(p * totalLen);
        const dx = pathPoint.x - clickX;
        const dy = pathPoint.y - clickY;
        const distSq = dx * dx + dy * dy;
        if (distSq < minSq) {
          minSq = distSq;
          bestP = p;
        }
      }

      const finalPoint = pathEl.getPointAtLength(bestP * totalLen);
      const calculatedX = Math.round(finalPoint.x * 10) / 10;
      const calculatedY = Math.round(finalPoint.y * 10) / 10;
      const roundedProgress = Math.round(bestP * 10000) / 10000;

      const profile =
        curvatureProfileRef.current ||
        computeCurvatureSpeedProfile(pathEl, LAP_DURATION_MS, 600);
      const idealTimeMs = Math.round(getTimeFromProgress(profile, bestP));
      const idealTime = Math.round((idealTimeMs / 1000) * 100) / 100;

      const newId = editedApexes.length + 1;
      const existingName =
        currentCircuit.apexes.find((a) => a.id === newId)?.name ||
        `Curva ${newId}`;

      const newApex: ApexCoordinate = {
        id: newId,
        name: existingName,
        x: calculatedX,
        y: calculatedY,
        progress: roundedProgress,
        idealTime,
        idealTimeMs,
        labelOffsetX: newId % 2 === 0 ? 38 : -38,
        labelOffsetY: 4,
      };

      const updated = [...editedApexes, newApex];
      setEditedApexes(updated);

      if (updated.length === 8) {
        setShowExportModal(true);
      }
    },
    [isEditMode, editedApexes, currentCircuit]
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isEditMode || !svgCanvasRef.current || !trackPathRef.current) return;
      const svgEl = svgCanvasRef.current;
      const pathEl = trackPathRef.current;

      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return;
      const svgCoords = pt.matrixTransform(ctm.inverse());
      const clickX = svgCoords.x;
      const clickY = svgCoords.y;

      const totalLen =
        totalPathLengthRef.current > 0
          ? totalPathLengthRef.current
          : pathEl.getTotalLength();
      if (totalLen <= 0) return;

      const SAMPLES = 250;
      let bestP = 0;
      let minSq = Infinity;
      for (let i = 0; i <= SAMPLES; i++) {
        const p = i / SAMPLES;
        const pathPoint = pathEl.getPointAtLength(p * totalLen);
        const dx = pathPoint.x - clickX;
        const dy = pathPoint.y - clickY;
        const distSq = dx * dx + dy * dy;
        if (distSq < minSq) {
          minSq = distSq;
          bestP = p;
        }
      }

      const finalPoint = pathEl.getPointAtLength(bestP * totalLen);
      setHoverPoint({
        x: Math.round(finalPoint.x * 10) / 10,
        y: Math.round(finalPoint.y * 10) / 10,
        progress: Math.round(bestP * 10000) / 10000,
      });
    },
    [isEditMode]
  );

  const formattedApexesCode = useMemo(() => {
    const listToExport =
      editedApexes.length > 0 ? editedApexes : currentApexes;
    const lines = listToExport.map((ap) => {
      return `    {
      id: ${ap.id},
      name: "${ap.name}",
      x: ${ap.x},
      y: ${ap.y},
      progress: ${ap.progress},
      idealTime: ${ap.idealTime},
      idealTimeMs: ${ap.idealTimeMs},
      labelOffsetX: ${ap.labelOffsetX ?? 35},
      labelOffsetY: ${ap.labelOffsetY ?? 4},
    },`;
    });

    return `  apexes: [\n${lines.join("\n")}\n  ],`;
  }, [editedApexes, currentApexes]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedApexesCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  }, [formattedApexesCode]);

  const fastestLapHolder = leaderboard.length > 0 ? leaderboard[0] : null;
  const attemptsRemaining = Math.max(0, MAX_WEEKLY_ATTEMPTS - weeklyAttempts);
  const currentPerfectMedalTier = getPerfectLapMedalTier(vueltasPerfectas);

  return (
    <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col select-none">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3 sm:space-y-5">
          {/* Barra superior de retorno + Indicador de Intentos de la Semana (X / 5) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/minijuegos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F1F27]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-[#D0D0D2] hover:text-white hover:border-white/20 transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span>Volver al Hub</span>
              </Link>

              {/* Botón de Edición (Solo Admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditMode((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                    isEditMode
                      ? "bg-amber-500 text-black border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/50"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400"
                  }`}
                  title="Herramienta para calibrar y mapear visualmente los APEX del circuito"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>
                    {isEditMode ? "Modo Edición ACTIVO" : "Activar Modo Edición APEX"}
                  </span>
                </button>
              )}
            </div>

            {!checkingAccess && isDayAllowed && (
              <div className="flex flex-wrap items-center gap-2">
                {weeklyRecord !== null && (
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F1F27]/80 border border-purple-500/30 text-xs font-bold text-purple-300">
                    <Trophy className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      Récord Semanal:{" "}
                      <strong className="text-white font-mono">
                        {weeklyRecord} pts
                      </strong>
                      {weeklyBestReactionMs !== null && (
                        <span className="ml-1 text-[11px] text-cyan-300 font-mono">
                          ({weeklyBestReactionMs} ms)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-xs sm:text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <span>
                    Intentos de la semana:{" "}
                    {Math.min(weeklyAttempts, MAX_WEEKLY_ATTEMPTS)} /{" "}
                    {MAX_WEEKLY_ATTEMPTS}
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
                  Verificando disponibilidad de pista y tus intentos de la semana en Firestore.
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
                  Durante el fin de semana de Gran Premio la actividad se traslada a la pista real y el ganador semanal recibe{" "}
                  <strong className="text-emerald-400">+1 punto extra</strong> en su predicción del GP. Regresa el lunes para competir.
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
          ) : weeklyAttempts >= MAX_WEEKLY_ATTEMPTS && !isFinished ? (
            /* =============================================================== */
            /* 3. BLOQUEO POR LÍMITE DE 5 INTENTOS SEMANALES AGOTADOS          */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl space-y-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                  <Lock className="w-10 h-10" />
                </div>

                <div className="space-y-3 max-w-lg mx-auto">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                    <Timer className="w-3.5 h-3.5" />
                    <span>
                      Intentos de la semana: {MAX_WEEKLY_ATTEMPTS} /{" "}
                      {MAX_WEEKLY_ATTEMPTS}
                    </span>
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    ¡Ya completaste tus 5 intentos de la semana!
                  </h1>
                  <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed">
                    El juego queda bloqueado hasta la próxima semana. El único ganador semanal (mayor puntaje y menor tiempo de reacción en ms) recibirá{" "}
                    <strong className="text-emerald-400">+1 punto extra</strong> en su predicción del Gran Premio.
                  </p>
                  {weeklyRecord !== null && (
                    <p className="text-sm font-bold text-purple-300 pt-1">
                      Tu mejor marca semanal:{" "}
                      <span className="font-mono text-white">
                        {weeklyRecord} pts
                      </span>{" "}
                      / {MAX_POSSIBLE_POINTS} pts
                      {weeklyBestReactionMs !== null && (
                        <span className="ml-1.5 font-mono text-cyan-300">
                          • {weeklyBestReactionMs} ms
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabla Semanal con Desempate por Milisegundos */}
              <div className="max-w-2xl mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Tabla Semanal • Desempate por Milisegundos
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                    {currentCircuit.grandPrix}
                  </span>
                </div>

                {fastestLapHolder ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-[#1F1F27] to-[#1F1F27] border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500 text-white font-mono font-black text-sm flex items-center justify-center shadow-md shrink-0">
                          P1
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                              🟣 Récord de Vuelta Rápida
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                              <Zap className="w-2.5 h-2.5 text-emerald-400 fill-current" />
                              +1 pt extra en GP
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-white mt-0.5">
                            {fastestLapHolder.nombre}
                            {fastestLapHolder.userId === user?.uid && (
                              <span className="ml-2 text-xs font-bold text-cyan-400">
                                (Tú)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right pl-13 sm:pl-0">
                        <p className="text-xl sm:text-2xl font-black font-mono text-purple-300">
                          {fastestLapHolder.puntajeTotal} pts
                        </p>
                        <p className="text-xs font-mono font-bold text-cyan-300">
                          ⏱️ {fastestLapHolder.tiempoReaccionTotal} ms
                        </p>
                      </div>
                    </div>

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
                        <div className="flex items-center gap-3 font-mono">
                          <span className="font-black text-[#D0D0D2]">
                            {entry.puntajeTotal} pts
                          </span>
                          <span className="text-xs text-cyan-300 font-bold">
                            {entry.tiempoReaccionTotal} ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8E93] text-center py-3">
                    Aún no hay registros semanales cargados.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-center">
                <Link
                  href="/minijuegos"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : isFinished ? (
            /* =============================================================== */
            /* 4. PANTALLA FINAL DE RESUMEN, LEADERBOARD Y MEDALLAS 40/40      */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/85 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 mx-auto shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <Flag className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {counts.totalPoints === MAX_POSSIBLE_POINTS
                      ? "¡VUELTA PERFECTA HISTÓRICA (40/40 PTS)!"
                      : isNewWeeklyBest
                      ? "¡Nuevo Récord Personal de la Semana!"
                      : "Bandera a Cuadros • Vuelta Completada"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Resumen de tu Vuelta Rápida
                </h1>
              </div>

              {/* Tarjetas de Puntaje de la Vuelta, Tiempo de Reacción y Récord de la Semana */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 text-center space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#8E8E93]">
                    Puntaje de la Vuelta
                  </p>
                  <p className="text-3xl font-black font-mono text-white">
                    {counts.totalPoints}{" "}
                    <span className="text-sm text-[#8E8E93]">
                      / {MAX_POSSIBLE_POINTS} pts
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl bg-[#15151E]/95 border border-cyan-500/30 p-5 text-center space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
                    Reacción Total (8 Curvas)
                  </p>
                  <p className="text-3xl font-black font-mono text-cyan-300">
                    {lastLapReactionMs}{" "}
                    <span className="text-sm text-[#8E8E93]">ms</span>
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-purple-950/60 to-[#15151E] border border-purple-500/40 p-5 text-center space-y-1 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
                  <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                    Mejor Marca Semanal
                  </p>
                  <p className="text-2xl font-black font-mono text-purple-300">
                    {weeklyRecord ?? counts.totalPoints} pts
                  </p>
                  <p className="text-xs font-mono font-bold text-cyan-300">
                    ⏱️ {weeklyBestReactionMs ?? lastLapReactionMs} ms
                  </p>
                </div>
              </div>

              {/* Desglose de Sectores / Curvas de la vuelta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
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

              {/* Mini Leaderboard Semanal (Desempate por Milisegundos) */}
              <div className="max-w-3xl mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Tabla Semanal • Desempate por Milisegundos
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                    {currentCircuit.grandPrix}
                  </span>
                </div>

                {fastestLapHolder ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-[#1F1F27] to-[#1F1F27] border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500 text-white font-mono font-black text-sm flex items-center justify-center shadow-md shrink-0">
                          P1
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                              🟣 Récord de Vuelta Rápida
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                              <Zap className="w-2.5 h-2.5 text-emerald-400 fill-current" />
                              +1 pt extra en GP
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-white mt-0.5">
                            {fastestLapHolder.nombre}
                            {fastestLapHolder.userId === user?.uid && (
                              <span className="ml-2 text-xs font-bold text-cyan-400">
                                (Tú)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right pl-13 sm:pl-0">
                        <p className="text-xl sm:text-2xl font-black font-mono text-purple-300">
                          {fastestLapHolder.puntajeTotal} pts
                        </p>
                        <p className="text-xs font-mono font-bold text-cyan-300">
                          ⏱️ {fastestLapHolder.tiempoReaccionTotal} ms
                        </p>
                      </div>
                    </div>

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
                        <div className="flex items-center gap-3 font-mono">
                          <span className="font-black text-[#D0D0D2]">
                            {entry.puntajeTotal} pts
                          </span>
                          <span className="text-xs text-cyan-300 font-bold">
                            {entry.tiempoReaccionTotal} ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8E93] text-center py-3">
                    Aún no hay registros semanales cargados.
                  </p>
                )}
              </div>

              {/* Sistema de Medallas por Puntaje Perfecto Histórico (40/40 pts) */}
              <div className="max-w-3xl mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Medal className="w-5 h-5 text-amber-400" />
                    <div>
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                        Logros Históricos • Vuelta Perfecta (40/40 pts)
                      </h2>
                      <p className="text-[11px] text-[#8E8E93]">
                        Clavá los 8 sectores en violeta (40 puntos) para desbloquear medallas de Bronce, Plata y Oro en tu vitrina.
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black font-mono">
                    Vueltas Perfectas: {vueltasPerfectas}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PERFECT_MEDAL_TIERS.map((medal) => {
                    const isUnlocked = vueltasPerfectas >= medal.threshold;
                    return (
                      <div
                        key={medal.tier}
                        className={`relative rounded-2xl bg-gradient-to-b p-4 border flex flex-col items-center text-center transition-all ${
                          isUnlocked
                            ? `${medal.bgClass} ${medal.borderClass} ${medal.glowClass}`
                            : "from-[#1A1A24]/70 to-[#12121A]/80 border-[#2D2D38] opacity-65"
                        }`}
                      >
                        <ThemedTrophy
                          badgeId="vueltas_perfectas"
                          tier={isUnlocked ? medal.tier : "bloqueado"}
                          isZero={!isUnlocked}
                          className="w-20 h-20"
                        />
                        <span
                          className={`mt-2 text-xs font-black uppercase tracking-wider ${
                            isUnlocked ? medal.textClass : "text-[#8E8E93]"
                          }`}
                        >
                          Medalla de {medal.label}
                        </span>
                        <p className="text-[11px] font-bold text-white mt-0.5">
                          {medal.reqText}
                        </p>
                        <span
                          className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isUnlocked
                              ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                              : "bg-[#15151E] border border-white/10 text-[#8E8E93]"
                          }`}
                        >
                          {isUnlocked
                            ? "Desbloqueada"
                            : `${Math.min(vueltasPerfectas, medal.threshold)} / ${medal.threshold}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción: Reiniciar (si quedan intentos de la semana) o Volver al Hub */}
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
                        ? "intento semanal disponible"
                        : "intentos semanales disponibles"}
                      )
                    </span>
                  </button>
                ) : (
                  <div className="px-5 py-3 rounded-2xl bg-[#15151E] border border-white/10 text-xs font-bold text-amber-300">
                    ¡Ya completaste tus 5 intentos de la semana! Regresa la próxima semana.
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
            /* 5. INTERFAZ PRINCIPAL DEL JUEGO (HUD + SVG OFICIAL MAXIMIZADO)  */
            /* =============================================================== */
            <div className="space-y-3 sm:space-y-4">
              {/* HUD Superior Compacto: Puntuación Acumulada y Desglose en Tiempo Real */}
              <div className="rounded-2xl sm:rounded-3xl bg-[#1F1F27]/85 backdrop-blur-xl border border-white/10 p-3 sm:p-5 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Título del circuito activo y Cronómetro de Vuelta (10.00s) */}
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block">
                          {currentCircuit.grandPrix} • Giro {currentCircuit.direction || "Antihorario"}
                        </span>
                        <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                          Vuelta Rápida • 10s
                        </h1>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-xl bg-[#15151E] border border-white/10 font-mono text-xs sm:text-sm font-black text-cyan-300">
                      <span ref={timerDisplayRef}>0.00s / 10.00s</span>
                    </div>
                  </div>

                  {/* Puntos en tiempo real y desglose por color */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                    <div className="px-3.5 py-1.5 rounded-xl bg-[#15151E] border border-cyan-400/40 text-xs sm:text-sm font-black text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                      Puntos:{" "}
                      <span className="text-cyan-400 font-mono">
                        {counts.totalPoints}
                      </span>{" "}
                      pts
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-black font-mono">
                      <span className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300">
                        🟣 Violeta: {counts.violeta}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        🟢 Verde: {counts.verde}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300">
                        🟡 Amarillo: {counts.amarillo}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300">
                        🔴 Rojo: {counts.rojo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenedor Interactivo del Trazado SVG Oficial Maximizado en Móvil */}
              <div className="relative rounded-2xl sm:rounded-3xl bg-[#111118]/90 backdrop-blur-xl border border-white/10 p-1.5 sm:p-4 shadow-2xl overflow-hidden">
                <div className="absolute -top-24 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Barra de Controles de Edición APEX (Solo Admin cuando isEditMode = true) */}
                {isEditMode ? (
                  <div className="relative z-20 mb-2 p-2.5 sm:p-3 rounded-2xl bg-amber-500/15 border border-amber-400/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shadow-xl">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                            Modo Edición APEX
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono font-bold text-white">
                            {editedApexes.length}/8 puntos
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-100/80">
                          {editedApexes.length < 8
                            ? `Haz click sobre la pista para fijar el APEX ${editedApexes.length + 1} de 8`
                            : "¡Los 8 APEX están fijados! Revisa o exporta el código."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleUndoApex}
                        disabled={editedApexes.length === 0}
                        className="px-2.5 py-1 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-white/20 disabled:opacity-40 text-xs font-bold text-[#D0D0D2] inline-flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Deshacer el último APEX colocado"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Deshacer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetApexes}
                        disabled={editedApexes.length === 0}
                        className="px-2.5 py-1 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-red-500/40 text-xs font-bold text-red-300 disabled:opacity-40 inline-flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Borrar todos los puntos colocados"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reiniciar</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLoadCurrentApexes}
                        className="px-2.5 py-1 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-cyan-500/40 text-xs font-bold text-cyan-300 inline-flex items-center gap-1 transition-all cursor-pointer"
                        title="Cargar los 8 puntos actuales del circuito para editarlos"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cargar Actuales</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowExportModal(true)}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        title="Ver o copiar el bloque de configuración para trackCoordinates.ts"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Exportar ({editedApexes.length}/8)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="p-1 rounded-lg bg-black/40 hover:bg-black/60 text-[#8E8E93] hover:text-white transition-all cursor-pointer"
                        title="Cerrar modo edición"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Sub-barra informativa compacta */
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 px-2 pt-1 pb-1 text-[10px] sm:text-[11px] font-bold text-[#8E8E93]">
                    <span>
                      Giro <strong className="text-white">Antihorario</strong> • El
                      punto acelera en rectas y frena al llegar a cada{" "}
                      <strong className="text-cyan-400">APEX (1 al 8)</strong>
                    </span>
                    {nextPendingApex && (
                      <span className="text-cyan-300 font-mono">
                        Próximo: APEX {nextPendingApex.id} •{" "}
                        {nextPendingApex.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Lienzo SVG Oficial Maximizado (w-full min-h-[50vh]) */}
                <div className="relative w-full min-h-[50vh] sm:min-h-[56vh] flex items-center justify-center">
                  <svg
                    ref={svgCanvasRef}
                    viewBox={currentCircuit.viewBox}
                    className={`w-full min-h-[50vh] sm:min-h-[56vh] max-h-[68vh] h-auto overflow-visible ${
                      isEditMode ? "cursor-crosshair select-none" : ""
                    }`}
                    preserveAspectRatio="xMidYMid meet"
                    onClick={isEditMode ? handleSvgClick : undefined}
                    onPointerMove={isEditMode ? handleSvgPointerMove : undefined}
                    onPointerLeave={isEditMode ? () => setHoverPoint(null) : undefined}
                  >
                    <defs>
                      {/* Resplandor LED para el móvil (Punto Luminoso de 6 a 8px) */}
                      <filter
                        id="dot-led-glow"
                        x="-200%"
                        y="-200%"
                        width="500%"
                        height="500%"
                      >
                        <feGaussianBlur stdDeviation="3.5" result="blur1" />
                        <feGaussianBlur stdDeviation="7" result="blur2" />
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
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Contorno exterior blanco estilo silueta oficial F1 */}
                    <path
                      d={currentCircuit.pathD}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.28)"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Pista principal gris oscuro semi-translúcido (Path oficial de Austin para getPointAtLength) */}
                    <path
                      ref={setTrackPathNode}
                      d={currentCircuit.pathD}
                      fill="none"
                      stroke="rgba(42, 45, 58, 0.92)"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Línea de trazada interna en cian */}
                    <path
                      d={currentCircuit.pathD}
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.22)"
                      strokeWidth="1.6"
                      strokeDasharray="5 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Línea de Largada / Meta sobre la recta principal de Austin */}
                    <g
                      transform={`translate(${currentCircuit.startPoint.x}, ${currentCircuit.startPoint.y}) rotate(${currentCircuit.startPoint.angleDeg})`}
                    >
                      <rect
                        x="-2.5"
                        y="-10"
                        width="5"
                        height="20"
                        rx="1.2"
                        fill="#FFFFFF"
                        opacity="0.95"
                      />
                      <line
                        x1="0"
                        y1="-10"
                        x2="0"
                        y2="10"
                        stroke="#E10600"
                        strokeWidth="1.8"
                        strokeDasharray="3 3"
                      />
                    </g>
                    <text
                      x={currentCircuit.startPoint.x - 12}
                      y={currentCircuit.startPoint.y + 22}
                      fill="#9CA3AF"
                      fontSize="8.5"
                      fontWeight="800"
                      textAnchor="middle"
                      className="uppercase tracking-widest font-mono"
                    >
                      LARGADA / META
                    </text>

                    {/* Indicadores de APEX (Modo Edición vs Modo Normal) */}
                    {isEditMode ? (
                      <>
                        {editedApexes.map((apex) => {
                          const labelX = apex.x + (apex.labelOffsetX || 0);
                          const labelY = apex.y + (apex.labelOffsetY || 0);

                          return (
                            <g key={apex.id} className="cursor-pointer">
                              {/* Círculo de pulsación exterior */}
                              <circle
                                cx={apex.x}
                                cy={apex.y}
                                r="12"
                                fill="none"
                                stroke="#F59E0B"
                                strokeWidth="1.5"
                                opacity="0.6"
                                className="animate-ping"
                              />

                              {/* Círculo central cian */}
                              <circle
                                cx={apex.x}
                                cy={apex.y}
                                r="6.5"
                                fill="rgba(6, 182, 212, 0.45)"
                                stroke="#22D3EE"
                                strokeWidth="2.5"
                                filter="url(#apex-cyan-glow)"
                              />
                              <circle
                                cx={apex.x}
                                cy={apex.y}
                                r="2.2"
                                fill="#ECFEFF"
                              />

                              {/* Placa identificatoria con ID y progreso exacto */}
                              <g transform={`translate(${labelX}, ${labelY})`}>
                                <rect
                                  x="-26"
                                  y="-12"
                                  width="52"
                                  height="24"
                                  rx="5"
                                  fill="rgba(8, 51, 68, 0.95)"
                                  stroke="#22D3EE"
                                  strokeWidth="1.2"
                                />
                                <text
                                  x="0"
                                  y="-2"
                                  fill="#67E8F9"
                                  fontSize="8"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  className="font-mono tracking-wider"
                                >
                                  APEX {apex.id}
                                </text>
                                <text
                                  x="0"
                                  y="7"
                                  fill="#CBD5E1"
                                  fontSize="6.5"
                                  fontWeight="700"
                                  textAnchor="middle"
                                  className="font-mono"
                                >
                                  p: {apex.progress}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Previsualización fantasma al pasar el mouse sobre la pista */}
                        {hoverPoint && editedApexes.length < 8 && (
                          <g className="pointer-events-none">
                            <circle
                              cx={hoverPoint.x}
                              cy={hoverPoint.y}
                              r="8"
                              fill="rgba(245, 158, 11, 0.3)"
                              stroke="#F59E0B"
                              strokeWidth="2"
                              strokeDasharray="3 3"
                            />
                            <circle
                              cx={hoverPoint.x}
                              cy={hoverPoint.y}
                              r="2.5"
                              fill="#FEF08A"
                            />
                            <g transform={`translate(${hoverPoint.x}, ${hoverPoint.y - 18})`}>
                              <rect
                                x="-32"
                                y="-8.5"
                                width="64"
                                height="17"
                                rx="4"
                                fill="rgba(30, 27, 75, 0.95)"
                                stroke="#F59E0B"
                                strokeWidth="1"
                              />
                              <text
                                x="0"
                                y="3"
                                fill="#FDE68A"
                                fontSize="7.5"
                                fontWeight="800"
                                textAnchor="middle"
                                className="font-mono uppercase tracking-wider"
                              >
                                APEX {editedApexes.length + 1} • p:{hoverPoint.progress}
                              </text>
                            </g>
                          </g>
                        )}
                      </>
                    ) : (
                      /* MODO NORMAL: Indicadores oficiales leídos de trackCoordinates */
                      currentApexes.map((apex) => {
                        const tier = apexResults[apex.id];
                        const isNext =
                          hasStarted && nextPendingApex?.id === apex.id;

                        // CÁLCULO VISUAL DIRECTO EN EL RENDER:
                        // Si apex.progress está definido y el path SVG está disponible, calcula (posX, posY)
                        // directamente con getPointAtLength(progress * totalLength) para alimentar cx y cy:
                        let posX = apex.x;
                        let posY = apex.y;

                        if (typeof apex.progress === "number" && trackPathRef.current) {
                          try {
                            const totalLen =
                              totalPathLengthRef.current > 0
                                ? totalPathLengthRef.current
                                : trackPathRef.current.getTotalLength();
                            if (totalLen > 0) {
                              const pt = trackPathRef.current.getPointAtLength(
                                apex.progress * totalLen
                              );
                              posX = Math.round(pt.x * 10) / 10;
                              posY = Math.round(pt.y * 10) / 10;
                            }
                          } catch {
                            posX = apex.x;
                            posY = apex.y;
                          }
                        }

                        let ringColor = "#22D3EE";
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

                        const labelX = posX + (apex.labelOffsetX || 0);
                        const labelY = posY + (apex.labelOffsetY || 0);

                        return (
                          <g key={apex.id}>
                            {isNext && (
                              <circle
                                cx={posX}
                                cy={posY}
                                r="11"
                                fill="none"
                                stroke="#22D3EE"
                                strokeWidth="1.8"
                                opacity="0.7"
                                className="animate-ping"
                              />
                            )}

                            {/* Círculo brillante azul/cian fijo sobre el centro exacto del APEX */}
                            <circle
                              cx={posX}
                              cy={posY}
                              r="5.5"
                              fill="rgba(6, 182, 212, 0.3)"
                              stroke={ringColor}
                              strokeWidth="2"
                              filter="url(#apex-cyan-glow)"
                            />
                            <circle
                              cx={posX}
                              cy={posY}
                              r="1.8"
                              fill="#ECFEFF"
                            />

                            {/* Etiqueta con la palabra 'APEX' y su número (1 al 8) */}
                            <g transform={`translate(${labelX}, ${labelY})`}>
                              <rect
                                x="-24"
                                y="-8.5"
                                width="48"
                                height="16"
                                rx="4"
                                fill={badgeBg}
                                stroke={badgeBorder}
                                strokeWidth="1"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill={badgeText}
                                fontSize="8.2"
                                fontWeight="900"
                                textAnchor="middle"
                                className="font-mono tracking-wider"
                              >
                                APEX {apex.id}
                              </text>
                            </g>
                          </g>
                        );
                      })
                    )}

                    {/* El Móvil: Punto Luminoso (glow) de 7px de diámetro (entre 6 y 8px) */}
                    <g>
                      <circle
                        ref={dotGlowRef}
                        cx={currentCircuit.startPoint.x}
                        cy={currentCircuit.startPoint.y}
                        r="5.5"
                        fill="rgba(34, 211, 238, 0.45)"
                        filter="url(#dot-led-glow)"
                      />
                      <circle
                        ref={dotCoreRef}
                        cx={currentCircuit.startPoint.x}
                        cy={currentCircuit.startPoint.y}
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#22D3EE"
                        strokeWidth="1.2"
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
                          transform={`translate(${fb.x}, ${fb.y - 22})`}
                          className="pointer-events-none"
                        >
                          <rect
                            x="-64"
                            y="-19"
                            width="128"
                            height="29"
                            rx="7"
                            fill="rgba(15, 15, 23, 0.94)"
                            stroke={colorMap[fb.tier]}
                            strokeWidth="1.5"
                          />
                          <text
                            x="0"
                            y="-4.5"
                            fill={colorMap[fb.tier]}
                            stroke={strokeMap[fb.tier]}
                            strokeWidth="0.35"
                            fontSize="11"
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono uppercase tracking-wider"
                          >
                            {fb.text}
                          </text>
                          <text
                            x="0"
                            y="6"
                            fill="#E5E7EB"
                            fontSize="7.5"
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

                {/* Leyenda de Dificultad Extrema (Hitbox milimétrica: 25ms / 50ms / 100ms) */}
                <div className="mt-2 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[10px] sm:text-[11px] font-bold text-[#8E8E93]">
                  <span>
                    🟣 <strong className="text-purple-300">≤ 0.025s (25ms):</strong>{" "}
                    +5 pts
                  </span>
                  <span>
                    🟢 <strong className="text-emerald-300">≤ 0.05s (50ms):</strong>{" "}
                    +3 pts
                  </span>
                  <span>
                    🟡 <strong className="text-amber-300">≤ 0.1s (100ms):</strong>{" "}
                    +1 pt
                  </span>
                  <span>
                    🔴{" "}
                    <strong className="text-red-300">
                      &gt; 0.1s o no presionar:
                    </strong>{" "}
                    0 pts
                  </span>
                </div>
              </div>

              {/* Botón Grande, Destacado y Centrado: "¡ARRANCAR!" / "¡DOBLAR!" */}
              <div className="flex justify-center pt-1 pb-2">
                {isEditMode ? (
                  <div className="w-full max-w-md py-4 px-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5 shadow-lg">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modo Edición Interactivo Activo</span>
                    </div>
                    <p className="text-xs text-white/90 font-bold">
                      Haz click sobre la silueta del circuito para fijar cada punto APEX ({editedApexes.length}/8).
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">
                      Para jugar la vuelta lanzada de 10 segundos, desactiva el modo edición en la barra superior.
                    </p>
                  </div>
                ) : !hasStarted ? (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleStartLap();
                    }}
                    onClick={(e) => {
                      if (e.detail === 0) {
                        handleStartLap();
                      }
                    }}
                    className="w-full max-w-md py-5 sm:py-6 px-8 rounded-3xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] text-white font-black text-xl sm:text-2xl uppercase tracking-widest shadow-[0_0_35px_rgba(6,182,212,0.45)] border border-cyan-300/40 flex items-center justify-center gap-3 transition-transform cursor-pointer select-none touch-manipulation"
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

              {/* Vitrina de Medallas por Vuelta Perfecta (40/40) visible en modo espera */}
              {!hasStarted && (
                <div className="rounded-2xl sm:rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 text-amber-400" />
                      <div>
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          Sistema de Medallas • Vuelta Perfecta Histórica (40/40 pts)
                        </h2>
                        <p className="text-[11px] text-[#8E8E93]">
                          1 vez = Bronce • 5 veces = Plata • 10 veces = Oro • El ganador semanal suma{" "}
                          <strong className="text-emerald-400">+1 pt extra</strong> en el GP.
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15151E] border border-amber-500/30 text-xs font-black text-amber-300 font-mono">
                      <span>Vueltas Perfectas: {vueltasPerfectas}</span>
                      {currentPerfectMedalTier !== "bloqueado" && (
                        <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-white">
                          {currentPerfectMedalTier}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PERFECT_MEDAL_TIERS.map((medal) => {
                      const isUnlocked = vueltasPerfectas >= medal.threshold;
                      return (
                        <div
                          key={medal.tier}
                          className={`rounded-2xl bg-gradient-to-b p-3.5 border flex items-center gap-3.5 transition-all ${
                            isUnlocked
                              ? `${medal.bgClass} ${medal.borderClass} ${medal.glowClass}`
                              : "from-[#15151E]/90 to-[#12121A]/90 border-white/10 opacity-70"
                          }`}
                        >
                          <div className="shrink-0">
                            <ThemedTrophy
                              badgeId="vueltas_perfectas"
                              tier={isUnlocked ? medal.tier : "bloqueado"}
                              isZero={!isUnlocked}
                              className="w-16 h-16"
                            />
                          </div>
                          <div className="min-w-0 text-left space-y-1">
                            <span
                              className={`block text-xs font-black uppercase tracking-wider ${
                                isUnlocked ? medal.textClass : "text-[#8E8E93]"
                              }`}
                            >
                              Medalla de {medal.label}
                            </span>
                            <p className="text-[11px] font-bold text-white leading-snug">
                              {medal.reqText}
                            </p>
                            <span
                              className={`inline-block text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-full ${
                                isUnlocked
                                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                                  : "bg-black/40 border border-white/10 text-[#8E8E93]"
                              }`}
                            >
                              {isUnlocked
                                ? "Desbloqueada"
                                : `Progreso: ${Math.min(vueltasPerfectas, medal.threshold)} / ${medal.threshold}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* =============================================================== */}
        {/* MODAL / ALERTA DE CELEBRACIÓN AL DESBLOQUEAR MEDALLA 40/40      */}
        {/* =============================================================== */}
        {unlockedMedalAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setUnlockedMedalAlert(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1F1F2B] via-[#171722] to-[#12121A] border border-amber-400/50 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(255,215,0,0.3)] space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setUnlockedMedalAlert(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar alerta de logro"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¡Nuevo Logro Histórico Desbloqueado!</span>
              </div>

              <div className="flex justify-center py-2">
                <ThemedTrophy
                  badgeId="vueltas_perfectas"
                  tier={unlockedMedalAlert.tier}
                  isZero={false}
                  className="w-28 h-28"
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {unlockedMedalAlert.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#D0D0D2] leading-relaxed">
                  {unlockedMedalAlert.subtitle}
                </p>
              </div>

              <div className="rounded-2xl bg-[#15151E]/90 border border-purple-500/40 px-4 py-3 flex items-center justify-between text-xs font-bold">
                <span className="text-[#8E8E93] uppercase tracking-wider">
                  Vueltas Perfectas (40/40)
                </span>
                <span className="font-mono text-base font-black text-purple-300">
                  {unlockedMedalAlert.vueltasPerfectas}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUnlockedMedalAlert(null)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-all cursor-pointer"
              >
                ¡Lucir Medalla en mi Perfil!
              </button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* MODAL DE EXPORTACIÓN DE CÓDIGO APEX (SOLO ADMIN)                */}
        {/* =============================================================== */}
        {showExportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowExportModal(false)}
          >
            <div
              className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-b from-[#1F1F2B] via-[#171722] to-[#12121A] border border-cyan-400/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.25)] space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-black uppercase tracking-wider">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Código Generado • {carreraActiva.name}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Configuración de APEX Calibrada ({editedApexes.length}/8 puntos)
                </h2>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Copia este bloque y reemplaza el array{" "}
                  <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">
                    apexes
                  </code>{" "}
                  en{" "}
                  <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">
                    src/utils/trackCoordinates.ts
                  </code>{" "}
                  dentro de la configuración de este circuito.
                </p>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={formattedApexesCode}
                  rows={13}
                  className="w-full rounded-2xl bg-[#0D0D14] border border-white/15 p-4 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 resize-none selection:bg-cyan-500/30 selection:text-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-xs text-[#8E8E93]">
                  {editedApexes.length < 8
                    ? `⚠️ Solo has colocado ${editedApexes.length} de 8 APEX.`
                    : "✅ Los 8 APEX están listos para guardar en el diccionario."}
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#D0D0D2] transition-colors cursor-pointer"
                  >
                    Seguir Editando
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                      copiedCode
                        ? "bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-400"
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30"
                    }`}
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>¡Código Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}

export default function VueltaRapidaPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#15151E] flex items-center justify-center text-[#D0D0D2]">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        }
      >
        <VueltaRapidaContent />
      </Suspense>
    </ProtectedRoute>
  );
}
