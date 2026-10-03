"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePredictionWizard } from "@/context/PredictionWizardContext";
import { useF1Data } from "@/context/F1DataContext";
import { DriverGrid, DriverBadgeInfo } from "./DriverGrid";
import { CircuitTrackSilhouette } from "./CircuitTrackSilhouette";
import { getCircuitImageUrl } from "@/data/f1InitialData";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Lock,
  Trophy,
  Zap,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
  Flag,
  Shield,
  Flame,
} from "lucide-react";

export const PredictionWizardModal: React.FC = () => {
  const {
    activeGp,
    isOpen,
    currentStep,
    totalSteps,
    state,
    loadingExisting,
    submitting,
    isLockedByTime,
    minutesUntilLock,
    closeWizard,
    goToStep,
    nextStep,
    prevStep,
    toggleQ1Driver,
    toggleQ2Driver,
    assignQ3Position,
    autoFillRemainingQ3,
    clearQ3Grid,
    assignRacePodium,
    setDnfCount,
    setEscuderiaId,
    setPilotoDelDiaId,
    setPosicionColapinto,
    assignSprintField,
    canProceedCurrentStep,
    submitPrediction,
  } = usePredictionWizard();

  const { pilotos, escuderias, getPiloto, getEscuderia } = useF1Data();

  // Estados locales de UI para los pasos con casilleros múltiples
  const [hideExcludedInGrid, setHideExcludedInGrid] = useState<boolean>(true);
  const [activeQ3Slot, setActiveQ3Slot] = useState<number>(0);
  const [activePodiumSlot, setActivePodiumSlot] = useState<"p1" | "p2" | "p3">(
    "p1"
  );
  const [activeSprintSlot, setActiveSprintSlot] = useState<
    "sprintPole" | "sprintP1" | "sprintP2" | "sprintP3"
  >("sprintPole");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !activeGp) return null;

  const handleFinalSubmit = async () => {
    const ok = await submitPrediction();
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        closeWizard();
      }, 1400);
    }
  };

  // Títulos descriptivos por paso
  const stepTitles: Record<number, { tag: string; title: string; subtitle: string }> = {
    1: {
      tag: "PASO 1 • CLASIFICACIÓN Q1",
      title: "¿Qué pilotos quedan afuera de la Q1?",
      subtitle:
        "Selecciona exactamente 6 tarjetas de los 22 pilotos. Otorga 1 punto por cada eliminado acertado (sin importar el orden).",
    },
    2: {
      tag: "PASO 2 • CLASIFICACIÓN Q2",
      title: "¿Qué pilotos quedan afuera de la Q2?",
      subtitle:
        "Los 6 pilotos de Q1 quedan excluidos. Selecciona exactamente 6 tarjetas entre los 16 pilotos restantes (1 pt por cada acierto).",
    },
    3: {
      tag: "PASO 3 • GRILLA FINAL Q3",
      title: "¿Cómo queda la grilla final?",
      subtitle:
        "Asigna a los 10 pilotos clasificados su posición exacta del 1 (Pole) al 10. Otorga 1 pt por presencia en Q3 + 1 pt por posición exacta (Pole Position suma +2 pts extras).",
    },
    4: {
      tag: "PASO 4 • REVISIÓN DE CLASIFICACIÓN",
      title: "Revisión de Clasificación (Top 10 Q3)",
      subtitle:
        "Verifica el orden exacto de tu parrilla de salida del P1 al P10 antes de avanzar a los pronósticos de carrera.",
    },
    5: {
      tag: "PASO 5 • PODIO CARRERA PRINCIPAL",
      title: "¿Cómo queda el podio final de la carrera?",
      subtitle:
        "Parrilla reiniciada a los 22 pilotos. Asigna P1 (3 pts), P2 (2 pts) y P3 (1 pt) de forma mutuamente excluyente.",
    },
    6: {
      tag: "PASO 6 • CARRERA MIXTA",
      title: "Abandonos (DNF) y Escudería Ganadora",
      subtitle:
        "Predice cuántos autos abandonarán la carrera (1 pt) y qué escudería se llevará la victoria (1 pt).",
    },
    7: {
      tag: "PASO 7 • ESPECIALES DE CARRERA",
      title: "Piloto del Día y Posición de Franco Colapinto",
      subtitle:
        "Elige al Piloto del Día / DOTD (1 pt) y la posición final exacta de Franco Colapinto (2 pts).",
    },
    8: {
      tag: "PASO 8 • FORMATO SPRINT",
      title: "¿Cómo queda la Pole y el Podio de la Sprint?",
      subtitle:
        "Este Gran Premio incluye formato Sprint. Asigna Pole Sprint (1 pt), P1 Sprint (3 pts), P2 Sprint (2 pts) y P3 Sprint (1 pt).",
    },
  };

  const currentStepMeta = stepTitles[currentStep] || stepTitles[1];

  // Pilotos disponibles en Q3 (los 10 que no fueron eliminados ni en Q1 ni en Q2)
  const q1AndQ2Excluded = [...state.q1Eliminated, ...state.q2Eliminated];
  const q3AvailableDriverIds = pilotos
    .map((p) => p.id)
    .filter((id) => !q1AndQ2Excluded.includes(id));

  // Badges para Q3 en DriverGrid
  const q3Badges: Record<string, DriverBadgeInfo> = {};
  state.q3Grid.forEach((driverId, idx) => {
    if (driverId) {
      q3Badges[driverId] = {
        label: idx === 0 ? "P1 • POLE" : `P${idx + 1}`,
        bgClass: idx === 0 ? "bg-amber-500 text-black" : "bg-[#E10600]",
      };
    }
  });

  // Badges para Podio Carrera (Paso 5)
  const podiumBadges: Record<string, DriverBadgeInfo> = {};
  if (state.p1)
    podiumBadges[state.p1] = {
      label: "🥇 P1 (3 PTS)",
      bgClass: "bg-amber-500 text-black",
    };
  if (state.p2)
    podiumBadges[state.p2] = {
      label: "🥈 P2 (2 PTS)",
      bgClass: "bg-zinc-300 text-black",
    };
  if (state.p3)
    podiumBadges[state.p3] = {
      label: "🥉 P3 (1 PT)",
      bgClass: "bg-amber-700 text-white",
    };

  // Badges para Sprint (Paso 8)
  const sprintBadges: Record<string, DriverBadgeInfo> = {};
  if (state.sprintP1)
    sprintBadges[state.sprintP1] = {
      label: "SPRINT P1",
      bgClass: "bg-amber-500 text-black",
    };
  if (state.sprintP2)
    sprintBadges[state.sprintP2] = {
      label: "SPRINT P2",
      bgClass: "bg-zinc-300 text-black",
    };
  if (state.sprintP3)
    sprintBadges[state.sprintP3] = {
      label: "SPRINT P3",
      bgClass: "bg-amber-700 text-white",
    };
  if (state.sprintPole) {
    sprintBadges[state.sprintPole] = {
      label: sprintBadges[state.sprintPole]
        ? `POLE + ${sprintBadges[state.sprintPole].label}`
        : "⚡ POLE SPRINT",
      bgClass: "bg-[#E10600] text-white",
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#15151E]/95 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      {/* Barra superior fija del Wizard */}
      <div className="border-b border-[#2D2D38] bg-[#1F1F27] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{activeGp.bandera || "🏁"}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white truncate">
                {activeGp.nombre}
              </h2>
              <CircuitTrackSilhouette
                silueta={getCircuitImageUrl(activeGp)}
                alt={activeGp.nombre}
                size="sm"
              />
              {activeGp.isSprint && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full shrink-0">
                  <Zap className="w-3 h-3 fill-amber-300" /> Sprint
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8E8E93] truncate">
              {activeGp.circuito || activeGp.pais} &bull; Paso {currentStep} de{" "}
              {totalSteps}
            </p>
          </div>
        </div>

        {/* Indicador de progreso de pasos */}
        <div className="hidden md:flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isCurrent = stepNum === currentStep;
            const isPast = stepNum < currentStep;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => isPast && goToStep(stepNum)}
                disabled={!isPast && !isCurrent}
                className={`h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? "w-8 bg-[#E10600] shadow-[0_0_10px_#E10600]"
                    : isPast
                    ? "w-4 bg-[#E10600]/60 hover:bg-[#E10600] cursor-pointer"
                    : "w-2.5 bg-[#2D2D38]"
                }`}
                title={`Paso ${stepNum}`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={closeWizard}
          className="p-2 rounded-xl bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white hover:border-[#E10600]/50 transition-colors"
          title="Cerrar Wizard"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cuerpo principal desplazable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {loadingExisting ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#D0D0D2]">
              <Loader2 className="w-8 h-8 animate-spin text-[#E10600]" />
              <p className="text-sm font-semibold">
                Sincronizando tu pronóstico desde Firestore...
              </p>
            </div>
          ) : isLockedByTime ? (
            <div className="max-w-xl mx-auto my-12 rounded-2xl bg-[#1F1F27] border border-[#E10600]/40 p-8 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">
                Pronósticos Cerrados para este Gran Premio
              </h3>
              <p className="text-xs sm:text-sm text-[#D0D0D2] leading-relaxed">
                El formulario se bloquea automáticamente 60 minutos antes del
                inicio de la clasificación (<code>qualyStartTime</code>) o cuando
                la carrera ya ha finalizado.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/mis-pronosticos"
                  onClick={closeWizard}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] text-white hover:bg-[#b80500] transition-all"
                >
                  Ver Mis Pronósticos
                </Link>
                <button
                  type="button"
                  onClick={closeWizard}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white"
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-10">
              {/* Encabezado del Paso Actual */}
              <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#E10600] bg-[#E10600]/10 border border-[#E10600]/30 px-2.5 py-0.5 rounded-md mb-2">
                    {currentStepMeta.tag}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {currentStepMeta.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#8E8E93] mt-1 max-w-3xl">
                    {currentStepMeta.subtitle}
                  </p>
                </div>

                {/* Contador contextual para Q1 y Q2 */}
                {currentStep === 1 && (
                  <div className="shrink-0 bg-[#15151E] border border-[#2D2D38] px-4 py-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold">
                      Eliminados Q1
                    </p>
                    <p
                      className={`text-2xl font-black font-mono ${
                        state.q1Eliminated.length === 6
                          ? "text-emerald-400"
                          : "text-[#E10600]"
                      }`}
                    >
                      {state.q1Eliminated.length} / 6
                    </p>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHideExcludedInGrid((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white"
                    >
                      {hideExcludedInGrid ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-[#E10600]" />
                          <span>Mostrar excluidos Q1 (bloqueados)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-[#E10600]" />
                          <span>Ocultar los 6 eliminados Q1</span>
                        </>
                      )}
                    </button>
                    <div className="bg-[#15151E] border border-[#2D2D38] px-4 py-2.5 rounded-xl text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold">
                        Eliminados Q2
                      </p>
                      <p
                        className={`text-xl font-black font-mono ${
                          state.q2Eliminated.length === 6
                            ? "text-emerald-400"
                            : "text-[#E10600]"
                        }`}
                      >
                        {state.q2Eliminated.length} / 6
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* PASO 1: ELIMINADOS EN Q1 (6 de 22 pilotos)                */}
              {/* ========================================================= */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Chips de los 6 seleccionados */}
                  <div className="flex flex-wrap items-center gap-2 bg-[#1F1F27]/70 border border-[#2D2D38] p-3 rounded-xl">
                    <span className="text-xs font-bold text-[#8E8E93] mr-1">
                      Seleccionados Q1:
                    </span>
                    {state.q1Eliminated.length === 0 ? (
                      <span className="text-xs text-zinc-500 italic">
                        Haz clic en 6 pilotos del DriverGrid inferior...
                      </span>
                    ) : (
                      state.q1Eliminated.map((id) => {
                        const pil = getPiloto(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleQ1Driver(id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#E10600]/50 text-xs font-bold text-white hover:bg-red-950/40"
                          >
                            <span>{pil?.nombre || id}</span>
                            <X className="w-3 h-3 text-[#E10600]" />
                          </button>
                        );
                      })
                    )}
                  </div>

                  <DriverGrid
                    selectedDriverIds={state.q1Eliminated}
                    maxSelections={6}
                    onSelectDriver={(driver) => toggleQ1Driver(driver.id)}
                  />
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 2: ELIMINADOS EN Q2 (6 de los 16 restantes)          */}
              {/* ========================================================= */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 bg-[#1F1F27]/70 border border-[#2D2D38] p-3 rounded-xl">
                    <span className="text-xs font-bold text-[#8E8E93] mr-1">
                      Seleccionados Q2:
                    </span>
                    {state.q2Eliminated.length === 0 ? (
                      <span className="text-xs text-zinc-500 italic">
                        Selecciona los 6 eliminados en Q2...
                      </span>
                    ) : (
                      state.q2Eliminated.map((id) => {
                        const pil = getPiloto(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleQ2Driver(id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#E10600]/50 text-xs font-bold text-white hover:bg-red-950/40"
                          >
                            <span>{pil?.nombre || id}</span>
                            <X className="w-3 h-3 text-[#E10600]" />
                          </button>
                        );
                      })
                    )}
                  </div>

                  <DriverGrid
                    selectedDriverIds={state.q2Eliminated}
                    excludedDriverIds={state.q1Eliminated}
                    hideExcluded={hideExcludedInGrid}
                    maxSelections={6}
                    onSelectDriver={(driver) => toggleQ2Driver(driver.id)}
                  />
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 3: GRILLA FINAL Q3 (Posiciones 1 Pole a 10)          */}
              {/* ========================================================= */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* 10 Casilleros interactivos del P1 (Pole) al P10 */}
                  <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Casilleros de Salida Q3 (1 al 10)
                        </h4>
                        <p className="text-xs text-[#8E8E93]">
                          Selecciona un casillero (P1 a P10) y luego haz clic en
                          el piloto correspondiente abajo.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            autoFillRemainingQ3(q3AvailableDriverIds)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-amber-400 hover:border-amber-400/50 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Completar vacíos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearQ3Grid();
                            setActiveQ3Slot(0);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar Q3</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {state.q3Grid.map((driverId, idx) => {
                        const pil = getPiloto(driverId);
                        const esc = getEscuderia(pil?.escuderia_id);
                        const isSlotActive = activeQ3Slot === idx;
                        const isPole = idx === 0;

                        return (
                          <div
                            key={idx}
                            onClick={() => setActiveQ3Slot(idx)}
                            style={{
                              borderColor: isSlotActive
                                ? "#E10600"
                                : pil
                                ? esc?.color_hex || "#3671C6"
                                : "#2D2D38",
                            }}
                            className={`relative rounded-xl p-2.5 border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSlotActive
                                ? "bg-[#E10600]/15 ring-2 ring-[#E10600]/50"
                                : "bg-[#15151E] hover:bg-[#1a1a25]"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                                  isPole
                                    ? "bg-amber-500 text-black"
                                    : "bg-[#1F1F27] text-white border border-white/10"
                                }`}
                              >
                                P{idx + 1}
                              </span>
                              <div className="min-w-0">
                                {pil ? (
                                  <>
                                    <p className="text-xs font-bold text-white truncate">
                                      {pil.nombre}
                                    </p>
                                    <p className="text-[10px] text-[#8E8E93] truncate">
                                      {isPole ? "⚡ Pole (+2 pts)" : esc?.nombre}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs text-zinc-500 italic">
                                    {isPole ? "Elegir Pole..." : "Vacío"}
                                  </p>
                                )}
                              </div>
                            </div>

                            {pil && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assignQ3Position(idx, null);
                                  setActiveQ3Slot(idx);
                                }}
                                className="text-zinc-400 hover:text-[#E10600] p-1"
                                title="Quitar piloto"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DriverGrid con los 10 pilotos clasificados a Q3 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-[#D0D0D2]">
                        Asignando actualmente:{" "}
                        <span className="text-[#E10600] font-black">
                          Posición P{activeQ3Slot + 1}{" "}
                          {activeQ3Slot === 0 ? "(Pole Position)" : ""}
                        </span>
                      </p>
                      <span className="text-xs font-mono text-[#8E8E93]">
                        {state.q3Grid.filter(Boolean).length} / 10 asignados
                      </span>
                    </div>

                    <DriverGrid
                      selectedDriverIds={
                        state.q3Grid.filter(Boolean) as string[]
                      }
                      excludedDriverIds={q1AndQ2Excluded}
                      hideExcluded={true}
                      driverBadges={q3Badges}
                      onSelectDriver={(driver) => {
                        assignQ3Position(activeQ3Slot, driver.id);
                        // Avanzar automáticamente al próximo casillero vacío
                        const nextEmpty = state.q3Grid.findIndex(
                          (val, i) => i !== activeQ3Slot && !val
                        );
                        if (nextEmpty !== -1) {
                          setActiveQ3Slot(nextEmpty);
                        } else if (activeQ3Slot < 9) {
                          setActiveQ3Slot(activeQ3Slot + 1);
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 4: REVISIÓN Q3 (Top 10 Ordenado + Modificar/Confirmar) */}
              {/* ========================================================= */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D2D38] pb-4">
                      <div>
                        <h4 className="text-lg font-black text-white">
                          Parrilla Oficial Confirmada (Top 10 Q3)
                        </h4>
                        <p className="text-xs text-[#8E8E93]">
                          Revisa tus 10 posiciones de salida y los eliminados en
                          Q1 y Q2.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => goToStep(3)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white hover:border-[#E10600]/40 transition-colors"
                        >
                          Modificar Grilla Q3
                        </button>
                        <button
                          type="button"
                          onClick={() => nextStep()}
                          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] text-white hover:bg-[#b80500] shadow-[0_0_15px_rgba(225,6,0,0.4)] transition-all"
                        >
                          Confirmar Clasificación
                        </button>
                      </div>
                    </div>

                    {/* Grilla escalonada estilo F1 TV (P1..P10) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {state.q3Grid.map((driverId, idx) => {
                        const pil = getPiloto(driverId);
                        const esc = getEscuderia(pil?.escuderia_id);
                        const isPole = idx === 0;
                        return (
                          <div
                            key={idx}
                            style={{
                              borderLeftColor: esc?.color_hex || "#E10600",
                            }}
                            className={`flex items-center justify-between p-3.5 rounded-xl bg-[#15151E] border border-[#2D2D38] border-l-4 ${
                              idx % 2 === 1 ? "md:translate-y-2" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-9 h-9 rounded-lg font-mono text-sm font-black flex items-center justify-center ${
                                  isPole
                                    ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                    : "bg-[#1F1F27] text-white border border-white/10"
                                }`}
                              >
                                P{idx + 1}
                              </span>
                              {pil?.foto_url && (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#1F1F27] border border-white/10 shrink-0">
                                  <Image
                                    src={pil.foto_url}
                                    alt={pil.nombre}
                                    fill
                                    sizes="40px"
                                    className="object-contain object-bottom"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-black text-white">
                                  {pil?.nombre || "Sin asignar"}
                                </p>
                                <p className="text-xs text-[#8E8E93]">
                                  {esc?.nombre || pil?.escuderia_id}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                                isPole
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-white/5 text-[#8E8E93]"
                              }`}
                            >
                              {isPole ? "POLE (+2 PTS EXTRA)" : "+1 PT EXACTO"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen compacto de Q1 y Q2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#2D2D38]">
                      <div className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8E8E93] uppercase">
                            Eliminados Q2 (P11 - P16)
                          </span>
                          <button
                            type="button"
                            onClick={() => goToStep(2)}
                            className="text-[11px] font-semibold text-[#E10600] hover:underline"
                          >
                            Editar Q2
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {state.q2Eliminated.map((id) => (
                            <span
                              key={id}
                              className="text-xs font-bold px-2 py-0.5 rounded bg-[#1F1F27] text-white border border-white/10"
                            >
                              {getPiloto(id)?.nombre || id}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8E8E93] uppercase">
                            Eliminados Q1 (P17 - P22)
                          </span>
                          <button
                            type="button"
                            onClick={() => goToStep(1)}
                            className="text-[11px] font-semibold text-[#E10600] hover:underline"
                          >
                            Editar Q1
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {state.q1Eliminated.map((id) => (
                            <span
                              key={id}
                              className="text-xs font-bold px-2 py-0.5 rounded bg-[#1F1F27] text-white border border-white/10"
                            >
                              {getPiloto(id)?.nombre || id}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 5: PODIO DE LA CARRERA PRINCIPAL (P1, P2, P3)        */}
              {/* ========================================================= */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  {/* Tarjetas de selección de escalón del podio */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(
                      [
                        {
                          slot: "p1",
                          title: "🥇 P1 • Ganador GP",
                          pts: "3 Puntos",
                          val: state.p1,
                          next: "p2",
                        },
                        {
                          slot: "p2",
                          title: "🥈 P2 • Segundo Puesto",
                          pts: "2 Puntos",
                          val: state.p2,
                          next: "p3",
                        },
                        {
                          slot: "p3",
                          title: "🥉 P3 • Tercer Puesto",
                          pts: "1 Punto",
                          val: state.p3,
                          next: "p1",
                        },
                      ] as const
                    ).map((item) => {
                      const pil = getPiloto(item.val);
                      const esc = getEscuderia(pil?.escuderia_id);
                      const isActive = activePodiumSlot === item.slot;
                      return (
                        <div
                          key={item.slot}
                          onClick={() => setActivePodiumSlot(item.slot)}
                          className={`rounded-2xl p-4 border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isActive
                              ? "bg-[#E10600]/15 border-[#E10600] shadow-[0_0_20px_rgba(225,6,0,0.25)]"
                              : "bg-[#1F1F27] border-[#2D2D38] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {pil?.foto_url ? (
                              <div
                                className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#15151E] border-2 shrink-0"
                                style={{
                                  borderColor: esc?.color_hex || "#E10600",
                                }}
                              >
                                <Image
                                  src={pil.foto_url}
                                  alt={pil.nombre}
                                  fill
                                  sizes="48px"
                                  className="object-contain object-bottom"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-[#15151E] border border-[#2D2D38] flex items-center justify-center text-xs font-black text-[#8E8E93]">
                                {item.slot.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  {item.pts}
                                </span>
                              </div>
                              <p className="text-sm font-black text-[#F5F5F7] truncate mt-0.5">
                                {pil ? pil.nombre : "Seleccionar en el grid..."}
                              </p>
                            </div>
                          </div>

                          {pil && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                assignRacePodium(item.slot, null);
                                setActivePodiumSlot(item.slot);
                              }}
                              className="p-1 text-zinc-400 hover:text-[#E10600]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <DriverGrid
                    selectedDriverIds={
                      [state.p1, state.p2, state.p3].filter(Boolean) as string[]
                    }
                    driverBadges={podiumBadges}
                    onSelectDriver={(driver) => {
                      assignRacePodium(activePodiumSlot, driver.id);
                      if (activePodiumSlot === "p1") setActivePodiumSlot("p2");
                      else if (activePodiumSlot === "p2")
                        setActivePodiumSlot("p3");
                    }}
                  />
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 6: CARRERA MIXTA (Cantidad DNF + Escudería Ganadora) */}
              {/* ========================================================= */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  {/* Pregunta 1: Cantidad exacta de DNF */}
                  <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#E10600]" />
                          <span>1. ¿Cuántos DNF (abandonos) habrá en la carrera?</span>
                        </h4>
                        <p className="text-xs text-[#8E8E93]">
                          Otorga 1 punto por acertar la cantidad exacta de pilotos
                          que no terminan la carrera (0 a 22).
                        </p>
                      </div>
                      <span className="text-2xl font-black font-mono text-[#E10600] bg-[#15151E] border border-[#2D2D38] px-4 py-2 rounded-xl">
                        {state.dnfCount ?? 0} DNF
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 11 }).map((_, num) => {
                        const active = state.dnfCount === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setDnfCount(num)}
                            className={`w-12 h-11 rounded-xl font-mono text-sm font-black border transition-all ${
                              active
                                ? "bg-[#E10600] border-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.4)]"
                                : "bg-[#15151E] border-[#2D2D38] text-[#D0D0D2] hover:border-white/30"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-[#8E8E93]">Otro (0-22):</span>
                        <input
                          type="number"
                          min={0}
                          max={22}
                          value={state.dnfCount ?? ""}
                          onChange={(e) =>
                            setDnfCount(
                              e.target.value === ""
                                ? null
                                : Math.max(
                                    0,
                                    Math.min(22, parseInt(e.target.value, 10))
                                  )
                            )
                          }
                          className="w-20 bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#E10600]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pregunta 2: Escudería Ganadora */}
                  <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 space-y-4">
                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#E10600]" />
                        <span>2. ¿Qué Escudería ganará / sumará más puntos en el GP?</span>
                      </h4>
                      <p className="text-xs text-[#8E8E93]">
                        Otorga 1 punto por acertar la escudería ganadora del Gran
                        Premio.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                      {escuderias.map((esc) => {
                        const isSelected = state.escuderiaId === esc.id;
                        const teamDrivers = pilotos.filter(
                          (p) => p.escuderia_id === esc.id
                        );
                        return (
                          <div
                            key={esc.id}
                            onClick={() => setEscuderiaId(esc.id)}
                            style={{
                              borderColor: isSelected
                                ? "#E10600"
                                : esc.color_hex,
                            }}
                            className={`rounded-2xl p-4 bg-[#15151E] border-2 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "ring-4 ring-[#E10600]/50 shadow-[0_0_20px_rgba(225,6,0,0.35)] scale-[1.02]"
                                : "hover:scale-[1.01]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded text-white"
                                style={{ backgroundColor: esc.color_hex }}
                              >
                                {esc.id}
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-black text-white">
                              {esc.nombre}
                            </p>
                            <p className="text-[11px] text-[#8E8E93] mt-1 truncate">
                              {teamDrivers.map((d) => d.nombre).join(" • ")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 7: ESPECIALES (Piloto del Día + Posición Colapinto)  */}
              {/* ========================================================= */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  {/* Pregunta 1: Posición final exacta de Franco Colapinto (2 pts) */}
                  <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <span>🇦🇷 1. ¿En qué posición finaliza Franco Colapinto?</span>
                          <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            2 Puntos
                          </span>
                        </h4>
                        <p className="text-xs text-[#8E8E93]">
                          Selecciona su posición final exacta del P1 al P22 (o DNF
                          si consideras que abandona).
                        </p>
                      </div>
                      <span className="text-lg font-black font-mono text-amber-400 bg-[#15151E] border border-amber-500/30 px-4 py-1.5 rounded-xl self-start sm:self-auto">
                        {state.posicionColapinto === 0
                          ? "DNF (Abandono)"
                          : state.posicionColapinto
                          ? `P${state.posicionColapinto}`
                          : "Sin elegir"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 22 }).map((_, i) => {
                        const pos = i + 1;
                        const active = state.posicionColapinto === pos;
                        return (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setPosicionColapinto(pos)}
                            className={`w-12 h-10 rounded-xl font-mono text-xs font-black border transition-all ${
                              active
                                ? "bg-[#E10600] border-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
                                : "bg-[#15151E] border-[#2D2D38] text-[#D0D0D2] hover:border-white/30"
                            }`}
                          >
                            P{pos}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setPosicionColapinto(0)}
                        className={`px-4 h-10 rounded-xl font-mono text-xs font-black border transition-all ${
                          state.posicionColapinto === 0
                            ? "bg-[#E10600] border-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
                            : "bg-[#15151E] border-[#2D2D38] text-amber-400 hover:border-amber-400/40"
                        }`}
                      >
                        DNF (Abandono)
                      </button>
                    </div>
                  </div>

                  {/* Pregunta 2: Piloto del Día (DOTD) con DriverGrid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <Flame className="w-4 h-4 text-[#E10600]" />
                          <span>2. ¿Quién será el Piloto del Día (Driver of the Day)?</span>
                        </h4>
                        <p className="text-xs text-[#8E8E93]">
                          Selecciona una tarjeta en el DriverGrid (1 punto).
                        </p>
                      </div>
                      {state.pilotoDelDiaId && (
                        <span className="text-xs font-black text-white bg-[#1F1F27] border border-[#E10600] px-3 py-1.5 rounded-xl">
                          DOTD: {getPiloto(state.pilotoDelDiaId)?.nombre}
                        </span>
                      )}
                    </div>

                    <DriverGrid
                      selectedDriverId={state.pilotoDelDiaId}
                      onSelectDriver={(driver) => setPilotoDelDiaId(driver.id)}
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 8: SPRINT (Solo si activeGp.isSprint es true)        */}
              {/* ========================================================= */}
              {currentStep === 8 && activeGp.isSprint && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {(
                      [
                        {
                          slot: "sprintPole",
                          title: "⚡ Pole Sprint",
                          pts: "1 Punto",
                          val: state.sprintPole,
                        },
                        {
                          slot: "sprintP1",
                          title: "🥇 Sprint P1",
                          pts: "3 Puntos",
                          val: state.sprintP1,
                        },
                        {
                          slot: "sprintP2",
                          title: "🥈 Sprint P2",
                          pts: "2 Puntos",
                          val: state.sprintP2,
                        },
                        {
                          slot: "sprintP3",
                          title: "🥉 Sprint P3",
                          pts: "1 Punto",
                          val: state.sprintP3,
                        },
                      ] as const
                    ).map((item) => {
                      const pil = getPiloto(item.val);
                      const isActive = activeSprintSlot === item.slot;
                      return (
                        <div
                          key={item.slot}
                          onClick={() => setActiveSprintSlot(item.slot)}
                          className={`rounded-2xl p-3.5 border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isActive
                              ? "bg-[#E10600]/15 border-[#E10600]"
                              : "bg-[#1F1F27] border-[#2D2D38]"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {item.pts}
                              </span>
                            </div>
                            <p className="text-sm font-black text-[#F5F5F7] truncate mt-1">
                              {pil ? pil.nombre : "Seleccionar piloto..."}
                            </p>
                          </div>
                          {pil && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                assignSprintField(item.slot, null);
                              }}
                              className="p-1 text-zinc-400 hover:text-[#E10600]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <DriverGrid
                    selectedDriverIds={
                      [
                        state.sprintPole,
                        state.sprintP1,
                        state.sprintP2,
                        state.sprintP3,
                      ].filter(Boolean) as string[]
                    }
                    driverBadges={sprintBadges}
                    onSelectDriver={(driver) => {
                      assignSprintField(activeSprintSlot, driver.id);
                      if (activeSprintSlot === "sprintPole")
                        setActiveSprintSlot("sprintP1");
                      else if (activeSprintSlot === "sprintP1")
                        setActiveSprintSlot("sprintP2");
                      else if (activeSprintSlot === "sprintP2")
                        setActiveSprintSlot("sprintP3");
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior de navegación del Wizard */}
      {!isLockedByTime && !loadingExisting && (
        <div className="border-t border-[#2D2D38] bg-[#1F1F27] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1 || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Paso Anterior</span>
          </button>

          {savedSuccess ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider">
              <Check className="w-4 h-4" />
              <span>¡Pronóstico Guardado en Firestore!</span>
            </div>
          ) : currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceedCurrentStep()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] hover:bg-[#b80500] text-white disabled:opacity-40 shadow-[0_0_20px_rgba(225,6,0,0.4)] transition-all"
            >
              <span>
                {currentStep === 4
                  ? "Confirmar Clasificación"
                  : "Siguiente Paso"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={!canProceedCurrentStep() || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] hover:bg-[#b80500] text-white disabled:opacity-40 shadow-[0_0_25px_rgba(225,6,0,0.5)] transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Flag className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "Guardando en Firestore..."
                  : "Confirmar y Guardar Ticket"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
