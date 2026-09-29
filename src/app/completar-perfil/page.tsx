"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { DriverGrid } from "@/components/DriverGrid";
import { Piloto } from "@/types/f1";
import {
  Trophy,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  Heart,
} from "lucide-react";

export default function CompletarPerfilPage() {
  const { user, profile, loading, updateFavorites } = useAuth();
  const { getPiloto, getEscuderia, escuderias } = useF1Data();
  const router = useRouter();

  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedEscuderiaId, setSelectedEscuderiaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirección si no está logueado o si ya tiene el perfil completo
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (profile?.piloto_favorito_id && profile?.escuderia_favorita_id) {
        // Si ya completó su perfil previamente, no necesita estar aquí
        router.replace("/dashboard");
      }
    }
  }, [user, profile, loading, router]);

  const handleSelectDriver = (driver: Piloto) => {
    setSelectedDriverId(driver.id);
    // Preseleccionar automáticamente la escudería de ese piloto
    setSelectedEscuderiaId(driver.escuderia_id);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!selectedDriverId || !selectedEscuderiaId) {
      setErrorMsg("Debes seleccionar un piloto y una escudería para continuar.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      await updateFavorites(selectedDriverId, selectedEscuderiaId);
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Error al completar perfil:", err);
      setErrorMsg("Ocurrió un error al guardar tu selección. Intenta de nuevo.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#15151E] flex flex-col items-center justify-center text-[#D0D0D2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E10600]" />
      </div>
    );
  }

  const chosenDriver = getPiloto(selectedDriverId);
  const chosenTeam = getEscuderia(selectedEscuderiaId);

  return (
    <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
      {/* Barra superior minimalista */}
      <header className="border-b border-[#2D2D38] bg-[#15151E]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E10600] flex items-center justify-center text-white shadow-[0_0_15px_rgba(225,6,0,0.4)]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-white text-base tracking-tight">
                GRID<span className="text-[#E10600]">PRODE</span>
              </span>
              <span className="ml-1.5 bg-[#E10600]/20 text-[#E10600] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E10600]/30">
                F1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
            <span>Hola,</span>
            <span className="font-semibold text-white truncate max-w-[150px]">
              {user?.displayName || user?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 pb-32">
        {/* Cabecera de bienvenida / Onboarding */}
        <div className="bg-[#1F1F27] border border-[#2D2D38] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-[#E10600] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Paso Obligatorio &bull; Configuración Inicial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Elige a tu Piloto y Escudería Favorita
          </h1>
          <p className="text-sm text-[#8E8E93] max-w-2xl mt-1">
            Antes de acceder al panel de predicciones, personaliza tu perfil de competidor seleccionando tu piloto y constructor predilecto de la temporada.
          </p>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-[#E10600]/50 text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Sección 1: Selección con DriverGrid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Parrilla de Pilotos Oficiales (Haz clic para seleccionar)</span>
            </h2>
            <span className="text-xs text-[#8E8E93]">22 pilotos disponibles</span>
          </div>

          <DriverGrid
            selectedDriverId={selectedDriverId}
            onSelectDriver={handleSelectDriver}
            selectable={true}
          />
        </div>

        {/* Sección 2: Ajuste de Escudería si desea otra */}
        {selectedDriverId && (
          <div className="bg-[#1F1F27] border border-[#2D2D38] rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-bold text-white">
                Escudería Favorita
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Se preseleccionó la escudería de tu piloto, pero puedes elegir cualquier otra si lo deseas:
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {escuderias.map((esc) => {
                const isSelected = selectedEscuderiaId === esc.id;
                return (
                  <button
                    key={esc.id}
                    type="button"
                    onClick={() => setSelectedEscuderiaId(esc.id)}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border text-left transition-all
                      ${
                        isSelected
                          ? "bg-[#15151E] border-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.3)] ring-1 ring-[#E10600]"
                          : "bg-[#15151E]/60 border-[#2D2D38] text-[#D0D0D2] hover:border-white/20"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: esc.color_hex }}
                      />
                      <span className="text-xs font-semibold">{esc.nombre}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#E10600] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Barra flotante inferior de confirmación */}
      <div className="fixed bottom-0 inset-x-0 bg-[#15151E]/95 border-t border-[#2D2D38] backdrop-blur-md p-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Resumen de la Selección */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8E8E93]">Piloto:</span>
              {chosenDriver ? (
                <div className="flex items-center gap-1.5 font-bold text-white bg-[#1F1F27] px-2.5 py-1 rounded-lg border border-[#2D2D38]">
                  {chosenDriver.foto_url && (
                    <img
                      src={chosenDriver.foto_url}
                      alt={chosenDriver.nombre}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <span>{chosenDriver.nombre}</span>
                  <span className="text-[10px] text-[#8E8E93]">({chosenDriver.id})</span>
                </div>
              ) : (
                <span className="text-[#8E8E93] italic">Sin seleccionar</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8E8E93]">Escudería:</span>
              {chosenTeam ? (
                <div className="flex items-center gap-1.5 font-bold text-white bg-[#1F1F27] px-2.5 py-1 rounded-lg border border-[#2D2D38]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: chosenTeam.color_hex }}
                  />
                  <span>{chosenTeam.nombre}</span>
                </div>
              ) : (
                <span className="text-[#8E8E93] italic">Sin seleccionar</span>
              )}
            </div>
          </div>

          {/* Botón de Confirmación */}
          <button
            onClick={handleSave}
            disabled={!selectedDriverId || !selectedEscuderiaId || saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#E10600] hover:bg-[#B80500] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_0_20px_rgba(225,6,0,0.4)]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {saving ? "Guardando..." : "Confirmar y Entrar al Dashboard"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
