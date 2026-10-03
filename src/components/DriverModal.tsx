"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Piloto, DriverStats } from "@/types/f1";
import { useF1Data } from "@/context/F1DataContext";
import {
  X,
  Trophy,
  User,
  Zap,
  Flame,
  Medal,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { fetchDriverStats } from "@/services/driverStatsService";

// Re-exportamos para máxima conveniencia y compatibilidad modular
export { fetchDriverStats };
export type { DriverStats };

export interface DriverModalProps {
  driver: Piloto | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectDriver?: (driver: Piloto) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
}

export const DriverModal: React.FC<DriverModalProps> = ({
  driver,
  isOpen,
  onClose,
  onSelectDriver,
  isSelectable = false,
  isSelected = false,
}) => {
  const { getEscuderia } = useF1Data();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Consulta asíncrona robusta combinando API pública y Firestore
  useEffect(() => {
    if (!isOpen || !driver) {
      setStats(null);
      setLoadingStats(true);
      return;
    }

    let isMounted = true;
    setLoadingStats(true);
    setStats(null);

    fetchDriverStats(driver.id)
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setLoadingStats(false);
        }
      })
      .catch((err) => {
        console.error("Error al obtener estadísticas del piloto:", err);
        if (isMounted) {
          // Si ambas fuentes fallan, proveemos un fallback por defecto sin romper la UI
          setStats({
            driverId: driver.id,
            posicion_campeonato: 0,
            puntos_campeonato: 0,
            h2h_qualy: { victorias: 0, derrotas: 0, companero: "Compañero", companeroId: "COMP" },
            veces_q1: 0,
            veces_q2: 0,
            veces_q3: 0,
            poles_anio: 0,
            victorias_anio: 0,
            dnfs_anio: 0,
            ultimas_carreras: [],
          });
          setLoadingStats(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, driver?.id]);

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Bloqueo de scroll en el body mientras el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !driver) return null;

  const escuderia = getEscuderia(driver.escuderia_id);
  const teamColor = escuderia?.color_hex || "#E10600";

  // Cálculos para gráfico de clasificación (Q1, Q2, Q3)
  const totalQualys = stats ? (stats.veces_q1 || 0) + (stats.veces_q2 || 0) + (stats.veces_q3 || 0) : 0;
  const q3Pct = totalQualys > 0 && stats ? Math.round((stats.veces_q3 / totalQualys) * 100) : 0;
  const q2Pct = totalQualys > 0 && stats ? Math.round((stats.veces_q2 / totalQualys) * 100) : 0;
  const q1Pct = totalQualys > 0 ? Math.max(0, 100 - q3Pct - q2Pct) : 0;

  // Cálculos para H2H
  const totalH2H = stats
    ? (stats.h2h_qualy?.victorias || 0) + (stats.h2h_qualy?.derrotas || 0)
    : 0;
  const h2hWinPct = totalH2H > 0 && stats ? Math.round((stats.h2h_qualy.victorias / totalH2H) * 100) : 50;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-modal-title"
    >
      {/* Fondo con desenfoque de cristal (glassmorphism) */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor principal del Modal */}
      <div
        className="relative w-full max-w-2xl bg-[#15151E]/95 border border-[#2D2D38] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        style={{
          boxShadow: `0 0 50px ${teamColor}33, 0 25px 60px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Botón de cierre superior derecho */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-[#1F1F27]/80 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scroll interno si la pantalla es reducida */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* ========================================== */}
          {/* 1. SECCIÓN CABECERA (IDENTIDAD)            */}
          {/* ========================================== */}
          <div className="relative p-5 sm:p-7 pb-5 overflow-hidden border-b border-[#2D2D38]/80 bg-gradient-to-b from-white/[0.04] to-transparent">
            {/* Acento superior de equipo */}
            <div
              className="absolute top-0 inset-x-0 h-1.5 z-20"
              style={{ backgroundColor: teamColor }}
            />

            {/* Resplandor ambiental de equipo */}
            <div
              className="absolute -top-10 -right-10 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: teamColor }}
            />

            {/* Número de auto gigante en el fondo (semitransparente) */}
            <div className="absolute right-4 sm:right-8 -bottom-3 sm:bottom-0 pointer-events-none select-none z-0">
              <span className="font-mono text-8xl sm:text-9xl font-black text-white/[0.07] tracking-tighter leading-none">
                {driver.numero ? `#${driver.numero}` : `#${driver.id}`}
              </span>
            </div>

            {/* Contenido en primer plano */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Foto recortada del piloto superpuesta sobre el número */}
              <div
                className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-2xl bg-gradient-to-t from-[#1F1F27] to-[#15151E] border-2 p-1.5 flex items-end justify-center shadow-2xl"
                style={{ borderColor: teamColor }}
              >
                {/* Resplandor inferior bajo el retrato */}
                <div
                  className="absolute inset-x-2 bottom-0 h-1/2 rounded-b-xl opacity-30 blur-md pointer-events-none"
                  style={{ backgroundColor: teamColor }}
                />

                {driver.foto_url ? (
                  <Image
                    src={driver.foto_url}
                    alt={driver.nombre}
                    fill
                    sizes="(max-width: 640px) 140px, 170px"
                    className="object-contain object-bottom filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <User className="w-16 h-16" />
                  </div>
                )}

                {/* Badge de número de auto en esquina inferior derecha */}
                {driver.numero && (
                  <div
                    className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-lg font-mono text-xs font-black text-white border border-white/20 shadow-lg"
                    style={{ backgroundColor: teamColor }}
                  >
                    #{driver.numero}
                  </div>
                )}
              </div>

              {/* Datos de identidad */}
              <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
                  {/* Bandera y País */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1F1F27] border border-[#2D2D38] text-xs font-semibold text-zinc-300 shadow-sm">
                    <span className="text-base leading-none">{driver.bandera || "🏁"}</span>
                    <span>{driver.pais || "Internacional"}</span>
                  </span>

                  {/* Código Piloto */}
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-zinc-800 text-white border border-white/10">
                    {driver.id}
                  </span>
                </div>

                <h2
                  id="driver-modal-title"
                  className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2.5"
                >
                  {driver.nombre}
                </h2>

                {/* Escudería */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1F1F27]/90 border border-white/10 backdrop-blur-sm shadow-md">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: teamColor, color: teamColor }}
                  />
                  <span className="text-xs sm:text-sm font-black text-white">
                    {escuderia?.nombre || driver.escuderia_id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. SECCIÓN PERFIL BIOGRÁFICO (ESTÁTICOS)   */}
          {/* ========================================== */}
          <div className="p-5 sm:p-6 border-b border-[#2D2D38]/80 bg-[#15151E]/60">
            <div className="flex items-center gap-2 mb-3.5">
              <User className="w-4 h-4 text-[#E10600]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Perfil Biográfico
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* Edad */}
              <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Edad
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {driver.edad ? `${driver.edad} años` : "—"}
                </span>
              </div>

              {/* Año Debut */}
              <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Debut F1
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {driver.debut_anio ? driver.debut_anio : "—"}
                </span>
              </div>

              {/* Campeonatos Mundiales */}
              <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Mundiales
                </span>
                <div className="flex items-center gap-1.5">
                  {(driver.titulos_mundiales || 0) > 0 && (
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span
                    className={`text-base sm:text-lg font-black font-mono ${
                      (driver.titulos_mundiales || 0) > 0 ? "text-amber-400" : "text-white"
                    }`}
                  >
                    {driver.titulos_mundiales !== undefined ? driver.titulos_mundiales : "—"}
                  </span>
                </div>
              </div>

              {/* Victorias Históricas */}
              <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Victorias
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {driver.victorias_totales !== undefined ? driver.victorias_totales : "—"}
                </span>
              </div>

              {/* Podios Históricos */}
              <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Podios
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {driver.podios_totales !== undefined ? driver.podios_totales : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. SECCIÓN RENDIMIENTO TEMPORADA (DINÁMICOS) */}
          {/* ========================================== */}
          <div className="p-5 sm:p-6 bg-[#15151E]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E10600]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Rendimiento Temporada Actual
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                API + Firebase Sync
              </span>
            </div>

            {loadingStats ? (
              /* Estado de carga con spinner durante 1 segundo */
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center bg-[#1F1F27]/40 rounded-2xl border border-[#2D2D38]">
                <div className="relative w-10 h-10">
                  <div className="w-10 h-10 rounded-full border-4 border-[#2D2D38] border-t-[#E10600] animate-spin" />
                  <Flame className="w-4 h-4 text-[#E10600] absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-wide">
                    Sincronizando rendimiento de temporada...
                  </p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Consultando API pública y Firestore en paralelo
                  </p>
                </div>
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Cuadrícula de Rendimiento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* A. CAMPEONATO */}
                  <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Campeonato Pilotos
                      </span>
                      <Medal className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                          {stats.posicion_campeonato && stats.posicion_campeonato > 0
                            ? `P${stats.posicion_campeonato}`
                            : "—"}
                        </span>
                        <span className="text-xs text-zinc-500 ml-1.5">Posición</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                          {stats.puntos_campeonato !== undefined && stats.puntos_campeonato !== null
                            ? stats.puntos_campeonato
                            : "—"}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1 font-semibold">PTS</span>
                      </div>
                    </div>
                  </div>

                  {/* B. CARRERA: VICTORIAS Y DNFS */}
                  <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Carrera (Año)
                      </span>
                      <Zap className="w-4 h-4 text-[#E10600]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="bg-[#15151E] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                          Victorias
                        </span>
                        <span className="text-xl font-black text-white font-mono">
                          {stats.victorias_anio !== undefined ? stats.victorias_anio : "—"}
                        </span>
                      </div>
                      <div className="bg-[#15151E] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                          Abandonos
                        </span>
                        <span className="text-xl font-black text-rose-400 font-mono">
                          {stats.dnfs_anio !== undefined ? `${stats.dnfs_anio} DNF` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* C. CLASIFICACIÓN: DUELO H2H Y POLES (EXCLUSIVO FIREBASE) */}
                  <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-4 sm:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                          Clasificación (Dato Clave)
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Duelo H2H vs {stats.h2h_qualy?.companero || "Compañero"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          {stats.poles_anio ?? 0} {stats.poles_anio === 1 ? "Pole" : "Poles"}
                        </span>
                      </div>
                    </div>

                    {/* Barra visual de duelo H2H */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-white">
                          {driver.id} {stats.h2h_qualy?.victorias ?? "—"}
                        </span>
                        <span className="text-zinc-500 font-sans text-[11px]">
                          {totalH2H > 0 ? `${h2hWinPct}% efectividad` : "Sin enfrentamientos"}
                        </span>
                        <span className="text-zinc-400">
                          {stats.h2h_qualy?.derrotas ?? "—"} {stats.h2h_qualy?.companeroId || ""}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden flex border border-white/5">
                        <div
                          className="h-full transition-all duration-700"
                          style={{
                            width: `${totalH2H > 0 ? h2hWinPct : 50}%`,
                            backgroundColor: totalH2H > 0 ? teamColor : "#52525b",
                          }}
                        />
                        <div
                          className="h-full bg-zinc-600 transition-all duration-700"
                          style={{ width: `${totalH2H > 0 ? 100 - h2hWinPct : 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Gráfico y Cápsulas de Q1, Q2 y Q3 */}
                    <div className="pt-2 border-t border-[#2D2D38] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                        <span>Frecuencia en Sesiones de Clasificación</span>
                        <span className="text-zinc-500 font-mono">
                          {totalQualys > 0 ? `${totalQualys} GPs` : "—"}
                        </span>
                      </div>

                      {/* Barra segmentada */}
                      <div className="w-full h-3 rounded-full bg-[#15151E] overflow-hidden flex p-0.5 gap-0.5 border border-white/10">
                        {stats.veces_q3 > 0 && (
                          <div
                            style={{ width: `${q3Pct}%` }}
                            className="h-full rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            title={`Q3: ${stats.veces_q3} veces (${q3Pct}%)`}
                          />
                        )}
                        {stats.veces_q2 > 0 && (
                          <div
                            style={{ width: `${q2Pct}%` }}
                            className="h-full rounded-sm bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500"
                            title={`Q2: ${stats.veces_q2} veces (${q2Pct}%)`}
                          />
                        )}
                        {stats.veces_q1 > 0 && (
                          <div
                            style={{ width: `${q1Pct}%` }}
                            className="h-full rounded-sm bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                            title={`Q1: ${stats.veces_q1} veces (${q1Pct}%)`}
                          />
                        )}
                        {totalQualys === 0 && (
                          <div className="w-full h-full bg-zinc-800 rounded-sm" />
                        )}
                      </div>

                      {/* Cápsulas visuales de Q1, Q2 y Q3 */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-[#15151E] border border-emerald-500/30 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                            Q3 Top 10
                          </span>
                          <span className="text-sm font-black text-white font-mono">
                            {stats.veces_q3 !== undefined ? stats.veces_q3 : "—"}{" "}
                            {totalQualys > 0 && (
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({q3Pct}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="bg-[#15151E] border border-sky-500/30 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-sky-400 block uppercase">
                            Q2 Out
                          </span>
                          <span className="text-sm font-black text-white font-mono">
                            {stats.veces_q2 !== undefined ? stats.veces_q2 : "—"}{" "}
                            {totalQualys > 0 && (
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({q2Pct}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="bg-[#15151E] border border-rose-500/30 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-rose-400 block uppercase">
                            Q1 Out
                          </span>
                          <span className="text-sm font-black text-white font-mono">
                            {stats.veces_q1 !== undefined ? stats.veces_q1 : "—"}{" "}
                            {totalQualys > 0 && (
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({q1Pct}%)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* D. RACHA: ÚLTIMAS 3 CARRERAS */}
                  <div className="bg-[#1F1F27]/80 border border-[#2D2D38] rounded-2xl p-4 sm:col-span-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
                      Racha de Resultados (Últimas 3 Carreras)
                    </span>
                    {stats.ultimas_carreras && stats.ultimas_carreras.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {stats.ultimas_carreras.map((c, idx) => (
                          <div
                            key={idx}
                            className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 text-center flex flex-col justify-center items-center shadow-sm"
                          >
                            <span className="text-lg mb-0.5 leading-none">{c.gpBandera || "🏁"}</span>
                            <span
                              className={`text-base font-black font-mono ${
                                c.posicion === 1
                                ? "text-amber-400"
                                : c.posicion === 2
                                ? "text-zinc-300"
                                : c.posicion === 3
                                ? "text-amber-600"
                                : c.posicion === "DNF"
                                ? "text-rose-400"
                                : typeof c.posicion === "number" && c.posicion <= 10
                                ? "text-emerald-400"
                                : "text-zinc-400"
                              }`}
                            >
                              {typeof c.posicion === "number" ? `P${c.posicion}` : (c.posicion || "—")}
                            </span>
                            <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-full">
                              GP {c.gpNombre || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {[1, 2, 3].map((slot) => (
                          <div
                            key={slot}
                            className="bg-[#15151E] border border-[#2D2D38] rounded-xl p-2.5 text-center flex flex-col justify-center items-center opacity-60"
                          >
                            <span className="text-lg mb-0.5 leading-none">🏁</span>
                            <span className="text-base font-black font-mono text-zinc-500">—</span>
                            <span className="text-[10px] text-zinc-600">Sin datos</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No se encontraron estadísticas para este piloto.
              </div>
            )}
          </div>
        </div>

        {/* Barra inferior de acciones si el modal se invoca desde modo selección */}
        {isSelectable && onSelectDriver && (
          <div className="p-4 border-t border-[#2D2D38] bg-[#1F1F27] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-zinc-400">
              ¿Deseas seleccionar a este piloto para tu pronóstico?
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectDriver(driver);
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                isSelected
                  ? "bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700"
                  : "bg-[#E10600] text-white hover:bg-red-600 shadow-[0_0_15px_rgba(225,6,0,0.4)]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSelected ? "Deseleccionar" : "Seleccionar Piloto"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverModal;
