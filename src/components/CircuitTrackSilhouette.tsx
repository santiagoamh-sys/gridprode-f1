"use client";

import React from "react";

export interface CircuitTrackSilhouetteProps {
  /**
   * URL de la silueta del circuito / pista en blanco
   */
  silueta?: string | null;
  /**
   * Alias de silueta para máxima compatibilidad
   */
  src?: string | null;
  /**
   * Título opcional del Gran Premio. Si se provee, renderiza el título junto a la silueta.
   */
  titulo?: string;
  /**
   * Emoji de bandera o ícono opcional
   */
  bandera?: string;
  /**
   * Texto alternativo para accesibilidad
   */
  alt?: string;
  /**
   * Clases adicionales de Tailwind
   */
  className?: string;
  /**
   * Tamaño visual: "sm", "md" (default), "lg"
   */
  size?: "sm" | "md" | "lg";
}

/**
 * Componente visual para renderizar la silueta oficial de la pista de F1
 * en color blanco puro, sin fondo (transparente) y con tamaño de alta visibilidad,
 * ubicado al lado del nombre o título del Gran Premio.
 */
export const CircuitTrackSilhouette: React.FC<CircuitTrackSilhouetteProps> = ({
  silueta,
  src,
  titulo,
  bandera,
  alt,
  className = "",
  size = "md",
}) => {
  const silhouetteUrl = silueta || src;

  // Tamaños aumentados para que la pista destaque con mayor presencia manteniendo la proporción
  const sizeMap = {
    sm: "h-10 w-16 max-w-[64px]",
    md: "h-14 sm:h-16 w-20 sm:w-24 max-w-[100px]",
    lg: "h-18 sm:h-20 w-28 sm:w-32 max-w-[130px]",
  };

  const imageElement = silhouetteUrl ? (
    <img
      src={silhouetteUrl}
      alt={alt || (titulo ? `Silueta de pista de ${titulo}` : "Silueta de pista F1")}
      className={`object-contain filter brightness-0 invert shrink-0 transition-transform duration-300 hover:scale-105 pointer-events-none select-none ${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  ) : null;

  // Si se pasa título, renderiza la estructura completa del encabezado con la silueta al lado
  if (titulo) {
    return (
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          {bandera && <span className="text-xl shrink-0">{bandera}</span>}
          <h3 className="font-black text-white text-base sm:text-lg leading-tight tracking-tight">
            {titulo}
          </h3>
        </div>
        {imageElement}
      </div>
    );
  }

  // Si no hay título, retorna únicamente la silueta blanca sin fondo
  return imageElement;
};

export default CircuitTrackSilhouette;
