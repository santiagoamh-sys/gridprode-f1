"use client";

import React from "react";
import { SemaforoRecord } from "@/lib/firebase/semaforoService";
import {
  Trophy,
  Zap,
  Medal,
  Crown,
  Timer,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";

interface SemaforoLeaderboardProps {
  records: SemaforoRecord[];
  currentUserId?: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
}

export const SemaforoLeaderboard: React.FC<SemaforoLeaderboardProps> = ({
  records,
  currentUserId,
  isLoading = false,
  onRefresh,
  title = "Top 10 de Reflejos • Semáforo de Largada",
  subtitle = "Tiempos oficiales de reacción más rápidos registrados en la parrilla",
}) => {
  const p1 = records[0] || null;
  const p2 = records[1] || null;
  const p3 = records[2] || null;
  const restRecords = records.slice(3, 10);

  const currentUserIndex = records.findIndex((r) => r.userId === currentUserId);
  const currentUserRecord =
    currentUserIndex !== -1 ? records[currentUserIndex] : null;

  const formatMs = (ms: number) => `${ms} ms`;
  const formatSec = (ms: number) => `${(ms / 1000).toFixed(3)}s`;

  return (
    <div className="rounded-3xl bg-[#1F1F27]/85 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-7">
      {/* Encabezado del Leaderboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2D2D38]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Salida Oficial F1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93]">{subtitle}</p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#15151E] border border-[#2D2D38] hover:border-white/30 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer shadow-md"
            title="Actualizar tabla de posiciones"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-amber-400 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            <span>{isLoading ? "Actualizando..." : "Actualizar"}</span>
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Timer className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-white">
            Parrilla sin tiempos registrados aún
          </h3>
          <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
            Sé el primer piloto en realizar una salida perfecta sin Jump Start para reclamar la Pole Position de reflejos.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {/* ============================================================= */}
          {/* PODIO TOP 3 (P1, P2, P3) VISUAL DESTACADO                     */}
          {/* ============================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 🥈 SEGUNDO PUESTO (P2 - PLATA) */}
            <div
              className={`order-2 md:order-1 rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                p2?.userId === currentUserId
                  ? "bg-zinc-800/60 border-zinc-300 ring-2 ring-zinc-300 shadow-[0_0_25px_rgba(212,212,216,0.3)]"
                  : "bg-gradient-to-b from-zinc-400/10 to-[#15151E] border-zinc-500/40 shadow-lg"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-zinc-400/20 border border-zinc-400/40 flex items-center justify-center text-xs font-black text-zinc-200">
                    P2
                  </span>
                  <span className="text-xs font-black uppercase text-zinc-300">
                    Segundo Lugar
                  </span>
                </div>
                <Medal className="w-5 h-5 text-zinc-300" />
              </div>

              {p2 ? (
                <div className="py-4 space-y-1.5 text-center">
                  <p className="text-sm sm:text-base font-black text-white truncate flex items-center justify-center gap-1.5">
                    <span>{p2.nombre}</span>
                    {p2.userId === currentUserId && (
                      <span className="text-[10px] bg-zinc-300 text-black px-1.5 py-0.2 rounded font-black">
                        TÚ
                      </span>
                    )}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-zinc-200 tracking-tight">
                    {formatMs(p2.tiempoMs)}
                  </p>
                  <p className="text-[11px] font-mono text-[#8E8E93]">
                    {formatSec(p2.tiempoMs)}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#8E8E93] italic">
                  Puesto vacante
                </div>
              )}
            </div>

            {/* 🥇 PRIMER PUESTO (P1 - ORO / POLEMAN) */}
            <div
              className={`order-1 md:order-2 rounded-2xl p-6 border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                p1?.userId === currentUserId
                  ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] scale-[1.02]"
                  : "bg-gradient-to-b from-amber-500/15 via-[#1F1F27] to-[#15151E] border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] md:-translate-y-2"
              }`}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center text-xs font-black shadow-md">
                    P1
                  </span>
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    ⚡ Poleman de Reflejos
                  </span>
                </div>
                <Crown className="w-6 h-6 text-amber-400" />
              </div>

              {p1 ? (
                <div className="py-4 space-y-2 text-center">
                  <p className="text-base sm:text-lg font-black text-white truncate flex items-center justify-center gap-2">
                    <span>{p1.nombre}</span>
                    {p1.userId === currentUserId && (
                      <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">
                        TÚ
                      </span>
                    )}
                  </p>
                  <div className="inline-block px-3 py-1 rounded-xl bg-black/40 border border-amber-500/30">
                    <p className="text-3xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight">
                      {formatMs(p1.tiempoMs)}
                    </p>
                  </div>
                  <p className="text-xs font-mono text-[#8E8E93]">
                    {formatSec(p1.tiempoMs)} • Récord Absoluto
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#8E8E93] italic">
                  Puesto vacante
                </div>
              )}
            </div>

            {/* 🥉 TERCER PUESTO (P3 - BRONCE) */}
            <div
              className={`order-3 rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                p3?.userId === currentUserId
                  ? "bg-amber-950/60 border-amber-600 ring-2 ring-amber-600 shadow-[0_0_25px_rgba(217,119,6,0.3)]"
                  : "bg-gradient-to-b from-amber-700/10 to-[#15151E] border-amber-700/40 shadow-lg"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-700/20 border border-amber-700/40 flex items-center justify-center text-xs font-black text-amber-500">
                    P3
                  </span>
                  <span className="text-xs font-black uppercase text-amber-500">
                    Tercer Lugar
                  </span>
                </div>
                <Medal className="w-5 h-5 text-amber-600" />
              </div>

              {p3 ? (
                <div className="py-4 space-y-1.5 text-center">
                  <p className="text-sm sm:text-base font-black text-white truncate flex items-center justify-center gap-1.5">
                    <span>{p3.nombre}</span>
                    {p3.userId === currentUserId && (
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-black">
                        TÚ
                      </span>
                    )}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
                    {formatMs(p3.tiempoMs)}
                  </p>
                  <p className="text-[11px] font-mono text-[#8E8E93]">
                    {formatSec(p3.tiempoMs)}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#8E8E93] italic">
                  Puesto vacante
                </div>
              )}
            </div>
          </div>

          {/* ============================================================= */}
          {/* TABLA P4 A P10                                                */}
          {/* ============================================================= */}
          {restRecords.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#8E8E93] px-1">
                Zona de Puntos • Posiciones P4 a P10
              </h4>

              <div className="divide-y divide-white/5 rounded-2xl bg-[#15151E]/90 border border-white/5 overflow-hidden">
                {restRecords.map((item, idx) => {
                  const rank = idx + 4;
                  const isCurrent = item.userId === currentUserId;

                  return (
                    <div
                      key={item.userId}
                      className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                        isCurrent
                          ? "bg-amber-500/10 border-l-4 border-amber-400 text-white"
                          : "hover:bg-white/5 text-[#D0D0D2]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#1F1F27] border border-white/10 flex items-center justify-center font-mono text-xs font-black text-[#8E8E93] shrink-0">
                          #{rank}
                        </span>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                            <span className="text-white">{item.nombre}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black shrink-0">
                                TÚ
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-black font-mono text-amber-300">
                          {formatMs(item.tiempoMs)}
                        </p>
                        <p className="text-[10px] font-mono text-[#8E8E93]">
                          {formatSec(item.tiempoMs)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* BANNER DEL USUARIO ACTUAL (SI PARTICIPÓ)                      */}
          {/* ============================================================= */}
          {currentUserRecord && (
            <div className="rounded-2xl bg-[#15151E] border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-amber-300">
                    Tu Récord Oficial en el Semáforo
                  </p>
                  <p className="text-[11px] text-[#8E8E93]">
                    {currentUserIndex < 10
                      ? `¡Excelente! Te encuentras en la posición #${currentUserIndex + 1} de la tabla general.`
                      : `Posición #${currentUserIndex + 1} en el ranking global. ¡Sigue practicando para entrar al Top 10!`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs font-mono font-black text-[#8E8E93] bg-[#1F1F27] px-2.5 py-1 rounded-lg border border-white/5">
                  Posición #{currentUserIndex + 1}
                </span>
                <span className="text-sm font-mono font-black text-white bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-lg">
                  {formatMs(currentUserRecord.tiempoMs)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
