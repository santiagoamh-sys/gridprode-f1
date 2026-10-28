"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GrandPrix, Piloto, Escuderia } from "@/types/f1";
import { pilotsData } from "@/data/pilotsData";
import {
  updateDriverStatsForGrandPrix,
  UpdateDriverStatsResult,
  MAIN_RACE_POINTS_MAP,
  SPRINT_POINTS_MAP,
} from "@/lib/firebase/driverStatsAdminService";
import {
  normalizeDriverList,
} from "@/lib/scoringEngine";
import {
  ShieldAlert,
  Zap,
  Trophy,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Flag,
  Sparkles,
  Users,
  Timer,
  ChevronRight,
  Flame,
} from "lucide-react";

interface AdminDriverStatsTabProps {
  selectedGp?: GrandPrix;
  pilotos: Piloto[];
  escuderias: Escuderia[];
  getEscuderia: (id?: string | null) => Escuderia | undefined;
  onStatsUpdated: () => Promise<void>;
}

export const AdminDriverStatsTab: React.FC<AdminDriverStatsTabProps> = ({
  selectedGp,
  pilotos,
  escuderias,
  getEscuderia,
  onStatsUpdated,
}) => {
  // =========================================================================
  // ESTADOS DE LA SUBPESTAÑA
  // =========================================================================
  // Sección A: 22 puestos de Clasificación (P1 a P22)
  const [qualyList, setQualyList] = useState<string[]>(Array(22).fill(""));

  // Sección B: 22 puestos de Carrera (P1 a P22) y estado DNF
  const [raceList, setRaceList] = useState<string[]>(Array(22).fill(""));
  const [dnfSet, setDnfSet] = useState<Set<string>>(new Set());

  // Sección C: Top 8 de Sprint (P1 a P8)
  const [sprintList, setSprintList] = useState<string[]>(Array(8).fill(""));

  // Estados de proceso y feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [allowReprocess, setAllowReprocess] = useState<boolean>(false);
  const [syncMode, setSyncMode] = useState<"bio_only" | "full">("bio_only");
  const [summaryResult, setSummaryResult] = useState<UpdateDriverStatsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lista estática de los 22 pilotos para fallback
  const allDriverCodes = useMemo(() => {
    return pilotsData.map((p) => p.codigo.toUpperCase());
  }, []);

  const pilotsMetaMap = useMemo(() => {
    const map = new Map<string, (typeof pilotsData)[0]>();
    pilotsData.forEach((p) => {
      map.set(p.codigo.toUpperCase(), p);
    });
    return map;
  }, []);

  // =========================================================================
  // AUTO-COMPLETADO INTELIGENTE DESDE LA PESTAÑA 1 (Resultados Oficiales)
  // =========================================================================
  const autoPopulateFromOfficialResults = () => {
    if (!selectedGp) return;
    const res = selectedGp.resultados_oficiales || {};

    // 1. Clasificación Completa (P1 a P22):
    // Q3 ya cargada (P1 a P10)
    const rawQ3 = normalizeDriverList(res.q3);
    const q1 = normalizeDriverList(res.q1);
    const q2 = normalizeDriverList(res.q2);

    const newQualy: string[] = Array(22).fill("");

    // P1 a P10 desde Q3
    for (let i = 0; i < 10; i++) {
      newQualy[i] = rawQ3[i] || "";
    }
    // Si res.pole está seteada y Q3 está vacía o distinta en P1, aseguramos que P1 sea la Pole
    if (res.pole && (!newQualy[0] || newQualy[0] !== res.pole)) {
      newQualy[0] = res.pole;
    }

    // P11 a P16 desde Q2
    for (let i = 0; i < 6; i++) {
      newQualy[10 + i] = q2[i] || "";
    }

    // P17 a P22 desde Q1
    for (let i = 0; i < 6; i++) {
      newQualy[16 + i] = q1[i] || "";
    }

    // Completar cualquier posición vacía con pilotos restantes que falten
    const assignedQualySet = new Set(newQualy.filter(Boolean));
    const missingForQualy = allDriverCodes.filter((c) => !assignedQualySet.has(c));
    let missingQualyIdx = 0;
    for (let i = 0; i < 22; i++) {
      if (!newQualy[i] && missingQualyIdx < missingForQualy.length) {
        newQualy[i] = missingForQualy[missingQualyIdx++];
      }
    }
    setQualyList(newQualy);

    // 2. Carrera Principal (P1 a P22 + DNF):
    const newRace: string[] = Array(22).fill("");
    const newDnfs = new Set<string>();

    // Precargar P1, P2 y P3
    if (res.p1) newRace[0] = res.p1;
    if (res.p2) newRace[1] = res.p2;
    if (res.p3) newRace[2] = res.p3;

    // Precargar posición de Franco Colapinto
    const posColapinto = res.posicion_colapinto;
    if (posColapinto !== null && posColapinto !== undefined) {
      if (posColapinto >= 1 && posColapinto <= 22) {
        newRace[posColapinto - 1] = "COL";
      } else if (posColapinto === 0) {
        // DNF para Colapinto
        newDnfs.add("COL");
      }
    }

    // Precargar DNF de la Pestaña 1
    const dnfDrivers = normalizeDriverList(res.dnf_drivers);
    dnfDrivers.forEach((d) => newDnfs.add(d.toUpperCase()));

    // Para los puestos restantes de carrera, rellenar provisionalmente con los pilotos de Qualy que aún no estén asignados
    const assignedRaceSet = new Set(newRace.filter(Boolean));
    const availableFromQualy = newQualy.filter((c) => c && !assignedRaceSet.has(c));
    let availIdx = 0;
    for (let i = 3; i < 22; i++) {
      if (!newRace[i] && availIdx < availableFromQualy.length) {
        newRace[i] = availableFromQualy[availIdx++];
      }
    }
    setRaceList(newRace);
    setDnfSet(newDnfs);

    // 3. Top 8 de Sprint (Condicional):
    if (selectedGp.isSprint) {
      const newSprint: string[] = Array(8).fill("");
      if (res.sprintP1) newSprint[0] = res.sprintP1;
      if (res.sprintP2) newSprint[1] = res.sprintP2;
      if (res.sprintP3) newSprint[2] = res.sprintP3;

      // Rellenar P4 a P8 con pilotos restantes si están disponibles
      const assignedSprintSet = new Set(newSprint.filter(Boolean));
      const remainingForSprint = newQualy.filter((c) => c && !assignedSprintSet.has(c));
      let remSprintIdx = 0;
      for (let i = 3; i < 8; i++) {
        if (!newSprint[i] && remSprintIdx < remainingForSprint.length) {
          newSprint[i] = remainingForSprint[remSprintIdx++];
        }
      }
      setSprintList(newSprint);
    }
  };

  // Cargar automáticamente al montar o al cambiar de GP
  useEffect(() => {
    autoPopulateFromOfficialResults();
    setSummaryResult(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAllowReprocess(false);
  }, [selectedGp?.id]);

  // =========================================================================
  // CONTROLADORES DE ORDENAMIENTO (SWAP ⬆️ / ⬇️)
  // =========================================================================
  const handleSwapQualy = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= 22 || indexB < 0 || indexB >= 22) return;
    setQualyList((prev) => {
      const copy = [...prev];
      const temp = copy[indexA];
      copy[indexA] = copy[indexB];
      copy[indexB] = temp;
      return copy;
    });
  };

  const handleSwapRace = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= 22 || indexB < 0 || indexB >= 22) return;
    setRaceList((prev) => {
      const copy = [...prev];
      const temp = copy[indexA];
      copy[indexA] = copy[indexB];
      copy[indexB] = temp;
      return copy;
    });
  };

  const handleToggleDnf = (driverId: string) => {
    if (!driverId) return;
    setDnfSet((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  // =========================================================================
  // VALIDACIONES
  // =========================================================================
  const qualyDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    qualyList.filter(Boolean).forEach((id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id]) => id);
  }, [qualyList]);

  const raceDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    raceList.filter(Boolean).forEach((id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id]) => id);
  }, [raceList]);

  const isQualyComplete = qualyList.every(Boolean) && qualyDuplicates.length === 0;
  const isRaceComplete = raceList.every(Boolean) && raceDuplicates.length === 0;
  const isSprintComplete =
    !selectedGp?.isSprint ||
    (sprintList.slice(0, 8).every(Boolean) &&
      new Set(sprintList.slice(0, 8)).size === 8);

  const isFormValid = isQualyComplete && isRaceComplete && isSprintComplete;

  const isAlreadyProcessed = Boolean((selectedGp as any)?.driverStatsProcessed);

  // =========================================================================
  // EJECUTAR ACTUALIZACIÓN DE ESTADÍSTICAS
  // =========================================================================
  const handleUpdateDriverStats = async () => {
    if (!selectedGp) return;

    if (!isFormValid) {
      setErrorMsg(
        "Por favor asegúrate de que todos los 22 puestos de Clasificación y Carrera estén asignados sin pilotos duplicados."
      );
      return;
    }

    if (isAlreadyProcessed && !allowReprocess) {
      setErrorMsg(
        "Este Gran Premio ya tiene estadísticas de pilotos procesadas. Si deseas sobreescribir, activa la casilla de confirmación."
      );
      return;
    }

    const isBioOnly = isAlreadyProcessed && syncMode === "bio_only";

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const racePayload = raceList.map((driverId) => ({
        driverId,
        isDnf: dnfSet.has(driverId),
      }));

      const result = await updateDriverStatsForGrandPrix({
        gpId: selectedGp.id,
        gpNombre: selectedGp.nombre,
        gpBandera: selectedGp.bandera || "🏁",
        isSprint: Boolean(selectedGp.isSprint),
        qualyPositions: qualyList,
        racePositions: racePayload,
        sprintTop8: selectedGp.isSprint ? sprintList.slice(0, 8) : [],
        syncBiographicalOnly: isBioOnly,
      });

      setSummaryResult(result);
      setSuccessMsg(
        isBioOnly
          ? `¡Perfil Biográfico de los ${result.updatedDriversCount} pilotos sincronizado exitosamente (carreras, victorias y podios históricos actualizados sin duplicar puntos ni victorias anuales)!`
          : `¡Estadísticas completas de los ${result.updatedDriversCount} pilotos actualizadas exitosamente en Firebase!`
      );
      await onStatsUpdated();
    } catch (err: any) {
      console.error("Error al actualizar estadísticas de pilotos:", err);
      setErrorMsg(err.message || "Error al procesar estadísticas en Firestore.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper para renderizar opción de piloto con colores
  const renderDriverOption = (driverId: string) => {
    const meta = pilotsMetaMap.get(driverId);
    if (!meta) return driverId;
    return `${meta.bandera} ${meta.nombreCompleto} (${meta.codigo}) • ${meta.escuderia}`;
  };

  const getDriverColor = (driverId: string) => {
    const meta = pilotsMetaMap.get(driverId);
    const esc = getEscuderia(meta?.escuderiaId);
    return esc?.color_hex || "#8E8E93";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ================================================================= */}
      {/* BANNER INFORMATIVO Y HERRAMIENTAS DE PRE-CARGA                   */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[#E10600] text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" />
              <span>Gestión de Temporada Oficial F1</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Estadísticas de Pilotos • {selectedGp?.nombre}</span>
              <span className="text-base">{selectedGp?.bandera}</span>
            </h2>
            <p className="text-xs text-[#8E8E93]">
              Actualiza las colecciones oficiales de los 22 pilotos (<code className="text-white">pilotos</code> y <code className="text-white">drivers_stats</code>) con puntos FIA, poles, H2H y rachas.
            </p>
          </div>

          <button
            type="button"
            onClick={autoPopulateFromOfficialResults}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#15151E] border border-[#2D2D38] hover:border-white/30 text-xs font-bold text-white transition-all shadow-md cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Recargar desde Pestaña 1</span>
          </button>
        </div>

        {/* Alerta de Idempotencia si el GP ya fue procesado */}
        {isAlreadyProcessed && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Estadísticas Ya Procesadas para este Gran Premio</span>
            </div>
            <p className="text-xs text-amber-100 leading-relaxed">
              Este Gran Premio ya tiene su flag de procesamiento activo en Firebase. Para evitar duplicar victorias, podios y puntos de forma involuntaria, selecciona cómo deseas proceder:
            </p>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#15151E] border border-amber-500/40 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="bio_only"
                  checked={syncMode === "bio_only"}
                  onChange={() => setSyncMode("bio_only")}
                  className="mt-0.5 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Sincronizar únicamente Perfil Biográfico (carreras, victorias y podios históricos)
                  </span>
                  <span className="text-[11px] text-[#8E8E93]">
                    Recomendado: actualiza los contadores biográficos faltantes sin duplicar los puntos del campeonato ni las victorias anuales ya sumadas.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#15151E] border border-white/10 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="full"
                  checked={syncMode === "full"}
                  onChange={() => setSyncMode("full")}
                  className="mt-0.5 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Recalcular completamente (suma puntos y victorias anuales nuevamente)
                  </span>
                  <span className="text-[11px] text-[#8E8E93]">
                    Vuelve a sumar puntos de carrera y sprint, cortes clasificatorios y duelos H2H.
                  </span>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReprocess}
                onChange={(e) => setAllowReprocess(e.target.checked)}
                className="w-4 h-4 rounded border-amber-400 text-[#E10600] focus:ring-[#E10600]"
              />
              <span className="text-xs font-bold text-amber-200">
                He verificado los datos y confirmo la ejecución de la actualización.
              </span>
            </label>
          </div>
        )}

        {/* Mensajes de feedback */}
        {errorMsg && (
          <div className="rounded-xl bg-red-950/60 border border-red-500/60 p-4 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/60 p-4 text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SECCIÓN A: CLASIFICACIÓN COMPLETA (P1 A P22)                      */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2D2D38]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-[#E10600]" />
              <h3 className="text-base font-black text-white tracking-tight">
                Sección A • Clasificación Completa (P1 a P22)
              </h3>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Precargada automáticamente: <span className="text-amber-400 font-bold">P1-P10 (Q3)</span>,{" "}
              <span className="text-sky-400 font-bold">P11-P16 (Q2)</span> y{" "}
              <span className="text-rose-400 font-bold">P17-P22 (Q1)</span>. Usa los botones ⬆️ / ⬇️ para intercambiar posiciones adyacentes.
            </p>
          </div>

          {qualyDuplicates.length > 0 && (
            <span className="text-xs font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-xl">
              Duplicados: {qualyDuplicates.join(", ")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {qualyList.map((driverId, idx) => {
            const pos = idx + 1;
            const isQ3 = pos <= 10;
            const isQ2 = pos > 10 && pos <= 16;
            const isQ1 = pos > 16;
            const isPole = pos === 1;

            const badgeColor = isPole
              ? "bg-amber-500 text-black border-amber-300"
              : isQ3
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : isQ2
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40";

            const cutLabel = isPole
              ? "POLE POSITION ⚡"
              : isQ3
              ? "Q3 (Top 10)"
              : isQ2
              ? "Q2 (Eliminado)"
              : "Q1 (Eliminado)";

            return (
              <div
                key={`qualy-slot-${pos}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isPole
                    ? "bg-[#1F1F27] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "bg-[#15151E] border-[#2D2D38] hover:border-white/20"
                }`}
              >
                {/* Posición y Badge de Corte */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-black border ${badgeColor}`}
                  >
                    P{pos}
                  </span>
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-black uppercase text-[#8E8E93] block">
                      {cutLabel}
                    </span>
                  </div>
                </div>

                {/* Selector de Piloto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: getDriverColor(driverId) }}
                    />
                    <select
                      value={driverId}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setQualyList((prev) => {
                          const copy = [...prev];
                          copy[idx] = newVal;
                          return copy;
                        });
                      }}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600] truncate"
                    >
                      <option value="">-- Seleccionar Piloto --</option>
                      {allDriverCodes.map((code) => (
                        <option key={code} value={code}>
                          {renderDriverOption(code)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botones de Reordenamiento Rápido */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwapQualy(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Subir posición"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwapQualy(idx, idx + 1)}
                    disabled={idx === 21}
                    className="p-1.5 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Bajar posición"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECCIÓN B: RESULTADO FINAL DE CARRERA (P1 A P22 + DNF)            */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2D2D38]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-black text-white tracking-tight">
                Sección B • Resultado Final de Carrera (P1 a P22 + Toggle DNF)
              </h3>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Precargados automáticamente: <span className="text-amber-300 font-bold">P1, P2 y P3</span>,{" "}
              la posición final de <span className="text-sky-300 font-bold">Franco Colapinto</span> y los pilotos en{" "}
              <span className="text-red-400 font-bold">[DNF]</span>.
            </p>
          </div>

          {raceDuplicates.length > 0 && (
            <span className="text-xs font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-xl">
              Duplicados: {raceDuplicates.join(", ")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {raceList.map((driverId, idx) => {
            const pos = idx + 1;
            const isPodium = pos <= 3;
            const isColapinto = driverId === "COL";
            const isDnf = dnfSet.has(driverId);
            const pointsAwarded = !isDnf ? MAIN_RACE_POINTS_MAP[pos] || 0 : 0;

            const podiumBadgeColor =
              pos === 1
                ? "bg-amber-500 text-black border-amber-300"
                : pos === 2
                ? "bg-zinc-300 text-black border-zinc-100"
                : pos === 3
                ? "bg-amber-700 text-white border-amber-500"
                : "bg-[#1F1F27] text-white border-[#2D2D38]";

            return (
              <div
                key={`race-slot-${pos}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isDnf
                    ? "bg-red-950/20 border-red-500/40"
                    : isPodium
                    ? "bg-[#1F1F27] border-amber-500/40 shadow-sm"
                    : isColapinto
                    ? "bg-sky-950/20 border-sky-500/40"
                    : "bg-[#15151E] border-[#2D2D38] hover:border-white/20"
                }`}
              >
                {/* Posición y Puntos */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-black border ${podiumBadgeColor}`}
                  >
                    P{pos}
                  </span>
                  <div className="w-16">
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isDnf
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : pointsAwarded > 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "text-[#8E8E93]"
                      }`}
                    >
                      {isDnf ? "0 pts" : `+${pointsAwarded} pts`}
                    </span>
                  </div>
                </div>

                {/* Selector de Piloto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: getDriverColor(driverId) }}
                    />
                    <select
                      value={driverId}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setRaceList((prev) => {
                          const copy = [...prev];
                          copy[idx] = newVal;
                          return copy;
                        });
                      }}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600] truncate"
                    >
                      <option value="">-- Seleccionar Piloto --</option>
                      {allDriverCodes.map((code) => (
                        <option key={code} value={code}>
                          {renderDriverOption(code)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toggle DNF */}
                <button
                  type="button"
                  onClick={() => handleToggleDnf(driverId)}
                  disabled={!driverId}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                    isDnf
                      ? "bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(225,6,0,0.5)]"
                      : "bg-[#1F1F27] text-[#8E8E93] hover:text-white border-white/10"
                  }`}
                  title="Marcar o desmarcar abandono (DNF)"
                >
                  {isDnf ? "DNF" : "Fin"}
                </button>

                {/* Botones Swap */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwapRace(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwapRace(idx, idx + 1)}
                    disabled={idx === 21}
                    className="p-1.5 rounded-lg bg-[#1F1F27] border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECCIÓN C: TOP 8 DE SPRINT (CONDICIONAL - SI isSprint)            */}
      {/* ================================================================= */}
      {selectedGp?.isSprint && (
        <div className="rounded-2xl bg-[#1F1F27] border border-amber-500/40 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#2D2D38]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black text-white tracking-tight">
                  Sección C • Top 8 de Carrera Sprint (Puntos Oficiales F1)
                </h3>
              </div>
              <p className="text-xs text-[#8E8E93]">
                Puntos Sprint FIA: P1 (+8), P2 (+7), P3 (+6), P4 (+5), P5 (+4), P6 (+3), P7 (+2), P8 (+1).
              </p>
            </div>
            <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl">
              Formato Sprint Activo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {sprintList.map((driverId, idx) => {
              const pos = idx + 1;
              const points = SPRINT_POINTS_MAP[pos] || 0;

              return (
                <div
                  key={`sprint-slot-${pos}`}
                  className="p-3 rounded-xl bg-[#15151E] border border-amber-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-md bg-amber-500 text-black font-mono text-xs font-black flex items-center justify-center">
                      P{pos}
                    </span>
                    <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                      +{points} pts
                    </span>
                  </div>

                  <select
                    value={driverId}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setSprintList((prev) => {
                        const copy = [...prev];
                        copy[idx] = newVal;
                        return copy;
                      });
                    }}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 truncate"
                  >
                    <option value="">-- Seleccionar --</option>
                    {allDriverCodes.map((code) => (
                      <option key={code} value={code}>
                        {renderDriverOption(code)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* BOTÓN INDEPENDIENTE: ACTUALIZAR ESTADÍSTICAS DE PILOTOS          */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E10600]" />
            <span>Actualización Oficial de Estadísticas de Pilotos</span>
          </h4>
          <p className="text-xs text-[#8E8E93] leading-relaxed">
            Suma +1 carrera a los 22 pilotos, victorias y podios históricos, puntos del campeonato, ranking del 1º al 22º, H2H con compañero, frecuencia en Q1/Q2/Q3 y racha FIFO de 3 carreras.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUpdateDriverStats}
          disabled={isProcessing || !isFormValid || (isAlreadyProcessed && !allowReprocess)}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-wider bg-gradient-to-r from-[#E10600] via-[#ff221c] to-[#E10600] hover:brightness-110 text-white shadow-[0_0_35px_rgba(225,6,0,0.45)] disabled:opacity-50 transition-all cursor-pointer shrink-0"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5 fill-white" />
          )}
          <span>
            {isProcessing
              ? "Actualizando Pilotos en Firebase..."
              : "Actualizar Estadísticas de Pilotos"}
          </span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* RESUMEN DETALLADO TRAS ACTUALIZAR                                */}
      {/* ================================================================= */}
      {summaryResult && (
        <div className="rounded-2xl bg-[#1F1F27] border border-emerald-500/40 p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-2.5 text-emerald-400 font-black text-sm uppercase tracking-wider pb-3 border-b border-[#2D2D38]">
            <CheckCircle2 className="w-5 h-5" />
            <span>Resumen de Estadísticas de Pilotos Actualizadas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#15151E] border border-white/5 space-y-1">
              <span className="text-[#8E8E93] text-[10px] uppercase font-bold block">
                Pole Position
              </span>
              <span className="text-white font-black">
                {summaryResult.poleDriver}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#15151E] border border-white/5 space-y-1">
              <span className="text-[#8E8E93] text-[10px] uppercase font-bold block">
                Ganador (P1)
              </span>
              <span className="text-white font-black">
                {summaryResult.winnerDriver}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#15151E] border border-white/5 space-y-1">
              <span className="text-[#8E8E93] text-[10px] uppercase font-bold block">
                Podio
              </span>
              <span className="text-white font-black">
                {summaryResult.podiumDrivers.join(" • ")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#15151E] border border-white/5 space-y-1">
              <span className="text-[#8E8E93] text-[10px] uppercase font-bold block">
                Abandonos (DNF)
              </span>
              <span className="text-red-400 font-black">
                {summaryResult.dnfDrivers.length > 0
                  ? summaryResult.dnfDrivers.join(", ")
                  : "0 DNF"}
              </span>
            </div>
          </div>

          {/* Tabla de Puntos y Posición del Campeonato */}
          <div className="space-y-2">
            <h5 className="text-xs font-black uppercase text-[#8E8E93]">
              Nuevo Ranking y Puntos del Campeonato de Pilotos
            </h5>
            <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-[#15151E]">
              {summaryResult.pointsAwarded.map((item) => (
                <div
                  key={item.driverId}
                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-md bg-[#1F1F27] border border-white/10 flex items-center justify-center font-mono font-black text-white text-[11px]">
                      {item.posicionNueva}º
                    </span>
                    <span className="font-bold text-white">{item.nombre}</span>
                    <span className="text-[10px] font-mono text-[#8E8E93]">
                      ({item.driverId})
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-mono text-zinc-300 hidden sm:inline-block">
                      {item.carrerasTotales} carr • {item.victoriasTotales} vict • {item.podiosTotales} pod
                    </span>
                    {item.puntosSumados > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400">
                        +{item.puntosSumados} pts
                      </span>
                    )}
                    <span className="font-mono font-black text-white text-xs w-16 text-right">
                      {item.puntosTotal} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
