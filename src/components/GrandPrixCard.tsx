"use client";

import React, { useState } from "react";
import { GrandPrix } from "@/types/f1";
import { usePredictionWizard } from "@/context/PredictionWizardContext";
import { normalizeDriverList, normalizeDnfCount } from "@/lib/scoringEngine";
import {
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Flag,
  Lock,
} from "lucide-react";

interface GrandPrixCardProps {
  gp: GrandPrix;
}

export const GrandPrixCard: React.FC<GrandPrixCardProps> = ({ gp }) => {
  const { openWizard } = usePredictionWizard();
  const [showResults, setShowResults] = useState(false);

  // Formato de fecha para qualyStartTime
  const qualyDate = new Date(gp.qualyStartTime);
  const formattedQualy = isNaN(qualyDate.getTime())
    ? gp.qualyStartTime
    : qualyDate.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

  // Verificar si faltan menos de 60 minutos para qualyStartTime
  const diffMin = !isNaN(qualyDate.getTime())
    ? Math.floor((qualyDate.getTime() - Date.now()) / (1000 * 60))
    : null;
  const isLocked =
    gp.estado === "finalizado" ||
    gp.estado === "cancelado" ||
    (diffMin !== null && diffMin < 60);

  const res = gp.resultados_oficiales;
  const q1Arr = normalizeDriverList(res.q1);
  const q2Arr = normalizeDriverList(res.q2);
  const q3Arr = normalizeDriverList(res.q3);
  const dnfVal = normalizeDnfCount(res.dnf);

  return (
    <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 flex flex-col justify-between hover:border-[#E10600]/40 transition-all shadow-xl">
      <div>
        {/* Encabezado de la Carrera */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{gp.bandera || "🏁"}</span>
              <h3 className="font-black text-white text-base sm:text-lg leading-tight tracking-tight">
                {gp.nombre}
              </h3>
            </div>
            <p className="text-xs text-[#8E8E93]">
              {gp.ronda ? `Ronda ${gp.ronda} • ` : ""}
              {gp.circuito || gp.pais}
            </p>
          </div>

          {/* Badges de Estado y Sprint */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {gp.isSprint && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Zap className="w-3 h-3 fill-amber-300" /> Sprint
              </span>
            )}
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                gp.estado === "finalizado"
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                  : "bg-[#15151E] text-[#D0D0D2] border-[#2D2D38]"
              }`}
            >
              {gp.estado}
            </span>
          </div>
        </div>

        {/* Fecha Límite / Qualy Start Time */}
        <div className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-3 mb-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#E10600]" />
              Cierre (60m antes Qualy):
            </span>
            <span className="font-semibold text-white capitalize">
              {formattedQualy}
            </span>
          </div>
        </div>

        {/* Desplegable de Resultados Oficiales */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowResults(!showResults)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 py-1.5 px-2.5 rounded-lg bg-[#15151E] border border-[#2D2D38] transition-colors"
          >
            <span>Ver Resultados Oficiales Cargados</span>
            {showResults ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showResults && (
            <div className="mt-2 p-3 rounded-xl bg-[#15151E] border border-[#2D2D38] text-[11px] space-y-2 text-zinc-300">
              <div className="space-y-1">
                <div>
                  <span className="text-[#8E8E93]">Pole / Top 3 Q3:</span>{" "}
                  <span className="font-mono text-white">
                    {q3Arr.length > 0 ? q3Arr.slice(0, 3).join(", ") + "..." : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E8E93]">Eliminados Q1 / Q2:</span>{" "}
                  <span className="font-mono text-white">
                    {q1Arr.length > 0 ? `${q1Arr.length} pil.` : "—"} /{" "}
                    {q2Arr.length > 0 ? `${q2Arr.length} pil.` : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                  <div>
                    <span className="text-[#8E8E93]">Podio Carrera:</span>{" "}
                    <span className="font-mono text-white">
                      {res.p1 || "—"} / {res.p2 || "—"} / {res.p3 || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Piloto del Día:</span>{" "}
                    <span className="font-mono text-white">
                      {res.piloto_del_dia || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Cantidad DNF:</span>{" "}
                    <span className="font-mono text-white">
                      {dnfVal !== null ? `${dnfVal} DNF` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Escudería:</span>{" "}
                    <span className="font-mono text-white">
                      {res.escuderia || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-amber-400">🇦🇷 Pos. Colapinto:</span>{" "}
                    <span className="font-mono text-white">
                      {res.posicion_colapinto === 0
                        ? "DNF"
                        : res.posicion_colapinto
                        ? `P${res.posicion_colapinto}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {gp.isSprint && (
                <div className="pt-2 border-t border-[#2D2D38] text-amber-200/90">
                  <span className="font-bold block mb-1">
                    Resultados Sprint:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      Sprint Pole:{" "}
                      <span className="font-mono">{res.sprintPole || "—"}</span>
                    </div>
                    <div>
                      Podio Sprint:{" "}
                      <span className="font-mono">
                        {res.sprintP1 || "—"} / {res.sprintP2 || "—"} /{" "}
                        {res.sprintP3 || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón Acción para abrir el Wizard Paso a Paso */}
      <button
        type="button"
        onClick={() => openWizard(gp)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
          isLocked
            ? "bg-[#15151E] border border-[#2D2D38] text-[#8E8E93] hover:text-white"
            : "text-white bg-[#E10600] hover:bg-[#B80500] shadow-[0_0_20px_rgba(225,6,0,0.35)]"
        }`}
      >
        {isLocked ? (
          <>
            <Lock className="w-3.5 h-3.5 text-[#E10600]" />
            <span>Pronóstico Cerrado (Ver Estado)</span>
          </>
        ) : (
          <>
            <Flag className="w-3.5 h-3.5" />
            <span>Abrir Wizard de Pronóstico</span>
          </>
        )}
      </button>
    </div>
  );
};
