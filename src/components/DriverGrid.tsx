"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Piloto } from "@/types/f1";
import { useF1Data } from "@/context/F1DataContext";
import { Check, User, Ban, Info } from "lucide-react";
import { DriverModal } from "@/components/DriverModal";

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
  enableModal?: boolean;
}

// Orden de constructores basado en el Campeonato de Constructores 2025, con Cadillac al final
const TEAM_ORDER = [
  'McLaren',
  'Mercedes Benz',
  'Red Bull Racing',
  'Scuderia Ferrari',
  'Williams',
  'Racing Bull',
  'Haas',
  'Alpine',
  'Aston Martin',
  'Audi',
  'Cadillac',
];

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
  enableModal = true,
}) => {
  const { pilotos, getEscuderia } = useF1Data();
  const [modalDriver, setModalDriver] = useState<Piloto | null>(null);

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

  // Ordenamiento por escudería (según TEAM_ORDER) y desempate por número de auto
  const sortedPilotos = React.useMemo(() => {
    return [...visiblePilotos].sort((a, b) => {
      const escA = getEscuderia(a.escuderia_id)?.nombre || "";
      const escB = getEscuderia(b.escuderia_id)?.nombre || "";

      let indexA = TEAM_ORDER.indexOf(escA);
      let indexB = TEAM_ORDER.indexOf(escB);

      if (indexA === -1) {
        indexA = TEAM_ORDER.findIndex((name) =>
          escA.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(escA.toLowerCase())
        );
      }
      if (indexB === -1) {
        indexB = TEAM_ORDER.findIndex((name) =>
          escB.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(escB.toLowerCase())
        );
      }

      const orderA = indexA !== -1 ? indexA : 999;
      const orderB = indexB !== -1 ? indexB : 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Si pertenecen a la misma escudería, se ordenan por su número de auto
      const numA = typeof a.numero === "number" ? a.numero : 999;
      const numB = typeof b.numero === "number" ? b.numero : 999;
      if (numA !== numB) {
        return numA - numB;
      }

      return a.nombre.localeCompare(b.nombre);
    });
  }, [visiblePilotos, getEscuderia]);

  const isMaxReached =
    typeof maxSelections === "number" && selectedSet.size >= maxSelections;

  const handleCardClick = (p: Piloto) => {
    if (excludedSet.has(p.id)) return;

    if (selectable) {
      if (!isMaxReached || selectedSet.has(p.id)) {
        onSelectDriver?.(p);
      }
    } else if (enableModal) {
      setModalDriver(p);
    }
  };

  return (
    <>
      <div
        className={`grid ${
          compact
            ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5"
        }`}
      >
        {sortedPilotos.map((p) => {
          const escuderia = getEscuderia(p.escuderia_id);
          const teamColor = escuderia?.color_hex || "#3671C6";
          const isSelected = selectedSet.has(p.id);
          const isExcluded = excludedSet.has(p.id);
          const badge = driverBadges[p.id];

          const canClick =
            !isExcluded && (selectable ? (!isMaxReached || isSelected) : enableModal);

          return (
            <div
              key={p.id}
              onClick={() => handleCardClick(p)}
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

              {/* Badges superiores y controles */}
              <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
                {/* Código del piloto */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#15151E]/90 text-white border border-white/10 backdrop-blur-sm shadow-sm pointer-events-none">
                    {p.id}
                  </span>
                  {p.numero && (
                    <span className="font-mono text-[9px] font-bold text-zinc-400 px-1 py-0.5 rounded bg-black/40 border border-white/5 pointer-events-none hidden sm:inline-block">
                      #{p.numero}
                    </span>
                  )}
                </div>

                {/* Acciones e indicadores superiores derechos */}
                <div className="flex items-center gap-1.5">
                  {/* Botón de ficha técnica informativa para abrir DriverModal */}
                  {enableModal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalDriver(p);
                      }}
                      title={`Ver ficha técnica y estadísticas de ${p.nombre}`}
                      className="w-5 h-5 rounded-full bg-[#15151E]/90 hover:bg-[#E10600] border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-sm group-hover:border-white/40"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  )}

                  {/* Badge personalizado (ej: P1, P2, P3, Q1 OUT) o check de selección */}
                  {isExcluded ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-700 pointer-events-none">
                      <Ban className="w-2.5 h-2.5 text-red-500" /> Excluido
                    </span>
                  ) : badge ? (
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-md pointer-events-none ${
                        badge.bgClass || "bg-[#E10600]"
                      }`}
                    >
                      {badge.label}
                    </span>
                  ) : isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#E10600] text-white flex items-center justify-center shadow-[0_0_12px_#E10600] pointer-events-none">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Información del piloto al pie de la tarjeta */}
              <div className="relative z-10 p-2.5 sm:p-3 text-left">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-black text-[#F5F5F7] tracking-tight leading-tight drop-shadow truncate">
                    {p.nombre}
                  </p>
                  {p.bandera && (
                    <span className="text-xs shrink-0 drop-shadow">
                      {p.bandera}
                    </span>
                  )}
                </div>
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

      {/* DriverModal para detalles completos y estadísticas */}
      {enableModal && (
        <DriverModal
          driver={modalDriver}
          isOpen={!!modalDriver}
          onClose={() => setModalDriver(null)}
          onSelectDriver={onSelectDriver}
          isSelectable={selectable}
          isSelected={modalDriver ? selectedSet.has(modalDriver.id) : false}
        />
      )}
    </>
  );
};

export default DriverGrid;
