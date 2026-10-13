"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import {
  BADGES_DATA,
  BadgeDefinition,
  calculateBadgeProgress,
  getBadgeProgressValue,
  BadgeTier,
} from "@/data/badgesData";
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Check,
  Crosshair,
  Brain,
  CalendarCheck,
  Flame,
  Sparkles,
  Flag,
  TrendingUp,
  Star,
  HeartHandshake,
  Layers,
  Skull,
  Users,
  ShieldCheck,
  Shuffle,
  Zap,
  Sparkle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

// Mapeo dinámico de íconos representativos
const ICON_MAP: Record<string, React.ElementType> = {
  Crosshair,
  Brain,
  CalendarCheck,
  Flame,
  Sparkles,
  Flag,
  TrendingUp,
  Star,
  HeartHandshake,
  Layers,
  Skull,
  Users,
  ShieldCheck,
  Shuffle,
  Zap,
};

type FilterCategory = "todos" | "desbloqueados" | "bloqueados" | "oro" | "plata" | "bronce";

export const Premios: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [liveBadgesProgress, setLiveBadgesProgress] = useState<Record<string, number> | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // 1. Escuchar actualizaciones en tiempo real de Firestore para badges_progress si el usuario está autenticado
  useEffect(() => {
    if (!db || !user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.badges_progress) {
            setLiveBadgesProgress(data.badges_progress as Record<string, number>);
          }
        }
      },
      (error) => {
        console.warn("No se pudo escuchar badges_progress en tiempo real:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Consumir badges_progress desde el Auth Context (con fallback a la escucha en vivo)
  const currentBadgesProgress: Record<string, number> = useMemo(() => {
    if (liveBadgesProgress) {
      return liveBadgesProgress;
    }
    return profile?.badges_progress || {};
  }, [liveBadgesProgress, profile?.badges_progress]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (err) {
      console.error("Error al refrescar perfil:", err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Calcular el progreso para cada una de las 15 insignias
  const badgeCardItems = useMemo(() => {
    return BADGES_DATA.map((badge) => {
      const rawValue = getBadgeProgressValue(badge, currentBadgesProgress);
      const progressInfo = calculateBadgeProgress(badge, rawValue);
      return {
        badge,
        rawValue,
        progressInfo,
      };
    });
  }, [currentBadgesProgress]);

  // Estadísticas globales del usuario
  const stats = useMemo(() => {
    let unlocked = 0;
    let oroCount = 0;
    let plataCount = 0;
    let bronceCount = 0;
    let totalProgress = 0;

    badgeCardItems.forEach(({ rawValue, progressInfo }) => {
      if (rawValue > 0) {
        unlocked++;
      }
      if (progressInfo.tier === "oro") oroCount++;
      else if (progressInfo.tier === "plata") plataCount++;
      else if (progressInfo.tier === "bronce") bronceCount++;

      totalProgress += progressInfo.progressPercent;
    });

    const completionPercent = Math.round(totalProgress / (BADGES_DATA.length || 1));

    return {
      unlocked,
      total: BADGES_DATA.length,
      oroCount,
      plataCount,
      bronceCount,
      completionPercent,
    };
  }, [badgeCardItems]);

  // Filtrado de insignias por categoría y búsqueda
  const filteredBadges = useMemo(() => {
    return badgeCardItems.filter(({ badge, rawValue, progressInfo }) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = badge.nombre.toLowerCase().includes(query);
        const matchesDesc = badge.descripcion.toLowerCase().includes(query);
        const matchesCat = badge.categoria.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // Filtro por estado
      if (activeFilter === "desbloqueados") return rawValue > 0;
      if (activeFilter === "bloqueados") return rawValue === 0;
      if (activeFilter === "oro") return progressInfo.tier === "oro";
      if (activeFilter === "plata") return progressInfo.tier === "plata";
      if (activeFilter === "bronce") return progressInfo.tier === "bronce";

      return true;
    });
  }, [badgeCardItems, activeFilter, searchQuery]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera Principal */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1F1F27]/90 via-[#181822]/80 to-[#12121A]/90 border border-[#2D2D38] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#E10600]/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-[#ffd700]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] text-xs font-black tracking-wider uppercase">
              <Trophy className="w-3.5 h-3.5" />
              Vitrina Oficial F1
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Vitrina de Trofeos
              <Sparkle className="w-6 h-6 text-amber-400 animate-pulse hidden sm:inline" />
            </h1>
            <p className="text-sm sm:text-base text-[#9E9EA8] max-w-2xl leading-relaxed">
              Consigue puntos, acierta pronósticos y completa desafíos clave en cada Gran Premio para desbloquear los niveles Bronce, Plata y Oro de cada insignia.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Sincronizar progreso de Firebase"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#D0D0D2] bg-[#15151E]/80 hover:bg-[#1F1F27] border border-[#2D2D38] hover:border-white/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#E10600]" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen de Nivel */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          {/* Desbloqueadas */}
          <div className="rounded-2xl bg-[#15151E]/70 border border-[#2D2D38] p-4 flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Desbloqueadas
              </span>
              <Award className="w-4 h-4 text-[#D0D0D2]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.unlocked}</span>
              <span className="text-xs text-[#8E8E93] font-medium">/ {stats.total}</span>
            </div>
          </div>

          {/* Trofeos Bronce */}
          <div className="rounded-2xl bg-[#15151E]/70 border border-[#cd7f32]/40 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_15px_rgba(205,127,50,0.15)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#cd7f32]">
                Nivel Bronce
              </span>
              <Medal className="w-4 h-4 text-[#cd7f32]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#cd7f32]">{stats.bronceCount}</span>
              <span className="text-xs text-[#8E8E93]">conseguidos</span>
            </div>
          </div>

          {/* Trofeos Plata */}
          <div className="rounded-2xl bg-[#15151E]/70 border border-[#c0c0c0]/40 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_15px_rgba(192,192,192,0.15)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#c0c0c0]">
                Nivel Plata
              </span>
              <Medal className="w-4 h-4 text-[#c0c0c0]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#c0c0c0]">{stats.plataCount}</span>
              <span className="text-xs text-[#8E8E93]">conseguidos</span>
            </div>
          </div>

          {/* Trofeos Oro */}
          <div className="rounded-2xl bg-[#15151E]/70 border border-[#ffd700]/50 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffd700]">
                Nivel Oro
              </span>
              <Trophy className="w-4 h-4 text-[#ffd700]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#ffd700]">{stats.oroCount}</span>
              <span className="text-xs text-[#8E8E93]">conseguidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: "todos", label: "Todas (15)" },
              { id: "desbloqueados", label: "Desbloqueadas" },
              { id: "oro", label: "Oro" },
              { id: "plata", label: "Plata" },
              { id: "bronce", label: "Bronce" },
              { id: "bloqueados", label: "Bloqueadas" },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.35)]"
                    : "text-[#8E8E93] hover:text-white bg-[#1F1F27]/70 hover:bg-[#252530] border border-[#2D2D38]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar insignia..."
            className="w-full bg-[#1F1F27]/70 border border-[#2D2D38] focus:border-[#E10600] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8E8E93] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Cuadrícula CSS Grid Responsiva de Tarjetas de Premios */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F27]/50 border border-[#2D2D38] p-12 text-center text-[#8E8E93] space-y-3">
          <Filter className="w-8 h-8 mx-auto text-[#8E8E93]/60" />
          <p className="text-sm font-semibold">No se encontraron insignias con el filtro actual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredBadges.map(({ badge, rawValue, progressInfo }) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              rawValue={rawValue}
              progressInfo={progressInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  rawValue: number;
  progressInfo: ReturnType<typeof calculateBadgeProgress>;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, rawValue, progressInfo }) => {
  const IconComponent = ICON_MAP[badge.icono] || Award;
  const isZero = rawValue === 0;
  const { tier, isLocked } = progressInfo;

  // Lógica de color progresivo requerida:
  // - Si el valor en la base de datos es 0: gris, semitransparente (#6B7280) y con candado
  // - Si el usuario alcanza los umbrales: borde y resplandor (glow) cambian a Bronce (#cd7f32), Plata (#c0c0c0) u Oro (#ffd700).
  const tierColor = progressInfo.color;

  // Clases y estilos de tarjeta según tier
  const cardStyles = useMemo(() => {
    if (isZero) {
      return {
        cardClass:
          "bg-[#171722]/55 border-[#2D2D38] opacity-60 hover:opacity-85 shadow-none",
        borderStyle: "border border-[#2D2D38]",
        glowShadow: "none",
        radialGradient: "none",
        iconBoxClass: "bg-[#1F1F27] border-[#2D2D38] text-[#6B7280]",
        accentBarClass: "bg-[#6B7280]",
      };
    }

    if (tier === "oro") {
      return {
        cardClass: "bg-[#1C1C28]/85",
        borderStyle: "border-2 border-[#ffd700]",
        glowShadow:
          "0 0 25px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.08)",
        radialGradient:
          "radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.22), transparent 70%)",
        iconBoxClass:
          "bg-[#ffd700]/15 border-[#ffd700] text-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.35)]",
        accentBarClass: "bg-[#ffd700]",
      };
    }

    if (tier === "plata") {
      return {
        cardClass: "bg-[#1C1C28]/85",
        borderStyle: "border-2 border-[#c0c0c0]",
        glowShadow:
          "0 0 22px rgba(192, 192, 192, 0.35), inset 0 0 15px rgba(192, 192, 192, 0.06)",
        radialGradient:
          "radial-gradient(ellipse at 50% 0%, rgba(192, 192, 192, 0.18), transparent 70%)",
        iconBoxClass:
          "bg-[#c0c0c0]/15 border-[#c0c0c0] text-[#c0c0c0] shadow-[0_0_15px_rgba(192,192,192,0.3)]",
        accentBarClass: "bg-[#c0c0c0]",
      };
    }

    if (tier === "bronce") {
      return {
        cardClass: "bg-[#1C1C28]/85",
        borderStyle: "border-2 border-[#cd7f32]",
        glowShadow:
          "0 0 22px rgba(205, 127, 50, 0.35), inset 0 0 15px rgba(205, 127, 50, 0.06)",
        radialGradient:
          "radial-gradient(ellipse at 50% 0%, rgba(205, 127, 50, 0.18), transparent 70%)",
        iconBoxClass:
          "bg-[#cd7f32]/15 border-[#cd7f32] text-[#cd7f32] shadow-[0_0_15px_rgba(205,127,50,0.3)]",
        accentBarClass: "bg-[#cd7f32]",
      };
    }

    // 0 < valor < bronce (en camino a bronce)
    return {
      cardClass: "bg-[#1C1C28]/75 opacity-90",
      borderStyle: "border border-[#3D3D4E]",
      glowShadow: "0 0 15px rgba(156, 163, 175, 0.15)",
      radialGradient:
        "radial-gradient(ellipse at 50% 0%, rgba(156, 163, 175, 0.1), transparent 70%)",
      iconBoxClass: "bg-[#1F1F27] border-[#3D3D4E] text-[#D0D0D2]",
      accentBarClass: "bg-[#9CA3AF]",
    };
  }, [isZero, tier]);

  // Pill badge en la esquina
  const tierPill = useMemo(() => {
    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1F1F27] border border-[#2D2D38] text-[#8E8E93]">
          <Lock className="w-3 h-3 text-[#6B7280]" />
          Bloqueado
        </span>
      );
    }
    if (tier === "oro") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ffd700]/15 border border-[#ffd700]/50 text-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.3)]">
          <Trophy className="w-3 h-3 text-[#ffd700]" />
          Nivel Oro
        </span>
      );
    }
    if (tier === "plata") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#c0c0c0]/15 border border-[#c0c0c0]/50 text-[#c0c0c0] shadow-[0_0_10px_rgba(192,192,192,0.25)]">
          <Medal className="w-3 h-3 text-[#c0c0c0]" />
          Nivel Plata
        </span>
      );
    }
    if (tier === "bronce") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#cd7f32]/15 border border-[#cd7f32]/50 text-[#cd7f32] shadow-[0_0_10px_rgba(205,127,50,0.25)]">
          <Medal className="w-3 h-3 text-[#cd7f32]" />
          Nivel Bronce
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1F1F27] border border-[#3D3D4E] text-[#9CA3AF]">
        En Progreso
      </span>
    );
  }, [isZero, tier]);

  return (
    <div
      style={{
        boxShadow: cardStyles.glowShadow,
      }}
      className={`
        relative rounded-2xl p-5 sm:p-6 backdrop-blur-xl transition-all duration-300
        flex flex-col justify-between group overflow-hidden
        ${cardStyles.cardClass}
        ${cardStyles.borderStyle}
      `}
    >
      {/* Resplandor radial de fondo */}
      {cardStyles.radialGradient !== "none" && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ background: cardStyles.radialGradient }}
        />
      )}

      {/* Marca de agua de candado si valor === 0 */}
      {isZero && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="w-7 h-7 rounded-lg bg-black/40 border border-[#2D2D38] flex items-center justify-center text-[#6B7280]">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Parte Superior: Ícono y Categoría / Nivel */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-3">
          {/* Contenedor del Ícono */}
          <div
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-transform duration-300 group-hover:scale-105
              ${cardStyles.iconBoxClass}
            `}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          {/* Pill de Nivel */}
          {!isZero && <div className="shrink-0">{tierPill}</div>}
        </div>

        {/* Nombre y Descripción */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3
              className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                isZero ? "text-[#8E8E93]" : "text-white"
              }`}
            >
              {badge.nombre}
            </h3>
            {tier === "oro" && (
              <Sparkles className="w-4 h-4 text-[#ffd700] shrink-0" />
            )}
          </div>
          <p className="text-xs text-[#9E9EA8] leading-relaxed line-clamp-2">
            {badge.descripcion}
          </p>
        </div>
      </div>

      {/* Parte Inferior: Umbrales y Barra de Progreso Dinámica */}
      <div className="relative z-10 mt-6 pt-4 border-t border-white/5 space-y-3">
        {/* Hitos de Umbrales Bronce / Plata / Oro */}
        <div className="flex items-center justify-between gap-2 text-[10px]">
          {/* Bronce */}
          <div
            className={`flex items-center gap-1 font-bold ${
              rawValue >= badge.umbrales.bronce
                ? "text-[#cd7f32]"
                : "text-[#6B7280]"
            }`}
          >
            {rawValue >= badge.umbrales.bronce ? (
              <Check className="w-3 h-3 text-[#cd7f32]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            )}
            <span>Bronce: {badge.umbrales.bronce}</span>
          </div>

          {/* Plata */}
          <div
            className={`flex items-center gap-1 font-bold ${
              rawValue >= badge.umbrales.plata
                ? "text-[#c0c0c0]"
                : "text-[#6B7280]"
            }`}
          >
            {rawValue >= badge.umbrales.plata ? (
              <Check className="w-3 h-3 text-[#c0c0c0]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            )}
            <span>Plata: {badge.umbrales.plata}</span>
          </div>

          {/* Oro */}
          <div
            className={`flex items-center gap-1 font-bold ${
              rawValue >= badge.umbrales.oro
                ? "text-[#ffd700]"
                : "text-[#6B7280]"
            }`}
          >
            {rawValue >= badge.umbrales.oro ? (
              <Check className="w-3 h-3 text-[#ffd700]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            )}
            <span>Oro: {badge.umbrales.oro}</span>
          </div>
        </div>

        {/* Texto de Progreso Dinámico (ej: '1/3 logrados para Plata') */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <span
            className="truncate max-w-[210px]"
            style={{ color: isZero ? "#8E8E93" : tierColor }}
          >
            {progressInfo.progressText}
          </span>
          <span className="text-[11px] font-bold text-[#8E8E93]">
            {progressInfo.progressPercent}%
          </span>
        </div>

        {/* Barra de Progreso */}
        <div className="h-2 w-full rounded-full bg-[#15151E] overflow-hidden border border-white/5 p-0.5">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(4, progressInfo.progressPercent)}%`,
              backgroundColor: isZero ? "#4A4A5A" : tierColor,
              boxShadow: !isZero ? `0 0 10px ${tierColor}` : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};
