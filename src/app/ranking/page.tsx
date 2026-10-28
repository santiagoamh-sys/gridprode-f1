"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useF1Data, filterGrandPrixFromSingapore } from "@/context/F1DataContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  getAllPredicciones,
  getGrandPrixList,
  getGanadorVueltaRapidaSemanal,
  VueltaRapidaWinner,
} from "@/lib/firebase/f1Service";
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
import { CustomF1Car } from "@/components/CustomF1Car";

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
  puntos_base: number;
  puntos_gps: number;
  total: number;
  base: number;
  gps: number;
  puntosBase: number;
  puntosGPs: number;
  sumaPuntajesGp?: number;
  totalPoints: number;
  predictionsByGp: Record<string, Prediccion>;
  scoresByGp: Record<string, UserGpScoreDetail>;
  [key: string]: any;
}

function RankingContent() {
  const { user } = useAuth();
  const { allGrandPrixList, grandPrixList, getPiloto, getEscuderia } =
    useF1Data();
  const [rows, setRows] = useState<RankedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // PASO 1: Fetch de Usuarios Primero: Haz un getDocs a la colección users.
      if (!db) {
        console.error("Firestore no está inicializado");
        return;
      }
      const usersSnap = await getDocs(collection(db, "users"));
      const usersDataList: UserProfile[] = usersSnap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...d,
          uid: d.uid || docSnap.id,
        } as UserProfile;
      });

      // PASO 2: Fetch de Predicciones Segundo: Luego, obtén las predicciones/resultados.
      const [preds, allGps] = await Promise.all([
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

      const predsByUser = new Map<string, Record<string, Prediccion>>();
      preds.forEach((p) => {
        const map = predsByUser.get(p.usuario_id) || {};
        map[p.grand_prix_id] = p;
        predsByUser.set(p.usuario_id, map);
      });

      // Mapea todos los usuarios y extrae explícitamente su base desde puntos_base (Number)
      // Se ignora por completo el antiguo campo puntaje_global
      const combined: RankedUserRow[] = usersDataList.map((userData) => {
        const userPreds = predsByUser.get(userData.uid) || {};
        const scoresByGp: Record<string, UserGpScoreDetail> = {};

        // Nuevo Esquema en users: A partir de ahora, el puntaje histórico se lee desde puntos_base (Number).
        // Se ignora por completo el antiguo campo puntaje_global.
        const puntos_base = Number(userData.puntos_base) || 0;

        // Puntos Dinámicos: Suma los resultados evaluados de los Grandes Premios (incluyendo el +1 de Vuelta Rápida) en puntos_gps
        let puntos_gps = 0;

        activeGps.forEach((gp) => {
          const pred = userPreds[gp.id];
          const hasPred = Boolean(pred);
          const gpWinner = vrWinnersByGp.get(gp.id);
          const wonVr = Boolean(gpWinner && gpWinner.userId === userData.uid);
          const bonoVr = wonVr ? 1 : 0;
          const alreadyHasVrInPred = pred?.bonus_vuelta_rapida === 1;

          let puntosPronosticos = 0;
          let puntajeGp: number | null = null;
          const predPts =
            pred && typeof pred.puntos_totales === "number"
              ? pred.puntos_totales
              : null;

          if (predPts !== null) {
            // Predicción ya calculada y evaluada oficialmente: se suma el +1 de Vuelta Rápida únicamente aquí
            if (alreadyHasVrInPred) {
              puntosPronosticos = Math.max(0, predPts - 1);
              puntajeGp = predPts;
            } else if (wonVr) {
              puntosPronosticos = predPts;
              puntajeGp = predPts + 1;
            } else {
              puntosPronosticos = predPts;
              puntajeGp = predPts;
            }
          } else {
            // La carrera aún no ocurrió o no tiene puntaje base de pronóstico.
            puntosPronosticos = 0;
            puntajeGp = null;
          }

          scoresByGp[gp.id] = {
            puntosPronosticos,
            bonoVr,
            puntajeGp,
            wonVr: wonVr || alreadyHasVrInPred,
            hasPred,
          };

          // Suma iterada de Puntaje_GP únicamente de las carreras disputadas y evaluadas
          if (typeof puntajeGp === "number") {
            puntos_gps += puntajeGp;
          }
        });

        // Fórmula Estricta: El Total General para ordenar el Leaderboard debe ser estrictamente Total = puntos_base + puntos_gps
        const total = puntos_base + puntos_gps;

        // Debugging
        console.log(
          'Leaderboard Calc -> Usuario:',
          userData.nombre || userData.displayName,
          '| Base DB (puntos_base):',
          puntos_base,
          '| Suma GPs (puntos_gps):',
          puntos_gps,
          '| Total:',
          total
        );

        return {
          ...userData,
          profile: userData,
          puntos_base,
          puntos_gps,
          total,
          base: puntos_base,
          puntosBase: puntos_base,
          gps: puntos_gps,
          puntosGPs: puntos_gps,
          sumaPuntajesGp: puntos_gps,
          totalPoints: total,
          predictionsByGp: userPreds,
          scoresByGp,
        };
      });

      // El Total General para ordenar el Leaderboard debe ser estrictamente Total = puntos_base + puntos_gps
      combined.sort((a, b) => b.total - a.total);
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

                    {/* Render miniatura del CustomF1Car */}
                    <div className="shrink-0 w-14 sm:w-16 h-8 bg-black/40 border border-[#2D2D38] rounded-lg p-1 flex items-center justify-center overflow-hidden shadow-inner">
                      <CustomF1Car
                        modelo={u.modeloAuto}
                        diseno={u.disenoAuto}
                        colores={u.coloresAuto}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {u.nombre_escuderia ? (
                          <p className="text-sm sm:text-base font-black text-white truncate">
                            {u.nombre_escuderia}
                          </p>
                        ) : (
                          <p className="text-sm sm:text-base font-semibold text-[#8E8E93] italic truncate">
                            Escudería en Formación
                          </p>
                        )}
                        {isCurrentUser && (
                          <span className="text-[10px] font-black uppercase bg-[#E10600] text-white px-2 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#8E8E93]">
                        <span className="text-zinc-400 font-medium">
                          Piloto: {u.nombre || u.displayName || "Piloto"}
                        </span>
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
                              ? `${gp.nombre} • Vuelta Rápida asegurada (⚡)${hasScore ? ` • Total GP: ${ptsText}` : " • +1 pt se sumará al evaluarse el GP"}`
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
                        {row.total}{" "}
                        <span className="text-xs font-normal text-[#8E8E93]">
                          pts
                        </span>
                      </p>
                      {/* Texto gris del Leaderboard: {puntos_base} base + {puntos_gps} GPs */}
                      <p className="text-[10px] font-mono text-zinc-500">
                        {row.puntos_base} base + {row.puntos_gps} GPs
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#E10600]">
                        Desglose de Puntos por Gran Premio
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                          <span>Puntos Base:</span>
                          <strong className="font-mono text-amber-400">
                            +{row.puntos_base} pts
                          </strong>
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-300 bg-[#252530] border border-[#3D3D4E] px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                          <span>Puntos GPs:</span>
                          <strong className="font-mono text-white">
                            +{row.puntos_gps} pts
                          </strong>
                        </span>
                      </div>
                    </div>

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

                            // Cálculos de desglose unificado
                            const ptsPodio = Number(d?.carrera_total) || 0;
                            const ptsVueltaRapidaCarrera =
                              (d as any)?.vuelta_rapida !== undefined
                                ? Number((d as any).vuelta_rapida) || 0
                                : pred?.respuestas?.vuelta_rapida &&
                                  gp.resultados_oficiales?.vuelta_rapida &&
                                  pred.respuestas.vuelta_rapida ===
                                    gp.resultados_oficiales.vuelta_rapida
                                ? 1
                                : 0;
                            const ptsPilotoDelDia =
                              Number(d?.piloto_del_dia) || 0;
                            const ptsColapinto =
                              Number(d?.posicion_colapinto) || 0;
                            const ptsDnf = Number(d?.dnf) || 0;
                            const ptsEscuderia = Number(d?.escuderia) || 0;

                            const rawEspeciales =
                              d &&
                              (d.piloto_del_dia !== undefined ||
                                d.posicion_colapinto !== undefined ||
                                d.dnf !== undefined ||
                                d.escuderia !== undefined)
                                ? ptsPilotoDelDia +
                                  ptsColapinto +
                                  ptsDnf +
                                  ptsEscuderia
                                : Math.max(
                                    0,
                                    (Number(d?.especiales_total) || 0) -
                                      (scoreDetail?.bonoVr || (wonVr ? 1 : 0))
                                  );

                            // Caja CARRERA: Podio (P1, P2, P3) + VR Carrera + DOTD + Colapinto + DNF + Escudería
                            const puntosCarrera =
                              ptsPodio + ptsVueltaRapidaCarrera + rawEspeciales;

                            // Caja SPRINT: Pole, P1, P2 y P3 de Sprint
                            const puntosSprint = Number(d?.sprint_total) || 0;

                            // Caja EXTRAS: Únicamente puntos extra ganados en el minijuego semanal de Vuelta Rápida
                            const puntosExtras =
                              scoreDetail?.bonoVr !== undefined
                                ? scoreDetail.bonoVr
                                : wonVr || pred?.bonus_vuelta_rapida === 1
                                ? 1
                                : 0;

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
                                        <span>
                                          VR {typeof puntajeGp === "number" ? "(+1 pt)" : "(Asegurado ⚡)"}
                                        </span>
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
                                          {d.q1 ?? 0}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Q2
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.q2 ?? 0}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Q3
                                        </span>
                                        <strong className="font-mono text-white">
                                          {d.q3_total ?? 0}
                                        </strong>
                                      </div>
                                      <div
                                        className="bg-[#15151E] p-1.5 rounded text-center"
                                        title={`Carrera: Podio (${ptsPodio}) + VR Carrera (${ptsVueltaRapidaCarrera}) + DOTD (${ptsPilotoDelDia}) + Colapinto (${ptsColapinto}) + DNF (${ptsDnf}) + Escudería (${ptsEscuderia})`}
                                      >
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Carrera
                                        </span>
                                        <strong className="font-mono text-white">
                                          {puntosCarrera}
                                        </strong>
                                      </div>
                                      <div className="bg-[#15151E] p-1.5 rounded text-center">
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Sprint
                                        </span>
                                        <strong className="font-mono text-white">
                                          {puntosSprint}
                                        </strong>
                                      </div>
                                      <div
                                        className="bg-[#15151E] p-1.5 rounded text-center"
                                        title="Puntos extra ganados en el minijuego semanal de Vuelta Rápida"
                                      >
                                        <span className="block text-[9px] text-[#8E8E93] uppercase">
                                          Extras
                                        </span>
                                        <strong
                                          className={`font-mono ${
                                            puntosExtras > 0
                                              ? "text-emerald-400 font-black"
                                              : "text-white"
                                          }`}
                                        >
                                          {puntosExtras}
                                        </strong>
                                      </div>
                                    </div>
                                    {wonVr && (
                                      <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded flex items-center justify-between">
                                        <span className="flex items-center gap-1 font-semibold">
                                          <Zap className="w-3 h-3 fill-current" />
                                          {typeof puntajeGp === "number"
                                            ? "Bono Ganador Vuelta Rápida"
                                            : "Bono Vuelta Rápida asegurado (+1 pt al evaluarse el GP)"}
                                        </span>
                                        <span className="font-mono font-bold">
                                          {typeof puntajeGp === "number" ? "+1 pt" : "Asegurado"}
                                        </span>
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
                                          {typeof puntajeGp === "number"
                                            ? "Bono Ganador Vuelta Rápida"
                                            : "Bono Vuelta Rápida asegurado (+1 pt al evaluarse el GP)"}
                                        </span>
                                        <span className="font-mono font-bold">
                                          {typeof puntajeGp === "number" ? "+1 pt" : "Asegurado"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : wonVr ? (
                                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-semibold">
                                      <Zap className="w-3 h-3 fill-current" />
                                      {typeof puntajeGp === "number"
                                        ? "Bono Vuelta Rápida (Sin pronóstico registrado)"
                                        : "Bono Vuelta Rápida asegurado (+1 pt al evaluarse el GP)"}
                                    </span>
                                    <span className="font-mono font-bold">
                                      {typeof puntajeGp === "number" ? "+1 pt" : "Asegurado"}
                                    </span>
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
