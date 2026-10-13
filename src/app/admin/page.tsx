"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import { AdminSeedCard } from "@/components/AdminSeedCard";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { GrandPrix, ResultadosOficiales } from "@/types/f1";
import { guardarResultadosYCalcularPuntajes } from "@/lib/firebase/f1Service";
import {
  processRaceBadgesBatch,
  ProcessBadgesResult,
} from "@/lib/firebase/badgeService";
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
  Calculator,
  CloudDownload,
  Zap,
  ArrowLeft,
  AlertCircle,
  Edit3,
  Trophy,
  Award,
  Sparkles,
  Flame,
  Users,
  Flag,
  Car,
  Check,
  X,
  Layers,
  Calendar,
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

type AdminTab = "badges" | "scoring" | "seed";

interface ToastState {
  show: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  badgeCount?: number;
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

  const [activeTab, setActiveTab] = useState<AdminTab>("badges");

  // Estado del Toast flotante
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  // Temporizador para auto-ocultar el toast
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

  // =========================================================================
  // ESTADOS PARA FORMULARIO DE EVALUACIÓN DE INSIGNIAS (FASE 2)
  // =========================================================================
  const [badgeP1, setBadgeP1] = useState<string>("");
  const [badgeP2, setBadgeP2] = useState<string>("");
  const [badgeP3, setBadgeP3] = useState<string>("");
  const [badgePole, setBadgePole] = useState<string>("");
  const [badgeDotd, setBadgeDotd] = useState<string>("");
  const [badgeEscuderia, setBadgeEscuderia] = useState<string>("");
  const [badgeDnfCount, setBadgeDnfCount] = useState<number>(2);
  const [badgeDnfDrivers, setBadgeDnfDrivers] = useState<string[]>([]);
  const [badgeColapinto, setBadgeColapinto] = useState<number>(10);
  const [badgeIsSprint, setBadgeIsSprint] = useState<boolean>(false);
  const [badgeSprintPole, setBadgeSprintPole] = useState<string>("");
  const [badgeSprintP1, setBadgeSprintP1] = useState<string>("");
  const [badgeSprintP2, setBadgeSprintP2] = useState<string>("");
  const [badgeSprintP3, setBadgeSprintP3] = useState<string>("");

  const [processingBadges, setProcessingBadges] = useState(false);
  const [badgeErrorMsg, setBadgeErrorMsg] = useState<string | null>(null);
  const [badgeProcessResult, setBadgeProcessResult] =
    useState<ProcessBadgesResult | null>(null);

  // Sincronizar campos de insignias cuando cambia el GP seleccionado
  useEffect(() => {
    if (!selectedGp) return;
    const res = selectedGp.resultados_oficiales;
    setBadgeP1(res.p1 || "");
    setBadgeP2(res.p2 || "");
    setBadgeP3(res.p3 || "");

    // Pole desde pole o q3[0]
    let poleVal = res.pole || "";
    if (!poleVal && res.q3) {
      const q3Drivers = normalizeDriverList(res.q3);
      if (q3Drivers.length > 0) poleVal = q3Drivers[0];
    }
    setBadgePole(poleVal);

    setBadgeDotd(res.piloto_del_dia || "");
    setBadgeEscuderia(res.escuderia || "");
    setBadgeDnfCount(normalizeDnfCount(res.dnf) ?? 2);

    const dnfList = normalizeDriverList(
      res.dnf_drivers || (Array.isArray(res.dnf) ? res.dnf : [])
    );
    setBadgeDnfDrivers(dnfList);

    setBadgeColapinto(
      res.posicion_colapinto !== null && res.posicion_colapinto !== undefined
        ? Number(res.posicion_colapinto)
        : 10
    );

    setBadgeIsSprint(Boolean(selectedGp.isSprint));
    setBadgeSprintPole(res.sprintPole || "");
    setBadgeSprintP1(res.sprintP1 || "");
    setBadgeSprintP2(res.sprintP2 || "");
    setBadgeSprintP3(res.sprintP3 || "");
    setBadgeErrorMsg(null);
  }, [selectedGpId, selectedGp]);

  // Manejo de alternancia en lista de pilotos DNF
  const toggleDnfDriver = (driverId: string) => {
    setBadgeDnfDrivers((prev) => {
      const exists = prev.includes(driverId);
      const next = exists
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId];
      // Si la cantidad de DNFs coincide con la lista, sugerimos el nuevo largo
      setBadgeDnfCount(next.length);
      return next;
    });
  };

  // Procesar Evaluación de Insignias y Otorgar Premios en Lote (Firebase Batch)
  const handleProcessBadges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGp) return;

    if (!badgeP1 || !badgeP2 || !badgeP3) {
      setBadgeErrorMsg("Debes especificar el podio completo de la carrera (P1, P2 y P3).");
      return;
    }
    if (new Set([badgeP1, badgeP2, badgeP3]).size !== 3) {
      setBadgeErrorMsg("Los 3 pilotos del podio deben ser distintos.");
      return;
    }
    if (!badgePole) {
      setBadgeErrorMsg("Debes seleccionar al piloto ganador de la Pole Position.");
      return;
    }
    if (!badgeDotd) {
      setBadgeErrorMsg("Debes seleccionar al Piloto del Día (Driver of the Day).");
      return;
    }
    if (!badgeEscuderia) {
      setBadgeErrorMsg("Debes seleccionar la Escudería Ganadora.");
      return;
    }

    try {
      setProcessingBadges(true);
      setBadgeErrorMsg(null);
      setBadgeProcessResult(null);

      const officialPayload: OfficialRaceResults = {
        p1: badgeP1,
        p2: badgeP2,
        p3: badgeP3,
        pole: badgePole,
        piloto_del_dia: badgeDotd,
        escuderia: badgeEscuderia,
        dnf: badgeDnfCount,
        dnfDrivers: badgeDnfDrivers,
        dnf_drivers: badgeDnfDrivers,
        posicion_colapinto: badgeColapinto,
        isSprint: badgeIsSprint,
        ...(badgeIsSprint
          ? {
              sprintPole: badgeSprintPole,
              sprintP1: badgeSprintP1,
              sprintP2: badgeSprintP2,
              sprintP3: badgeSprintP3,
            }
          : {}),
      };

      const result = await processRaceBadgesBatch(selectedGp.id, officialPayload);
      setBadgeProcessResult(result);
      await refreshData();
      await onScoresUpdated();

      // Disparar Toast de Éxito
      setToast({
        show: true,
        type: "success",
        title: "¡Insignias Procesadas y Otorgadas con Éxito!",
        message: `Se evaluaron ${result.totalPredictions} pronósticos y se actualizaron ${result.updatedUsersCount} perfiles de usuarios en Firestore.`,
      });
    } catch (err: any) {
      console.error("Error al procesar insignias:", err);
      setBadgeErrorMsg(
        err.message || "Error al procesar el lote de insignias en Firestore."
      );
      setToast({
        show: true,
        type: "error",
        title: "Error al procesar insignias",
        message: err.message || "Ocurrió un error al procesar el lote.",
      });
    } finally {
      setProcessingBadges(false);
    }
  };

  // =========================================================================
  // ESTADOS DEL FORMULARIO DE CÁLCULO GENERAL DE PUNTAJES (Q1, Q2, Q3)
  // =========================================================================
  const [q1Slots, setQ1Slots] = useState<string[]>(Array(6).fill(""));
  const [q2Slots, setQ2Slots] = useState<string[]>(Array(6).fill(""));
  const [q3Slots, setQ3Slots] = useState<string[]>(Array(10).fill(""));
  const [p1, setP1] = useState<string>("");
  const [p2, setP2] = useState<string>("");
  const [p3, setP3] = useState<string>("");
  const [dnfCount, setDnfCount] = useState<number>(2);
  const [escuderiaGanadora, setEscuderiaGanadora] = useState<string>("");
  const [pilotoDelDia, setPilotoDelDia] = useState<string>("");
  const [posicionColapinto, setPosicionColapinto] = useState<number>(10);
  const [sprintPole, setSprintPole] = useState<string>("");
  const [sprintP1, setSprintP1] = useState<string>("");
  const [sprintP2, setSprintP2] = useState<string>("");
  const [sprintP3, setSprintP3] = useState<string>("");

  const [syncingApi, setSyncingApi] = useState(false);
  const [apiPreviewMeta, setApiPreviewMeta] =
    useState<F1ApiSyncedResults | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<{
    prediccionesEvaluadas: number;
    usuariosActualizados: number;
    resumenUsuarios: Array<{
      usuario_id: string;
      puntos_gp: number;
      nuevo_puntaje_global: number;
    }>;
  } | null>(null);

  // Sincronizar formulario general cuando cambia de GP
  useEffect(() => {
    if (!selectedGp) return;
    const res = selectedGp.resultados_oficiales;
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
    setP1(res.p1 || "");
    setP2(res.p2 || "");
    setP3(res.p3 || "");
    setDnfCount(normalizeDnfCount(res.dnf) ?? 2);
    setEscuderiaGanadora(res.escuderia || "");
    setPilotoDelDia(res.piloto_del_dia || "");
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
    setCalcResult(null);
    setErrorMsg(null);
  }, [selectedGpId, selectedGp]);

  const q1Eliminated = q1Slots.filter(Boolean);
  const q2Eliminated = q2Slots.filter(Boolean);
  const q3Selected = q3Slots.filter(Boolean);

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

  const toggleAdminQ1Card = (driverId: string) => {
    const existingIdx = q1Slots.indexOf(driverId);
    if (existingIdx !== -1) {
      handleQ1SlotChange(existingIdx, "");
    } else {
      const emptyIdx = q1Slots.findIndex((val) => !val);
      if (emptyIdx !== -1) {
        handleQ1SlotChange(emptyIdx, driverId);
      }
    }
  };

  const handleQ2SlotChange = (slotIdx: number, driverId: string) => {
    if (driverId && q1Eliminated.includes(driverId)) return;
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

  const toggleAdminQ2Card = (driverId: string) => {
    if (q1Eliminated.includes(driverId)) return;
    const existingIdx = q2Slots.indexOf(driverId);
    if (existingIdx !== -1) {
      handleQ2SlotChange(existingIdx, "");
    } else {
      const emptyIdx = q2Slots.findIndex((val) => !val);
      if (emptyIdx !== -1) {
        handleQ2SlotChange(emptyIdx, driverId);
      }
    }
  };

  const handleQ3SlotChange = (posIndex: number, driverId: string) => {
    if (
      driverId &&
      (q1Eliminated.includes(driverId) || q2Eliminated.includes(driverId))
    ) {
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
      return next;
    });
  };

  const q2AvailableDrivers = pilotos.filter(
    (p) => !q1Eliminated.includes(p.id)
  );
  const q3AvailableDrivers = pilotos.filter(
    (p) => !q1Eliminated.includes(p.id) && !q2Eliminated.includes(p.id)
  );

  const handleSyncFromF1Api = async () => {
    if (!selectedGp) return;
    try {
      setSyncingApi(true);
      setErrorMsg(null);
      setCalcResult(null);

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
      setP1(synced.p1);
      setP2(synced.p2);
      setP3(synced.p3);
      setDnfCount(synced.dnfCount);
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

  const handleSaveAndCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGp) return;

    if (q1Eliminated.length !== 6 || new Set(q1Eliminated).size !== 6) {
      setErrorMsg("Debes seleccionar exactamente 6 pilotos distintos en Q1.");
      return;
    }
    if (q2Eliminated.length !== 6 || new Set(q2Eliminated).size !== 6) {
      setErrorMsg("Debes seleccionar exactamente 6 pilotos distintos en Q2.");
      return;
    }
    if (q3Selected.length !== 10 || new Set(q3Selected).size !== 10) {
      setErrorMsg(
        "Debes asignar los 10 pilotos clasificados en la Grilla Final Q3 (P1 a P10)."
      );
      return;
    }
    if (!p1 || !p2 || !p3 || new Set([p1, p2, p3]).size !== 3) {
      setErrorMsg(
        "El podio de la Carrera Principal (P1, P2 y P3) debe tener 3 pilotos distintos."
      );
      return;
    }
    if (!escuderiaGanadora || !pilotoDelDia) {
      setErrorMsg(
        "Por favor verifica y selecciona la Escudería Ganadora y el Piloto del Día (DOTD)."
      );
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);
      setCalcResult(null);

      const resultadosOficiales: ResultadosOficiales = {
        q1: q1Eliminated,
        q2: q2Eliminated,
        q3: q3Selected,
        p1,
        p2,
        p3,
        dnf: dnfCount,
        escuderia: escuderiaGanadora,
        piloto_del_dia: pilotoDelDia,
        posicion_colapinto: posicionColapinto,
        ...(selectedGp.isSprint
          ? {
              sprintPole,
              sprintP1,
              sprintP2,
              sprintP3,
            }
          : {}),
      };

      const res = await guardarResultadosYCalcularPuntajes(
        selectedGp,
        resultadosOficiales
      );
      setCalcResult(res);
      setApiPreviewMeta(null);
      await refreshData();
      await onScoresUpdated();

      setToast({
        show: true,
        type: "success",
        title: "¡Puntajes Calculados con Éxito!",
        message: `Se evaluaron ${res.prediccionesEvaluadas} pronósticos y se actualizaron ${res.usuariosActualizados} usuarios en el Ranking.`,
      });
    } catch (err: any) {
      console.error("Error al guardar resultados y calcular puntajes:", err);
      setErrorMsg(
        err.message || "Error al procesar el cálculo de puntajes en Firestore."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Mapa de nombres de insignias para el resumen visual
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
          <div className="rounded-2xl bg-[#1F1F27]/95 backdrop-blur-xl border border-emerald-500/50 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-1">
              <h4 className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
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

      {/* Encabezado General del Panel */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Panel de Administración • GridProde F1
              </h1>
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                Admin Activo
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Fase 2: Motor de Evaluación de Insignias y Premios • Cálculo de Puntajes Oficiales
            </p>
          </div>
        </div>

        {/* Selector de Gran Premio Global */}
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black uppercase tracking-wider text-[#E10600] mb-1">
            Gran Premio a Administrar
          </label>
          <select
            value={selectedGpId}
            onChange={(e) => setSelectedGpId(e.target.value)}
            className="w-full sm:w-80 bg-[#15151E] border border-[#2D2D38] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
          >
            {grandPrixList.map((gp) => (
              <option key={gp.id} value={gp.id}>
                {gp.bandera} {gp.nombre} ({gp.estado.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selector de Pestañas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-[#2D2D38] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("badges")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "badges"
              ? "bg-[#E10600] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]"
              : "text-[#8E8E93] hover:text-white hover:bg-[#1F1F27]"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Motor de Insignias y Premios (Fase 2)</span>
        </button>

        <button
          onClick={() => setActiveTab("scoring")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "scoring"
              ? "bg-[#E10600] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]"
              : "text-[#8E8E93] hover:text-white hover:bg-[#1F1F27]"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Cálculo de Puntajes Q1/Q2/Q3</span>
        </button>

        <button
          onClick={() => setActiveTab("seed")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "seed"
              ? "bg-[#E10600] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]"
              : "text-[#8E8E93] hover:text-white hover:bg-[#1F1F27]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Gestión de Base de Datos (Seed)</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* PESTAÑA 1: MOTOR DE EVALUACIÓN DE INSIGNIAS (FASE 2)              */}
      {/* ================================================================= */}
      {activeTab === "badges" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <form
            onSubmit={handleProcessBadges}
            className="rounded-2xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
          >
            {/* Cabecera del formulario de Insignias */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#2D2D38]">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Carga de Resultados Oficiales para Insignias</span>
                </div>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Ingresa los resultados oficiales para evaluar las 15 insignias del juego.
                  Al procesar, se recuperarán todos los pronósticos de{" "}
                  <strong className="text-white">{selectedGp?.nombre}</strong>, se calculará el progreso acumulado y se actualizarán en lote (batch) en Firestore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8E8E93] bg-[#15151E] border border-[#2D2D38] px-3 py-1.5 rounded-xl">
                  {selectedGp?.bandera} {selectedGp?.nombre}
                </span>
              </div>
            </div>

            {/* SECCIÓN 1: PODIO OFICIAL Y POLE POSITION */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>1. Podio Oficial y Pole Position</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* P1 */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5 focus-within:border-amber-400 transition-colors">
                  <label className="block text-xs font-black uppercase text-amber-400">
                    🥇 P1 • Ganador de Carrera
                  </label>
                  <select
                    value={badgeP1}
                    onChange={(e) => setBadgeP1(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Seleccionar ganador...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* P2 */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5 focus-within:border-zinc-300 transition-colors">
                  <label className="block text-xs font-black uppercase text-zinc-300">
                    🥈 P2 • Segundo Puesto
                  </label>
                  <select
                    value={badgeP2}
                    onChange={(e) => setBadgeP2(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-300"
                  >
                    <option value="">Seleccionar P2...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* P3 */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5 focus-within:border-amber-600 transition-colors">
                  <label className="block text-xs font-black uppercase text-amber-600">
                    🥉 P3 • Tercer Puesto
                  </label>
                  <select
                    value={badgeP3}
                    onChange={(e) => setBadgeP3(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="">Seleccionar P3...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pole Position */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5 focus-within:border-purple-400 transition-colors">
                  <label className="block text-xs font-black uppercase text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Pole Position</span>
                  </label>
                  <select
                    value={badgePole}
                    onChange={(e) => setBadgePole(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="">Seleccionar Poleman...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ESPECIALES Y COMUNIDAD */}
            <div className="space-y-4 pt-4 border-t border-[#2D2D38]">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>2. Especiales de Carrera y Comunidad</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Piloto del Día */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-black uppercase text-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Piloto del Día (Driver of the Day)</span>
                  </label>
                  <select
                    value={badgeDotd}
                    onChange={(e) => setBadgeDotd(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Seleccionar Piloto del Día...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Escudería Ganadora */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-black uppercase text-[#D0D0D2] flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-[#E10600]" />
                    <span>Escudería Ganadora (Constructor)</span>
                  </label>
                  <select
                    value={badgeEscuderia}
                    onChange={(e) => setBadgeEscuderia(e.target.value)}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                  >
                    <option value="">Seleccionar Escudería...</option>
                    {escuderias.map((esc) => (
                      <option key={esc.id} value={esc.id}>
                        {esc.nombre} ({esc.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Posición Franco Colapinto */}
                <div className="bg-[#15151E]/80 border border-[#2D2D38] rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-black uppercase text-sky-400 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-sky-400" />
                    <span>🇦🇷 Posición Franco Colapinto</span>
                  </label>
                  <select
                    value={badgeColapinto}
                    onChange={(e) => setBadgeColapinto(Number(e.target.value))}
                    className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value={0}>DNF (Abandono / Retiro)</option>
                    {Array.from({ length: 22 }).map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        P{idx + 1} (Posición #{idx + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: ABANDONOS (DNFs) Y LISTA DE PILOTOS */}
            <div className="space-y-4 pt-4 border-t border-[#2D2D38]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>3. Cantidad y Lista de Abandonos (DNFs)</span>
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">
                    Selecciona los pilotos que abandonaron (necesario para la insignia <em>&quot;El Mufa&quot;</em> y la cantidad para <em>&quot;Oráculo del Caos&quot;</em> / <em>&quot;Carrera Limpia&quot;</em>).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#8E8E93]">
                    Total DNFs:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={22}
                    value={badgeDnfCount}
                    onChange={(e) =>
                      setBadgeDnfCount(
                        Math.max(
                          0,
                          Math.min(22, parseInt(e.target.value, 10) || 0)
                        )
                      )
                    }
                    className="w-20 bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              {/* Selector interactivo de pilotos DNF */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {pilotos.map((p) => {
                  const isDnf = badgeDnfDrivers.includes(p.id);
                  const esc = getEscuderia(p.escuderia_id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleDnfDriver(p.id)}
                      className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                        isDnf
                          ? "bg-red-950/60 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-500"
                          : "bg-[#15151E]/60 border-[#2D2D38] text-[#8E8E93] hover:text-white hover:border-[#3D3D48]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-black">
                          {p.id}
                        </span>
                        {isDnf ? (
                          <span className="text-[9px] font-black text-red-400 bg-red-900/50 px-1 rounded">
                            DNF
                          </span>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: esc?.color_hex || "#888" }}
                          />
                        )}
                      </div>
                      <p className="text-[11px] font-bold truncate mt-1">
                        {p.nombre}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 4: FORMATO SPRINT */}
            <div className="space-y-4 pt-4 border-t border-[#2D2D38]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="checkboxIsSprint"
                    checked={badgeIsSprint}
                    onChange={(e) => setBadgeIsSprint(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-[#15151E] border-[#2D2D38] focus:ring-amber-500 cursor-pointer"
                  />
                  <label
                    htmlFor="checkboxIsSprint"
                    className="text-xs font-black uppercase tracking-wider text-amber-300 cursor-pointer flex items-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>Es Formato Sprint (isSprint: true)</span>
                  </label>
                </div>
                <span className="text-[11px] text-[#8E8E93]">
                  Habilita la evaluación de la insignia <em>&quot;Maestro del Sprint&quot;</em>
                </span>
              </div>

              {badgeIsSprint && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-200 mb-1">
                      Pole Sprint
                    </label>
                    <select
                      value={badgeSprintPole}
                      onChange={(e) => setBadgeSprintPole(e.target.value)}
                      className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
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
                      Sprint P1
                    </label>
                    <select
                      value={badgeSprintP1}
                      onChange={(e) => setBadgeSprintP1(e.target.value)}
                      className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
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
                      Sprint P2
                    </label>
                    <select
                      value={badgeSprintP2}
                      onChange={(e) => setBadgeSprintP2(e.target.value)}
                      className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
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
                      Sprint P3
                    </label>
                    <select
                      value={badgeSprintP3}
                      onChange={(e) => setBadgeSprintP3(e.target.value)}
                      className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
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
              )}
            </div>

            {/* Mensajes de Error */}
            {badgeErrorMsg && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-[#E10600] text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>{badgeErrorMsg}</span>
              </div>
            )}

            {/* Resumen Detallado de Éxito al procesar las insignias */}
            {badgeProcessResult && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>
                    ¡Resultados Procesados y Premios Otorgados Exitosamente!
                  </span>
                </div>
                <p className="text-xs text-[#D0D0D2]">
                  Se recuperaron{" "}
                  <strong className="text-white">
                    {badgeProcessResult.totalPredictions}
                  </strong>{" "}
                  pronósticos de usuarios para este Gran Premio y se
                  actualizaron en lote{" "}
                  <strong className="text-white">
                    {badgeProcessResult.updatedUsersCount}
                  </strong>{" "}
                  perfiles de la colección <code>users</code> en Firestore.
                </p>

                {badgeProcessResult.usersSummary.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                    <h5 className="text-[11px] font-black uppercase text-emerald-300">
                      Insignias Desbloqueadas o Incrementadas por Usuario:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {badgeProcessResult.usersSummary.map((u) => (
                        <div
                          key={u.uid}
                          className="bg-[#15151E] border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1.5"
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
                            <div className="flex flex-wrap gap-1">
                              {u.awardedBadges.map((badgeId) => (
                                <span
                                  key={badgeId}
                                  className="text-[10px] bg-[#1F1F27] border border-[#2D2D38] px-2 py-0.5 rounded-md text-amber-300 font-semibold"
                                >
                                  {badgeNameMap.get(badgeId) || badgeId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#8E8E93]">
                              Sin nuevos aciertos en esta carrera.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botón Principal de Procesamiento */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#2D2D38]">
              <p className="text-xs text-[#8E8E93]">
                Al presionar el botón se leerán todas las predicciones de este Gran Premio y se actualizarán simultáneamente los documentos de cada usuario en <code>users</code> mediante un <code>writeBatch</code>.
              </p>

              <button
                type="submit"
                disabled={processingBadges}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-[#E10600] to-amber-600 hover:from-amber-400 hover:via-[#b80500] hover:to-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.35)] disabled:opacity-50 transition-all shrink-0 cursor-pointer"
              >
                {processingBadges ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trophy className="w-5 h-5" />
                )}
                <span>
                  {processingBadges
                    ? "Evaluando y Actualizando en Lote..."
                    : "Procesar Resultados y Otorgar Premios"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* PESTAÑA 2: CÁLCULO GENERAL DE PUNTAJES (Q1, Q2, Q3)               */}
      {/* ================================================================= */}
      {activeTab === "scoring" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveAndCalculate}
            className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 sm:p-8 space-y-8 shadow-2xl"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#2D2D38]">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Cálculo de Puntajes de Clasificación (Q1, Q2, Q3) y Podio
                </h2>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Ingresa o sincroniza desde la API la grilla completa de tiempos para calcular la tabla general de posiciones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSyncFromF1Api}
                  disabled={syncingApi || processing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-[#15151E] border border-[#2D2D38] hover:border-white/30 text-white disabled:opacity-50 transition-all"
                >
                  {syncingApi ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4" />
                  )}
                  <span>
                    {syncingApi ? "Consultando API..." : "Autocompletar desde API"}
                  </span>
                </button>
              </div>
            </div>

            {/* Banner de Pre-visualización API */}
            {apiPreviewMeta && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                  <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Pre-visualización cargada desde API F1</span>
                </div>
                <p className="text-xs text-[#D0D0D2]">
                  Sesión: <strong>{apiPreviewMeta.sessionRaceName}</strong>. Los datos han sido precargados en el formulario.
                </p>
              </div>
            )}

            {/* 1. Q1 Eliminados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    1. Eliminados Oficiales en Q1 (6 pilotos • 1 pt c/u)
                  </h3>
                  <p className="text-xs text-[#8E8E93]">
                    Posiciones 17 a 22 en la clasificación.
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-black px-3 py-1 rounded-lg border ${
                    q1Eliminated.length === 6
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                      : "bg-[#15151E] border-[#2D2D38] text-[#E10600]"
                  }`}
                >
                  {q1Eliminated.length} / 6
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                {q1Slots.map((driverId, idx) => (
                  <div
                    key={idx}
                    className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 space-y-1"
                  >
                    <label className="block text-[10px] font-black uppercase text-[#8E8E93]">
                      Eliminado Q1 #{idx + 1}
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ1SlotChange(idx, e.target.value)}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="">Seleccionar...</option>
                      {pilotos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Q2 Eliminados */}
            <div className="space-y-4 pt-4 border-t border-[#2D2D38]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    2. Eliminados Oficiales en Q2 (6 pilotos • 1 pt c/u)
                  </h3>
                  <p className="text-xs text-[#8E8E93]">
                    Posiciones 11 a 16 en la clasificación.
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-black px-3 py-1 rounded-lg border ${
                    q2Eliminated.length === 6
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                      : "bg-[#15151E] border-[#2D2D38] text-[#E10600]"
                  }`}
                >
                  {q2Eliminated.length} / 6
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                {q2Slots.map((driverId, idx) => (
                  <div
                    key={idx}
                    className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 space-y-1"
                  >
                    <label className="block text-[10px] font-black uppercase text-[#8E8E93]">
                      Eliminado Q2 #{idx + 1}
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ2SlotChange(idx, e.target.value)}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="">Seleccionar...</option>
                      {q2AvailableDrivers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Top 10 Q3 */}
            <div className="space-y-3 pt-4 border-t border-[#2D2D38]">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                3. Top 10 Grilla Oficial Q3 (P1 Pole al P10)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {q3Slots.map((driverId, idx) => (
                  <div
                    key={idx}
                    className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-3 space-y-1.5"
                  >
                    <label className="block text-[11px] font-black uppercase text-white">
                      {idx === 0 ? "⚡ P1 (Pole Position)" : `Posición P${idx + 1}`}
                    </label>
                    <select
                      value={driverId}
                      onChange={(e) => handleQ3SlotChange(idx, e.target.value)}
                      className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="">Seleccionar piloto...</option>
                      {q3AvailableDrivers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Mensajes de Error y Éxito de Scoring */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-[#E10600] text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {calcResult && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>¡Puntajes calculados con éxito!</span>
                </div>
                <p className="text-xs text-[#D0D0D2]">
                  Se evaluaron {calcResult.prediccionesEvaluadas} pronósticos y se
                  actualizaron {calcResult.usuariosActualizados} usuarios en el
                  Ranking general.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[#2D2D38]">
              <button
                type="submit"
                disabled={processing || syncingApi}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                <span>
                  {processing
                    ? "Guardando y Calculando..."
                    : "Guardar y Calcular Puntajes"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* PESTAÑA 3: GESTIÓN DE BASE DE DATOS (SEED)                         */}
      {/* ================================================================= */}
      {activeTab === "seed" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <AdminSeedCard />
        </div>
      )}
    </div>
  );
}
