"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useF1Data } from "@/context/F1DataContext";
import { getCurrentActiveGpId } from "@/data/circuits";
import { CircuitTrackSilhouette } from "@/components/CircuitTrackSilhouette";
import { getCircuitImageUrl } from "@/data/f1InitialData";
import { GrandPrix } from "@/types/f1";
import {
  Timer,
  Brain,
  Gamepad2,
  Play,
  Sparkles,
  Zap,
  HelpCircle,
  Gauge,
  Flag,
} from "lucide-react";

export default function MinijuegosHubPage() {
  const { grandPrixList } = useF1Data();

  // Carrera Activa: consultar el próximo Gran Premio activo ('EN CURSO' o 'PRÓXIMO')
  // utilizando la misma lógica de la pantalla de Inicio
  const carreraActiva: GrandPrix | null = useMemo(() => {
    if (!grandPrixList || grandPrixList.length === 0) return null;
    const recommendedId = getCurrentActiveGpId();
    const byId = grandPrixList.find((g) => g.id === recommendedId);
    if (byId) return byId;
    const upcoming = grandPrixList.find(
      (g) => g.estado === "proximo" || g.estado === "en_curso"
    );
    return upcoming || grandPrixList[0];
  }, [grandPrixList]);

  const games = useMemo(
    () => [
      {
        id: "semaforo",
        title: "Semáforo de Largada",
        subtitle: "Test de Reflejos FIA F1",
        description:
          "Pon a prueba tu tiempo de reacción frente a las 5 luces rojas oficiales. Espera a que se enciendan una por una y lánzate apenas se apaguen sin cometer Jump Start.",
        href: "/minijuegos/semaforo",
        icon: Timer,
        badgeIcon: Zap,
        badgeText: "Reflejos en ms",
        accentColor: "#E10600",
        glowClass:
          "hover:border-[#E10600]/60 hover:shadow-[0_0_35px_rgba(225,6,0,0.2)]",
        buttonClass:
          "bg-[#E10600] hover:bg-[#b80500] text-white shadow-[0_0_20px_rgba(225,6,0,0.4)]",
      },
      {
        id: "trivia",
        title: "Trivia Semanal",
        subtitle: "Desafío Contrarreloj • 5 Preguntas",
        description:
          "Demuestra cuánto sabes de la historia y actualidad de la Fórmula 1. Responde 5 preguntas de opción múltiple con un reloj límite de 15 segundos por pregunta.",
        href: "/minijuegos/trivia",
        icon: Brain,
        badgeIcon: HelpCircle,
        badgeText: "15s por pregunta",
        accentColor: "#F59E0B",
        glowClass:
          "hover:border-amber-500/60 hover:shadow-[0_0_35px_rgba(245,158,11,0.2)]",
        buttonClass:
          "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]",
      },
      {
        id: "vuelta",
        title: "Vuelta Rápida",
        subtitle: `Precisión en Apex • ${carreraActiva?.nombre || "Gran Premio"}`,
        description: `Domina los APEX de ${carreraActiva?.circuito || carreraActiva?.nombre || "la pista oficial"} en una vuelta lanzada de 10 segundos. Disponible de lunes a jueves con 5 intentos por semana.`,
        href: carreraActiva ? `/minijuegos/vuelta?gp=${carreraActiva.id}` : "/minijuegos/vuelta",
        icon: Gauge,
        badgeIcon: Flag,
        badgeText: "5 intentos / semana",
        accentColor: "#06B6D4",
        glowClass:
          "hover:border-cyan-500/60 hover:shadow-[0_0_35px_rgba(6,182,212,0.2)]",
        buttonClass:
          "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]",
      },
    ],
    [carreraActiva]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
          {/* Encabezado del Hub */}
          <div className="relative overflow-hidden rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#E10600]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600]/15 border border-[#E10600]/30 text-[#E10600] text-xs font-black uppercase tracking-wider">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Zona Arcade • GridProde F1</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Hub de <span className="text-[#E10600]">Minijuegos</span>
                </h1>
                <p className="text-sm sm:text-base text-[#8E8E93] leading-relaxed">
                  Entrena tus reflejos de largada y pon a prueba tu conocimiento
                  del Gran Circo entre cada fin de semana de carrera.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#15151E]/90 border border-white/10 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">
                    3 Modos Disponibles
                  </p>
                  <p className="text-[11px] text-[#8E8E93]">
                    Compite cada semana de GP
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grilla de Tarjetas Grandes de Juegos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {games.map((game) => {
              const Icon = game.icon;
              const BadgeIcon = game.badgeIcon;
              return (
                <div
                  key={game.id}
                  className={`group relative rounded-3xl bg-[#1F1F27]/75 backdrop-blur-xl border border-white/10 p-7 sm:p-9 flex flex-col justify-between transition-all duration-300 shadow-xl ${game.glowClass}`}
                >
                  {/* Luz ambiental superior */}
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-15 group-hover:opacity-30 transition-opacity pointer-events-none"
                    style={{ backgroundColor: game.accentColor }}
                  />

                  <div className="space-y-5 relative z-10">
                    {/* Fila superior: Ícono principal + Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: `${game.accentColor}20`,
                          borderColor: `${game.accentColor}50`,
                          color: game.accentColor,
                        }}
                      >
                        <Icon className="w-8 h-8" />
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15151E]/90 border border-white/10 text-xs font-bold text-[#D0D0D2]">
                        <BadgeIcon
                          className="w-3.5 h-3.5"
                          style={{ color: game.accentColor }}
                        />
                        {game.badgeText}
                      </span>
                    </div>

                    {/* Textos del juego */}
                    <div className="space-y-2">
                      <p
                        className="text-xs font-black uppercase tracking-widest truncate"
                        style={{ color: game.accentColor }}
                      >
                        {game.subtitle}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {game.title}
                      </h2>
                      <p className="text-sm text-[#8E8E93] leading-relaxed pt-1">
                        {game.description}
                      </p>
                    </div>

                    {/* Trazado / Silueta Oficial del Circuito Activo para Vuelta Rápida */}
                    {game.id === "vuelta" && carreraActiva && (
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover:border-cyan-500/40 transition-colors">
                        <div className="w-full flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{carreraActiva.bandera}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                              Circuito Activo
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                            Semana de GP
                          </span>
                        </div>

                        <div className="h-24 w-full flex items-center justify-center py-1">
                          <CircuitTrackSilhouette
                            silueta={getCircuitImageUrl(carreraActiva)}
                            titulo={carreraActiva.nombre}
                            bandera={carreraActiva.bandera}
                            size="md"
                            className="max-h-full drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          />
                        </div>

                        <span className="text-[11px] font-bold text-white/90 truncate max-w-full text-center mt-1">
                          {carreraActiva.circuito || carreraActiva.nombre}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botón de Acción */}
                  <div className="pt-6 mt-6 border-t border-white/10 relative z-10">
                    <Link
                      href={game.href}
                      className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${game.buttonClass}`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Jugar</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
