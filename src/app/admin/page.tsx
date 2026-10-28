"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import { AdminSeedCard } from "@/components/AdminSeedCard";
import { AdminDriverStatsTab } from "@/components/AdminDriverStatsTab";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { GrandPrix, ResultadosOficiales } from "@/types/f1";
import { guardarResultadosYCalcularPuntajes } from "@/lib/firebase/f1Service";
import {
  processRaceBadgesBatch,
  ProcessBadgesResult,
} from "@/lib/firebase/badgeService";
import { resetAndPublishTrivia } from "@/lib/firebase/triviaService";
import { DEFAULT_MEXICO_TRIVIA } from "@/data/triviaData";
import { OfficialRaceResults } from "@/utils/badgeEvaluator";
import { BADGES_DATA } from "@/data/badgesData";
import {
  fetchOfficialResultsFromF1Api,
  F1ApiSyncedResults,
} from "@/lib/f1ApiService";
import {
  normalizeDriverList,
  normalizeDnfCount,
} from "@/lib/scoringEngine";
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  Loader2,
  CloudDownload,
  Zap,
  ArrowLeft,
  AlertCircle,
  Trophy,
  Award,
  Sparkles,
  Flame,
  Users,
  Flag,
  Car,
  X,
  Layers,
  Calendar,
  Timer,
  ChevronDown,
  ChevronUp,
  Brain,
  RefreshCw,
} from "lucide-react";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <AdminGuardAndContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function AdminGuardAndContent() {
  const { user, profile, refreshProfile } = useAuth();
  const isAuthorizedAdmin =
    isEmailInInitialAdmins(user?.email) || profile?.role === "Administrador";

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-xl mx-auto my-16 rounded-2xl bg-[#1F1F27] border border-[#E10600]/40 p-8 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-white">
          Acceso Restringido al Panel de Administrador
        </h1>
        <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed">
          Esta ruta está protegida mediante la variable de entorno{" "}
          <code className="text-white font-mono">
            NEXT_PUBLIC_INITIAL_ADMIN_EMAILS
          </code>
          . Tu cuenta actual (<span className="text-white">{user?.email}</span>)
          no figura en la lista de administradores autorizados.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] text-white hover:bg-[#b80500]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <AdminPanelContent onScoresUpdated={refreshProfile} />;
}

interface ToastState {
  show: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface OperationSummary {
  prediccionesEvaluadas: number;
  usuariosActualizados: number;
  badgesUsersCount: number;
  usersBadgesSummary: ProcessBadgesResult["usersSummary"];
}

function AdminPanelContent({
  onScoresUpdated,
}: {
  onScoresUpdated: () => Promise<void>;
}) {
  const {
    grandPrixList,
    pilotos,
    escuderias,
    getEscuderia,
    refreshData,
  } = useF1Data();

  // Toast flotante
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  // Selección de Gran Premio
  const [selectedGpId, setSelectedGpId] = useState<string>(
    grandPrixList[0]?.id || "gp-singapur-2026"
  );

  const selectedGp: GrandPrix | undefined =
    grandPrixList.find((g) => g.id === selectedGpId) || grandPrixList[0];

  // Subpestañas del Panel de Administración
  const [activeAdminTab, setActiveAdminTab] = useState<
    "resultados" | "estadisticas_pilotos"
  >("resultados");

  // =========================================================================
  // ESTADOS DEL FORMULARIO ÚNICO DE RESULTADOS OFICIALES
  // =========================================================================
  // 1. Clasificación / Grilla (Q1, Q2, Q3)
  const [q1Slots, setQ1Slots] = useState<string[]>(Array(6).fill(""));
  const [q2Slots, setQ2Slots] = useState<string[]>(Array(6).fill(""));
  const [q3Slots, setQ3Slots] = useState<string[]>(Array(10).fill(""));
  const [pole, setPole] = useState<string>("");

  // 2. Podio de Carrera Principal
  const [p1, setP1] = useState<string>("");
  const [p2, setP2] = useState<string>("");
  const [p3, setP3] = useState<string>("");

  // 3. Vuelta Rápida y Piloto del Día
  const [vueltaRapida, setVueltaRapida] = useState<string>("");
  const [pilotoDelDia, setPilotoDelDia] = useState<string>("");

  // 4. Posición Franco Colapinto (1 a 22 o 0 DNF)
  const [posicionColapinto, setPosicionColapinto] = useState<number>(10);

  // 5. Escudería Ganadora / Con Más Puntos
  const [escuderiaGanadora, setEscuderiaGanadora] = useState<string>("");

  // 6. Gestor de Abandonos (DNF)
  const [dnfDrivers, setDnfDrivers] = useState<string[]>([]);

  // 7. Modo Sprint Condicional
  const [sprintPole, setSprintPole] = useState<string>("");
  const [sprintP1, setSprintP1] = useState<string>("");
  const [sprintP2, setSprintP2] = useState<string>("");
  const [sprintP3, setSprintP3] = useState<string>("");

  // Estados de proceso y feedback
  const [syncingApi, setSyncingApi] = useState(false);
  const [apiPreviewMeta, setApiPreviewMeta] =
    useState<F1ApiSyncedResults | null>(null);
  const [isSavingAndCalculating, setIsSavingAndCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [operationSummary, setOperationSummary] =
    useState<OperationSummary | null>(null);

  // Panel secundario colapsable de Seed y Trivia
  const [showSeedCard, setShowSeedCard] = useState(false);
  const [isReactivatingTrivia, setIsReactivatingTrivia] = useState(false);

  const handleReactivateTrivia = async () => {
    try {
      setIsReactivatingTrivia(true);
      await resetAndPublishTrivia(DEFAULT_MEXICO_TRIVIA, true);
      setToast({
        show: true,
        type: "success",
        title: "¡Trivia de México Activada con Éxito!",
        message:
          "Se actualizaron las 5 preguntas oficiales en Firestore con estado 'activa' y se reseteó la disponibilidad para todos los usuarios.",
      });
    } catch (err: any) {
      console.error("Error al reactivar trivia:", err);
      setToast({
        show: true,
        type: "error",
        title: "Error al Reactivar Trivia",
        message: err.message || "No se pudo actualizar la trivia en Firebase.",
      });
    } finally {
      setIsReactivatingTrivia(false);
    }
  };

  // Sincronizar formulario completo cuando cambia el GP seleccionado
  useEffect(() => {
    if (!selectedGp) return;
    const res = selectedGp.resultados_oficiales || ({} as ResultadosOficiales);
    const q1 = normalizeDriverList(res.q1).slice(0, 6);
    const q2 = normalizeDriverList(res.q2)
      .filter((id) => !q1.includes(id))
      .slice(0, 6);
    const rawQ3 = normalizeDriverList(res.q3).filter(
      (id) => !q1.includes(id) && !q2.includes(id)
    );

    setQ1Slots(Array(6).fill("").map((_, i) => q1[i] || ""));
    setQ2Slots(Array(6).fill("").map((_, i) => q2[i] || ""));
    setQ3Slots(Array(10).fill("").map((_, i) => rawQ3[i] || ""));

    let poleVal = res.pole || "";
    if (!poleVal && rawQ3.length > 0) poleVal = rawQ3[0];
    setPole(poleVal);

    setP1(res.p1 || "");
    setP2(res.p2 || "");
    setP3(res.p3 || "");
    setVueltaRapida(res.vuelta_rapida || "");
    setPilotoDelDia(res.piloto_del_dia || "");
    setEscuderiaGanadora(res.escuderia || "");

    const dnfList = normalizeDriverList(
      res.dnf_drivers || (Array.isArray(res.dnf) ? res.dnf : [])
    );
    setDnfDrivers(dnfList);

    setPosicionColapinto(
      res.posicion_colapinto !== null && res.posicion_colapinto !== undefined
        ? Number(res.posicion_colapinto)
        : 10
    );

    setSprintPole(res.sprintPole || "");
    setSprintP1(res.sprintP1 || "");
    setSprintP2(res.sprintP2 || "");
    setSprintP3(res.sprintP3 || "");

    setApiPreviewMeta(null);
    setErrorMsg(null);
    setOperationSummary(null);
  }, [selectedGpId, selectedGp]);

  // Manejo de alternancia en slots de Q1, Q2, Q3
  const handleQ1SlotChange = (slotIdx: number, driverId: string) => {
    setQ1Slots((prev) => {
      const next = [...prev];
      if (driverId) {
        for (let i = 0; i < 6; i++) {
          if (next[i] === driverId) next[i] = "";
        }
      }
      next[slotIdx] = driverId;
      const activeQ1 = new Set(next.filter(Boolean));
      setQ2Slots((q2Prev) =>
        q2Prev.map((id) => (id && activeQ1.has(id) ? "" : id))
      );
      setQ3Slots((q3Prev) =>
        q3Prev.map((id) => (id && activeQ1.has(id) ? "" : id))
      );
      return next;
    });
  };

  const handleQ2SlotChange = (slotIdx: number, driverId: string) => {
    const q1Elim = q1Slots.filter(Boolean);
    if (driverId && q1Elim.includes(driverId)) return;
    setQ2Slots((prev) => {
      const next = [...prev];
      if (driverId) {
        for (let i = 0; i < 6; i++) {
          if (next[i] === driverId) next[i] = "";
        }
      }
      next[slotIdx] = driverId;
      const activeQ2 = new Set(next.filter(Boolean));
      setQ3Slots((q3Prev) =>
        q3Prev.map((id) => (id && activeQ2.has(id) ? "" : id))
      );
      return next;
    });
  };

  const handleQ3SlotChange = (posIndex: number, driverId: string) => {
    const q1Elim = q1Slots.filter(Boolean);
    const q2Elim = q2Slots.filter(Boolean);
    if (driverId && (q1Elim.includes(driverId) || q2Elim.includes(driverId))) {
      return;
    }
    setQ3Slots((prev) => {
      const next = [...prev];
      if (driverId) {
        for (let i = 0; i < 10; i++) {
          if (next[i] === driverId) next[i] = "";
        }
      }
      next[posIndex] = driverId;
      if (posIndex === 0 && driverId) {
        setPole(driverId);
      }
      return next;
    });
  };

  const q1Eliminated = q1Slots.filter(Boolean);
  const q2Eliminated = q2Slots.filter(Boolean);
  const q3Selected = q3Slots.filter(Boolean);

  const q2AvailableDrivers = pilotos.filter(
    (p) => !q1Eliminated.includes(p.id)
  );
  const q3AvailableDrivers = pilotos.filter(
    (p) => !q1Eliminated.includes(p.id) && !q2Eliminated.includes(p.id)
  );

  // Manejo interactivo de Abandonos (DNF)
  const toggleDnfDriver = (driverId: string) => {
    setDnfDrivers((prev) => {
      const isAlreadyDnf = prev.includes(driverId);
      const next = isAlreadyDnf
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId];

      // Sincronizar automáticamente la posición de Colapinto si es el piloto seleccionado
      if (driverId === "COL") {
        if (!isAlreadyDnf) {
          setPosicionColapinto(0);
        } else if (posicionColapinto === 0) {
          setPosicionColapinto(10);
        }
      }
      return next;
    });
  };

  // Sincronización automática desde la API oficial de F1
  const handleSyncFromF1Api = async () => {
    if (!selectedGp) return;
    try {
      setSyncingApi(true);
      setErrorMsg(null);
      setOperationSummary(null);

      const synced = await fetchOfficialResultsFromF1Api(selectedGp);

      setQ1Slots(
        Array(6)
          .fill("")
          .map((_, i) => synced.q1Eliminated[i] || "")
      );
      setQ2Slots(
        Array(6)
          .fill("")
          .map((_, i) => synced.q2Eliminated[i] || "")
      );
      setQ3Slots(
        Array(10)
          .fill("")
          .map((_, i) => synced.q3Grid[i] || "")
      );

      const syncedPole = synced.q3Grid[0] || synced.p1;
      setPole(syncedPole);
      setP1(synced.p1);
      setP2(synced.p2);
      setP3(synced.p3);
      setVueltaRapida(synced.p1);
      setEscuderiaGanadora(synced.escuderiaGanadora);
      setPosicionColapinto(synced.posicionColapinto);
      setPilotoDelDia((prev) => prev || synced.pilotoDelDiaSuggested);

      if (selectedGp.isSprint) {
        setSprintPole(synced.sprintPole || synced.p1);
        setSprintP1(synced.sprintP1 || synced.p1);
        setSprintP2(synced.sprintP2 || synced.p2);
        setSprintP3(synced.sprintP3 || synced.p3);
      }

      setApiPreviewMeta(synced);
    } catch (err: any) {
      console.error("Error al sincronizar desde la API de F1:", err);
      setErrorMsg(
        err.message ||
          "No se pudieron obtener los resultados desde la API de F1."
      );
    } finally {
      setSyncingApi(false);
    }
  };

  // =========================================================================
  // BOTÓN ÚNICO: GUARDAR RESULTADOS Y CALCULAR (AUTOMATIZACIÓN COMPLETA)
  // =========================================================================
  const handleSaveAndCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGp) return;

    // Validaciones estrictas
    if (!p1 || !p2 || !p3) {
      setErrorMsg("Debes especificar el podio completo de la carrera (P1, P2 y P3).");
      return;
    }
    if (new Set([p1, p2, p3]).size !== 3) {
      setErrorMsg("Los 3 pilotos del podio principal (P1, P2 y P3) deben ser distintos.");
      return;
    }
    if (!escuderiaGanadora) {
      setErrorMsg("Debes seleccionar la Escudería Ganadora / Con más puntos.");
      return;
    }
    if (!pilotoDelDia) {
      setErrorMsg("Debes seleccionar al Piloto del Día (DOTD).");
      return;
    }
    if (selectedGp.isSprint && (!sprintP1 || !sprintP2 || !sprintP3)) {
      setErrorMsg("Para carreras con formato Sprint, debes completar el podio de la Sprint.");
      return;
    }

    const finalPole = pole || q3Slots[0] || p1;

    try {
      setIsSavingAndCalculating(true);
      setErrorMsg(null);
      setOperationSummary(null);

      // 1. Guardar resultados de carrera y calcular puntajes de leaderboard
      const resultadosOficiales: ResultadosOficiales = {
        q1: q1Slots.filter(Boolean),
        q2: q2Slots.filter(Boolean),
        q3: q3Slots.filter(Boolean),
        pole: finalPole,
        p1,
        p2,
        p3,
        dnf: dnfDrivers.length,
        dnf_drivers: dnfDrivers,
        vuelta_rapida: vueltaRapida || null,
        piloto_del_dia: pilotoDelDia,
        escuderia: escuderiaGanadora,
        posicion_colapinto: posicionColapinto,
        ...(selectedGp.isSprint
          ? {
              sprintPole: sprintPole || finalPole,
              sprintP1,
              sprintP2,
              sprintP3,
            }
          : {}),
      };

      const scoringResult = await guardarResultadosYCalcularPuntajes(
        selectedGp,
        resultadosOficiales
      );

      // 2. Ejecutar automáticamente la lógica de premios e insignias individuales
      const officialPayload: OfficialRaceResults = {
        p1,
        p2,
        p3,
        pole: finalPole,
        q3: q3Slots.filter(Boolean),
        piloto_del_dia: pilotoDelDia,
        escuderia: escuderiaGanadora,
        dnf: dnfDrivers.length,
        dnfDrivers: dnfDrivers,
        dnf_drivers: dnfDrivers,
        posicion_colapinto: posicionColapinto,
        vuelta_rapida: vueltaRapida || null,
        isSprint: selectedGp.isSprint,
        ...(selectedGp.isSprint
          ? {
              sprintPole: sprintPole || finalPole,
              sprintP1,
              sprintP2,
              sprintP3,
            }
          : {}),
      };

      const badgesResult = await processRaceBadgesBatch(
        selectedGp.id,
        officialPayload
      );

      // 3. Refrescar contextos de la aplicación
      await refreshData();
      await onScoresUpdated();

      // 4. Registrar resumen de la operación
      setOperationSummary({
        prediccionesEvaluadas: scoringResult.prediccionesEvaluadas,
        usuariosActualizados: scoringResult.usuariosActualizados,
        badgesUsersCount: badgesResult.updatedUsersCount,
        usersBadgesSummary: badgesResult.usersSummary,
      });

      // 5. Toast único de éxito
      setToast({
        show: true,
        type: "success",
        title: "¡Resultados Guardados y Puntajes Calculados!",
        message: `Se evaluaron ${scoringResult.prediccionesEvaluadas} pronósticos, se actualizó la tabla general (${scoringResult.usuariosActualizados} usuarios) y se procesaron las 16 insignias y trofeos (${badgesResult.updatedUsersCount} perfiles actualizados).`,
      });
    } catch (err: any) {
      console.error("Error al guardar resultados y calcular:", err);
      setErrorMsg(
        err.message ||
          "Ocurrió un error al guardar los resultados y calcular en Firebase."
      );
      setToast({
        show: true,
        type: "error",
        title: "Error en la Operación",
        message: err.message || "Error al procesar en Firebase.",
      });
    } finally {
      setIsSavingAndCalculating(false);
    }
  };

  const badgeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    BADGES_DATA.forEach((b) => {
      map.set(b.id, b.nombre);
    });
    return map;
  }, []);

  return (
    <div className="space-y-8 relative">
      {/* ================================================================= */}
      {/* TOAST FLOTANTE GLASSMORPHISM                                      */}
      {/* ================================================================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div
            className={`rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white flex items-start gap-3.5 backdrop-blur-xl border ${
              toast.type === "error"
                ? "bg-[#1F1F27]/95 border-red-500/50"
                : "bg-[#1F1F27]/95 border-emerald-500/50"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                toast.type === "error"
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Trophy className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 pr-1">
              <h4
                className={`text-sm font-black flex items-center gap-1.5 ${
                  toast.type === "error" ? "text-red-300" : "text-emerald-300"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {toast.title}
              </h4>
              <p className="text-xs text-[#D0D0D2] mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-[#8E8E93] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ENCABEZADO PRINCIPAL • SELECTOR DE GP Y SINCRONIZACIÓN API       */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Panel de Administración • Carga Unificada de Resultados
                </h1>
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                  Admin Activo
                </span>
              </div>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Carga de Resultados Oficiales, Cálculo de Puntajes y Otorgamiento Automático de Insignias y Trofeos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Botón de Sincronización API */}
            <button
              type="button"
              onClick={handleSyncFromF1Api}
              disabled={syncingApi || isSavingAndCalculating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#15151E] border border-[#2D2D38] hover:border-white/30 text-white disabled:opacity-50 transition-all cursor-pointer shadow-md"
            >
              {syncingApi ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
              ) : (
                <CloudDownload className="w-4 h-4 text-[#E10600]" />
              )}
              <span>
                {syncingApi ? "Consultando API F1..." : "Sincronizar desde API de F1"}
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Selección de Gran Premio y Metadatos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#2D2D38]">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#E10600] mb-1.5">
              Gran Premio a Gestionar
            </label>
            <select
              value={selectedGpId}
              onChange={(e) => setSelectedGpId(e.target.value)}
              className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
            >
              {grandPrixList.map((gp) => (
                <option key={gp.id} value={gp.id}>
                  {gp.bandera} {gp.nombre} ({gp.estado.toUpperCase()}) {gp.isSprint ? "• SPRINT ⚡" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#8E8E93]">Estado Actual:</span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  selectedGp?.estado === "finalizado"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : selectedGp?.estado === "en_curso"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                }`}
              >
                {selectedGp?.estado || "PROXIMO"}
              </span>
            </div>
            {selectedGp?.isSprint && (
              <span className="shrink-0 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase px-3 py-2.5 rounded-xl flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Sprint</span>
              </span>
            )}
          </div>
        </div>

        {/* Pre-visualización API F1 */}
        {apiPreviewMeta && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Datos precargados desde la API oficial ({apiPreviewMeta.sessionRaceName}). Revisa los campos y pulsa Guardar y Calcular.
              </span>
            </div>
            <button
              onClick={() => setApiPreviewMeta(null)}
              className="text-amber-400/70 hover:text-amber-200 text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SELECTOR DE SUBPESTAÑAS DEL PANEL ADMIN                           */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#2D2D38] pb-4">
        <button
          type="button"
          onClick={() => setActiveAdminTab("resultados")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeAdminTab === "resultados"
              ? "bg-[#E10600] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]"
              : "bg-[#1F1F27] text-[#8E8E93] hover:text-white border border-[#2D2D38] hover:border-white/20"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Carga de Resultados Oficiales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab("estadisticas_pilotos")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeAdminTab === "estadisticas_pilotos"
              ? "bg-[#E10600] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]"
              : "bg-[#1F1F27] text-[#8E8E93] hover:text-white border border-[#2D2D38] hover:border-white/20"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Estadísticas F1 (Pilotos)</span>
        </button>
      </div>

      {activeAdminTab === "estadisticas_pilotos" ? (
        <AdminDriverStatsTab
          selectedGp={selectedGp}
          pilotos={pilotos}
          escuderias={escuderias}
          getEscuderia={getEscuderia}
          onStatsUpdated={async () => {
            await refreshData();
            await onScoresUpdated();
          }}
        />
      ) : (
        <>
          {/* ================================================================= */}
          {/* FORMULARIO ÚNICO SIN PASOS                                        */}
          {/* ================================================================= */}
          <form onSubmit={handleSaveAndCalculate} className="space-y-8">
        {/* SECCIÓN 1: CLASIFICACIÓN / GRILLA (Q1, Q2, Q3) */}
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#2D2D38]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  1. Clasificación / Grilla Oficial (Q1, Q2, Q3)
                </h2>
                <p className="text-xs text-[#8E8E93]">
                  Eliminados en Q1, Q2 y las 10 posiciones de la Grilla Final Q3 (la posición 1 define la Pole Position)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold bg-[#15151E] px-2.5 py-1 rounded-lg border border-[#2D2D38] text-purple-300">
                Pole: {pole || q3Slots[0] || "Pendiente"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Q1 (6 eliminados) */}
            <div className="bg-[#15151E]/60 border border-[#2D2D38] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Q1 • 6 Eliminados
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    q1Eliminated.length === 6
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-[#1F1F27] border-[#2D2D38] text-amber-400"
                  }`}
                >
                  {q1Eliminated.length} / 6
                </span>
              </div>
              <div className="space-y-2">
                {q1Slots.map((driverId, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <label className="text-[10px] font-bold text-[#8E8E93] block">
                      Eliminado #{idx + 1} (P{17 + idx})
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ1SlotChange(idx, e.target.value)}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="">Seleccionar piloto...</option>
                      {pilotos.map((p) => {
                        const esc = getEscuderia(p.escuderia_id);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.id}) • {esc?.nombre}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Q2 (6 eliminados) */}
            <div className="bg-[#15151E]/60 border border-[#2D2D38] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-sky-400 tracking-wider">
                  Q2 • 6 Eliminados
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    q2Eliminated.length === 6
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-[#1F1F27] border-[#2D2D38] text-sky-400"
                  }`}
                >
                  {q2Eliminated.length} / 6
                </span>
              </div>
              <div className="space-y-2">
                {q2Slots.map((driverId, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <label className="text-[10px] font-bold text-[#8E8E93] block">
                      Eliminado #{idx + 1} (P{11 + idx})
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ2SlotChange(idx, e.target.value)}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="">Seleccionar piloto...</option>
                      {q2AvailableDrivers.map((p) => {
                        const esc = getEscuderia(p.escuderia_id);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.id}) • {esc?.nombre}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Q3 (Top 10 Grilla Final) */}
            <div className="bg-[#15151E]/60 border border-[#2D2D38] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                  Q3 • Top 10 Grilla Final
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    q3Selected.length === 10
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-[#1F1F27] border-[#2D2D38] text-purple-400"
                  }`}
                >
                  {q3Selected.length} / 10
                </span>
              </div>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {q3Slots.map((driverId, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <label className="text-[10px] font-bold text-[#8E8E93] block">
                      {idx === 0 ? "⚡ P1 • Pole Position" : `P${idx + 1} • Grilla de Partida`}
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ3SlotChange(idx, e.target.value)}
                      className={`w-full bg-[#1F1F27] border rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none ${
                        idx === 0
                          ? "border-purple-500/50 focus:border-purple-400"
                          : "border-[#2D2D38] focus:border-[#E10600]"
                      }`}
                    >
                      <option value="">Seleccionar piloto...</option>
                      {q3AvailableDrivers.map((p) => {
                        const esc = getEscuderia(p.escuderia_id);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.id}) • {esc?.nombre}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PODIO DE CARRERA PRINCIPAL (P1, P2 Y P3 INDEPENDIENTES) */}
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#2D2D38]">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                2. Podio Oficial de la Carrera (P1, P2 y P3 Independientes)
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Selecciona individualmente a los 3 pilotos que subieron al podio oficial
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* P1 • Ganador */}
            <div className="rounded-xl bg-gradient-to-b from-amber-500/10 to-[#15151E] border border-amber-500/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <span>🥇</span>
                  <span>P1 • Ganador de Carrera</span>
                </label>
                {p1 && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        getEscuderia(pilotos.find((p) => p.id === p1)?.escuderia_id || "")?.color_hex || "#E10600",
                    }}
                  />
                )}
              </div>
              <select
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                className="w-full bg-[#1F1F27] border border-amber-500/30 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">Seleccionar Ganador P1...</option>
                {pilotos.map((p) => {
                  const esc = getEscuderia(p.escuderia_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id}) — {esc?.nombre}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* P2 • Segundo Puesto */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-300/10 to-[#15151E] border border-zinc-400/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-zinc-300 flex items-center gap-1.5">
                  <span>🥈</span>
                  <span>P2 • Segundo Puesto</span>
                </label>
                {p2 && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        getEscuderia(pilotos.find((p) => p.id === p2)?.escuderia_id || "")?.color_hex || "#E10600",
                    }}
                  />
                )}
              </div>
              <select
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                className="w-full bg-[#1F1F27] border border-zinc-400/30 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-300"
              >
                <option value="">Seleccionar P2...</option>
                {pilotos.map((p) => {
                  const esc = getEscuderia(p.escuderia_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id}) — {esc?.nombre}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* P3 • Tercer Puesto */}
            <div className="rounded-xl bg-gradient-to-b from-amber-700/10 to-[#15151E] border border-amber-700/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-amber-500 flex items-center gap-1.5">
                  <span>🥉</span>
                  <span>P3 • Tercer Puesto</span>
                </label>
                {p3 && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        getEscuderia(pilotos.find((p) => p.id === p3)?.escuderia_id || "")?.color_hex || "#E10600",
                    }}
                  />
                )}
              </div>
              <select
                value={p3}
                onChange={(e) => setP3(e.target.value)}
                className="w-full bg-[#1F1F27] border border-amber-700/30 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Seleccionar P3...</option>
                {pilotos.map((p) => {
                  const esc = getEscuderia(p.escuderia_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id}) — {esc?.nombre}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: VUELTA RÁPIDA, PILOTO DEL DÍA Y POSICIÓN COLAPINTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vuelta Rápida Oficial */}
          <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-400" />
              <label className="text-xs font-black uppercase text-purple-400 tracking-wider">
                Vuelta Rápida Oficial
              </label>
            </div>
            <select
              value={vueltaRapida}
              onChange={(e) => setVueltaRapida(e.target.value)}
              className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">Seleccionar piloto con Vuelta Rápida...</option>
              {pilotos.map((p) => {
                const esc = getEscuderia(p.escuderia_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.id}) • {esc?.nombre}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-[#8E8E93]">
              Piloto oficial que registró el mejor tiempo de vuelta de carrera.
            </p>
          </div>

          {/* Piloto del Día (DOTD) */}
          <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <label className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Piloto del Día (DOTD)
              </label>
            </div>
            <select
              value={pilotoDelDia}
              onChange={(e) => setPilotoDelDia(e.target.value)}
              className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">Seleccionar Piloto del Día...</option>
              {pilotos.map((p) => {
                const esc = getEscuderia(p.escuderia_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.id}) • {esc?.nombre}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-[#8E8E93]">
              Votación oficial Driver of the Day de la F1.
            </p>
          </div>

          {/* Posición Franco Colapinto */}
          <div className="rounded-2xl bg-[#1F1F27] border border-sky-500/30 p-5 space-y-3 shadow-xl bg-gradient-to-b from-sky-500/5 to-[#1F1F27]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-sky-400" />
                <label className="text-xs font-black uppercase text-sky-400 tracking-wider">
                  🇦🇷 Posición Franco Colapinto
                </label>
              </div>
              <span className="text-xs font-mono font-bold text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/40">
                {posicionColapinto === 0 ? "DNF" : `P${posicionColapinto}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={posicionColapinto}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPosicionColapinto(val);
                  if (val === 0 && !dnfDrivers.includes("COL")) {
                    setDnfDrivers((prev) => [...prev, "COL"]);
                  } else if (val > 0 && dnfDrivers.includes("COL")) {
                    setDnfDrivers((prev) => prev.filter((id) => id !== "COL"));
                  }
                }}
                className="w-full bg-[#15151E] border border-sky-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
              >
                <option value={0}>0 — DNF (Abandono)</option>
                {Array.from({ length: 22 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    P{idx + 1} (Posición #{idx + 1})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              1 a 22 o 0 si abandonó (DNF). Se sincroniza con el gestor de abandonos.
            </p>
          </div>
        </div>

        {/* SECCIÓN 4: ESCUDERÍA GANADORA / CON MÁS PUNTOS */}
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#2D2D38]">
            <Car className="w-4 h-4 text-[#E10600]" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              3. Escudería Ganadora / Con Más Puntos en el GP
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {escuderias.map((esc) => {
              const isSelected = escuderiaGanadora === esc.id;
              return (
                <button
                  key={esc.id}
                  type="button"
                  onClick={() => setEscuderiaGanadora(esc.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#E10600]/15 border-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)] ring-1 ring-[#E10600]"
                      : "bg-[#15151E] border-[#2D2D38] text-[#8E8E93] hover:text-white hover:border-[#3D3D48]"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: esc.color_hex || "#E10600" }}
                  />
                  <div className="truncate">
                    <p className="text-xs font-black truncate">{esc.nombre}</p>
                    <p className="text-[10px] font-mono opacity-70">{esc.id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 5: GESTOR DE ABANDONOS (DNF) SIN FOTOS */}
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2D2D38]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  4. Gestor de Abandonos (DNF)
                </h2>
                <p className="text-xs text-[#8E8E93]">
                  Haz click para marcar los pilotos que abandonaron. Cada uno muestra su punto de escudería y nombre (sin fotos).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#15151E] border border-rose-500/40 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-[#8E8E93]">Total Abandonos:</span>
              <span className="text-sm font-mono font-black text-rose-400">
                {dnfDrivers.length} DNF
              </span>
            </div>
          </div>

          {/* Grid de 22 Pilotos para Marcar DNF */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {pilotos.map((p) => {
              const isDnf = dnfDrivers.includes(p.id);
              const esc = getEscuderia(p.escuderia_id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleDnfDriver(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isDnf
                      ? "bg-rose-950/60 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-1 ring-rose-500"
                      : "bg-[#15151E] border-[#2D2D38] text-[#8E8E93] hover:text-white hover:border-[#3D3D48]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: esc?.color_hex || "#8E8E93" }}
                    />
                    <span className="text-xs font-bold truncate">
                      {p.nombre}
                    </span>
                  </div>
                  {isDnf ? (
                    <span className="text-[9px] font-black uppercase text-rose-300 bg-rose-900/60 px-1.5 py-0.5 rounded shrink-0">
                      DNF
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#8E8E93] shrink-0">
                      {p.id}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 6: MODO SPRINT CONDICIONAL */}
        {selectedGp?.isSprint && (
          <div className="rounded-2xl bg-gradient-to-b from-amber-500/10 to-[#1F1F27] border border-amber-500/40 p-6 sm:p-7 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2.5 pb-3 border-b border-amber-500/30">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  5. Formato Sprint Oficial (Activo para este GP)
                </h2>
                <p className="text-xs text-[#8E8E93]">
                  Completa la Pole de Sprint y el podio Sprint (P1, P2 y P3)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1">
                  ⚡ Pole Sprint
                </label>
                <select
                  value={sprintPole}
                  onChange={(e) => setSprintPole(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Seleccionar Pole Sprint...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1">
                  🥇 Sprint P1
                </label>
                <select
                  value={sprintP1}
                  onChange={(e) => setSprintP1(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Seleccionar Sprint P1...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1">
                  🥈 Sprint P2
                </label>
                <select
                  value={sprintP2}
                  onChange={(e) => setSprintP2(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Seleccionar Sprint P2...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1">
                  🥉 Sprint P3
                </label>
                <select
                  value={sprintP3}
                  onChange={(e) => setSprintP3(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Seleccionar Sprint P3...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK DE ERROR */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-[#E10600] text-xs font-bold text-red-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-[#E10600] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FEEDBACK DE RESUMEN DE ÉXITO */}
        {operationSummary && (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-emerald-300 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>
                ¡Operación Completada! Resultados Guardados y Puntos Calculados
              </span>
            </div>
            <p className="text-xs text-[#D0D0D2] leading-relaxed">
              Se procesaron exitosamente{" "}
              <strong className="text-white">
                {operationSummary.prediccionesEvaluadas} pronósticos
              </strong>
              , se recalculó la tabla general de posiciones para{" "}
              <strong className="text-white">
                {operationSummary.usuariosActualizados} usuarios
              </strong>{" "}
              y se actualizaron las 16 insignias y trofeos en lotes atómicos de Firestore (
              <strong className="text-white">
                {operationSummary.badgesUsersCount} perfiles impactados
              </strong>
              ).
            </p>

            {operationSummary.usersBadgesSummary.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-emerald-500/20">
                <h5 className="text-[11px] font-black uppercase text-emerald-300">
                  Resumen de Insignias Otorgadas en este GP:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {operationSummary.usersBadgesSummary.map((u) => (
                    <div
                      key={u.uid}
                      className="bg-[#15151E] border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate">
                          {u.nombre || u.email || `Usuario ${u.uid.slice(0, 5)}`}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded">
                          +{u.awardedBadges.length} insignias
                        </span>
                      </div>
                      {u.awardedBadges.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.awardedBadges.map((badgeId) => (
                            <span
                              key={badgeId}
                              className="text-[10px] bg-[#1F1F27] border border-[#2D2D38] px-2 py-0.5 rounded text-amber-300 font-semibold"
                            >
                              {badgeNameMap.get(badgeId) || badgeId}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#8E8E93]">
                          Sin nuevos logros en esta carrera.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* BOTÓN ÚNICO DE GUARDADO Y AUTOMATIZACIÓN MASIVA                   */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E10600]" />
              <span>Automatización Masiva de Resultados</span>
            </h4>
            <p className="text-xs text-[#8E8E93] max-w-2xl">
              Al presionar el botón se guardarán los resultados oficiales en Firestore, se calcularán los puntos de la tabla general para todos los participantes y se otorgarán automáticamente las 16 insignias y trofeos individuales.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSavingAndCalculating || syncingApi}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-wider bg-gradient-to-r from-[#E10600] via-[#ff221c] to-[#E10600] hover:brightness-110 text-white shadow-[0_0_35px_rgba(225,6,0,0.45)] disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {isSavingAndCalculating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-white" />
            )}
            <span>
              {isSavingAndCalculating
                ? "Guardando y Calculando..."
                : "Guardar Resultados y Calcular"}
            </span>
          </button>
        </div>
      </form>

      {/* ================================================================= */}
      {/* SECCIÓN TRIVIA SEMANAL • GP DE MÉXICO                             */}
      {/* ================================================================= */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#1F1F27] to-[#1F1F27] border border-amber-500/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              Trivia Semanal • Gran Premio de la Ciudad de México
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Estado: ACTIVA
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-white">
            5 Preguntas Oficiales del Autódromo Hermanos Rodríguez
          </h3>
          <p className="text-xs text-[#8E8E93] max-w-xl">
            Reemplaza las preguntas anteriores con las 5 preguntas oficiales de México y reactiva el estado en Firebase a &apos;activa&apos; para todos los usuarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/minijuegos/trivia"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#15151E] border border-[#2D2D38] hover:border-white/30 text-xs font-bold text-white transition-all shadow-md"
          >
            <Brain className="w-4 h-4 text-amber-400" />
            <span>Probar Trivia en Vivo</span>
          </Link>

          <button
            type="button"
            onClick={handleReactivateTrivia}
            disabled={isReactivatingTrivia}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50 transition-all cursor-pointer"
          >
            {isReactivatingTrivia ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>
              {isReactivatingTrivia
                ? "Publicando en Firebase..."
                : "Reactivar Trivia en Firebase"}
            </span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECCIÓN SECUNDARIA: GESTIÓN DE BASE DE DATOS (SEED / RESETEO)    */}
      {/* ================================================================= */}
      <div className="pt-6 border-t border-[#2D2D38]">
        <button
          type="button"
          onClick={() => setShowSeedCard((prev) => !prev)}
          className="flex items-center justify-between w-full p-4 rounded-xl bg-[#1F1F27]/60 border border-[#2D2D38] hover:border-[#3D3D48] text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#8E8E93]" />
            <div>
              <span className="text-xs font-black uppercase text-[#D0D0D2] tracking-wider">
                Herramientas Avanzadas • Gestión de Base de Datos (Seed / Reseteo)
              </span>
              <p className="text-[11px] text-[#8E8E93]">
                Poblar o restablecer colecciones de carreras, pilotos y escuderías en Firestore
              </p>
            </div>
          </div>
          {showSeedCard ? (
            <ChevronUp className="w-4 h-4 text-[#8E8E93]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
          )}
        </button>

        {showSeedCard && (
          <div className="mt-4 animate-in fade-in duration-200">
            <AdminSeedCard />
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
