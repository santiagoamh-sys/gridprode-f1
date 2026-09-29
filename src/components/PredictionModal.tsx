"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { GrandPrix, RespuestasPrediccion } from "@/types/f1";
import { guardarPrediccion, getPrediccionUsuario } from "@/lib/firebase/f1Service";
import { X, Check, Loader2, Sparkles, Zap, ShieldCheck } from "lucide-react";

interface PredictionModalProps {
  gp: GrandPrix;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({
  gp,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const { pilotos, escuderias, getEscuderia } = useF1Data();

  const [form, setForm] = useState<RespuestasPrediccion>({
    q1: "",
    q2: "",
    q3: "",
    p1: "",
    p2: "",
    p3: "",
    dnf: "",
    vuelta_rapida: "",
    piloto_del_dia: "",
    escuderia: "",
    posicion_colapinto: null,
    sprintPole: "",
    sprintP1: "",
    sprintP2: "",
    sprintP3: "",
  });

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    const loadPrediction = async () => {
      try {
        setLoadingInitial(true);
        const p = await getPrediccionUsuario(user.uid, gp.id);
        if (p?.respuestas) {
          setForm({
            q1: p.respuestas.q1 || "",
            q2: p.respuestas.q2 || "",
            q3: p.respuestas.q3 || "",
            p1: p.respuestas.p1 || "",
            p2: p.respuestas.p2 || "",
            p3: p.respuestas.p3 || "",
            dnf: (Array.isArray(p.respuestas.dnf) ? p.respuestas.dnf[0] : p.respuestas.dnf) || "",
            vuelta_rapida: p.respuestas.vuelta_rapida || "",
            piloto_del_dia: p.respuestas.piloto_del_dia || "",
            escuderia: p.respuestas.escuderia || "",
            posicion_colapinto: p.respuestas.posicion_colapinto ?? null,
            sprintPole: p.respuestas.sprintPole || "",
            sprintP1: p.respuestas.sprintP1 || "",
            sprintP2: p.respuestas.sprintP2 || "",
            sprintP3: p.respuestas.sprintP3 || "",
          });
        }
      } catch (err) {
        console.error("Error al cargar predicción previa:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadPrediction();
  }, [isOpen, user, gp.id]);

  if (!isOpen) return null;

  const handleChange = (field: keyof RespuestasPrediccion, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      const cleanedRespuestas: RespuestasPrediccion = {
        q1: form.q1 || null,
        q2: form.q2 || null,
        q3: form.q3 || null,
        p1: form.p1 || null,
        p2: form.p2 || null,
        p3: form.p3 || null,
        dnf: form.dnf || null,
        vuelta_rapida: form.vuelta_rapida || null,
        piloto_del_dia: form.piloto_del_dia || null,
        escuderia: form.escuderia || null,
        posicion_colapinto:
          form.posicion_colapinto !== null && form.posicion_colapinto !== undefined && form.posicion_colapinto !== ("" as any)
            ? Number(form.posicion_colapinto)
            : null,
      };

      if (gp.isSprint) {
        cleanedRespuestas.sprintPole = form.sprintPole || null;
        cleanedRespuestas.sprintP1 = form.sprintP1 || null;
        cleanedRespuestas.sprintP2 = form.sprintP2 || null;
        cleanedRespuestas.sprintP3 = form.sprintP3 || null;
      }

      await guardarPrediccion(user.uid, gp.id, cleanedRespuestas);
      setSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error al enviar predicción:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121722] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg sm:text-xl font-black text-white">
              Pronósticos &bull; {gp.nombre}
            </h3>
            {gp.isSprint && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">
                <Zap className="w-3 h-3" /> Sprint
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Completa tus predicciones oficiales. Tu ID de usuario (
            <code className="text-zinc-300">{user?.uid.slice(0, 8)}...</code>) se vinculará con este Grand Prix.
          </p>
        </div>

        {loadingInitial ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span className="text-xs">Cargando pronósticos anteriores...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección 1: Clasificación (Qualy Top 3) */}
            <div className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                1. Clasificación Oficial (Top 3 Qualy)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Q1 / Pole Position (P1)
                  </label>
                  <select
                    value={form.q1 || ""}
                    onChange={(e) => handleChange("q1", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Q2 / P2 Qualy
                  </label>
                  <select
                    value={form.q2 || ""}
                    onChange={(e) => handleChange("q2", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Q3 / P3 Qualy
                  </label>
                  <select
                    value={form.q3 || ""}
                    onChange={(e) => handleChange("q3", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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

            {/* Sección Sprint si isSprint es true */}
            {gp.isSprint && (
              <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 2. Pronósticos Sprint
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                      Sprint Pole
                    </label>
                    <select
                      value={form.sprintPole || ""}
                      onChange={(e) => handleChange("sprintPole", e.target.value)}
                      className="w-full bg-[#1a2130] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                    <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                      Sprint P1 (Ganador)
                    </label>
                    <select
                      value={form.sprintP1 || ""}
                      onChange={(e) => handleChange("sprintP1", e.target.value)}
                      className="w-full bg-[#1a2130] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                    <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                      Sprint P2
                    </label>
                    <select
                      value={form.sprintP2 || ""}
                      onChange={(e) => handleChange("sprintP2", e.target.value)}
                      className="w-full bg-[#1a2130] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                    <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                      Sprint P3
                    </label>
                    <select
                      value={form.sprintP3 || ""}
                      onChange={(e) => handleChange("sprintP3", e.target.value)}
                      className="w-full bg-[#1a2130] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
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

            {/* Sección 3: Podio de Carrera (P1, P2, P3) */}
            <div className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                {gp.isSprint ? "3." : "2."} Podio de Carrera Principal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    P1 (Ganador GP)
                  </label>
                  <select
                    value={form.p1 || ""}
                    onChange={(e) => handleChange("p1", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    P2 (Segundo Lugar)
                  </label>
                  <select
                    value={form.p2 || ""}
                    onChange={(e) => handleChange("p2", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    P3 (Tercer Lugar)
                  </label>
                  <select
                    value={form.p3 || ""}
                    onChange={(e) => handleChange("p3", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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

            {/* Sección 4: Extras (Vuelta Rápida, DNF, Piloto del Día, Escudería, Posición Colapinto) */}
            <div className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                {gp.isSprint ? "4." : "3."} Aciertos Especiales
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Vuelta Rápida
                  </label>
                  <select
                    value={form.vuelta_rapida || ""}
                    onChange={(e) => handleChange("vuelta_rapida", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Piloto del Día (DOTD)
                  </label>
                  <select
                    value={form.piloto_del_dia || ""}
                    onChange={(e) => handleChange("piloto_del_dia", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Escudería Ganadora / Destacada
                  </label>
                  <select
                    value={form.escuderia || ""}
                    onChange={(e) => handleChange("escuderia", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {escuderias.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} ({e.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    DNF (Retiro)
                  </label>
                  <select
                    value={(Array.isArray(form.dnf) ? form.dnf[0] : form.dnf) || ""}
                    onChange={(e) => handleChange("dnf", e.target.value)}
                    className="w-full bg-[#1a2130] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">Seleccionar piloto...</option>
                    {pilotos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.escuderia_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    🇦🇷 Posición Franco Colapinto (1 - 22)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    placeholder="Ej. 8 (o vacío si DNF)"
                    value={form.posicion_colapinto ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "posicion_colapinto",
                        e.target.value === "" ? null : parseInt(e.target.value)
                      )
                    }
                    className="w-full bg-[#1a2130] border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {success && (
              <div className="p-3 rounded-xl bg-green-950/70 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>¡Predicción guardada exitosamente en Firestore!</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-[0_0_15px_rgba(225,6,0,0.4)] flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? "Guardando..." : "Guardar Predicción"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
