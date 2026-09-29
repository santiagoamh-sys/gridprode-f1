"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { getPrediccionesPorUsuario } from "@/lib/firebase/f1Service";
import { Prediccion, DesglosePuntos } from "@/types/f1";
import {
  normalizeDriverList,
  normalizeDnfCount,
} from "@/lib/scoringEngine";
import {
  Ticket,
  Loader2,
  Trophy,
  Zap,
  Calendar,
  Shield,
  Flame,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function MisPronosticosPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <MisPronosticosContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function MisPronosticosContent() {
  const { user } = useAuth();
  const { allGrandPrixList, getPiloto, getEscuderia } = useF1Data();
  const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoading(true);
        const list = await getPrediccionesPorUsuario(user.uid);
        setPredicciones(list);
      } catch (err) {
        console.error("Error al cargar mis pronósticos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F27] border border-[#2D2D38] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Mis Pronósticos (Tickets Oficiales)
              </h1>
              <span className="text-[10px] font-black uppercase bg-[#15151E] border border-[#2D2D38] text-[#8E8E93] px-2 py-0.5 rounded-md">
                Solo Lectura
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Revisa las selecciones guardadas en Firestore y el desglose de
              puntos obtenidos en cada Gran Premio.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#15151E] border border-[#2D2D38] text-[#D0D0D2] hover:text-white self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#E10600]" />
          <span>Ir al Calendario</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8E8E93]">
          <Loader2 className="w-7 h-7 animate-spin text-[#E10600]" />
          <p className="text-xs font-semibold">
            Consultando tus tickets en Firestore...
          </p>
        </div>
      ) : predicciones.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#15151E] border border-[#2D2D38] flex items-center justify-center text-[#8E8E93] mx-auto">
            <Calendar className="w-6 h-6 text-[#E10600]" />
          </div>
          <h3 className="text-lg font-black text-white">
            Aún no tienes pronósticos registrados
          </h3>
          <p className="text-xs text-[#8E8E93] max-w-md mx-auto">
            Dirígete al Calendario desde el Gran Premio de Singapur y completa
            el Wizard paso a paso para generar tu primer ticket.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#E10600] text-white hover:bg-[#b80500] shadow-[0_0_20px_rgba(225,6,0,0.35)]"
          >
            <span>Cargar Pronóstico Ahora</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {predicciones.map((pred) => {
            const gp = allGrandPrixList.find(
              (g) => g.id === pred.grand_prix_id
            );
            const r = pred.respuestas || {};
            const q1List = normalizeDriverList(r.q1);
            const q2List = normalizeDriverList(r.q2);
            const q3List = normalizeDriverList(r.q3);
            const dnfCount = normalizeDnfCount(r.dnf);
            const escuderiaGanadora = getEscuderia(r.escuderia);
            const pilotoDotd = getPiloto(r.piloto_del_dia);
            const desglose = pred.desglose_puntos as
              | DesglosePuntos
              | undefined;
            const tienePuntaje = typeof pred.puntos_totales === "number";

            return (
              <div
                key={pred.id}
                className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] overflow-hidden shadow-2xl"
              >
                {/* Encabezado del Ticket */}
                <div className="bg-[#15151E] border-b border-[#2D2D38] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{gp?.bandera || "🏁"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-white">
                          {gp?.nombre || pred.grand_prix_id}
                        </h2>
                        {gp?.isSprint && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3 fill-amber-300" /> Sprint
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8E8E93]">
                        Ticket ID: <code className="font-mono">{pred.id}</code>
                      </p>
                    </div>
                  </div>

                  {/* Puntaje del Ticket */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    {tienePuntaje ? (
                      <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-xl">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-amber-300/80">
                            Puntaje Obtenido
                          </p>
                          <p className="text-lg font-black font-mono text-amber-400 leading-none">
                            {pred.puntos_totales} pts
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#1F1F27] border border-[#2D2D38] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ticket Guardado (Pendiente de Resultados)
                      </span>
                    )}
                  </div>
                </div>

                {/* Desglose de puntos si ya fue evaluado */}
                {desglose && (
                  <div className="bg-black/30 border-b border-[#2D2D38] px-6 py-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-black text-amber-400 uppercase tracking-wider text-[11px]">
                      Desglose Oficial:
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#2D2D38]">
                      Q1: <strong className="text-white">{desglose.q1} pts</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#2D2D38]">
                      Q2: <strong className="text-white">{desglose.q2} pts</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#2D2D38]">
                      Q3:{" "}
                      <strong className="text-white">
                        {desglose.q3_total} pts
                      </strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#2D2D38]">
                      Podio Carrera:{" "}
                      <strong className="text-white">
                        {desglose.carrera_total} pts
                      </strong>
                    </span>
                    {gp?.isSprint && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-amber-500/30 text-amber-300">
                        Sprint:{" "}
                        <strong className="text-white">
                          {desglose.sprint_total} pts
                        </strong>
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-[#15151E] border border-[#2D2D38]">
                      Especiales:{" "}
                      <strong className="text-white">
                        {desglose.especiales_total} pts
                      </strong>
                    </span>
                  </div>
                )}

                {/* Contenido de solo lectura */}
                <div className="p-6 space-y-6">
                  {/* 1. Podio Carrera Principal */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#E10600] mb-3">
                      Podio Carrera Principal (P1 • P2 • P3)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {(
                        [
                          { label: "🥇 P1 Ganador (3 pts)", id: r.p1 },
                          { label: "🥈 P2 Segundo (2 pts)", id: r.p2 },
                          { label: "🥉 P3 Tercero (1 pt)", id: r.p3 },
                        ] as const
                      ).map((slot, i) => {
                        const pil = getPiloto(slot.id);
                        const esc = getEscuderia(pil?.escuderia_id);
                        return (
                          <div
                            key={i}
                            style={{
                              borderColor: esc?.color_hex || "#2D2D38",
                            }}
                            className="rounded-xl bg-[#15151E] border-2 p-3.5 flex items-center gap-3"
                          >
                            {pil?.foto_url && (
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#1F1F27] shrink-0">
                                <Image
                                  src={pil.foto_url}
                                  alt={pil.nombre}
                                  fill
                                  sizes="48px"
                                  className="object-contain object-bottom"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase text-[#8E8E93]">
                                {slot.label}
                              </p>
                              <p className="text-sm font-black text-white truncate">
                                {pil?.nombre || slot.id || "—"}
                              </p>
                              <p className="text-[11px] text-[#8E8E93] truncate">
                                {esc?.nombre || ""}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Clasificación: Q3 (1 al 10), Q2 (6) y Q1 (6) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Grilla Q3 */}
                    <div className="lg:col-span-2 rounded-xl bg-[#15151E] border border-[#2D2D38] p-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                        Grilla Final Q3 (Posiciones 1 al 10)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q3List.map((driverId, idx) => {
                          const pil = getPiloto(driverId);
                          const esc = getEscuderia(pil?.escuderia_id);
                          return (
                            <div
                              key={idx}
                              style={{
                                borderLeftColor: esc?.color_hex || "#E10600",
                              }}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1F1F27] border border-[#2D2D38] border-l-4"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                                    idx === 0
                                      ? "bg-amber-500 text-black"
                                      : "bg-[#15151E] text-white"
                                  }`}
                                >
                                  P{idx + 1}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {pil?.nombre || driverId}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[#8E8E93]">
                                {pil?.escuderia_id}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Eliminados Q1 y Q2 */}
                    <div className="space-y-4">
                      <div className="rounded-xl bg-[#15151E] border border-[#2D2D38] p-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#8E8E93] mb-2.5">
                          Eliminados en Q2 (6 Pilotos)
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {q2List.map((id) => {
                            const pil = getPiloto(id);
                            return (
                              <span
                                key={id}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#1F1F27] border border-[#2D2D38] text-white"
                              >
                                {pil?.nombre || id}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#15151E] border border-[#2D2D38] p-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#8E8E93] mb-2.5">
                          Eliminados en Q1 (6 Pilotos)
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {q1List.map((id) => {
                            const pil = getPiloto(id);
                            return (
                              <span
                                key={id}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#1F1F27] border border-[#2D2D38] text-white"
                              >
                                {pil?.nombre || id}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Especiales de Carrera y Sprint */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-[#15151E] border border-[#2D2D38] p-3.5">
                      <p className="text-[10px] font-bold uppercase text-[#8E8E93] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#E10600]" />{" "}
                        Cantidad DNF
                      </p>
                      <p className="text-base font-black font-mono text-white mt-1">
                        {dnfCount !== null ? `${dnfCount} Abandonos` : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#15151E] border border-[#2D2D38] p-3.5">
                      <p className="text-[10px] font-bold uppercase text-[#8E8E93] flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#E10600]" /> Escudería
                        Ganadora
                      </p>
                      <p className="text-sm font-black text-white mt-1 truncate">
                        {escuderiaGanadora?.nombre || r.escuderia || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#15151E] border border-[#2D2D38] p-3.5">
                      <p className="text-[10px] font-bold uppercase text-[#8E8E93] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#E10600]" /> Piloto del
                        Día (DOTD)
                      </p>
                      <p className="text-sm font-black text-white mt-1 truncate">
                        {pilotoDotd?.nombre || r.piloto_del_dia || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#15151E] border border-amber-500/30 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-amber-300">
                        🇦🇷 Posición Colapinto
                      </p>
                      <p className="text-base font-black font-mono text-amber-400 mt-1">
                        {r.posicion_colapinto === 0
                          ? "DNF (Abandono)"
                          : r.posicion_colapinto
                          ? `P${r.posicion_colapinto}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Si es Sprint */}
                  {gp?.isSprint && (
                    <div className="rounded-xl bg-amber-950/15 border border-amber-500/30 p-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-3">
                        <Zap className="w-3.5 h-3.5 fill-amber-300" />{" "}
                        Selecciones Carrera Sprint
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-lg">
                          <span className="text-[#8E8E93] block text-[10px] uppercase">
                            Pole Sprint (1 pt)
                          </span>
                          <span className="font-black text-white">
                            {getPiloto(r.sprintPole)?.nombre ||
                              r.sprintPole ||
                              "—"}
                          </span>
                        </div>
                        <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-lg">
                          <span className="text-[#8E8E93] block text-[10px] uppercase">
                            Sprint P1 (3 pts)
                          </span>
                          <span className="font-black text-white">
                            {getPiloto(r.sprintP1)?.nombre || r.sprintP1 || "—"}
                          </span>
                        </div>
                        <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-lg">
                          <span className="text-[#8E8E93] block text-[10px] uppercase">
                            Sprint P2 (2 pts)
                          </span>
                          <span className="font-black text-white">
                            {getPiloto(r.sprintP2)?.nombre || r.sprintP2 || "—"}
                          </span>
                        </div>
                        <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-lg">
                          <span className="text-[#8E8E93] block text-[10px] uppercase">
                            Sprint P3 (1 pt)
                          </span>
                          <span className="font-black text-white">
                            {getPiloto(r.sprintP3)?.nombre || r.sprintP3 || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
