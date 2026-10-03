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

// Mapeo de fallbacks locales para máxima resiliencia en caso de imágenes externas o fallos de red
const LOCAL_FALLBACKS: Record<string, string> = {
  "https://cdn.jsdelivr.net/gh/julesr0y/f1-circuits-svg@main/circuits/minimal/white/marina-bay-4.svg":
    "/circuits/wiki_sg.svg",
  "https://cdn.jsdelivr.net/gh/julesr0y/f1-circuits-svg@main/circuits/minimal/white/las-vegas-1.svg":
    "/circuits/wiki_lv.svg",
  "/circuits/singapore.svg": "/circuits/wiki_sg.svg",
  "/circuits/las-vegas.svg": "/circuits/wiki_lv.svg",
};

function getFallbackCircuitUrl(title?: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes("singapur") || t.includes("singapore") || t.includes("marina bay")) {
    return "/circuits/wiki_sg.svg";
  }
  if (t.includes("las vegas") || t.includes("las-vegas") || t.includes("vegas")) {
    return "/circuits/wiki_lv.svg";
  }
  if (t.includes("mexico") || t.includes("méxico")) {
    return "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Mexico.png";
  }
  if (t.includes("brasil") || t.includes("brazil")) {
    return "https://media.formula1.com/image/upload/f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Brazil.png";
  }
  return null;
}

/**
 * Componente visual para renderizar la silueta oficial de la pista de F1.
 * Renderiza siluetas con trazo blanco puro, nítido y sólido, exactamente igual al estilo
 * oficial de la Fórmula 1 (México, Brasil, Estados Unidos, etc.).
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
  const silhouetteUrl = silueta || src || getFallbackCircuitUrl(titulo);
  const [currentSrc, setCurrentSrc] = React.useState<string | null>(silhouetteUrl || null);

  React.useEffect(() => {
    setCurrentSrc(silhouetteUrl || null);
  }, [silhouetteUrl]);

  // Tamaños estándar idénticos a los del resto de las pistas de la aplicación
  const sizeMap = {
    sm: "h-10 w-16 max-w-[64px]",
    md: "h-14 sm:h-16 w-20 sm:w-24 max-w-[100px]",
    lg: "h-18 sm:h-20 w-28 sm:w-32 max-w-[130px]",
  };

  const graphicElement = currentSrc ? (
    <img
      src={currentSrc}
      alt={alt || (titulo ? `Silueta de pista de ${titulo}` : "Silueta de pista F1")}
      className={`object-contain shrink-0 transition-transform duration-300 hover:scale-105 pointer-events-none select-none ${sizeMap[size]} ${className}`}
      loading="lazy"
      onError={() => {
        if (currentSrc && LOCAL_FALLBACKS[currentSrc] && currentSrc !== LOCAL_FALLBACKS[currentSrc]) {
          setCurrentSrc(LOCAL_FALLBACKS[currentSrc]);
        }
      }}
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
        {graphicElement}
      </div>
    );
  }

  // Si no hay título, retorna únicamente el elemento gráfico
  return graphicElement;
};

export default CircuitTrackSilhouette;
