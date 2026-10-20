"use client";

import React from "react";
import { BadgeTier } from "@/data/badgesData";

interface ThemedTrophyProps {
  badgeId: string;
  tier: BadgeTier;
  isZero: boolean;
  className?: string;
}

export const ThemedTrophy: React.FC<ThemedTrophyProps> = ({
  badgeId,
  tier,
  isZero,
  className = "w-24 h-24",
}) => {
  // Normalizar id para soportar variantes
  const normalizedId = badgeId.toLowerCase().replace(/[-_]/g, "");

  // Prefijo único para gradientes SVG
  const gId = `${normalizedId}_${isZero ? "locked" : tier}`;

  // Paleta metálica según tier
  const colors = isZero
    ? {
        mainGradStart: "#9E9EB2",
        mainGradMid: "#66667C",
        mainGradEnd: "#3A3A4C",
        highlight: "#D0D0E4",
        darkAccent: "#20202C",
        rimLight: "#B8B8CE",
        glow: "none",
        emblemAccent: "#E0E0F0",
      }
    : tier === "oro"
    ? {
        mainGradStart: "#FFF4A3",
        mainGradMid: "#FFD700",
        mainGradEnd: "#B37A00",
        highlight: "#FFFCE6",
        darkAccent: "#805500",
        rimLight: "#FFEAA5",
        glow: "rgba(255, 215, 0, 0.6)",
        emblemAccent: "#FFF8D6",
      }
    : tier === "plata"
    ? {
        mainGradStart: "#FFFFFF",
        mainGradMid: "#D8D8DF",
        mainGradEnd: "#8C8C9C",
        highlight: "#FFFFFF",
        darkAccent: "#545464",
        rimLight: "#EAEAFA",
        glow: "rgba(192, 192, 210, 0.5)",
        emblemAccent: "#FFFFFF",
      }
    : tier === "bronce"
    ? {
        mainGradStart: "#F8BA80",
        mainGradMid: "#CD7F32",
        mainGradEnd: "#7E4010",
        highlight: "#FCE5CF",
        darkAccent: "#542405",
        rimLight: "#F5C294",
        glow: "rgba(205, 127, 50, 0.5)",
        emblemAccent: "#FFE5D1",
      }
    : {
        // En progreso hacia bronce
        mainGradStart: "#8A8A9C",
        mainGradMid: "#58586A",
        mainGradEnd: "#343444",
        highlight: "#B0B0C4",
        darkAccent: "#242430",
        rimLight: "#A0A0B4",
        glow: "rgba(150, 150, 170, 0.3)",
        emblemAccent: "#D0D0E0",
      };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Gradiente principal del cuerpo del trofeo */}
          <linearGradient id={`${gId}_cup`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.mainGradStart} />
            <stop offset="45%" stopColor={colors.mainGradMid} />
            <stop offset="100%" stopColor={colors.mainGradEnd} />
          </linearGradient>

          {/* Gradiente de brillo vertical */}
          <linearGradient id={`${gId}_shine`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </linearGradient>

          {/* Gradiente del pedestal */}
          <linearGradient id={`${gId}_base`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.highlight} />
            <stop offset="25%" stopColor={colors.mainGradMid} />
            <stop offset="100%" stopColor={colors.darkAccent} />
          </linearGradient>

          {/* Gradiente del medallón central */}
          <radialGradient id={`${gId}_medallion`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E1E28" />
            <stop offset="85%" stopColor="#12121A" />
            <stop offset="100%" stopColor={colors.darkAccent} />
          </radialGradient>
        </defs>

        {/* 1. Base / Pedestal del Trofeo */}
        {/* Grada inferior */}
        <path
          d="M38 126 L102 126 L98 134 L42 134 Z"
          fill={`url(#${gId}_base)`}
          stroke={colors.darkAccent}
          strokeWidth="1"
        />
        {/* Bloque central de pedestal */}
        <rect
          x="44"
          y="114"
          width="52"
          height="12"
          rx="2"
          fill="#1C1C26"
          stroke={colors.rimLight}
          strokeWidth="1.2"
        />
        {/* Placa metálica en la base */}
        <rect
          x="50"
          y="117"
          width="40"
          height="6"
          rx="1.5"
          fill={`url(#${gId}_cup)`}
          stroke={colors.highlight}
          strokeWidth="0.5"
        />
        {/* Fuste / Cuello del trofeo */}
        <path
          d="M62 96 L78 96 L74 114 L66 114 Z"
          fill={`url(#${gId}_cup)`}
          stroke={colors.darkAccent}
          strokeWidth="1"
        />
        <ellipse cx="70" cy="96" rx="9" ry="3.5" fill={colors.highlight} opacity="0.8" />

        {/* 2. Asas del Trofeo (Manijas elegantes) */}
        {/* Asa izquierda */}
        <path
          d="M44 42 C24 42 20 62 26 78 C30 88 42 92 48 90 C45 84 34 82 32 74 C28 62 34 50 45 48 Z"
          fill={`url(#${gId}_cup)`}
          stroke={colors.darkAccent}
          strokeWidth="1"
        />
        {/* Asa derecha */}
        <path
          d="M96 42 C116 42 120 62 114 78 C110 88 98 92 92 90 C95 84 106 82 108 74 C112 62 106 50 95 48 Z"
          fill={`url(#${gId}_cup)`}
          stroke={colors.darkAccent}
          strokeWidth="1"
        />

        {/* 3. Copa / Cuerpo Principal */}
        <path
          d="M40 34 C40 34 38 78 54 94 C60 100 80 100 86 94 C102 78 100 34 100 34 Z"
          fill={`url(#${gId}_cup)`}
          stroke={colors.darkAccent}
          strokeWidth="1.2"
        />
        {/* Brillo curvo del cuerpo */}
        <path
          d="M44 38 C44 38 42 74 56 88 C59 91 64 93 68 94 C60 88 50 72 48 38 Z"
          fill="#FFFFFF"
          opacity={isZero ? "0.08" : "0.25"}
        />
        {/* Borde superior de la copa */}
        <ellipse cx="70" cy="34" rx="30" ry="7" fill={`url(#${gId}_base)`} stroke={colors.rimLight} strokeWidth="1.2" />
        <ellipse cx="70" cy="34" rx="26" ry="5" fill="#14141E" />

        {/* 4. Medallón Central para la Ilustración Tematizada */}
        <circle
          cx="70"
          cy="66"
          r="23"
          fill={`url(#${gId}_medallion)`}
          stroke={colors.rimLight}
          strokeWidth="1.8"
        />
        {/* Aro interior sutil */}
        <circle
          cx="70"
          cy="66"
          r="20.5"
          fill="none"
          stroke={colors.highlight}
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
          opacity="0.6"
        />

        {/* 5. Emblema e Ilustración Tematizada Específica */}
        <g id="badge-emblem">
          {renderBadgeEmblem(normalizedId, colors, isZero)}
        </g>

        {/* 6. Destellos / Chispas si Nivel Oro */}
        {!isZero && tier === "oro" && (
          <g>
            {/* Estrella superior izquierda */}
            <path
              d="M34 26 L36 31 L41 33 L36 35 L34 40 L32 35 L27 33 L32 31 Z"
              fill="#FFFFFF"
              opacity="0.9"
            />
            {/* Estrella superior derecha */}
            <path
              d="M106 24 L108 28 L112 30 L108 32 L106 36 L104 32 L100 30 L104 28 Z"
              fill="#FFF275"
              opacity="0.85"
            />
            {/* Brillo pequeño */}
            <circle cx="70" cy="28" r="1.8" fill="#FFFFFF" opacity="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Renderiza el emblema vectorial ilustrado para cada una de las 15 insignias
 */
function renderBadgeEmblem(
  id: string,
  colors: { highlight: string; emblemAccent: string },
  isZero: boolean
) {
  const accent = isZero ? "#8E8E9E" : colors.emblemAccent;

  switch (id) {
    // 1. Ojo Clínico: Mira / Retículo y Ojo de alta precisión
    case "ojoclinico":
      return (
        <g transform="translate(70, 66)">
          {/* Círculos de mira concéntricos */}
          <circle cx="0" cy="0" r="15" stroke={accent} strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
          <circle cx="0" cy="0" r="10" stroke={accent} strokeWidth="1" fill="none" opacity="0.7" />
          {/* Cruz de retícula */}
          <line x1="-17" y1="0" x2="-8" y2="0" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="8" y1="0" x2="17" y2="0" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="0" y2="-8" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="0" y1="8" x2="0" y2="17" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          {/* Ojo central */}
          <path
            d="M-7 0 C-4 -4 4 -4 7 0 C4 4 -4 4 -7 0 Z"
            fill="none"
            stroke={accent}
            strokeWidth="1.3"
          />
          <circle cx="0" cy="0" r="2.5" fill={accent} />
          <circle cx="1" cy="-1" r="0.8" fill="#FFFFFF" />
        </g>
      );

    // 2. El Estratega: Cerebro y Pizarra de estrategia F1
    case "elestratega":
      return (
        <g transform="translate(70, 66)">
          {/* Pizarra / Cuaderno táctico de fondo */}
          <rect x="-14" y="-14" width="28" height="28" rx="3" fill="#151520" stroke={accent} strokeWidth="1" />
          {/* Circuitos / Hemisferios de cerebro */}
          <path
            d="M-8 -6 C-11 -6 -12 -1 -10 2 C-12 4 -10 9 -6 8 C-4 10 -1 9 0 7 C1 9 4 10 6 8 C10 9 12 4 10 2 C12 -1 11 -6 8 -6 C7 -9 1 -9 0 -7 C-1 -9 -7 -9 -8 -6 Z"
            fill="none"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {/* Surco central y conexiones */}
          <path d="M0 -7 V7" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M-5 -1 H0 M0 3 H5" stroke={accent} strokeWidth="1" strokeLinecap="round" />
          {/* Flecha táctica de estrategia en la esquina */}
          <path d="M-8 10 L-2 10 L-4 8" stroke="#00E5FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="10" r="1.2" fill="#E10600" />
        </g>
      );

    // 3. Asistencia Perfecta: Calendario y Check de asistencia
    case "asistenciaperfecta":
      return (
        <g transform="translate(70, 66)">
          {/* Hoja de calendario */}
          <rect x="-13" y="-12" width="26" height="24" rx="3" fill="#181824" stroke={accent} strokeWidth="1.2" />
          {/* Barra roja superior del calendario */}
          <path d="M-13 -9 C-13 -10.6 -11.6 -12 -10 -12 H10 C11.6 -12 13 -10.6 13 -9 V-5 H-13 Z" fill="#E10600" />
          {/* Anillas superiores */}
          <rect x="-8" y="-14" width="2" height="4" rx="1" fill="#FFFFFF" />
          <rect x="6" y="-14" width="2" height="4" rx="1" fill="#FFFFFF" />
          {/* Días / Cuadrícula pequeña */}
          <circle cx="-6" cy="0" r="1" fill="#71717A" />
          <circle cx="0" cy="0" r="1" fill="#71717A" />
          <circle cx="6" cy="0" r="1" fill="#71717A" />
          <circle cx="-6" cy="5" r="1" fill="#71717A" />
          <circle cx="0" cy="5" r="1" fill="#71717A" />
          {/* Gran Checkmark victorioso verde/brillante */}
          <path
            d="M-4 2 L1 7 L9 -2"
            fill="none"
            stroke={isZero ? accent : "#22C55E"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    // 4. Oráculo del Caos: Llamas de fuego y explosión de carrera
    case "oraculodelcaos":
    case "oraculocaos":
      return (
        <g transform="translate(70, 66)">
          {/* Rueda / Neumático incendiado */}
          <circle cx="0" cy="4" r="8" fill="#1C1C26" stroke="#52525B" strokeWidth="1.5" />
          <circle cx="0" cy="4" r="4" fill="#272730" stroke="#71717A" strokeWidth="1" />
          {/* Llamas de fuego ascendentes */}
          <path
            d="M-7 4 C-9 0 -6 -6 -3 -11 C-1 -8 0 -5 2 -7 C4 -4 7 -8 6 -13 C10 -8 10 0 7 5 C5 8 0 10 -4 9 C-6 8 -7 6 -7 4 Z"
            fill={isZero ? accent : "url(#flame_grad)"}
            stroke={isZero ? accent : "#FF4500"}
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="flame_grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF1E00" />
              <stop offset="50%" stopColor="#FF7A00" />
              <stop offset="100%" stopColor="#FFEA00" />
            </linearGradient>
          </defs>
          {/* Chispas flotantes */}
          <circle cx="-8" cy="-8" r="1" fill="#FFA500" />
          <circle cx="8" cy="-5" r="1.2" fill="#FF4500" />
        </g>
      );

    // 5. Rey del Sábado: Corona de campeonato y cronómetro de Qualy
    case "reydelsabado":
    case "reysabado":
      return (
        <g transform="translate(70, 66)">
          {/* Cronómetro de clasificación de fondo */}
          <circle cx="0" cy="3" r="12" fill="#161622" stroke={accent} strokeWidth="1.3" />
          <path d="M0 -9 V-12" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 -6 L9 -8" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
          {/* Aguja del cronómetro */}
          <line x1="0" y1="3" x2="5" y2="-2" stroke="#E10600" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="3" r="1.8" fill={accent} />
          {/* Corona real dorada encima */}
          <path
            d="M-10 -7 L-12 -16 L-5 -11 L0 -17 L5 -11 L12 -16 L10 -7 Z"
            fill={isZero ? accent : "#FFD700"}
            stroke={accent}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Joyas en la corona */}
          <circle cx="-12" cy="-16" r="1" fill="#FFFFFF" />
          <circle cx="0" cy="-17" r="1.2" fill="#FFFFFF" />
          <circle cx="12" cy="-16" r="1" fill="#FFFFFF" />
        </g>
      );

    // 6. Pulso Argento: Bandera Argentina y Sol de Mayo con #43
    case "pulsoargento":
      return (
        <g transform="translate(70, 66)">
          {/* Escarapela / Franjas albicelestes */}
          <rect x="-14" y="-12" width="28" height="7" rx="1.5" fill="#74ACDF" />
          <rect x="-14" y="-5" width="28" height="10" fill="#FFFFFF" />
          <rect x="-14" y="5" width="28" height="7" rx="1.5" fill="#74ACDF" />
          <rect x="-14" y="-12" width="28" height="24" rx="2" fill="none" stroke={accent} strokeWidth="1.2" />
          {/* Sol de Mayo en el centro */}
          <circle cx="0" cy="0" r="3.2" fill="#F6B40E" stroke="#B87B00" strokeWidth="0.5" />
          {/* Rayos del sol */}
          <line x1="0" y1="-4.8" x2="0" y2="-3.4" stroke="#F6B40E" strokeWidth="0.8" />
          <line x1="0" y1="3.4" x2="0" y2="4.8" stroke="#F6B40E" strokeWidth="0.8" />
          <line x1="-4.8" y1="0" x2="-3.4" y2="0" stroke="#F6B40E" strokeWidth="0.8" />
          <line x1="3.4" y1="0" x2="4.8" y2="0" stroke="#F6B40E" strokeWidth="0.8" />
          {/* Número 43 de Franco Colapinto grabado */}
          <text
            x="0"
            y="9"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="900"
            fill="#101018"
            fontFamily="sans-serif"
          >
            #43
          </text>
        </g>
      );

    // 7. Contra la Corriente: Salmón / Flechas en sentido opuesto
    case "contralacorriente":
    case "contracorriente":
      return (
        <g transform="translate(70, 66)">
          {/* Flechas de la corriente hacia la izquierda (comunidad) */}
          <path d="M12 -9 L-2 -9 L1 -12" stroke="#71717A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 9 L-2 9 L1 6" stroke="#71717A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Salmón audaz nadando contra la corriente hacia la derecha */}
          <path
            d="M-12 0 C-8 -6 4 -6 12 0 C4 6 -8 6 -12 0 Z"
            fill={isZero ? accent : "#FA8072"}
            stroke={accent}
            strokeWidth="1.2"
          />
          {/* Cola del pez */}
          <path d="M-12 0 L-16 -5 L-14 0 L-16 5 Z" fill={isZero ? accent : "#FA8072"} stroke={accent} strokeWidth="1" />
          {/* Aleta dorsal y ojo */}
          <path d="M0 -4 L3 -7 L5 -3 Z" fill={accent} />
          <circle cx="8" cy="-1" r="1" fill="#FFFFFF" />
          <circle cx="8.5" cy="-1" r="0.5" fill="#000000" />
          {/* Flecha dorada superior marcando el nado contracorriente */}
          <path d="M-4 -1 L8 -1 L5 -4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );

    // 8. Pleno Perfecto: Gran Trofeo 100% y Estrellas
    case "plenoperfecto":
      return (
        <g transform="translate(70, 66)">
          {/* Corona de laureles */}
          <path
            d="M-14 8 C-18 -2 -14 -10 -6 -13 M14 8 C18 -2 14 -10 6 -13"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hojas de laurel */}
          <circle cx="-13" cy="-3" r="1.5" fill={accent} />
          <circle cx="-10" cy="-8" r="1.5" fill={accent} />
          <circle cx="13" cy="-3" r="1.5" fill={accent} />
          <circle cx="10" cy="-8" r="1.5" fill={accent} />
          {/* Gran 100% en el centro */}
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill={isZero ? accent : "#FFD700"}
            fontFamily="sans-serif"
            letterSpacing="-0.5"
          >
            100%
          </text>
          {/* 3 Estrellas de campeonato */}
          <path d="M-6 -7 L-5 -9 L-4 -7 L-2 -7 L-4 -5 L-3 -3 L-5 -5 L-7 -3 L-6 -5 L-8 -7 Z" fill={accent} transform="scale(0.7) translate(-3, -2)" />
          <path d="M0 -12 L1 -14 L2 -12 L4 -12 L2 -10 L3 -8 L1 -10 L-1 -8 L0 -10 L-2 -12 Z" fill={accent} transform="scale(0.85) translate(0, -2)" />
          <path d="M6 -7 L7 -9 L8 -7 L10 -7 L8 -5 L9 -3 L7 -5 L5 -3 L6 -5 L4 -7 Z" fill={accent} transform="scale(0.7) translate(3, -2)" />
        </g>
      );

    // 9. Fidelidad Absoluta: Corazón y auto de F1
    case "fidelidadabsoluta":
      return (
        <g transform="translate(70, 66)">
          {/* Gran Corazón de lealtad */}
          <path
            d="M0 10 C-10 4 -15 -3 -12 -8 C-9 -13 -2 -11 0 -5 C2 -11 9 -13 12 -8 C15 -3 10 4 0 10 Z"
            fill={isZero ? "#3F3F46" : "#E10600"}
            stroke={accent}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {/* Monoplaza F1 estilizado cruzando el corazón */}
          <path
            d="M-13 2 L-6 1 L-3 -2 L2 -2 L7 0 L13 2 L12 4 L-12 4 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          {/* Alerón delantero y trasero */}
          <rect x="-13" y="1" width="2" height="4" rx="0.5" fill={accent} />
          <rect x="11" y="1" width="2" height="4" rx="0.5" fill={accent} />
          {/* Neumáticos del auto */}
          <circle cx="-7" cy="4" r="2.2" fill="#181820" stroke={accent} strokeWidth="0.8" />
          <circle cx="7" cy="4" r="2.2" fill="#181820" stroke={accent} strokeWidth="0.8" />
        </g>
      );

    // 10. Monopolio: Doblete 1 - 2 y dos autos de la misma escudería
    case "monopolio":
      return (
        <g transform="translate(70, 66)">
          {/* Bandera a cuadros de fondo */}
          <rect x="-12" y="-12" width="6" height="6" fill="#FFFFFF" opacity="0.8" />
          <rect x="-6" y="-12" width="6" height="6" fill="#181820" />
          <rect x="0" y="-12" width="6" height="6" fill="#FFFFFF" opacity="0.8" />
          <rect x="6" y="-12" width="6" height="6" fill="#181820" />
          {/* Píldora con el distintivo 1-2 */}
          <rect x="-14" y="-3" width="28" height="13" rx="4" fill="#14141E" stroke={accent} strokeWidth="1.3" />
          <text
            x="0"
            y="6.5"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="900"
            fill={accent}
            fontFamily="sans-serif"
          >
            1 - 2
          </text>
          {/* Dos estrellas doradas arriba */}
          <circle cx="-5" cy="-8" r="1.5" fill={accent} />
          <circle cx="5" cy="-8" r="1.5" fill={accent} />
        </g>
      );

    // 11. El Mufa: Trofeo roto con nube de tormenta y rayo (DNF)
    case "elmufa":
      return (
        <g transform="translate(70, 66)">
          {/* Nube de lluvia gris sobre la copa */}
          <path
            d="M-8 -7 C-10 -7 -12 -5 -12 -3 C-13 -3 -15 -1 -14 1 C-13 3 -11 3 -9 3 H9 C11 3 13 1 13 -1 C13 -3 11 -4 10 -4 C10 -6 8 -8 6 -8 C4 -8 3 -7 2 -6 C1 -7 -1 -7 -2 -7 Z"
            fill="#4B5563"
            stroke="#9CA3AF"
            strokeWidth="1"
          />
          {/* Rayo potente cayendo */}
          <path
            d="M2 -2 L-3 5 L0 5 L-2 13 L6 3 L2 3 Z"
            fill={isZero ? accent : "#FACC15"}
            stroke="#CA8A04"
            strokeWidth="0.8"
          />
          {/* Gotas de lluvia */}
          <line x1="-8" y1="5" x2="-9" y2="8" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" />
          <line x1="-4" y1="7" x2="-5" y2="10" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" />
          <line x1="8" y1="5" x2="7" y2="8" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" />
          {/* Texto DNF diminuto */}
          <text
            x="-7"
            y="13"
            fontSize="4"
            fontWeight="900"
            fill="#EF4444"
            fontFamily="sans-serif"
          >
            DNF
          </text>
        </g>
      );

    // 12. Voto Popular: Siluetas de multitud y megáfono
    case "votopopular":
      return (
        <g transform="translate(70, 66)">
          {/* Siluetas de la comunidad con manos alzadas */}
          <circle cx="-8" cy="2" r="2.2" fill={accent} opacity="0.6" />
          <path d="M-11 11 C-11 7 -5 7 -5 11" fill={accent} opacity="0.6" />
          <circle cx="8" cy="2" r="2.2" fill={accent} opacity="0.6" />
          <path d="M5 11 C5 7 11 7 11 11" fill={accent} opacity="0.6" />
          <circle cx="0" cy="0" r="2.8" fill={accent} />
          <path d="M-4 11 C-4 5 4 5 4 11" fill={accent} />
          {/* Megáfono de difusión popular */}
          <path
            d="M-10 -7 L-4 -4 V-10 Z"
            fill={accent}
            stroke={accent}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <rect x="-12" y="-7.5" width="2.5" height="3" rx="0.5" fill={accent} />
          {/* Ondas sonoras de clamor popular */}
          <path d="M-1 -8 C1 -7 1 -5 -1 -4" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M1 -10 C4 -8 4 -4 1 -2" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </g>
      );

    // 13. Carrera Limpia: Bandera verde y escudo de 0 incidentes
    case "carreralimpia":
      return (
        <g transform="translate(70, 66)">
          {/* Escudo heráldico protector */}
          <path
            d="M-11 -10 H11 V-2 C11 6 0 13 0 13 C0 13 -11 6 -11 -2 Z"
            fill="#12181F"
            stroke={accent}
            strokeWidth="1.3"
          />
          {/* Bandera verde ondeando */}
          <path
            d="M-7 -7 H4 C6 -7 6 -4 4 -4 H-7 Z"
            fill={isZero ? accent : "#22C55E"}
            stroke={accent}
            strokeWidth="0.8"
          />
          <line x1="-7" y1="-9" x2="-7" y2="4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          {/* Cero ("0") incidentes / abandonos */}
          <text
            x="0"
            y="6.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            fill={isZero ? accent : "#22C55E"}
            fontFamily="sans-serif"
          >
            0
          </text>
        </g>
      );

    // 14. Caos Ordenado: Podio con flechas de orden cruzado
    case "caosordenado":
      return (
        <g transform="translate(70, 66)">
          {/* Podio de 3 escalones */}
          {/* Escalón 2 */}
          <rect x="-13" y="1" width="8" height="10" fill="#1C1C28" stroke={accent} strokeWidth="1" />
          <text x="-9" y="8" textAnchor="middle" fontSize="5" fontWeight="bold" fill={accent}>2</text>
          {/* Escalón 1 (central y más alto) */}
          <rect x="-5" y="-5" width="10" height="16" fill="#1C1C28" stroke={accent} strokeWidth="1" />
          <text x="0" y="3" textAnchor="middle" fontSize="6" fontWeight="bold" fill={accent}>1</text>
          {/* Escalón 3 */}
          <rect x="5" y="4" width="8" height="7" fill="#1C1C28" stroke={accent} strokeWidth="1" />
          <text x="9" y="9" textAnchor="middle" fontSize="5" fontWeight="bold" fill={accent}>3</text>
          {/* Flechas de mezcla / permutación (Shuffle cruzado) */}
          <path
            d="M-8 -8 C-4 -12 4 -12 8 -8 M7 -9 L8 -7 L10 -8"
            stroke="#E10600"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M8 -6 C4 -2 -4 -2 -8 -6 M-7 -5 L-8 -7 L-10 -6"
            stroke="#00E5FF"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      );

    // 15. Maestro del Sprint: Rayos de velocidad y logotipo SPRINT
    case "maestrodelsprint":
    case "maestrosprint":
      return (
        <g transform="translate(70, 66)">
          {/* Rayos / Estelas de velocidad en el fondo */}
          <line x1="-15" y1="-8" x2="15" y2="-8" stroke="#E10600" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="-12" y1="-4" x2="12" y2="-4" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <line x1="-15" y1="8" x2="15" y2="8" stroke="#E10600" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          {/* Rayo central de velocidad */}
          <path
            d="M3 -14 L-6 -2 L-1 -2 L-4 8 L6 -4 L1 -4 Z"
            fill={isZero ? accent : "#FACC15"}
            stroke={accent}
            strokeWidth="0.8"
          />
          {/* Placa estilizada "SPRINT" en ángulo */}
          <rect
            x="-14"
            y="0"
            width="28"
            height="8.5"
            rx="2"
            fill="#151520"
            stroke={accent}
            strokeWidth="1"
            transform="skewX(-10)"
          />
          <text
            x="0"
            y="6.2"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="900"
            fill="#FFFFFF"
            fontFamily="sans-serif"
            fontStyle="italic"
            letterSpacing="0.8"
            transform="skewX(-10)"
          >
            SPRINT
          </text>
        </g>
      );

    // 16. Vuelta Perfecta (40/40): Cronómetro Violeta de Vuelta Rápida + 40 PTS
    case "vueltasperfectas":
    case "vueltaperfecta":
      return (
        <g transform="translate(70, 66)">
          {/* Halo de sector violeta F1 */}
          <circle
            cx="0"
            cy="0"
            r="14.5"
            fill="#1A1028"
            stroke={isZero ? accent : "#C084FC"}
            strokeWidth="1.5"
          />
          {/* Arco de telemetría cian */}
          <path
            d="M-10 -6 A 11.5 11.5 0 0 1 10 -6"
            fill="none"
            stroke={isZero ? accent : "#22D3EE"}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Aguja de tacómetro apuntando al límite */}
          <line
            x1="0"
            y1="-1"
            x2="6.5"
            y2="-7.5"
            stroke={isZero ? accent : "#E879F9"}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="0" cy="-1" r="2" fill={accent} />
          {/* Placa 40/40 */}
          <rect
            x="-12"
            y="3"
            width="24"
            height="8"
            rx="2"
            fill={isZero ? "#1E1E2A" : "#581C87"}
            stroke={accent}
            strokeWidth="0.9"
          />
          <text
            x="0"
            y="8.8"
            textAnchor="middle"
            fontSize="5.2"
            fontWeight="900"
            fill="#FFFFFF"
            fontFamily="monospace"
          >
            40/40
          </text>
        </g>
      );

    default:
      return (
        <g transform="translate(70, 66)">
          <circle cx="0" cy="0" r="12" fill="none" stroke={accent} strokeWidth="1.5" />
          <path d="M0 -6 L2 -1 L7 0 L3 4 L4 9 L0 6 L-4 9 L-3 4 L-7 0 L-2 -1 Z" fill={accent} />
        </g>
      );
  }
}
