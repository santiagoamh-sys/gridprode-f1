"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { CustomF1Car } from "@/components/CustomF1Car";
import { CarCustomizerModal } from "@/components/CarCustomizerModal";
import { DriverGrid } from "@/components/DriverGrid";
import { CircuitTrackSilhouette } from "@/components/CircuitTrackSilhouette";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { usePredictionWizard } from "@/context/PredictionWizardContext";
import { getCircuitImageUrl } from "@/data/f1InitialData";
import { getCurrentActiveGpId } from "@/data/circuits";
import { GrandPrix, Prediccion } from "@/types/f1";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import {
  getPrediccionesPorUsuario,
  getAllPredicciones,
} from "@/lib/firebase/f1Service";
import {
  Clock,
  Zap,
  Flag,
  Settings,
  X,
  ChevronRight,
  CheckCircle2,
  Lock,
  Trophy,
} from "lucide-react";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDateStr?: string): TimeRemaining {
  if (!targetDateStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diff = target - now;
  if (isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isExpired: false };
}

export default function InicioPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] text-[#D0D0D2] flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 space-y-5 pb-24 md:pb-10">
          <InicioContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function InicioContent() {
  const { user, profile } = useAuth();
  const { pilotos, getPiloto, grandPrixList } = useF1Data();
  const { openWizard } = usePredictionWizard();

  // Modales
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Predicciones del usuario y estado del Leaderboard
  const [userPreds, setUserPreds] = useState<Prediccion[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [puntosGps, setPuntosGps] = useState<number>(0);

  // Piloto favorito
  const favPiloto = getPiloto(profile?.piloto_favorito_id);

  // 1. Determinar el Gran Premio Activo
  const activeGp: GrandPrix | null = useMemo(() => {
    if (!grandPrixList || grandPrixList.length === 0) return null;
    const recommendedId = getCurrentActiveGpId();
    const byId = grandPrixList.find((g) => g.id === recommendedId);
    if (byId) return byId;
    const upcoming = grandPrixList.find(
      (g) => g.estado === "proximo" || g.estado === "en_curso"
    );
    return upcoming || grandPrixList[0];
  }, [grandPrixList]);

  // 2. Contador regresivo hacia qualyStartTime del Gran Premio activo
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(activeGp?.qualyStartTime)
  );

  useEffect(() => {
    if (!activeGp?.qualyStartTime) return;
    setTimeRemaining(calculateTimeRemaining(activeGp.qualyStartTime));
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(activeGp.qualyStartTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeGp?.qualyStartTime]);

  // 3. Cargar predicciones del usuario y calcular posición en el Leaderboard
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;

    async function loadStatsAndRanking() {
      try {
        const [preds, allPreds, usersSnap] = await Promise.all([
          getPrediccionesPorUsuario(user!.uid),
          getAllPredicciones(),
          db ? getDocs(collection(db, "users")) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setUserPreds(preds);

        // Suma de puntos evaluados de GPs del usuario actual
        const sumGps = preds.reduce((acc, p) => {
          return (
            acc +
            (typeof p.puntos_totales === "number" ? p.puntos_totales : 0)
          );
        }, 0);
        setPuntosGps(sumGps);

        // Calcular ranking posicional
        if (usersSnap && !usersSnap.empty) {
          const userPointsMap = new Map<string, number>();

          usersSnap.docs.forEach((d) => {
            const data = d.data();
            const uid = d.id;
            const base = Number(data.puntos_base) || 0;
            userPointsMap.set(uid, base);
          });

          allPreds.forEach((p) => {
            if (typeof p.puntos_totales === "number" && p.puntos_totales > 0) {
              const prev = userPointsMap.get(p.usuario_id) || 0;
              userPointsMap.set(p.usuario_id, prev + p.puntos_totales);
            }
          });

          const sortedUsers = Array.from(userPointsMap.entries()).sort(
            (a, b) => b[1] - a[1]
          );

          const myIndex = sortedUsers.findIndex(([uid]) => uid === user!.uid);
          if (myIndex !== -1) {
            setUserRank(myIndex + 1);
          } else {
            setUserRank(1);
          }
        }
      } catch (err) {
        console.warn("Error al calcular estadísticas del dashboard:", err);
      }
    }

    loadStatsAndRanking();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, profile?.puntos_base]);

  // Puntos totales = puntos_base + puntos_gps
  const puntosBase = Number(profile?.puntos_base) || 0;
  const totalUserPoints = puntosBase + puntosGps;

  // Estado del Gran Premio activo para bloqueo
  const activeGpQualyDate = activeGp ? new Date(activeGp.qualyStartTime) : null;
  const diffMinActive =
    activeGpQualyDate && !isNaN(activeGpQualyDate.getTime())
      ? Math.floor((activeGpQualyDate.getTime() - Date.now()) / (1000 * 60))
      : null;

  const isActiveLocked = Boolean(
    activeGp &&
      (activeGp.estado === "finalizado" ||
        activeGp.estado === "cancelado" ||
        (diffMinActive !== null && diffMinActive < 60))
  );

  const hasPredForActiveGp = Boolean(
    activeGp && userPreds.some((p) => p.grand_prix_id === activeGp.id)
  );

  // Formato amigable de fecha del activo
  const formattedQualy =
    activeGpQualyDate && !isNaN(activeGpQualyDate.getTime())
      ? activeGpQualyDate.toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : activeGp?.qualyStartTime || "";

  // 4. Carrusel Horizontal: Auto-centrar en el GP activo en la carga inicial
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCardRef.current) {
      const timer = setTimeout(() => {
        activeCardRef.current?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeGp?.id]);

  // 5. Bloquear scroll del body cuando el modal de pilotos está abierto
  useEffect(() => {
    if (isDriverModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsDriverModalOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isDriverModalOpen]);

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* BLOQUE 1: HERO BANNER (URGENCIA CON CONTADOR Y SILUETA)             */}
      {/* =================================================================== */}
      {activeGp && (
        <section
          aria-label="Gran Premio Actual"
          className="relative overflow-hidden rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          {/* Silueta de circuito decorativa de fondo con baja opacidad */}
          <div className="absolute -right-6 -bottom-6 sm:right-0 sm:bottom-0 opacity-15 pointer-events-none w-48 sm:w-60 h-48 sm:h-60 flex items-center justify-center">
            <CircuitTrackSilhouette
              silueta={getCircuitImageUrl(activeGp)}
              size="lg"
              className="w-full h-full"
            />
          </div>

          <div className="relative z-10">
            {/* Top Bar: Ronda y Estado */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] animate-ping" />
                Ronda {activeGp.ronda} • Próxima Cita
              </span>

              {activeGp.isSprint && (
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  Sprint Race
                </span>
              )}
            </div>

            {/* Nombre del GP y Bandera */}
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl shrink-0">{activeGp.bandera}</span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                {activeGp.nombre}
              </h1>
            </div>

            {/* Circuito y Fecha */}
            <p className="text-xs text-[#8E8E93] mb-4">
              {activeGp.circuito} •{" "}
              <span className="text-white/80 font-medium capitalize">
                Qualy: {formattedQualy}
              </span>
            </p>

            {/* Contador Regresivo en tiempo real */}
            {!timeRemaining.isExpired ? (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>Cierre de pronósticos en:</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl py-2 px-1 text-center shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
                      {timeRemaining.days}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[#8E8E93] font-bold">
                      DÍAS
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl py-2 px-1 text-center shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
                      {String(timeRemaining.hours).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[#8E8E93] font-bold">
                      HORAS
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl py-2 px-1 text-center shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
                      {String(timeRemaining.minutes).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[#8E8E93] font-bold">
                      MIN
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl py-2 px-1 text-center shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-red-400 font-mono leading-tight animate-pulse">
                      {String(timeRemaining.seconds).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[#8E8E93] font-bold">
                      SEG
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/30 border border-[#E10600]/30 rounded-xl p-3 my-4 text-center">
                <p className="text-xs font-bold text-red-200">
                  🔴 ¡Fin de semana de Gran Premio en curso!
                </p>
                <p className="text-[10px] text-[#8E8E93]">
                  Los pronósticos para este evento se encuentran cerrados
                </p>
              </div>
            )}

            {/* Botón de Acción Principal (Abre el Wizard) */}
            <button
              type="button"
              onClick={() => openWizard(activeGp)}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                isActiveLocked
                  ? hasPredForActiveGp
                    ? "bg-[#1F1F27] border border-white/20 text-white hover:bg-white/10"
                    : "bg-white/5 border border-white/10 text-[#8E8E93]"
                  : "bg-[#E10600] hover:bg-[#C10500] text-white shadow-[#E10600]/30 hover:scale-[1.01]"
              }`}
            >
              {isActiveLocked ? (
                hasPredForActiveGp ? (
                  <>
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span>Ver Mi Pronóstico Guardado</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-[#8E8E93]" />
                    <span>Pronóstico Cerrado</span>
                  </>
                )
              ) : hasPredForActiveGp ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Editar Mi Pronóstico</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Cargar Mi Pronóstico</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* BLOQUE 2: DASHBOARD DE ESCUDERÍA (HORIZONTAL COMPACTO)              */}
      {/* =================================================================== */}
      <section
        aria-label="Dashboard de Escudería"
        className="rounded-2xl bg-[#1F1F27]/75 backdrop-blur-xl border border-white/10 p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3"
      >
        {/* Izquierda: Thumbnail del Auto F1 */}
        <div className="w-24 sm:w-28 h-12 sm:h-14 bg-black/50 border border-white/10 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          <CustomF1Car
            modelo={profile?.modeloAuto}
            diseno={profile?.disenoAuto}
            colores={profile?.coloresAuto}
            className="w-full h-full"
          />
        </div>

        {/* Centro: Nombre de escudería y piloto favorito */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#E10600]">
              Mi Escudería
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-white truncate leading-tight">
            {profile?.nombre_escuderia || "Escudería en Formación"}
          </h2>
          <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
            {favPiloto ? (
              <span>Fav: <span className="text-white/90 font-medium">{favPiloto.nombre}</span></span>
            ) : (
              <span className="italic text-[#71717A]">Sin piloto favorito</span>
            )}
          </p>
        </div>

        {/* Derecha: Posición 🏆, Puntos Totales y Botón de Ajustes ⚙️ */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-amber-400 font-black text-xs sm:text-sm leading-tight">
              <span>🏆</span>
              <span>{userRank !== null ? `#${userRank}` : "—"}</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-white leading-tight">
              {totalUserPoints}{" "}
              <span className="text-[10px] font-normal text-[#8E8E93]">pts</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCarModalOpen(true)}
            title="Personalizar Escudería y Auto"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* =================================================================== */}
      {/* BANNER PROMOCIONAL: VUELTA RÁPIDA (MUY FINO CON RAYO ⚡)            */}
      {/* =================================================================== */}
      <Link
        href="/minijuegos/vuelta"
        className="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1F1F27]/80 to-amber-500/10 hover:border-amber-400/60 p-3 flex items-center justify-between gap-3 shadow-lg transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-white truncate">
            Vuelta Rápida:{" "}
            <span className="text-amber-400 font-black">¡Sumá +1 Pt</span> en{" "}
            {activeGp?.pais || "este GP"}!
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-amber-400 font-bold shrink-0 group-hover:translate-x-0.5 transition-transform">
          <span className="hidden xs:inline">Desafío Semanal</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>

      {/* =================================================================== */}
      {/* BLOQUE 3: CALENDARIO (CARRUSEL HORIZONTAL CON AUTO-CENTER)          */}
      {/* =================================================================== */}
      <section aria-label="Calendario de Grandes Premios" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span>🏁 Calendario Oficial 2026</span>
          </h2>
          <span className="text-[11px] text-[#8E8E93]">
            Deslizá para explorar
          </span>
        </div>

        {/* Carrusel Horizontal Scrollable con Snap y Auto-centrado */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {grandPrixList.map((gp) => {
            const isActive = gp.id === activeGp?.id;
            const gpDate = new Date(gp.qualyStartTime);
            const formattedDate = !isNaN(gpDate.getTime())
              ? gpDate.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })
              : "";

            const isGpLocked =
              gp.estado === "finalizado" || gp.estado === "cancelado";

            const hasUserPrediction = userPreds.some(
              (p) => p.grand_prix_id === gp.id
            );

            return (
              <div
                key={gp.id}
                ref={isActive ? activeCardRef : null}
                className={`w-[260px] sm:w-[280px] shrink-0 snap-center rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  isActive
                    ? "bg-[#1F1F27] border-2 border-[#E10600] shadow-[0_0_20px_rgba(225,6,0,0.25)] ring-1 ring-[#E10600]/40"
                    : "bg-[#1F1F27]/70 backdrop-blur-md border border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  {/* Header de la tarjeta */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-[#8E8E93]">
                      Ronda {gp.ronda}
                    </span>

                    {isActive ? (
                      <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
                        En Curso
                      </span>
                    ) : isGpLocked ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] bg-white/5 px-2 py-0.5 rounded-full">
                        Finalizado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                        Próximo
                      </span>
                    )}
                  </div>

                  {/* Nombre y País */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xl shrink-0 mt-0.5">{gp.bandera}</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white leading-tight truncate">
                        {gp.nombre}
                      </h3>
                      <p className="text-[11px] text-[#8E8E93] truncate">
                        {gp.circuito}
                      </p>
                    </div>
                  </div>

                  {/* Silueta del circuito centrada */}
                  <div className="h-20 w-full flex items-center justify-center py-1 my-1">
                    <CircuitTrackSilhouette
                      silueta={getCircuitImageUrl(gp)}
                      size="md"
                      className="max-h-full"
                    />
                  </div>
                </div>

                {/* Pie con fecha y botón */}
                <div className="pt-3 border-t border-white/5 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-[#8E8E93]">
                    <span>Fecha Qualy:</span>
                    <span className="font-semibold text-white">
                      {formattedDate}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWizard(gp)}
                    className={`w-full py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      isGpLocked
                        ? "bg-white/5 text-[#8E8E93] hover:text-white"
                        : isActive
                        ? "bg-[#E10600] hover:bg-[#C10500] text-white shadow-md shadow-[#E10600]/20"
                        : "bg-white/10 hover:bg-white/15 text-white"
                    }`}
                  >
                    {isGpLocked ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Ver Resumen</span>
                      </>
                    ) : hasUserPrediction ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>Editar Pronóstico</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3 h-3" />
                        <span>Pronosticar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =================================================================== */}
      {/* BOTÓN PARRILLA Y ESTADÍSTICAS (ABRE BOTTOM SHEET / MODAL)           */}
      {/* =================================================================== */}
      <button
        type="button"
        onClick={() => setIsDriverModalOpen(true)}
        className="w-full py-3.5 px-4 rounded-2xl bg-[#1F1F27]/75 backdrop-blur-xl border border-white/10 hover:border-[#E10600]/40 text-white font-bold text-sm flex items-center justify-between shadow-lg hover:shadow-xl transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🏁</span>
          <span>Ver Parrilla y Estadísticas</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#8E8E93] group-hover:text-white transition-colors">
          <span>{pilotos.length} Pilotos</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* =================================================================== */}
      {/* MODAL DE PARRILLA Y ESTADÍSTICAS (BOTTOM SHEET / DIALOG)            */}
      {/* =================================================================== */}
      {isDriverModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-grid-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsDriverModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#15151E] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl overscroll-contain animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2D2D38]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏁</span>
                <div>
                  <h3
                    id="driver-grid-modal-title"
                    className="text-base sm:text-lg font-black text-white"
                  >
                    Parrilla Oficial F1 2026
                  </h3>
                  <p className="text-xs text-[#8E8E93]">
                    {pilotos.length} pilotos oficiales • Toca un piloto para ver sus estadísticas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con DriverGrid */}
            <div className="overflow-y-auto p-4 sm:p-6 overscroll-contain flex-1">
              <DriverGrid selectable={false} enableModal={true} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de personalización de Escudería y Auto */}
      <CarCustomizerModal
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
      />
    </div>
  );
}
