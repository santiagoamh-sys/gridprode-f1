"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useF1Data, filterGrandPrixFromSingapore } from "@/context/F1DataContext";
import {
  getAllUsuariosRanking,
  getAllPredicciones,
  getGrandPrixList,
  getGanadorVueltaRapidaSemanal,
  VueltaRapidaWinner,
} from "@/lib/firebase/f1Service";
import { currentCircuit } from "@/data/circuits";
import { UserProfile } from "@/types/auth";
import { Prediccion, DesglosePuntos } from "@/types/f1";
import {
  Medal,
  Trophy,
  Loader2,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";

export default function RankingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <RankingContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

interface UserGpScoreDetail {
  puntosPronosticos: number;
  bonoVr: number;
  puntajeGp: number | null;
  wonVr: boolean;
  hasPred: boolean;
}

interface RankedUserRow {
  profile: UserProfile;
  totalPoints: number;
  predictionsByGp: Record<string, Prediccion>;
  scoresByGp: Record<string, UserGpScoreDetail>;
  isVrWeeklyWinner: boolean;
}

function RankingContent() {
  const { user } = useAuth();
  const { allGrandPrixList, grandPrixList, getPiloto, getEscuderia } =
    useF1Data();
  const [rows, setRows] = useState<RankedUserRow[]>([]);
  const [weeklyVrWinner, setWeeklyVrWinner] =
    useState<VueltaRapidaWinner | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const [users, preds, allGps] = await Promise.all([
        getAllUsuariosRanking(),
        getAllPredicciones(),
        getGrandPrixList(),
      ]);

      const activeGps = filterGrandPrixFromSingapore(allGps);

      // Obtener el ganador de la Vuelta Rápida para cada Gran Premio activo
      const vrWinnersList = await Promise.all(
        activeGps.map(async (gp) => {
          const winner = await getGanadorVueltaRapidaSemanal(gp.id);
          return [gp.id, winner] as const;
        })
      );
      const vrWinnersByGp = new Map<string, VueltaRapidaWinner>();
      vrWinnersList.forEach(([gpId, winner]) => {
        if (winner) vrWinnersByGp.set(gpId, winner);
      });

      // Ganador semanal del circuito actualmente activo (para el badge general junto al nombre)
      const currentCircuitWinner =
        vrWinnersByGp.get(currentCircuit.gpId) ??
        (await getGanadorVueltaRapidaSemanal(currentCircuit.gpId));
      setWeeklyVrWinner(currentCircuitWinner);

      const predsByUser = new Map<string, Record<string, Prediccion>>();
      preds.forEach((p) => {
        const map = predsByUser.get(p.usuario_id) || {};
        map[p.grand_prix_id] = p;
        predsByUser.set(p.usuario_id, map);
      });

      const combined: RankedUserRow[] = users.map((u) => {
        const userPreds = predsByUser.get(u.uid) || {};
        const isVrWeeklyWinner =
          currentCircuitWinner !== null &&
          currentCircuitWinner.userId === u.uid;

        const scoresByGp: Record<string, UserGpScoreDetail> = {};
        let totalPoints = 0;

        activeGps.forEach((gp) => {
          const pred = userPreds[gp.id];
          const hasPred = Boolean(pred);
          const gpWinner = vrWinnersByGp.get(gp.id);
          const wonVr = Boolean(gpWinner && gpWinner.userId === u.uid);
          const bonoVr = wonVr ? 1 : 0;
          const alreadyHasVrInPred = pred?.bonus_vuelta_rapida === 1;

          let puntosPronosticos = 0;
          let puntajeGp: number | null = null;

          if (pred && typeof pred.puntos_totales === "number") {
            // Predicción ya calculada y evaluada oficialmente
            if (alreadyHasVrInPred) {
              puntosPronosticos = Math.max(0, pred.puntos_totales - 1);
              puntajeGp = pred.puntos_totales;
            } else if (wonVr) {
              puntosPronosticos = pred.puntos_totales;
              puntajeGp = puntosPronosticos + 1;
            } else {
              puntosPronosticos = pred.puntos_totales;
              puntajeGp = puntosPronosticos;
            }
          } else if (wonVr) {
            // Carrera pendiente / no puntuada, pero el usuario ganó la Vuelta Rápida
            puntosPronosticos = 0;
            puntajeGp = 1;
          } else {
            // Carrera no puntuada y no ganó VR
            puntajeGp = null;
          }

          scoresByGp[gp.id] = {
            puntosPronosticos,
            bonoVr,
            puntajeGp,
            wonVr: wonVr || alreadyHasVrInPred,
            hasPred,
          };

          // Cálculo Global: El 'Puntaje Total' del usuario es estrictamente la suma iterada de sus Puntaje_GP
          if (typeof puntajeGp === "number") {
            totalPoints += puntajeGp;
          }
        });

        return {
          profile: u,
          totalPoints,
          predictionsByGp: userPreds,
          scoresByGp,
          isVrWeeklyWinner,
        };
      });

      combined.sort((a, b) => b.totalPoints - a.totalPoints);
      setRows(combined);
    } catch (err) {
      console.error("Error al cargar ranking global:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F27] border border-[#2D2D38] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Medal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Leaderboard Global • Campeonato GridProde
            </h1>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Clasificación general ordenada por puntos totales y desglose por
              Gran Premio.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLeaderboard}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#E10600] ${
              loading ? "animate-spin" : ""
            }`}
          />
          <span>Actualizar Ranking</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8E8E93]">
          <Loader2 className="w-7 h-7 animate-spin text-[#E10600]" />
          <p className="text-xs font-semibold">
            Calculando tabla de posiciones en tiempo real...
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-12 text-center space-y-2">
          <Trophy className="w-8 h-8 text-[#E10600] mx-auto" />
          <h3 className="text-base font-black text-white">
            Aún no hay participantes registrados en el Ranking
          </h3>
          <p className="text-xs text-[#8E8E93]">
            Los usuarios aparecerán aquí automáticamente al iniciar sesión con
            Google.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {rows.map((row, idx) => {
            const rank = idx + 1;
            const u = row.profile;
            const isCurrentUser = user?.uid === u.uid;
            const isExpanded = expandedUid === u.uid;
            const favDriver = getPiloto(u.piloto_favorito_id);
            const favTeam = getEscuderia(u.escuderia_favorita_id);
            const gpEntries = Object.values(row.predictionsByGp);

            return (
              <div
                key={u.uid}
                className={`rounded-2xl bg-[#1F1F27] border transition-all overflow-hidden shadow-lg ${
                  isCurrentUser
                    ? "border-[#E10600] ring-1 ring-[#E10600]/40"
                    : rank === 1
                    ? "border-amber-500/50"
                    : "border-[#2D2D38]"
                }`}
              >
                <div
                  onClick={() =>
                    setExpandedUid(isExpanded ? null : u.uid)
                  }
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                >
                  {/* Posición + Foto de Google + Datos del Participante */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl font-mono text-sm font-black flex items-center justify-center shrink-0 ${
                        rank === 1
                          ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                          : rank === 2
                          ? "bg-zinc-300 text-black"
                          : rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-[#15151E] text-[#8E8E93] border border-[#2D2D38]"
                      }`}
                    >
                      #{rank}
                    </div>

                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.nombre || "Participante"}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#E10600]/40 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#15151E] border border-[#2D2D38] flex items-center justify-center text-[#D0D0D2] shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm sm:text-base font-black text-white truncate">
                          {u.nombre || u.displayName || "Piloto"}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-black uppercase bg-[#E10600] text-white px-2 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                        {row.isVrWeeklyWinner && (
                          <span
                            title={`Ganador Vuelta Rápida Semanal (${weeklyVrWinner?.puntajeTotal ?? 0} pts • ${weeklyVrWinner?.tiempoReaccionTotal ?? 0} ms) • +1 pt extra en GP`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                          >
                            <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                            <span>Vuelta Rápida (+1 pt)</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#8E8E93]">
                        {favDriver && (
                          <span className="inline-flex items-center gap-1">
                            🏎️ {favDriver.nombre}
                          </span>
                        )}
                        {favTeam && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: favTeam.color_hex }}
                            />
                            {favTeam.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges de puntos por cada Gran Premio */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {grandPrixList.map((gp) => {
                      const scoreDetail = row.scoresByGp[gp.id];
                      const puntajeGp = scoreDetail?.puntajeGp;
                      const wonVr = Boolean(scoreDetail?.wonVr);
                      const hasScore = typeof puntajeGp === "number";
                      const hasPred = Boolean(scoreDetail?.hasPred);

                      const ptsText = hasScore
                        ? `${puntajeGp} ${puntajeGp === 1 ? "pt" : "pts"}`
                        : hasPred
                        ? "Cargado"
                        : "—";

                      return (
                        <div
                          key={gp.id}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                            wonVr
                              ? "bg-emerald-950/20 border-emerald-500/50 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                              : hasScore
                              ? "bg-[#15151E] border-amber-500/40 text-white"
                              : hasPred
                              ? "bg-[#15151E] border-[#2D2D38] text-[#8E8E93]"
                              : "bg-[#15151E]/40 border-[#2D2D38]/50 text-zinc-600"
                          }`}
                          title={
                            wonVr
                              ? `${gp.nombre} • Ganador Vuelta Rápida (+1 pt)${hasScore ? ` • Total GP: ${ptsText}` : ""}`
                              : gp.nombre
                          }
                        >
                          <span>{gp.bandera || "🏁"}</span>
                          <span
                            className={`font-mono font-black flex items-center gap-1 ${
                              wonVr ? "text-emerald-400" : ""
                            }`}
                          >
                            {wonVr && (
                              <Zap className="w-3 h-3 text-emerald-400 fill-current shrink-0" />
                            )}
                            <span>{ptsText}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Puntaje Total */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#2D2D38] shrink-0">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                        Puntos Totales
                      </p>
                      <p className="text-xl font-black font-mono text-amber-400">
                        {row.totalPoints}{" "}
                        <span className="text-xs font-normal text-[#8E8E93]">
                          pts
                        </span>
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#15151E] border border-[#2D2D38] text-[#8E8E93]">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel desplegable con el desglose detallado por cada Gran Premio */}
                {isExpanded && (
                  <div className="bg-[#15151E] border-t border-[#2D2D38] p-5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#E10600]">
                      Desglose de Puntos por Gran Premio
                    </h4>

                    {(() => {
                      const relevantGps = grandPrixList.filter(
                        (gp) =>
                          row.predictionsByGp[gp.id] ||
                          row.scoresByGp[gp.id]?.wonVr
                      );

                      if (relevantGps.length === 0) {
                        return (
                          <p className="text-xs text-[#8E8E93] italic">
                            Este usuario aún no ha registrado actividad ni pronósticos en esta temporada.
                          </p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {relevantGps.map((gp) => {
                            const pred = row.predictionsByGp[gp.id];
                            const scoreDetail = row.scoresByGp[gp.id];
                            const puntajeGp = scoreDetail?.puntajeGp;
                            const wonVr = Boolean(scoreDetail?.wonVr);
                            const d = pred?.desglose_puntos as
                              | DesglosePuntos
                              | undefined;

                            return (
                              <div
                                key={gp.id}
                                className={`rounded-xl bg-[#1F1F27] border p-4 space-y-2 ${
                                  wonVr
                                    ? "border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                                    : "border-[#2D2D38]"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span>{gp.bandera || "🏁"}</span>
                                    <span className="text-xs font-black text-white">
                                      {gp.nombre}
                                    </span>
                                    {wonVr && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                        <Zap className="w-2.5 h-2.5 fill-current" />
                                        <span>VR (+1 pt)</span>
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${
                                      wonVr
                                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                                        : typeof puntajeGp === "number"
                                        ? "text-amber-400 bg-[#15151E] border-amber-500/30"
                                        : "text-[#8E8E93] bg-[#15151E] border-[#2D2D38]"
                                    }`}
                                  >
                                    {wonVr && (
                                      <Zap className="w-3 h-3 text-emerald-400 fill-current shrink-0" />
                                    )}
                                    {typeof puntajeGp === "number"
                                      ? `${puntajeGp} ${puntajeGp === 1 ? "pt" : "pts"}`
                                      : "Pendiente"}
                                  </span>
                                </div>

                                {d ? (
                                  <div className="space-y-1.5">
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1 text-[11px]">
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Q1
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.q1}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Q2
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.q2}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Q3
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.q3_total}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Podio
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.carrera_total}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Sprint
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.sprint_total}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Extras
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.especiales_total}
                                        </strong>
                                      </div>
                                    </div>
                                    {wonVr && (
                                      <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded flex items-center justify-between">
                                        <span className="flex items-center gap-1 font-semibold">
                                          <Zap className="w-3 h-3 fill-current" />
                                          Bono Ganador Vuelta Rápida
                                        </span>
                                        <span className="font-mono font-bold">+1 pt</span>
                                      </div>
                                    )}
                                  </div>
                                ) : pred ? (
                                  <div className="space-y-1">
                                    <p className="text-[11px] text-[#8E8E93]">
                                      Pronóstico cargado. El desglose estará
                                      disponible cuando el Administrador cargue los
                                      resultados oficiales.
                                    </p>
                                    {wonVr && (
                                      <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded flex items-center justify-between">
                                        <span className="flex items-center gap-1 font-semibold">
                                          <Zap className="w-3 h-3 fill-current" />
                                          Bono Ganador Vuelta Rápida
                                        </span>
                                        <span className="font-mono font-bold">+1 pt</span>
                                      </div>
                                    )}
                                  </div>
                                ) : wonVr ? (
                                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-semibold">
                                      <Zap className="w-3 h-3 fill-current" />
                                      Bono Vuelta Rápida (Sin pronóstico registrado)
                                    </span>
                                    <span className="font-mono font-bold">+1 pt</span>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
