"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import { UserProfileCard } from "@/components/UserProfileCard";
import { GrandPrixCard } from "@/components/GrandPrixCard";
import { AdminSeedCard } from "@/components/AdminSeedCard";
import { DriverGrid } from "@/components/DriverGrid";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import {
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Ticket,
  Medal,
  ShieldAlert,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <DashboardContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, role } = useAuth();
  const { pilotos, grandPrixList } = useF1Data();
  const isAdmin =
    role === "Administrador" || isEmailInInitialAdmins(user?.email);

  const [showCatalog, setShowCatalog] = useState(true);

  return (
    <div className="space-y-8">
      {/* 1. Tarjeta de Perfil del Usuario: Nombre, Puntaje Global, Favoritos */}
      <UserProfileCard />

      {/* Accesos rápidos a Mis Pronósticos, Ranking y Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/mis-pronosticos"
          className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] hover:border-[#E10600]/50 p-4 flex items-center gap-3.5 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600] group-hover:bg-[#E10600] group-hover:text-white transition-colors">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Mis Pronósticos</p>
            <p className="text-xs text-[#8E8E93]">
              Revisa tus tickets guardados en Firestore
            </p>
          </div>
        </Link>

        <Link
          href="/ranking"
          className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] hover:border-amber-500/50 p-4 flex items-center gap-3.5 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
            <Medal className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Leaderboard Global</p>
            <p className="text-xs text-[#8E8E93]">
              Tabla de posiciones y desglose por GP
            </p>
          </div>
        </Link>

        {isAdmin ? (
          <Link
            href="/admin"
            className="rounded-2xl bg-[#1F1F27] border border-[#E10600]/40 hover:border-[#E10600] p-4 flex items-center gap-3.5 transition-all group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center text-white shadow-[0_0_15px_rgba(225,6,0,0.4)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-white">
                Panel Administrador
              </p>
              <p className="text-xs text-[#8E8E93]">
                Cargar Resultados Oficiales y calcular puntos
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-4 flex items-center gap-3.5 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-[#15151E] border border-[#2D2D38] flex items-center justify-center text-[#8E8E93]">
              <Calendar className="w-5 h-5 text-[#E10600]" />
            </div>
            <div>
              <p className="text-sm font-black text-white">
                Inicio en GP de Singapur
              </p>
              <p className="text-xs text-[#8E8E93]">
                Calendario filtrado con fecha del sistema
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Herramienta de Admin para Popular Firestore si es Administrador */}
      {isAdmin && <AdminSeedCard />}

      {/* 3. Sección de Grand Prix & Pronósticos (Desde GP de Singapur) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#E10600]" />
              <span>Calendario de Pronósticos (Desde GP de Singapur)</span>
            </h2>
            <p className="text-xs text-[#8E8E93]">
              Los Grandes Premios anteriores a Singapur están ocultos. Completa
              el Wizard paso a paso hasta 60 minutos antes de la Qualy.
            </p>
          </div>
          <span className="text-xs text-[#8E8E93] bg-[#1F1F27] border border-[#2D2D38] px-3 py-1 rounded-xl self-start sm:self-auto font-mono">
            {grandPrixList.length} carreras disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grandPrixList.map((gp) => (
            <GrandPrixCard key={gp.id} gp={gp} />
          ))}
        </div>
      </div>

      {/* 4. DriverGrid: Parrilla Oficial F1 con tarjetas cuadradas y borde de 3px */}
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E10600]/10 flex items-center justify-center text-[#E10600]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Parrilla Oficial F1 ({pilotos.length} Pilotos en DriverGrid)
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Retratos oficiales de formula1.com (fondo transparente) con
                borde de 3px según el color de cada escudería.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1 text-xs font-semibold text-[#D0D0D2] hover:text-white bg-[#15151E] px-3.5 py-1.5 rounded-xl border border-[#2D2D38] transition-colors"
          >
            <span>{showCatalog ? "Ocultar DriverGrid" : "Ver DriverGrid"}</span>
            {showCatalog ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showCatalog && <DriverGrid selectable={false} />}
      </div>
    </div>
  );
}
