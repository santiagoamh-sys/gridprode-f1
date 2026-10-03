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

// Configuración de trazados vectoriales en proporción 4:3 estándar (idéntica a Track icons 4x3 de la F1)
// con trazo exterior blanco notablemente grueso y nítido (stroke 28) y hueco interior negro (stroke 8)
const VECTOR_CIRCUITS: Record<
  string,
  {
    path: string;
    viewBox: string;
    strokeOuter: number;
    strokeInner: number;
  }
> = {
  singapore: {
    path:
      "M461.432 325.308c3.546.215 6.228-.46 8.285-3.467 2.658-3.883 10.644-15.694 13.506-20.689 2.248-3.924 1.906-8.228 1.362-12.25-.547-4.022-21.779-162.674-22.394-167.042-.55-3.905-2.982-6.455-8.02-5.625-5.037.832-10.535.682-15.509-2.08-5.826-3.236-7.566-5.548-9.382-9.324-2.012-4.185-5.031-6.738-7.791-6.78-4.919-.079-7.416 3.389-7.87 6.78-.944 7.05-1.516 14.7-1.89 19.263-.454 5.547.59 16.212 1.816 20.65s6.726 21.596 9.38 32.207c2.657 10.608 5.068 21.644 6.355 28.2 1.816 9.246-5.447 26.66-19.82 25.58-16.56-1.243-96.96-6.878-104.994-7.571-7.76-.67-17.023-1.387-24.511-4.784-9.874-4.479-92.876-54.296-99.618-58.388-4.267-2.589-5.307-2.724-7.762 1.528-11.374 19.692-20.682 35.827-31.12 56.305-1.838 3.606-3.541 4.266-6.334 1.284-4.19-4.477-26.419-27.808-32.683-34.534-5.78-6.204-20.57-6.21-25.67 4.612-6.504 13.799-56.755 104.28-59.206 108.974-1.382 2.644-2.983 6.481-2.427 10.392.47 3.318 2.756 6.781 5.287 8.641 3.575 2.63 8.469 6.402 12.552 9.457 2.35 1.759 5.615 2.859 10.003 3.783 3.281.692 4.549 2.145 4.69 10.942.077 4.74.304 10.324.304 14.178 0 5.64 3.442 6.28 6.278 8.59 8.916 7.264 16.457 13.176 21.79 17.106 1.07.79 6.672 4.662 8.285 7.396 3.404 5.78 5.447 8.784 7.15 11.096 2.722 3.694 7.75 2.688 8.625-2.08 1.93-10.519 14.526-87.49 17.477-105.29.646-3.9 2.514-10.388 3.065-11.788.098-.25 17.789-43.744 18.355-45.218.646-1.68 1.17-2.659 1.277-2.918 1.153-2.766 3.802-3.986 7.49-.75 5.372 4.713 45.155 39.55 51.182 44.959 5.529 4.963 13.647 8.282 20.848 8.815 2.986.222 39.063 1.437 74.063 3.358 33.248 1.827 65.538 4.368 67.03 4.47 3.065.208 6.169 2.43 6.129 6.819-.115 12.367 4.653 19.533 14.98 20.457 5.903.526 74.874 4.459 79.437 4.736z",
    viewBox: "-48 16 586 439",
    strokeOuter: 28,
    strokeInner: 8,
  },
  lasvegas: {
    path:
      "M44.554 308.699c5.621 2.881 52.896 30.75 61.836 35.774 7.261 4.082 18.085 9.124 31.856 14.165 21.976 8.045 37.495 12.32 56.449 15.126 21.08 3.122 32.091 4.52 44.738 5.282 7.963.48 26.891.171 58.557.96 57.855 1.441 148.06 2.882 150.61 2.882 1.873 0 3.123-.801 3.279-4.322.19-4.316 1.534-7.813 4.216-10.564 2.681-2.75 7.964-8.563 7.964-11.284 0-8.248.702-133.012.937-151.02.148-11.395-2.811-30.251-16.865-41.536-7.364-5.914-39.35-33.613-46.612-40.575-3.316-3.18-9.106-1.364-11.711 2.64-4.685 7.203-4.758 15.367 6.324 27.131 6.559 6.963 12.184 12.623 7.73 23.53-4.216 10.323-13.351 20.648-37.711 20.648-13.743 0-151.305.48-159.745.48-3.747 0-9.135-5.509-9.135-9.364 0-4.162-.234-19.048-.234-31.212 0-13.605-11.009-40.096-35.368-40.096-4.222 0-9.37-1.2-9.135 4.562.331 8.16-5.856 9.844-11.712 7.203-4.23-1.908-8.891-4.78-11.946-6.723-6.075-3.864-10.956 2.726-11.243 12.965-.61 21.762-2.012 52.195-2.576 64.345-1.171 25.21-10.557 39.821-32.09 44.658-24.09 5.41-34.476 14.223-40.025 26.134-4.714 10.12-6.23 20.945-7.742 29.763-1.655 9.648 7.227 7.357 9.354 8.448z",
    viewBox: "-25 44 550 412",
    strokeOuter: 28,
    strokeInner: 8,
  },
};

function detectVectorCircuit(url?: string | null, title?: string): "singapore" | "lasvegas" | null {
  const text = `${url || ""} ${title || ""}`.toLowerCase();
  if (
    text.includes("singapur") ||
    text.includes("singapore") ||
    text.includes("marina-bay") ||
    text.includes("wiki_sg")
  ) {
    return "singapore";
  }
  if (
    text.includes("las-vegas") ||
    text.includes("las vegas") ||
    text.includes("vegas") ||
    text.includes("wiki_lv")
  ) {
    return "lasvegas";
  }
  return null;
}

// Mapeo de fallbacks locales para máxima resiliencia en caso de imágenes externas
const LOCAL_FALLBACKS: Record<string, string> = {
  "https://cdn.jsdelivr.net/gh/julesr0y/f1-circuits-svg@main/circuits/minimal/white/marina-bay-4.svg":
    "/circuits/wiki_sg.svg",
  "https://cdn.jsdelivr.net/gh/julesr0y/f1-circuits-svg@main/circuits/minimal/white/las-vegas-1.svg":
    "/circuits/wiki_lv.svg",
  "/circuits/singapore.svg": "/circuits/wiki_sg.svg",
  "/circuits/las-vegas.svg": "/circuits/wiki_lv.svg",
};

/**
 * Componente visual para renderizar la silueta oficial de la pista de F1.
 * Renderiza trazados vectoriales con trazo blanco grueso, definido y nítido, con detalle interior negro,
 * ajustado a la proporción visual exacta de los Grandes Premios oficiales sin sobresalir.
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

  const detectedVectorKey = detectVectorCircuit(silhouetteUrl, titulo);

  // Renderizado vectorial directo por código: proporción visual exacta 4:3 y línea blanca gruesa
  let graphicElement: React.ReactNode = null;

  if (detectedVectorKey && VECTOR_CIRCUITS[detectedVectorKey]) {
    const circuit = VECTOR_CIRCUITS[detectedVectorKey];
    graphicElement = (
      <svg
        viewBox={circuit.viewBox}
        className={`object-contain shrink-0 transition-transform duration-300 hover:scale-105 pointer-events-none select-none ${sizeMap[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt || (titulo ? `Silueta de pista de ${titulo}` : "Silueta de pista F1")}
      >
        {/* Trazo exterior blanco grueso y nítido (idéntico al grosor e impacto visual de Estados Unidos) */}
        <path
          d={circuit.path}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={circuit.strokeOuter}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Detalle interior negro que define el hueco interior visible y preciso */}
        <path
          d={circuit.path}
          fill="none"
          stroke="#000000"
          strokeWidth={circuit.strokeInner}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (currentSrc) {
    // Renderizado para circuitos con imagen oficial (limpio, sin filtros que deformen el contorno)
    graphicElement = (
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
    );
  }

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
