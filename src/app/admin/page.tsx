"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import { AdminSeedCard } from "@/components/AdminSeedCard";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { GrandPrix, ResultadosOficiales } from "@/types/f1";
import { guardarResultadosYCalcularPuntajes } from "@/lib/firebase/f1Service";
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

  const [selectedGpId, setSelectedGpId] = useState<string>(
    grandPrixList[0]?.id || "gp-singapur-2026"
  );

  const selectedGp: GrandPrix | undefined =
    grandPrixList.find((g) => g.id === selectedGpId) || grandPrixList[0];

  // Estados del formulario de Resultados Oficiales (6 casilleros Q1, 6 Q2, 10 Q3)
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

  // Estados de sincronización con API y procesamiento de puntajes
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

  // Sincronizar campos con los datos guardados en Firestore al cambiar de GP
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

  // Listas limpias de Q1, Q2 y Q3
  const q1Eliminated = q1Slots.filter(Boolean);
  const q2Eliminated = q2Slots.filter(Boolean);
  const q3Selected = q3Slots.filter(Boolean);

  // Exclusión en cascada al cambiar un select o tarjeta de Q1
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

  // Exclusión en cascada al cambiar un select o tarjeta de Q2
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

  // Cambio de casillero en Q3 (1 al 10)
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

  // =========================================================================
  // SINCRONIZACIÓN SEMI-AUTOMÁTICA CON API PÚBLICA DE F1 (PRE-VISUALIZACIÓN)
  // =========================================================================
  const handleSyncFromF1Api = async () => {
    if (!selectedGp) return;
    try {
      setSyncingApi(true);
      setErrorMsg(null);
      setCalcResult(null);

      const synced = await fetchOfficialResultsFromF1Api(selectedGp);

      // Inyectar los resultados en el estado visual del formulario SIN guardar en Firestore
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

  // =========================================================================
  // GUARDADO FINAL EN FIRESTORE Y CÁLCULO DE PUNTAJES (TRAS REVISIÓN MANUAL)
  // =========================================================================
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
    if (
      selectedGp.isSprint &&
      (!sprintPole ||
        !sprintP1 ||
        !sprintP2 ||
        !sprintP3 ||
        new Set([sprintP1, sprintP2, sprintP3]).size !== 3)
    ) {
      setErrorMsg(
        "Para un GP con formato Sprint, debes completar Sprint Pole y un Podio Sprint (P1, P2, P3) con 3 pilotos distintos."
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
    } catch (err: any) {
      console.error("Error al guardar resultados y calcular puntajes:", err);
      setErrorMsg(
        err.message || "Error al procesar el cálculo de puntajes en Firestore."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado Admin */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Panel de Administración • Carga Semi-Automática
              </h1>
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                Autorizado
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Sincroniza resultados desde la API oficial de F1 (Jolpi/Ergast),
              revisa o edita manualmente y ejecuta el Motor de Puntajes.
            </p>
          </div>
        </div>
      </div>

      {/* Herramienta de Seed de Colecciones Maestras */}
      <AdminSeedCard />

      {/* Formulario de Carga de Resultados Oficiales y Cálculo */}
      <form
        onSubmit={handleSaveAndCalculate}
        className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 sm:p-8 space-y-8 shadow-2xl"
      >
        {/* Barra Superior: Selector de Gran Premio + Botón Primario "Autocompletar Resultados Oficiales" */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#2D2D38]">
          <div className="flex-1">
            <label className="block text-xs font-black uppercase tracking-wider text-[#E10600] mb-1.5">
              Gran Premio Seleccionado (Desde GP de Singapur)
            </label>
            <select
              value={selectedGpId}
              onChange={(e) => setSelectedGpId(e.target.value)}
              className="w-full max-w-md bg-[#15151E] border border-[#2D2D38] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#E10600]"
            >
              {grandPrixList.map((gp) => (
                <option key={gp.id} value={gp.id}>
                  {gp.bandera} {gp.nombre} ({gp.estado.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Botón Primario de Sincronización con API */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSyncFromF1Api}
              disabled={syncingApi || processing}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-[#E10600] hover:bg-[#b80500] text-white shadow-[0_0_25px_rgba(225,6,0,0.45)] disabled:opacity-50 transition-all"
            >
              {syncingApi ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              <span>
                {syncingApi
                  ? "Consultando API F1..."
                  : "Autocompletar Resultados Oficiales"}
              </span>
            </button>
          </div>
        </div>

        {/* Banner de Pre-visualización tras autocompletar desde la API */}
        {apiPreviewMeta && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-5 space-y-2 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-wider">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Pre-visualización cargada desde API • Edición Manual Habilitada
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-200 bg-[#15151E] border border-amber-500/30 px-2.5 py-0.5 rounded-md">
                Sesión: {apiPreviewMeta.sessionRaceName}{" "}
                {apiPreviewMeta.sessionDate
                  ? `(${apiPreviewMeta.sessionDate})`
                  : ""}
              </span>
            </div>
            <p className="text-xs text-[#D0D0D2] leading-relaxed">
              Los campos de <strong>Q1 (6)</strong>, <strong>Q2 (6)</strong>,{" "}
              <strong>Top 10 Q3</strong>, <strong>Podio de Carrera</strong>,{" "}
              {selectedGp?.isSprint && <strong>Podio Sprint, </strong>}y{" "}
              <strong>Total de Abandonos ({apiPreviewMeta.dnfCount} DNF)</strong>{" "}
              han sido inyectados en los selectores del formulario.{" "}
              <strong className="text-white">
                Los datos aún NO se han guardado en Firestore ni se han
                calculado los puntajes.
              </strong>{" "}
              Verifica o corrige manualmente campos específicos como el{" "}
              <strong className="text-amber-300">Piloto del Día (DOTD)</strong> y
              la{" "}
              <strong className="text-amber-300">
                Posición de Franco Colapinto
              </strong>{" "}
              antes de presionar <em>&ldquo;Guardar y Calcular Puntajes&rdquo;</em>.
            </p>
          </div>
        )}

        {/* =============================================================== */}
        {/* 1. ELIMINADOS Q1 (6 selects + selector rápido de tarjetas)      */}
        {/* =============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                1. Eliminados Oficiales en Q1 (Posiciones 17 a 22 • 1 pt c/u)
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Revisa o modifica los 6 pilotos eliminados en Q1 mediante los
                selectores o haciendo clic en las tarjetas.
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

          {/* 6 Selects de Q1 sincronizados con la API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {q1Slots.map((driverId, idx) => (
              <div
                key={idx}
                className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 space-y-1"
              >
                <label className="block text-[10px] font-black uppercase text-[#8E8E93]">
                  Eliminado Q1 #{idx + 1} (P{17 + idx})
                </label>
                <select
                  value={driverId}
                  onChange={(e) => handleQ1SlotChange(idx, e.target.value)}
                  className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                >
                  <option value="">Seleccionar piloto...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Grilla rápida de botones de Q1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {pilotos.map((p) => {
              const selected = q1Eliminated.includes(p.id);
              const esc = getEscuderia(p.escuderia_id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleAdminQ1Card(p.id)}
                  style={{
                    borderColor: selected
                      ? "#E10600"
                      : esc?.color_hex || "#2D2D38",
                  }}
                  className={`px-3 py-2 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "bg-[#E10600]/20 text-white ring-2 ring-[#E10600]/50"
                      : "bg-[#15151E] text-[#D0D0D2] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-[#8E8E93]">
                      {p.id}
                    </span>
                    {selected && (
                      <span className="text-[9px] font-black text-[#E10600]">
                        OUT Q1
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate mt-0.5">
                    {p.nombre}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* =============================================================== */}
        {/* 2. ELIMINADOS Q2 (6 selects + selector rápido, excluye Q1)      */}
        {/* =============================================================== */}
        <div className="space-y-4 pt-4 border-t border-[#2D2D38]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                2. Eliminados Oficiales en Q2 (Posiciones 11 a 16 • 1 pt c/u)
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Los 6 eliminados en Q1 están excluidos automáticamente. Revisa o
                edita los 6 eliminados de Q2.
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

          {/* 6 Selects de Q2 sincronizados con la API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {q2Slots.map((driverId, idx) => (
              <div
                key={idx}
                className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 space-y-1"
              >
                <label className="block text-[10px] font-black uppercase text-[#8E8E93]">
                  Eliminado Q2 #{idx + 1} (P{11 + idx})
                </label>
                <select
                  value={driverId}
                  onChange={(e) => handleQ2SlotChange(idx, e.target.value)}
                  className="w-full bg-[#1F1F27] border border-[#2D2D38] rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
                >
                  <option value="">Seleccionar piloto...</option>
                  {q2AvailableDrivers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Grilla rápida de botones de Q2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {q2AvailableDrivers.map((p) => {
              const selected = q2Eliminated.includes(p.id);
              const esc = getEscuderia(p.escuderia_id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleAdminQ2Card(p.id)}
                  style={{
                    borderColor: selected
                      ? "#E10600"
                      : esc?.color_hex || "#2D2D38",
                  }}
                  className={`px-3 py-2 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "bg-[#E10600]/20 text-white ring-2 ring-[#E10600]/50"
                      : "bg-[#15151E] text-[#D0D0D2] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-[#8E8E93]">
                      {p.id}
                    </span>
                    {selected && (
                      <span className="text-[9px] font-black text-[#E10600]">
                        OUT Q2
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate mt-0.5">
                    {p.nombre}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* =============================================================== */}
        {/* 3. GRILLA OFICIAL Q3 (Posiciones 1 Pole al 10)                  */}
        {/* =============================================================== */}
        <div className="space-y-3 pt-4 border-t border-[#2D2D38]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                3. Top 10 Grilla Oficial Q3 (Posiciones 1 Pole al 10)
              </h3>
              <p className="text-xs text-[#8E8E93]">
                1 pt por estar en Top 10 + 1 pt extra por posición exacta (Pole
                Position P1 otorga +2 pts extras).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const used = new Set(q3Slots.filter(Boolean));
                const rem = q3AvailableDrivers
                  .map((d) => d.id)
                  .filter((id) => !used.has(id));
                let idx = 0;
                setQ3Slots((prev) =>
                  prev.map((val) => val || rem[idx++] || "")
                );
              }}
              className="text-xs font-bold text-amber-400 bg-[#15151E] border border-[#2D2D38] px-3 py-1.5 rounded-xl hover:border-amber-400/50"
            >
              Completar casilleros vacíos con los restantes
            </button>
          </div>

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

        {/* =============================================================== */}
        {/* 4. PODIO CARRERA PRINCIPAL (P1, P2, P3)                         */}
        {/* =============================================================== */}
        <div className="space-y-3 pt-4 border-t border-[#2D2D38]">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            4. Podio Oficial Carrera Principal (P1: 3 pts • P2: 2 pts • P3: 1 pt)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                🥇 Primer Puesto (P1 - 3 pts)
              </label>
              <select
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value="">Seleccionar ganador...</option>
                {pilotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.escuderia_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                🥈 Segundo Puesto (P2 - 2 pts)
              </label>
              <select
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value="">Seleccionar P2...</option>
                {pilotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.escuderia_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-600 mb-1">
                🥉 Tercer Puesto (P3 - 1 pt)
              </label>
              <select
                value={p3}
                onChange={(e) => setP3(e.target.value)}
                className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value="">Seleccionar P3...</option>
                {pilotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.escuderia_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* 5. CARRERA SPRINT (SI CORRESPONDE)                              */}
        {/* =============================================================== */}
        {selectedGp?.isSprint && (
          <div className="space-y-3 pt-4 border-t border-[#2D2D38]">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>
                5. Resultados Carrera Sprint (Pole: 1 pt • P1: 3 pts • P2: 2 pts
                • P3: 1 pt)
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Pole Sprint (1 pt)
                </label>
                <select
                  value={sprintPole}
                  onChange={(e) => setSprintPole(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                >
                  <option value="">Seleccionar...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.escuderia_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Sprint P1 (3 pts)
                </label>
                <select
                  value={sprintP1}
                  onChange={(e) => setSprintP1(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                >
                  <option value="">Seleccionar...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.escuderia_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Sprint P2 (2 pts)
                </label>
                <select
                  value={sprintP2}
                  onChange={(e) => setSprintP2(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                >
                  <option value="">Seleccionar...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.escuderia_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Sprint P3 (1 pt)
                </label>
                <select
                  value={sprintP3}
                  onChange={(e) => setSprintP3(e.target.value)}
                  className="w-full bg-[#15151E] border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                >
                  <option value="">Seleccionar...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.escuderia_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* 6. ESPECIALES DE CARRERA (EDICIÓN MANUAL DESTACADA)             */}
        {/* =============================================================== */}
        <div className="space-y-3 pt-4 border-t border-[#2D2D38]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              6. Especiales de Carrera (DNF: 1 pt • Escudería: 1 pt • DOTD: 1 pt
              • Colapinto: 2 pts)
            </h3>
            <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
              Verifica manualmente Piloto del Día y Posición de Franco Colapinto
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#D0D0D2] mb-1">
                Total de Abandonos / DNF (0 - 22)
              </label>
              <input
                type="number"
                min={0}
                max={22}
                value={dnfCount}
                onChange={(e) =>
                  setDnfCount(
                    Math.max(0, Math.min(22, parseInt(e.target.value, 10) || 0))
                  )
                }
                className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#D0D0D2] mb-1">
                Escudería Ganadora (1 pt)
              </label>
              <select
                value={escuderiaGanadora}
                onChange={(e) => setEscuderiaGanadora(e.target.value)}
                className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value="">Seleccionar escudería...</option>
                {escuderias.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre} ({esc.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">
                ⭐ Piloto del Día / DOTD (1 pt • Revisión Manual)
              </label>
              <select
                value={pilotoDelDia}
                onChange={(e) => setPilotoDelDia(e.target.value)}
                className="w-full bg-[#15151E] border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value="">Seleccionar Piloto del Día...</option>
                {pilotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.escuderia_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">
                🇦🇷 Posición Final Franco Colapinto (2 pts)
              </label>
              <select
                value={posicionColapinto}
                onChange={(e) =>
                  setPosicionColapinto(parseInt(e.target.value, 10))
                }
                className="w-full bg-[#15151E] border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E10600]"
              >
                <option value={0}>DNF (Abandono / Retiro)</option>
                {Array.from({ length: 22 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Posición Final P{idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mensajes de Error o Resultado del Cálculo */}
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
              <span>
                ¡Resultados Oficiales guardados en Firestore y Puntajes
                calculados con éxito!
              </span>
            </div>
            <p className="text-xs text-[#D0D0D2]">
              Se evaluaron{" "}
              <strong className="text-white">
                {calcResult.prediccionesEvaluadas}
              </strong>{" "}
              pronósticos para este Gran Premio y se actualizaron los puntajes
              globales de{" "}
              <strong className="text-white">
                {calcResult.usuariosActualizados}
              </strong>{" "}
              usuarios en el Ranking.
            </p>
          </div>
        )}

        {/* Botón Final de Envío tras Revisión Manual */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#2D2D38]">
          <p className="text-xs text-[#8E8E93]">
            Al presionar el botón final se guardarán los resultados en{" "}
            <code>grand_prix</code> y se cruzarán todas las predicciones en{" "}
            <code>predicciones</code> y <code>users</code>.
          </p>

          <button
            type="submit"
            disabled={processing || syncingApi}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50 transition-all shrink-0"
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
  );
}
