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
  BadgeProgressInfo,
} from "@/data/badgesData";
import { ThemedTrophy } from "@/components/ThemedTrophy";
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Check,
  Sparkle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  X,
  Target,
} from "lucide-react";

type FilterCategory = "todos" | "desbloqueados" | "bloqueados" | "oro" | "plata" | "bronce";

interface SelectedBadgeItem {
  badge: BadgeDefinition;
  rawValue: number;
  progressInfo: BadgeProgressInfo;
}

export const Premios: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [liveBadgesProgress, setLiveBadgesProgress] = useState<Record<string, number> | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<SelectedBadgeItem | null>(null);

  // Escuchar actualizaciones en tiempo real de Firestore para badges_progress si el usuario está autenticado
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

  // Si hay un modal abierto, actualizar sus datos si cambia badges_progress
  useEffect(() => {
    if (selectedBadge) {
      const updated = badgeCardItems.find((item) => item.badge.id === selectedBadge.badge.id);
      if (updated) {
        setSelectedBadge(updated);
      }
    }
  }, [badgeCardItems]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedBadge(null);
      }
    };
    if (selectedBadge) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBadge]);

  // Estadísticas globales del usuario
  const stats = useMemo(() => {
    let unlocked = 0;
    let oroCount = 0;
    let plataCount = 0;
    let bronceCount = 0;

    badgeCardItems.forEach(({ rawValue, progressInfo }) => {
      if (rawValue > 0) unlocked++;
      if (progressInfo.tier === "oro") oroCount++;
      else if (progressInfo.tier === "plata") plataCount++;
      else if (progressInfo.tier === "bronce") bronceCount++;
    });

    return {
      unlocked,
      total: BADGES_DATA.length,
      oroCount,
      plataCount,
      bronceCount,
    };
  }, [badgeCardItems]);

  // Filtrado de insignias por categoría y búsqueda
  const filteredBadges = useMemo(() => {
    return badgeCardItems.filter(({ badge, rawValue, progressInfo }) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = badge.nombre.toLowerCase().includes(query);
        const matchesDesc = badge.descripcion.toLowerCase().includes(query);
        const matchesCat = badge.categoria.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

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
              Toca cada trofeo para inspeccionar sus requisitos y detalles. Consigue aciertos en cada Gran Premio para evolucionar tus copas de Bronce a Plata y Oro.
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
          <div className="rounded-2xl bg-[#15151E]/70 border border-[#2D2D38] p-4 flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Colección
              </span>
              <Award className="w-4 h-4 text-[#D0D0D2]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.unlocked}</span>
              <span className="text-xs text-[#8E8E93] font-medium">/ {stats.total}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#15151E]/70 border border-[#cd7f32]/40 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_15px_rgba(205,127,50,0.15)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#cd7f32]">
                Bronce
              </span>
              <Medal className="w-4 h-4 text-[#cd7f32]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#cd7f32]">{stats.bronceCount}</span>
              <span className="text-xs text-[#8E8E93]">trofeos</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#15151E]/70 border border-[#c0c0c0]/40 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_15px_rgba(192,192,192,0.15)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#c0c0c0]">
                Plata
              </span>
              <Medal className="w-4 h-4 text-[#c0c0c0]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#c0c0c0]">{stats.plataCount}</span>
              <span className="text-xs text-[#8E8E93]">trofeos</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#15151E]/70 border border-[#ffd700]/50 p-4 flex flex-col justify-between backdrop-blur-md shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffd700]">
                Oro
              </span>
              <Trophy className="w-4 h-4 text-[#ffd700]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#ffd700]">{stats.oroCount}</span>
              <span className="text-xs text-[#8E8E93]">trofeos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: "todos", label: "Todos (15)" },
              { id: "desbloqueados", label: "Desbloqueados" },
              { id: "oro", label: "Oro" },
              { id: "plata", label: "Plata" },
              { id: "bronce", label: "Bronce" },
              { id: "bloqueados", label: "Bloqueados" },
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

        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar trofeo..."
            className="w-full bg-[#1F1F27]/70 border border-[#2D2D38] focus:border-[#E10600] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8E8E93] outline-none transition-colors"
          />
        </div>
      </div>

      {/* 1. Tarjetas Compactas y Minimalistas (Grid Principal) */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F27]/50 border border-[#2D2D38] p-12 text-center text-[#8E8E93] space-y-3">
          <Filter className="w-8 h-8 mx-auto text-[#8E8E93]/60" />
          <p className="text-sm font-semibold">No se encontraron trofeos con el filtro actual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
          {filteredBadges.map(({ badge, rawValue, progressInfo }) => (
            <CompactTrophyCard
              key={badge.id}
              badge={badge}
              rawValue={rawValue}
              progressInfo={progressInfo}
              onClick={() => setSelectedBadge({ badge, rawValue, progressInfo })}
            />
          ))}
        </div>
      )}

      {/* 2 & 3. Modal Interactivo para Inspeccionar Detalles del Trofeo */}
      {selectedBadge && (
        <TrophyDetailModal
          item={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   COMPONENTE: Tarjeta Compacta y Minimalista del Trofeo
   - Cuadrada y minimalista
   - Sin descripción
   - Protagonista: Ícono tematizado grande y centrado
   - Nombre debajo y barra de progreso fina y discreta
   - Clickable con hover:scale-105
   - Color / resplandor: gris/candado para 0, bronce, plata, oro
   ========================================================================= */

interface CompactTrophyCardProps {
  badge: BadgeDefinition;
  rawValue: number;
  progressInfo: BadgeProgressInfo;
  onClick: () => void;
}

const CompactTrophyCard: React.FC<CompactTrophyCardProps> = ({
  badge,
  rawValue,
  progressInfo,
  onClick,
}) => {
  const isZero = rawValue === 0;
  const { tier, color } = progressInfo;

  // Lógica de borde y resplandor según nivel
  const cardStyle = useMemo(() => {
    if (isZero) {
      return {
        borderClass: "border border-[#2D2D38]",
        bgClass: "bg-[#161622]/55 opacity-60 hover:opacity-90",
        shadow: "none",
        radial: "none",
        barColor: "#4B4B58",
      };
    }
    if (tier === "oro") {
      return {
        borderClass: "border-2 border-[#ffd700]",
        bgClass: "bg-[#1D1D2B]/90",
        shadow: "0 0 20px rgba(255, 215, 0, 0.45), inset 0 0 15px rgba(255, 215, 0, 0.08)",
        radial: "radial-gradient(ellipse at 50% 20%, rgba(255, 215, 0, 0.22), transparent 70%)",
        barColor: "#ffd700",
      };
    }
    if (tier === "plata") {
      return {
        borderClass: "border-2 border-[#c0c0c0]",
        bgClass: "bg-[#1D1D2B]/90",
        shadow: "0 0 18px rgba(192, 192, 192, 0.38), inset 0 0 12px rgba(192, 192, 192, 0.06)",
        radial: "radial-gradient(ellipse at 50% 20%, rgba(192, 192, 192, 0.18), transparent 70%)",
        barColor: "#c0c0c0",
      };
    }
    if (tier === "bronce") {
      return {
        borderClass: "border-2 border-[#cd7f32]",
        bgClass: "bg-[#1D1D2B]/90",
        shadow: "0 0 18px rgba(205, 127, 50, 0.38), inset 0 0 12px rgba(205, 127, 50, 0.06)",
        radial: "radial-gradient(ellipse at 50% 20%, rgba(205, 127, 50, 0.18), transparent 70%)",
        barColor: "#cd7f32",
      };
    }
    // En progreso hacia bronce
    return {
      borderClass: "border border-[#3E3E50]",
      bgClass: "bg-[#181824]/85",
      shadow: "0 0 12px rgba(156, 163, 175, 0.18)",
      radial: "radial-gradient(ellipse at 50% 20%, rgba(156, 163, 175, 0.12), transparent 70%)",
      barColor: "#9CA3AF",
    };
  }, [isZero, tier]);

  return (
    <button
      onClick={onClick}
      style={{ boxShadow: cardStyle.shadow }}
      className={`
        relative aspect-square w-full rounded-2xl p-3 sm:p-3.5
        flex flex-col items-center justify-between text-center select-none
        backdrop-blur-xl transition-all duration-300
        hover:scale-105 active:scale-95 group cursor-pointer overflow-hidden
        ${cardStyle.borderClass}
        ${cardStyle.bgClass}
      `}
      title={`Toca para ver detalles de ${badge.nombre}`}
    >
      {/* Resplandor radial interno */}
      {cardStyle.radial !== "none" && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: cardStyle.radial }}
        />
      )}

      {/* Indicador de candado o chip de nivel en la esquina superior */}
      <div className="w-full flex items-center justify-between z-10">
        <span className="text-[9px] font-bold text-[#71717A] tracking-wider uppercase truncate max-w-[70px]">
          {badge.categoria}
        </span>
        {isZero ? (
          <div className="w-5 h-5 rounded-md bg-black/40 border border-[#2D2D38] flex items-center justify-center text-[#71717A]">
            <Lock className="w-3 h-3" />
          </div>
        ) : tier === "oro" ? (
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffd700] shadow-[0_0_8px_#ffd700]" />
        ) : tier === "plata" ? (
          <span className="w-2.5 h-2.5 rounded-full bg-[#c0c0c0] shadow-[0_0_8px_#c0c0c0]" />
        ) : tier === "bronce" ? (
          <span className="w-2.5 h-2.5 rounded-full bg-[#cd7f32] shadow-[0_0_8px_#cd7f32]" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
        )}
      </div>

      {/* Protagonista: Ícono Tematizado Grande y Centrado */}
      <div className="my-auto relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <ThemedTrophy
          badgeId={badge.id}
          tier={tier}
          isZero={isZero}
          className="w-16 h-16 sm:w-20 sm:h-20"
        />
      </div>

      {/* Nombre del Premio y Barra Fina Discreta */}
      <div className="w-full z-10 space-y-1.5 pt-1">
        <p
          className={`text-xs sm:text-[13px] font-black leading-tight tracking-tight truncate ${
            isZero ? "text-[#8E8E93]" : "text-white group-hover:text-amber-300"
          } transition-colors`}
        >
          {badge.nombre}
        </p>

        {/* Barra de progreso muy fina y discreta */}
        <div className="w-full h-1 rounded-full bg-[#101018] overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(3, progressInfo.progressPercent)}%`,
              backgroundColor: cardStyle.barColor,
              boxShadow: !isZero ? `0 0 6px ${cardStyle.barColor}` : "none",
            }}
          />
        </div>
      </div>
    </button>
  );
};

/* =========================================================================
   COMPONENTE: Modal Detallado del Trofeo
   - Centrado en pantalla con estilo oscuro y glassmorphism
   - Ícono del trofeo en tamaño grande
   - Nombre del logro
   - Descripción detallada (literal)
   - Requisitos faltantes para el próximo nivel
   - Desglose de umbrales { bronce, plata, oro }
   - Botón para 'Cerrar'
   ========================================================================= */

interface TrophyDetailModalProps {
  item: SelectedBadgeItem;
  onClose: () => void;
}

const TrophyDetailModal: React.FC<TrophyDetailModalProps> = ({ item, onClose }) => {
  const { badge, rawValue, progressInfo } = item;
  const isZero = rawValue === 0;
  const { tier, color } = progressInfo;

  // Texto explicativo exacto de los requisitos faltantes
  const requirementNotice = useMemo(() => {
    const { bronce, plata, oro } = badge.umbrales;

    if (isZero) {
      return {
        headline: "Trofeo Bloqueado",
        message: `Actualmente tienes 0 aciertos. Necesitas sumar ${bronce} para desbloquear tu primera copa de Bronce.`,
        neededText: `Faltan ${bronce} aciertos para Bronce`,
        targetLabel: `0 / ${bronce}`,
      };
    }

    if (rawValue < bronce) {
      const remaining = bronce - rawValue;
      return {
        headline: "En Camino a Bronce",
        message: `Has conseguido ${rawValue} de los ${bronce} aciertos necesarios para forjar este trofeo en Bronce.`,
        neededText: `Faltan ${remaining} ${remaining === 1 ? "acierto" : "aciertos"} para Bronce`,
        targetLabel: `${rawValue} / ${bronce}`,
      };
    }

    if (rawValue < plata) {
      const remaining = plata - rawValue;
      return {
        headline: "Nivel Bronce Conquistado",
        message: `¡Ya tienes la copa de Bronce! Para ascender al nivel Plata necesitas alcanzar ${plata} aciertos en total.`,
        neededText: `Faltan ${remaining} ${remaining === 1 ? "acierto" : "aciertos"} para Plata`,
        targetLabel: `${rawValue} / ${plata}`,
      };
    }

    if (rawValue < oro) {
      const remaining = oro - rawValue;
      return {
        headline: "Nivel Plata Conquistado",
        message: `¡Impresionante nivel Plata! Para alcanzar la máxima gloria dorada (Oro), necesitas llegar a ${oro} aciertos.`,
        neededText: `Faltan ${remaining} ${remaining === 1 ? "acierto" : "aciertos"} para Oro`,
        targetLabel: `${rawValue} / ${oro}`,
      };
    }

    return {
      headline: "¡Nivel Oro Máximo Alcanzado!",
      message: `Has conquistado el nivel más alto de esta medalla con ${rawValue} aciertos. ¡Eres una leyenda de este logro!`,
      neededText: "¡Objetivo 100% completado!",
      targetLabel: `${rawValue} / ${oro}`,
    };
  }, [badge.umbrales, rawValue, isZero]);

  // Color de borde y glow del modal acorde al nivel
  const modalBorderColor = isZero
    ? "#3F3F46"
    : tier === "oro"
    ? "#ffd700"
    : tier === "plata"
    ? "#c0c0c0"
    : tier === "bronce"
    ? "#cd7f32"
    : "#71717A";

  const modalShadow = isZero
    ? "0 25px 60px rgba(0, 0, 0, 0.8)"
    : `0 0 40px ${color}40, 0 25px 60px rgba(0, 0, 0, 0.8)`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: modalBorderColor,
          boxShadow: modalShadow,
        }}
        className="relative w-full max-w-lg rounded-3xl bg-[#1A1A26]/95 border-2 p-6 sm:p-8 backdrop-blur-2xl text-[#D0D0D2] overflow-hidden shadow-2xl animate-scaleIn space-y-6"
      >
        {/* Resplandor superior decorativo */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: color }}
        />

        {/* Botón Cerrar (X) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#252533] hover:bg-[#323244] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors z-20"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera del Modal: Ícono Tematizado en Gran Tamaño */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <ThemedTrophy
              badgeId={badge.id}
              tier={tier}
              isZero={isZero}
              className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-2xl"
            />
          </div>

          {/* Chip de Estado / Nivel */}
          <div>
            {isZero ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#252533] border border-[#3F3F46] text-[#8E8E93]">
                <Lock className="w-3.5 h-3.5 text-[#71717A]" />
                Bloqueado
              </span>
            ) : tier === "oro" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#ffd700]/15 border border-[#ffd700] text-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.35)]">
                <Trophy className="w-3.5 h-3.5 text-[#ffd700]" />
                Nivel Oro
              </span>
            ) : tier === "plata" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#c0c0c0]/15 border border-[#c0c0c0] text-[#c0c0c0] shadow-[0_0_12px_rgba(192,192,192,0.3)]">
                <Medal className="w-3.5 h-3.5 text-[#c0c0c0]" />
                Nivel Plata
              </span>
            ) : tier === "bronce" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#cd7f32]/15 border border-[#cd7f32] text-[#cd7f32] shadow-[0_0_12px_rgba(205,127,50,0.3)]">
                <Medal className="w-3.5 h-3.5 text-[#cd7f32]" />
                Nivel Bronce
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#252533] border border-[#3E3E50] text-[#9CA3AF]">
                <Target className="w-3.5 h-3.5 text-[#9CA3AF]" />
                En Progreso
              </span>
            )}
          </div>

          {/* Nombre del logro */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {badge.nombre}
          </h2>

          {/* Descripción Detallada (Literal de badgesData.ts) */}
          <div className="w-full bg-[#12121A]/80 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs sm:text-sm text-[#D0D0D8] font-medium leading-relaxed">
              "{badge.descripcion}"
            </p>
          </div>
        </div>

        {/* Sección: Requisitos Faltantes y Progreso */}
        <div className="space-y-3 bg-[#14141E]/70 border border-white/5 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {requirementNotice.headline}
            </span>
            <span className="font-black text-[#8E8E93]" style={{ color: !isZero ? color : undefined }}>
              {requirementNotice.targetLabel}
            </span>
          </div>

          <p className="text-xs text-[#9E9EA8] leading-relaxed">
            {requirementNotice.message}
          </p>

          {/* Barra de progreso */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#8E8E93]">
              <span style={{ color: !isZero ? color : undefined }}>
                {requirementNotice.neededText}
              </span>
              <span>{progressInfo.progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#0D0D14] overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(4, progressInfo.progressPercent)}%`,
                  backgroundColor: isZero ? "#4B4B58" : color,
                  boxShadow: !isZero ? `0 0 10px ${color}` : "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Hitos de Umbrales Bronce / Plata / Oro */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          {/* Bronce */}
          <div
            className={`rounded-xl p-2.5 border transition-all ${
              rawValue >= badge.umbrales.bronce
                ? "bg-[#cd7f32]/10 border-[#cd7f32]/50 text-[#cd7f32]"
                : "bg-[#14141E] border-[#2D2D38] text-[#71717A]"
            }`}
          >
            <div className="flex items-center justify-center gap-1 font-bold">
              {rawValue >= badge.umbrales.bronce && <Check className="w-3.5 h-3.5 text-[#cd7f32]" />}
              <span>Bronce</span>
            </div>
            <p className="text-sm font-black mt-0.5">{badge.umbrales.bronce} aciertos</p>
          </div>

          {/* Plata */}
          <div
            className={`rounded-xl p-2.5 border transition-all ${
              rawValue >= badge.umbrales.plata
                ? "bg-[#c0c0c0]/10 border-[#c0c0c0]/50 text-[#c0c0c0]"
                : "bg-[#14141E] border-[#2D2D38] text-[#71717A]"
            }`}
          >
            <div className="flex items-center justify-center gap-1 font-bold">
              {rawValue >= badge.umbrales.plata && <Check className="w-3.5 h-3.5 text-[#c0c0c0]" />}
              <span>Plata</span>
            </div>
            <p className="text-sm font-black mt-0.5">{badge.umbrales.plata} aciertos</p>
          </div>

          {/* Oro */}
          <div
            className={`rounded-xl p-2.5 border transition-all ${
              rawValue >= badge.umbrales.oro
                ? "bg-[#ffd700]/10 border-[#ffd700]/50 text-[#ffd700]"
                : "bg-[#14141E] border-[#2D2D38] text-[#71717A]"
            }`}
          >
            <div className="flex items-center justify-center gap-1 font-bold">
              {rawValue >= badge.umbrales.oro && <Check className="w-3.5 h-3.5 text-[#ffd700]" />}
              <span>Oro</span>
            </div>
            <p className="text-sm font-black mt-0.5">{badge.umbrales.oro} aciertos</p>
          </div>
        </div>

        {/* Botón para Cerrar */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#252533] hover:bg-[#323244] border border-[#3E3E50] hover:border-white/20 text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg active:scale-98"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
