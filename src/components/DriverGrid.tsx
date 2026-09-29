"use client";

import React from "react";
import Image from "next/image";
import { Piloto } from "@/types/f1";
import { useF1Data } from "@/context/F1DataContext";
import { Check, User, Ban } from "lucide-react";

export interface DriverBadgeInfo {
  label: string;
  bgClass?: string;
}

interface DriverGridProps {
  selectedDriverId?: string | null;
  selectedDriverIds?: string[];
  excludedDriverIds?: string[];
  hideExcluded?: boolean;
  maxSelections?: number;
  driverBadges?: Record<string, DriverBadgeInfo>;
  onSelectDriver?: (driver: Piloto) => void;
  selectable?: boolean;
  compact?: boolean;
}

export const DriverGrid: React.FC<DriverGridProps> = ({
  selectedDriverId,
  selectedDriverIds = [],
  excludedDriverIds = [],
  hideExcluded = false,
  maxSelections,
  driverBadges = {},
  onSelectDriver,
  selectable = true,
  compact = false,
}) => {
  const { pilotos, getEscuderia } = useF1Data();

  const excludedSet = new Set(excludedDriverIds);
  const selectedSet = new Set(
    selectedDriverIds.length > 0
      ? selectedDriverIds
      : selectedDriverId
      ? [selectedDriverId]
      : []
  );

  const visiblePilotos = hideExcluded
    ? pilotos.filter((p) => !excludedSet.has(p.id))
    : pilotos;

  const isMaxReached =
    typeof maxSelections === "number" && selectedSet.size >= maxSelections;

  return (
    <div
      className={`grid ${
        compact
          ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5"
      }`}
    >
      {visiblePilotos.map((p) => {
        const escuderia = getEscuderia(p.escuderia_id);
        const teamColor = escuderia?.color_hex || "#3671C6";
        const isSelected = selectedSet.has(p.id);
        const isExcluded = excludedSet.has(p.id);
        const badge = driverBadges[p.id];

        const canClick =
          selectable && !isExcluded && (!isMaxReached || isSelected);

        return (
          <div
            key={p.id}
            onClick={() => {
              if (selectable && !isExcluded) {
                onSelectDriver?.(p);
              }
            }}
            style={{
              borderColor: isExcluded ? "#2D2D38" : teamColor,
            }}
            className={`
              relative aspect-square rounded-2xl overflow-hidden bg-[#1F1F27] border-[3px] 
              flex flex-col justify-end transition-all duration-200 select-none group
              ${
                isExcluded
                  ? "opacity-30 grayscale cursor-not-allowed pointer-events-none"
                  : canClick
                  ? "cursor-pointer hover:scale-[1.03] hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
                  : selectable && isMaxReached && !isSelected
                  ? "opacity-55 cursor-pointer hover:opacity-80"
                  : ""
              }
              ${
                isSelected
                  ? "ring-4 ring-[#E10600] shadow-[0_0_25px_rgba(225,6,0,0.5)] scale-[1.02]"
                  : "shadow-md"
              }
            `}
          >
            {/* Resplandor sutil de escudería detrás del retrato transparente */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${teamColor}, transparent 75%)`,
              }}
            />

            {/* Retrato oficial F1 (headshot con fondo transparente) */}
            {p.foto_url ? (
              <Image
                src={p.foto_url}
                alt={p.nombre}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                className="object-contain object-bottom pt-2 filter brightness-95 group-hover:brightness-105 group-hover:scale-105 transition-all duration-200"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#1F1F27] text-zinc-600">
                <User className="w-12 h-12" />
              </div>
            )}

            {/* Degradado inferior para legibilidad geométrica */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#15151E] via-[#15151E]/80 to-transparent pointer-events-none" />

            {/* Badges superiores */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
              {/* Código del piloto */}
              <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#15151E]/90 text-white border border-white/10 backdrop-blur-sm shadow-sm">
                {p.id}
              </span>

              {/* Badge personalizado (ej: P1, P2, P3, Q1 OUT) o check de selección */}
              {isExcluded ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-700">
                  <Ban className="w-2.5 h-2.5 text-red-500" /> Excluido
                </span>
              ) : badge ? (
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-md ${
                    badge.bgClass || "bg-[#E10600]"
                  }`}
                >
                  {badge.label}
                </span>
              ) : isSelected ? (
                <div className="w-6 h-6 rounded-full bg-[#E10600] text-white flex items-center justify-center shadow-[0_0_12px_#E10600]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : null}
            </div>

            {/* Información del piloto al pie de la tarjeta */}
            <div className="relative z-10 p-2.5 sm:p-3 text-left">
              <p className="text-xs sm:text-sm font-black text-[#F5F5F7] tracking-tight leading-tight drop-shadow truncate">
                {p.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: teamColor }}
                />
                <p className="text-[10px] font-semibold text-[#D0D0D2] truncate drop-shadow">
                  {escuderia?.nombre || p.escuderia_id}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
