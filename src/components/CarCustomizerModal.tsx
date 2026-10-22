"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CarModelId,
  CarDesignId,
  CarColors,
  DEFAULT_CAR_CONFIG,
} from "@/types/auth";
import {
  verificarDisponibilidadEscuderia,
  guardarEscuderiaYAuto,
} from "@/lib/firebase/escuderiaService";
import { CustomF1Car } from "./CustomF1Car";
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Palette,
  Flag,
  Car,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface CarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PalettePreset {
  name: string;
  colors: CarColors;
}

const PRESET_PALETTES: PalettePreset[] = [
  {
    name: "Scuderia Rosso",
    colors: {
      colorPrincipal: "#DC0000",
      colorSecundario: "#15151E",
      colorDetalle: "#FFFFFF",
    },
  },
  {
    name: "McLaren Papaya",
    colors: {
      colorPrincipal: "#FF8000",
      colorSecundario: "#15151E",
      colorDetalle: "#00D2BE",
    },
  },
  {
    name: "Red Bull Navy",
    colors: {
      colorPrincipal: "#14192A",
      colorSecundario: "#CC0000",
      colorDetalle: "#FFD700",
    },
  },
  {
    name: "Silver Arrows",
    colors: {
      colorPrincipal: "#D0D0D2",
      colorSecundario: "#00A19B",
      colorDetalle: "#15151E",
    },
  },
  {
    name: "Aston Green",
    colors: {
      colorPrincipal: "#00594F",
      colorSecundario: "#003831",
      colorDetalle: "#CEDC00",
    },
  },
  {
    name: "Williams Royal",
    colors: {
      colorPrincipal: "#002B49",
      colorSecundario: "#041E42",
      colorDetalle: "#00A0DE",
    },
  },
  {
    name: "Lotus Heritage",
    colors: {
      colorPrincipal: "#111111",
      colorSecundario: "#D4AF37",
      colorDetalle: "#FFFFFF",
    },
  },
  {
    name: "Gulf Heritage",
    colors: {
      colorPrincipal: "#7BB1D9",
      colorSecundario: "#F26A36",
      colorDetalle: "#FFFFFF",
    },
  },
];

const CAR_ERAS: { id: CarModelId; label: string; period: string; desc: string }[] = [
  {
    id: "clasico_fangio",
    label: "Época Dorada",
    period: "Años 50",
    desc: "Fuselaje en puro, ruedas de rayos, sin alerones, espíritu de Fangio.",
  },
  {
    id: "retro_senna",
    label: "Era Turbo & Alas",
    period: "Fines 80s / 90s",
    desc: "Alerón trasero gigante, toma de aire dorsal alta, trompa ancha.",
  },
  {
    id: "v10_schumacher",
    label: "Monstruos V10",
    period: "Años 2000s",
    desc: "Nariz afilada en flecha, branquias aerodinámicas y neumáticos con surcos.",
  },
  {
    id: "actual_2026",
    label: "Efecto Suelo & Halo",
    period: "Actualidad",
    desc: "Efecto suelo moderno, protección Halo, llantas 18'' y aerodinámica curva.",
  },
];

const LIVERY_PATTERNS: { id: CarDesignId; label: string; desc: string }[] = [
  {
    id: "diseno_1",
    label: "Racing Stripes",
    desc: "Franjas longitudinales deportivas clásicas.",
  },
  {
    id: "diseno_2",
    label: "Split Arrow",
    desc: "Corte dinámico en flecha con contraste frontal.",
  },
  {
    id: "diseno_3",
    label: "Geometric Tech",
    desc: "Acentos angulares y polígonos de velocidad.",
  },
  {
    id: "diseno_4",
    label: "Aero Accent",
    desc: "Resalte pop en alerones, Halo y difusor.",
  },
];

export const CarCustomizerModal: React.FC<CarCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile, updateEscuderiaProfile } = useAuth();

  // Estados del formulario
  const [nombreEscuderia, setNombreEscuderia] = useState<string>("");
  const [modeloAuto, setModeloAuto] = useState<CarModelId>("actual_2026");
  const [disenoAuto, setDisenoAuto] = useState<CarDesignId>("diseno_1");
  const [coloresAuto, setColoresAuto] = useState<CarColors>({
    colorPrincipal: "#E10600",
    colorSecundario: "#15151E",
    colorDetalle: "#FFFFFF",
  });

  // Etapa activa del configurador (tab)
  const [activeTab, setActiveTab] = useState<"identidad" | "epoca" | "colores">(
    "identidad"
  );

  // Estados de validación de unicidad
  const [checkingName, setCheckingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<
    "idle" | "valid" | "taken" | "invalid"
  >("idle");
  const [nameErrorMsg, setNameErrorMsg] = useState<string>("");

  // Estados de guardado
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar valores al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setNombreEscuderia(profile?.nombre_escuderia || "");
      setModeloAuto(profile?.modeloAuto || DEFAULT_CAR_CONFIG.modeloAuto);
      setDisenoAuto(profile?.disenoAuto || DEFAULT_CAR_CONFIG.disenoAuto);
      setColoresAuto(profile?.coloresAuto || DEFAULT_CAR_CONFIG.coloresAuto);
      setNameStatus(profile?.nombre_escuderia ? "valid" : "idle");
      setNameErrorMsg("");
      setSaveError(null);
      setSaveSuccess(false);
      setActiveTab("identidad");
    }
  }, [isOpen, profile]);

  // Validación de disponibilidad del nombre con debounce
  const handleNameChange = (val: string) => {
    setNombreEscuderia(val);
    setSaveError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length === 0) {
      setNameStatus("idle");
      setNameErrorMsg("");
      return;
    }

    if (trimmed.length < 3) {
      setNameStatus("invalid");
      setNameErrorMsg("Mínimo 3 caracteres");
      return;
    }

    if (trimmed.length > 30) {
      setNameStatus("invalid");
      setNameErrorMsg("Máximo 30 caracteres");
      return;
    }

    // Si coincide con el nombre que ya tiene el usuario actualmente
    if (
      profile?.nombre_escuderia &&
      trimmed.toLowerCase() === profile.nombre_escuderia.toLowerCase()
    ) {
      setNameStatus("valid");
      setNameErrorMsg("");
      return;
    }

    setCheckingName(true);
    setNameStatus("idle");

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await verificarDisponibilidadEscuderia(trimmed, user?.uid);
        if (res.disponible) {
          setNameStatus("valid");
          setNameErrorMsg("");
        } else {
          setNameStatus("taken");
          setNameErrorMsg(res.error || "El nombre de la escudería ya está en uso");
        }
      } catch (err) {
        setNameStatus("invalid");
        setNameErrorMsg("Error al validar el nombre");
      } finally {
        setCheckingName(false);
      }
    }, 400);
  };

  const handleApplyPreset = (preset: PalettePreset) => {
    setColoresAuto({ ...preset.colors });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanName = nombreEscuderia.trim();
    if (cleanName.length < 3) {
      setSaveError("Ingresa un nombre de escudería válido de al menos 3 caracteres.");
      setActiveTab("identidad");
      return;
    }

    if (nameStatus === "taken") {
      setSaveError("El nombre de la escudería ya está en uso.");
      setActiveTab("identidad");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      await guardarEscuderiaYAuto(
        user.uid,
        {
          nombre_escuderia: cleanName,
          modeloAuto,
          disenoAuto,
          coloresAuto,
        },
        profile?.nombre_escuderia
      );

      // Actualizar estado en memoria inmediatamente
      updateEscuderiaProfile({
        nombre_escuderia: cleanName,
        modeloAuto,
        disenoAuto,
        coloresAuto,
      });

      setSaveSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
      }, 900);
    } catch (err: any) {
      console.error("Error al guardar escudería:", err);
      setSaveError(err.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#1A1A23] border border-[#2D2D38] rounded-2xl shadow-2xl relative my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* ENCABEZADO */}
        <div className="px-5 py-4 border-b border-[#2D2D38] flex items-center justify-between bg-[#15151E]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E10600]/20 border border-[#E10600]/40 flex items-center justify-center text-[#E10600]">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Personalizar Escudería & Auto
              </h2>
              <p className="text-[11px] text-[#8E8E93]">
                Define tu identidad única en el Leaderboard de GridProde F1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#242430] hover:bg-[#2F2F3D] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENIDO CON SCROLL */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* VISTA PREVIA INTERACTIVA EN VIVO */}
          <div className="bg-[#121218] border border-[#2A2A36] rounded-2xl p-4 relative overflow-hidden flex flex-col items-center shadow-inner">
            <div className="w-full max-w-md h-32 sm:h-36 flex items-center justify-center">
              <CustomF1Car
                modelo={modeloAuto}
                diseno={disenoAuto}
                colores={coloresAuto}
                showGlow={true}
                className="w-full h-full"
              />
            </div>

            {/* Placa de Identidad de la Escudería */}
            <div className="mt-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#E10600]">
                Escudería Oficial
              </span>
              <p className="text-base sm:text-lg font-black text-white tracking-wide truncate max-w-xs sm:max-w-md">
                {nombreEscuderia.trim() || (
                  <span className="italic text-[#71717A] font-normal">
                    Escudería en Formación
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* TABS DE CONFIGURACIÓN */}
          <div className="grid grid-cols-3 gap-1 bg-[#121218] p-1 rounded-xl border border-[#2D2D38]">
            <button
              type="button"
              onClick={() => setActiveTab("identidad")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "identidad"
                  ? "bg-[#E10600] text-white shadow-md shadow-[#E10600]/30"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>1. Escudería</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("epoca")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "epoca"
                  ? "bg-[#E10600] text-white shadow-md shadow-[#E10600]/30"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>2. Época</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("colores")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "colores"
                  ? "bg-[#E10600] text-white shadow-md shadow-[#E10600]/30"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>3. Livery</span>
            </button>
          </div>

          {/* TAB 1: NOMBRE DE LA ESCUDERÍA (CON VALIDACIÓN DE UNICIDAD) */}
          {activeTab === "identidad" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Nombre de tu Escudería</span>
                    <span className="text-[#E10600]">*</span>
                  </label>
                  <span className="text-[10px] text-[#8E8E93]">
                    {nombreEscuderia.trim().length}/30 caracteres
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={nombreEscuderia}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej. Scuderia Fangio GP, Red Arrow Racing..."
                    maxLength={30}
                    className={`w-full bg-[#121218] border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none transition-all pr-10 ${
                      nameStatus === "valid"
                        ? "border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                        : nameStatus === "taken" || nameStatus === "invalid"
                        ? "border-red-500/70 focus:ring-2 focus:ring-red-500/30"
                        : "border-[#2D2D38] focus:border-[#E10600] focus:ring-2 focus:ring-[#E10600]/20"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {checkingName && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#8E8E93]" />
                    )}
                    {!checkingName && nameStatus === "valid" && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                    {!checkingName &&
                      (nameStatus === "taken" || nameStatus === "invalid") && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                  </div>
                </div>

                {/* Mensaje de estado de disponibilidad */}
                {nameStatus === "valid" && (
                  <p className="mt-1.5 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Nombre disponible para registrar
                  </p>
                )}
                {(nameStatus === "taken" || nameStatus === "invalid") && (
                  <p className="mt-1.5 text-[11px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {nameErrorMsg}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-[#71717A] leading-relaxed">
                  Este nombre debe ser <strong>único</strong> en todo GridProde F1 y
                  reemplazará tu nombre en la tabla general de posiciones (Leaderboard).
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("epoca")}
                  className="inline-flex items-center gap-1.5 bg-[#252532] hover:bg-[#2F2F3E] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <span>Siguiente: Elegir Época</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ETAPA A (ÉPOCA / CHASIS) */}
          {activeTab === "epoca" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-[#8E8E93]">
                Selecciona la silueta histórica del monoplaza para tu escudería:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CAR_ERAS.map((era) => {
                  const isSelected = modeloAuto === era.id;
                  return (
                    <button
                      key={era.id}
                      type="button"
                      onClick={() => setModeloAuto(era.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all relative ${
                        isSelected
                          ? "bg-[#E10600]/10 border-[#E10600] shadow-[0_0_15px_rgba(225,6,0,0.15)]"
                          : "bg-[#15151E] border-[#2D2D38] hover:border-[#3D3D4E] hover:bg-[#1A1A24]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white">
                          {era.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-[#E10600] text-white"
                              : "bg-[#252530] text-[#A1A1AA]"
                          }`}
                        >
                          {era.period}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                        {era.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("identidad")}
                  className="text-xs text-[#8E8E93] hover:text-white font-medium"
                >
                  ← Volver a Escudería
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("colores")}
                  className="inline-flex items-center gap-1.5 bg-[#252532] hover:bg-[#2F2F3E] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <span>Siguiente: Livery & Colores</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ETAPA B (DISEÑO Y COLOR) */}
          {activeTab === "colores" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Selector de Patrón de Livery */}
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  Patrón de Diseño (Livery)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LIVERY_PATTERNS.map((liv) => {
                    const isSelected = disenoAuto === liv.id;
                    return (
                      <button
                        key={liv.id}
                        type="button"
                        onClick={() => setDisenoAuto(liv.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "bg-[#E10600]/15 border-[#E10600] text-white shadow-sm"
                            : "bg-[#15151E] border-[#2D2D38] text-[#8E8E93] hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-bold">{liv.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de 3 Colores HEX */}
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  Paleta Cromática (Carrocería, Patrones y Acentos)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Color Principal */}
                  <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#8E8E93]">
                        Principal
                      </p>
                      <p className="text-xs font-mono font-bold text-white uppercase">
                        {coloresAuto.colorPrincipal}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={coloresAuto.colorPrincipal}
                        onChange={(e) =>
                          setColoresAuto({
                            ...coloresAuto,
                            colorPrincipal: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>

                  {/* Color Secundario */}
                  <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#8E8E93]">
                        Secundario
                      </p>
                      <p className="text-xs font-mono font-bold text-white uppercase">
                        {coloresAuto.colorSecundario}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={coloresAuto.colorSecundario}
                        onChange={(e) =>
                          setColoresAuto({
                            ...coloresAuto,
                            colorSecundario: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>

                  {/* Color Detalle */}
                  <div className="bg-[#15151E] border border-[#2D2D38] p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#8E8E93]">
                        Detalle / Acento
                      </p>
                      <p className="text-xs font-mono font-bold text-white uppercase">
                        {coloresAuto.colorDetalle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={coloresAuto.colorDetalle}
                        onChange={(e) =>
                          setColoresAuto({
                            ...coloresAuto,
                            colorDetalle: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Presets de Paletas Icónicas de F1 */}
              <div>
                <label className="block text-xs font-bold text-[#8E8E93] mb-2">
                  Paletas Clásicas de Carreras (1-clic)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_PALETTES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2 rounded-xl bg-[#15151E] border border-[#2D2D38] hover:border-[#4A4A58] flex items-center gap-2 transition-colors text-left"
                    >
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{
                            backgroundColor: preset.colors.colorPrincipal,
                          }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{
                            backgroundColor: preset.colors.colorSecundario,
                          }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{
                            backgroundColor: preset.colors.colorDetalle,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-white truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MENSAJES DE ERROR O ÉXITO */}
        {saveError && (
          <div className="px-5 py-2.5 bg-red-950/40 border-t border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* PIE CON BOTONES */}
        <div className="p-4 border-t border-[#2D2D38] bg-[#15151E] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-bold text-[#8E8E93] hover:text-white px-3 py-2 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              nameStatus === "taken" ||
              nombreEscuderia.trim().length < 3
            }
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg ${
              saveSuccess
                ? "bg-emerald-600 text-white"
                : nameStatus === "taken" || nombreEscuderia.trim().length < 3
                ? "bg-[#2A2A38] text-[#71717A] cursor-not-allowed"
                : "bg-[#E10600] hover:bg-[#C10500] text-white shadow-[#E10600]/30 hover:scale-[1.02]"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Guardado con éxito!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Guardar Identidad de Escudería</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
