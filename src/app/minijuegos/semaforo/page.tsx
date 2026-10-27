"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  getSemaforoLeaderboard,
  getUserSemaforoRecord,
  recordReactionTime,
  SemaforoRecord,
} from "@/lib/firebase/semaforoService";
import { SemaforoLeaderboard } from "@/components/SemaforoLeaderboard";
import {
  ArrowLeft,
  Timer,
  AlertTriangle,
  Trophy,
  Zap,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type GamePhase = "idle" | "sequence" | "lights_out" | "jump_start" | "finished";

export default function SemaforoGamePage() {
  const { user, profile } = useAuth();

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [activeLights, setActiveLights] = useState<number>(0);
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null);
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null);
  const [attemptsHistory, setAttemptsHistory] = useState<number[]>([]);

  // Leaderboard & Firebase State
  const [leaderboard, setLeaderboard] = useState<SemaforoRecord[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(true);
  const [isSavingRecord, setIsSavingRecord] = useState<boolean>(false);
  const [personalBestNotice, setPersonalBestNotice] = useState<{
    isNew: boolean;
    diffMs: number | null;
    isTop10: boolean;
  } | null>(null);

  const lightsOutTimestampRef = useRef<number>(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Cargar leaderboard general
  const loadLeaderboardData = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const records = await getSemaforoLeaderboard(10);
      setLeaderboard(records);
    } catch (err) {
      console.error("Error al cargar leaderboard de semáforo:", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Sincronizar el mejor tiempo del usuario desde la base de datos
  useEffect(() => {
    if (!user?.uid) return;
    getUserSemaforoRecord(user.uid)
      .then((rec) => {
        if (rec && rec.tiempoMs > 0) {
          setBestTimeMs(rec.tiempoMs);
        }
      })
      .catch((err) => {
        console.error("Error al obtener récord del usuario:", err);
      });
  }, [user?.uid]);

  // Inicia la secuencia de las 5 luces rojas (1 por segundo) + apagado aleatorio (1 a 3 seg)
  const startSequence = () => {
    clearAllTimers();
    setReactionTimeMs(null);
    setPersonalBestNotice(null);
    setActiveLights(0);
    setPhase("sequence");

    // Encender luces 1 a 5 secuencialmente cada 1000ms
    for (let i = 1; i <= 5; i++) {
      const lightTimer = setTimeout(() => {
        setActiveLights(i);

        // Cuando se enciende la 5ta luz, programar apagado aleatorio entre 1000ms y 3000ms
        if (i === 5) {
          const randomDelayMs = Math.floor(1000 + Math.random() * 2000);
          const lightsOutTimer = setTimeout(() => {
            setActiveLights(0);
            lightsOutTimestampRef.current = performance.now();
            setPhase("lights_out");
          }, randomDelayMs);
          timersRef.current.push(lightsOutTimer);
        }
      }, i * 1000);

      timersRef.current.push(lightTimer);
    }
  };

  // Maneja el clic en el botón gigante principal
  const handleMainButtonClick = () => {
    if (phase === "idle" || phase === "jump_start" || phase === "finished") {
      startSequence();
      return;
    }

    if (phase === "sequence") {
      // El usuario hizo clic antes de que se apagaran las luces -> Jump Start (descartado del ranking)
      clearAllTimers();
      setPersonalBestNotice(null);
      setPhase("jump_start");
      return;
    }

    if (phase === "lights_out") {
      // Salida válida: calcular tiempo de reacción
      const now = performance.now();
      const elapsedMs = Math.max(1, Math.round(now - lightsOutTimestampRef.current));
      setReactionTimeMs(elapsedMs);
      setAttemptsHistory((prev) => [elapsedMs, ...prev.slice(0, 4)]);
      setPhase("finished");

      // Evaluar récord y persistir en Firebase si el usuario está autenticado
      if (user?.uid) {
        const userName =
          profile?.nombre ||
          profile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "Piloto F1";

        setIsSavingRecord(true);
        recordReactionTime(user.uid, userName, elapsedMs)
          .then((res) => {
            if (res.isNewPersonalBest) {
              setBestTimeMs(res.record.tiempoMs);
              const diff =
                res.previousBestMs !== null
                  ? res.previousBestMs - res.record.tiempoMs
                  : null;

              // Comprobar si entra al Top 10 actual
              const entersTop10 =
                leaderboard.length < 10 ||
                res.record.tiempoMs <=
                  (leaderboard[leaderboard.length - 1]?.tiempoMs ?? 999999);

              setPersonalBestNotice({
                isNew: true,
                diffMs: diff,
                isTop10: entersTop10,
              });

              // Refrescar inmediatamente el podio
              loadLeaderboardData();
            } else {
              setPersonalBestNotice(null);
            }
          })
          .catch((err) => {
            console.error("Error al registrar récord en Firebase:", err);
          })
          .finally(() => {
            setIsSavingRecord(false);
          });
      }
    }
  };

  const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(3)}s`;

  const getReactionRank = (ms: number) => {
    if (ms < 180) return { label: "Reflejos de Poleman Absoluto ⚡", color: "text-amber-400" };
    if (ms < 230) return { label: "Salida de Campeón Mundial 🏆", color: "text-emerald-400" };
    if (ms < 300) return { label: "Ritmo Sólido de Zona de Puntos 🏁", color: "text-sky-400" };
    return { label: "Salida Conservadora • Puedes mejorar 🛠️", color: "text-[#8E8E93]" };
  };

  const isWaitingForLaunch = phase === "sequence" || phase === "lights_out";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col select-none">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
          {/* Barra superior de retorno y récord */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/minijuegos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F27]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-[#D0D0D2] hover:text-white hover:border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#E10600]" />
              <span>Volver al Hub de Minijuegos</span>
            </Link>

            <div className="flex items-center gap-3">
              <a
                href="#podio-semaforo"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Podio Top 10</span>
              </a>

              {bestTimeMs !== null && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs font-black text-amber-300 shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Tu mejor marca: {formatSeconds(bestTimeMs)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contenedor Principal Dark / Glassmorphism */}
          <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl space-y-8 text-center">
            {/* Título e instrucciones */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E10600]/15 border border-[#E10600]/30 text-[#E10600] text-[11px] font-black uppercase tracking-wider">
                <Timer className="w-3.5 h-3.5" />
                <span>Simulador Oficial de Salida</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Semáforo de Largada F1
              </h1>
              <p className="text-xs sm:text-sm text-[#8E8E93] max-w-lg mx-auto">
                Presiona <strong className="text-white">PREPARARSE</strong> para iniciar la secuencia.
                Cuando las 5 luces rojas se <strong className="text-white">apaguen por completo</strong>,
                haz clic inmediatamente en <strong className="text-emerald-400">¡LARGAR!</strong>
              </p>
            </div>

            {/* ============================================================= */}
            {/* PÓRTICO CON LOS 5 SEMÁFOROS DE LA F1                          */}
            {/* ============================================================= */}
            <div className="relative mx-auto max-w-2xl">
              {/* Barra transversal del pórtico */}
              <div className="h-3 w-4/5 mx-auto bg-gradient-to-r from-transparent via-[#2D2D38] to-transparent rounded-full mb-2" />

              <div className="rounded-3xl bg-[#0D0D12] border-2 border-[#2D2D38] p-4 sm:p-6 shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)]">
                <div className="grid grid-cols-5 gap-2.5 sm:gap-5">
                  {[1, 2, 3, 4, 5].map((colIndex) => {
                    const isLit = activeLights >= colIndex && phase === "sequence";
                    return (
                      <div
                        key={colIndex}
                        className="bg-[#16161F] border border-white/10 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center gap-2.5 sm:gap-3.5 shadow-lg"
                      >
                        {/* Dos luces superiores decorativas (apagadas) */}
                        <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-full bg-[#09090D] border border-white/5 shadow-inner" />
                        <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-full bg-[#09090D] border border-white/5 shadow-inner" />

                        {/* Dos luces rojas principales sincronizadas por columna */}
                        {[0, 1].map((bulbIdx) => (
                          <div
                            key={bulbIdx}
                            className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full transition-colors duration-75 border ${
                              isLit
                                ? "bg-[#E10600] border-red-300 shadow-[0_0_28px_#E10600,inset_0_0_10px_#fff]"
                                : "bg-[#1E0A0A] border-red-950/50 shadow-inner"
                            }`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* PANEL DE ESTADO / RESULTADO / JUMP START                      */}
            {/* ============================================================= */}
            <div className="min-h-[115px] flex items-center justify-center">
              {phase === "idle" && (
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-[#D0D0D2]">
                    Semáforo en espera de orden de dirección de carrera
                  </p>
                  <p className="text-xs text-[#8E8E93]">
                    Haz clic en el botón inferior para ocupar tu cajón en la parrilla.
                  </p>
                </div>
              )}

              {phase === "sequence" && (
                <div className="space-y-1 animate-pulse">
                  <p className="text-base sm:text-lg font-black uppercase tracking-widest text-[#E10600]">
                    ¡Mantén la calma! ({activeLights} / 5 luces)
                  </p>
                  <p className="text-xs text-[#8E8E93]">
                    Espera a que se apaguen todas las luces rojas...
                  </p>
                </div>
              )}

              {phase === "lights_out" && (
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                    ¡LUCES APAGADAS! ¡AHORA!
                  </p>
                  <p className="text-xs text-emerald-200 font-bold">
                    ¡Presiona el botón ¡LARGAR! inmediatamente!
                  </p>
                </div>
              )}

              {phase === "jump_start" && (
                <div className="w-full max-w-md mx-auto rounded-2xl bg-red-950/60 border border-[#E10600] p-4 space-y-1.5 shadow-[0_0_30px_rgba(225,6,0,0.25)]">
                  <div className="flex items-center justify-center gap-2 text-[#E10600] font-black text-base sm:text-lg uppercase tracking-wider">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Jump Start / Penalización</span>
                  </div>
                  <p className="text-xs text-red-200">
                    ¡Falsa salida! Soltaste el embrague mientras las luces rojas seguían encendidas (+5 segundos de sanción FIA).
                  </p>
                </div>
              )}

              {phase === "finished" && reactionTimeMs !== null && (
                <div className="w-full max-w-md mx-auto rounded-2xl bg-[#15151E]/95 border border-emerald-500/40 p-5 space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#8E8E93]">
                    Tiempo Oficial de Reacción
                  </p>
                  <p className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                    {formatSeconds(reactionTimeMs)}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">
                    ({reactionTimeMs} ms)
                  </p>
                  <p className={`text-xs font-bold pt-1 ${getReactionRank(reactionTimeMs).color}`}>
                    {getReactionRank(reactionTimeMs).label}
                  </p>

                  {/* Notificación de Nuevo Récord Personal / Entrada al Top 10 */}
                  {personalBestNotice?.isNew && (
                    <div className="rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-400/60 p-3.5 space-y-1.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse">
                      <div className="flex items-center justify-center gap-1.5 text-amber-300 font-black text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>¡Nuevo Récord Personal! ⚡</span>
                      </div>
                      <p className="text-xs text-amber-100 font-semibold">
                        {personalBestNotice.diffMs !== null
                          ? `¡Bajaste tu tiempo oficial anterior en ${personalBestNotice.diffMs} ms!`
                          : "¡Tu primera marca oficial ha sido guardada en el ranking!"}
                      </p>
                      {personalBestNotice.isTop10 && (
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-300 bg-black/50 px-2.5 py-1 rounded-full border border-amber-400/40 mt-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>¡Entraste al Top 10 de Reflejos de la Parrilla!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isSavingRecord && (
                    <p className="text-[10px] text-amber-300/80 italic animate-pulse">
                      Sincronizando tiempo con el podio global...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* BOTÓN GIGANTE DE ACCIÓN ('PREPARARSE' / '¡LARGAR!')           */}
            {/* ============================================================= */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleMainButtonClick}
                className={`w-full max-w-xl mx-auto min-h-[96px] sm:min-h-[112px] rounded-3xl px-8 py-6 text-xl sm:text-3xl font-black uppercase tracking-widest transition-transform active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer ${
                  isWaitingForLaunch
                    ? phase === "lights_out"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-[#09090D] shadow-[0_0_45px_rgba(16,185,129,0.7)] border-2 border-emerald-200"
                    : "bg-gradient-to-r from-[#E10600] to-amber-600 text-white shadow-[0_0_35px_rgba(225,6,0,0.5)] border-2 border-white/20"
                    : "bg-[#15151E] hover:bg-[#252532] text-white border-2 border-[#E10600] shadow-[0_0_25px_rgba(225,6,0,0.3)]"
                }`}
              >
                {isWaitingForLaunch ? (
                  <>
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                    <span>¡LARGAR!</span>
                  </>
                ) : (
                  <>
                    {phase === "idle" ? (
                      <Timer className="w-7 h-7 sm:w-8 sm:h-8 text-[#E10600]" />
                    ) : (
                      <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8 text-[#E10600]" />
                    )}
                    <span>PREPARARSE</span>
                  </>
                )}
              </button>
            </div>

            {/* Historial reciente de la sesión */}
            {attemptsHistory.length > 0 && (
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mr-1">
                  Últimos intentos:
                </span>
                {attemptsHistory.map((ms, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-white/10 font-mono text-xs font-bold text-[#D0D0D2]"
                  >
                    {formatSeconds(ms)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* SECCIÓN PODIO / LEADERBOARD TOP 10                            */}
          {/* ============================================================= */}
          <div id="podio-semaforo" className="pt-4 scroll-mt-6">
            <SemaforoLeaderboard
              records={leaderboard}
              currentUserId={user?.uid}
              isLoading={isLoadingLeaderboard}
              onRefresh={loadLeaderboardData}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
