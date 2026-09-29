"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useF1Data } from "@/context/F1DataContext";
import { Trophy, User, Heart, Settings2, Check, Loader2, X } from "lucide-react";

export const UserProfileCard: React.FC = () => {
  const { user, profile, updateFavorites } = useAuth();
  const { pilotos, escuderias, getPiloto, getEscuderia, getColor } = useF1Data();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPiloto, setSelectedPiloto] = useState<string>(
    profile?.piloto_favorito_id || ""
  );
  const [selectedEscuderia, setSelectedEscuderia] = useState<string>(
    profile?.escuderia_favorita_id || ""
  );
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const favPiloto = getPiloto(profile?.piloto_favorito_id);
  const favEscuderia = getEscuderia(profile?.escuderia_favorita_id);

  const handleOpen = () => {
    setSelectedPiloto(profile?.piloto_favorito_id || "");
    setSelectedEscuderia(profile?.escuderia_favorita_id || "");
    setSuccessMsg(false);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateFavorites(
        selectedPiloto || null,
        selectedEscuderia || null
      );
      setSuccessMsg(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(false);
      }, 1000);
    } catch (err) {
      console.error("Error al guardar favoritos:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-[#1F1F27] border border-[#2D2D38] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2D2D38]">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Usuario"}
                className="w-12 h-12 rounded-full ring-2 ring-[#E10600]/40 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#15151E] ring-1 ring-[#2D2D38] flex items-center justify-center text-[#D0D0D2]">
                <User className="w-6 h-6" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {profile?.nombre || user?.displayName || "Piloto"}
              </h2>
              <p className="text-xs text-[#8E8E93]">{user?.email}</p>
            </div>
          </div>

          {/* Puntaje Global */}
          <div className="flex items-center gap-3 bg-[#15151E] border border-[#2D2D38] px-4 py-2 rounded-xl self-start sm:self-auto">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#8E8E93] uppercase tracking-wider font-semibold">
                Puntaje Global
              </p>
              <p className="text-lg font-black text-amber-400 leading-none">
                {profile?.puntaje_global ?? 0}{" "}
                <span className="text-xs font-normal text-[#8E8E93]">pts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Favoritos */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Piloto Favorito */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {favPiloto?.foto_url ? (
                <img
                  src={favPiloto.foto_url}
                  alt={favPiloto.nombre}
                  className="w-10 h-10 rounded-full object-cover border-2"
                  style={{ borderColor: getColor(favPiloto.id) }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white bg-zinc-800 border-2"
                  style={{ borderColor: getColor(favPiloto?.id) }}
                >
                  {favPiloto?.id || <Heart className="w-4 h-4 text-zinc-500" />}
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500 fill-red-500" /> Piloto Favorito
                </p>
                {favPiloto ? (
                  <p className="text-xs font-semibold text-white mt-0.5">
                    {favPiloto.nombre}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-0.5 italic">Sin asignar</p>
                )}
              </div>
            </div>
            {favPiloto && (
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                {favPiloto.id}
              </span>
            )}
          </div>

          {/* Escudería Favorita */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" /> Escudería Favorita
              </p>
              {favEscuderia ? (
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: favEscuderia.color_hex }}
                  />
                  <p className="text-xs font-semibold text-white">
                    {favEscuderia.nombre}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 mt-1 italic">Sin asignar</p>
              )}
            </div>
            {favEscuderia && (
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                {favEscuderia.id}
              </span>
            )}
          </div>
        </div>

        {/* Botón para Configurar */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D0D0D2] hover:text-white bg-[#15151E] hover:bg-[#282832] border border-[#2D2D38] px-3.5 py-1.5 rounded-xl transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#E10600]" />
            <span>Editar Favoritos</span>
          </button>
        </div>
      </div>

      {/* Modal de Selección de Favoritos */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1F1F27] border border-[#2D2D38] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#8E8E93] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">
              Configurar tus Favoritos de F1
            </h3>
            <p className="text-xs text-[#8E8E93] mb-6">
              Selecciona tu piloto y escudería preferida para personalizar tu perfil en el Prode.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Selector de Piloto */}
              <div>
                <label className="block text-xs font-semibold text-[#D0D0D2] mb-1.5">
                  Piloto Favorito
                </label>
                <select
                  value={selectedPiloto}
                  onChange={(e) => setSelectedPiloto(e.target.value)}
                  className="w-full bg-[#15151E] border border-[#2D2D38] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E10600]"
                >
                  <option value="">Selecciona un piloto...</option>
                  {pilotos.map((p) => {
                    const esc = getEscuderia(p.escuderia_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({esc?.nombre || p.escuderia_id})
                      </option>
                    );
                  })}
                </select>

                {/* Previsualización del piloto seleccionado */}
                {selectedPiloto && (
                  <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg bg-black/40 border border-white/5">
                    {getPiloto(selectedPiloto)?.foto_url ? (
                      <img
                        src={getPiloto(selectedPiloto)?.foto_url}
                        alt="Preview"
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                      />
                    ) : null}
                    <div className="text-xs">
                      <span className="font-semibold text-white">
                        {getPiloto(selectedPiloto)?.nombre}
                      </span>
                      <span className="text-zinc-400 block text-[10px]">
                        {getEscuderia(getPiloto(selectedPiloto)?.escuderia_id)?.nombre}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Escudería */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Escudería Favorita
                </label>
                <select
                  value={selectedEscuderia}
                  onChange={(e) => setSelectedEscuderia(e.target.value)}
                  className="w-full bg-[#1a2130] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <option value="">Selecciona una escudería...</option>
                  {escuderias.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} ({e.id})
                    </option>
                  ))}
                </select>
              </div>

              {successMsg && (
                <div className="p-2.5 rounded-lg bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span>Favoritos actualizados con éxito.</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(225,6,0,0.4)]"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
