"use client";

import React from "react";
import { useF1Data } from "@/context/F1DataContext";
import { Database, Loader2, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export const AdminSeedCard: React.FC = () => {
  const { escuderias, pilotos, isSeeding, seedStatus, seedFirestore } = useF1Data();

  return (
    <div className="rounded-2xl bg-gradient-to-b from-amber-950/25 via-[#131722]/90 to-[#10141e] border border-amber-500/40 p-6 shadow-xl relative overflow-hidden backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Herramienta de Administración
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Popular Listas Maestras en Firestore
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl">
            Inserta las 11 escuderías y los 22 pilotos oficiales en las colecciones <code>escuderias</code> y <code>pilotos</code> de Firestore, junto con las carreras de prueba.
          </p>
        </div>

        <button
          onClick={seedFirestore}
          disabled={isSeeding}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 self-start sm:self-auto"
        >
          {isSeeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          <span>{isSeeding ? "Populando..." : "Popular en Firestore"}</span>
        </button>
      </div>

      {seedStatus && (
        <div className="mt-4 p-3 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{seedStatus}</span>
        </div>
      )}

      {/* Resumen del Dataset en Memoria / Frontend State */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">
            Escuderías Cargadas
          </p>
          <p className="text-xl font-black text-white">{escuderias.length}</p>
        </div>

        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">
            Pilotos Cargados
          </p>
          <p className="text-xl font-black text-white">{pilotos.length}</p>
        </div>

        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">
            Colección Carreras
          </p>
          <p className="text-xl font-black text-amber-400">grand_prix</p>
        </div>

        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">
            Colección Predicciones
          </p>
          <p className="text-xl font-black text-red-400">predicciones</p>
        </div>
      </div>
    </div>
  );
};
