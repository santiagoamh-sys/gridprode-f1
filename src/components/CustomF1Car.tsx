"use client";

import React from "react";
import { CarModelId, CarDesignId, CarColors } from "@/types/auth";

interface CustomF1CarProps {
  modelo?: CarModelId | null;
  diseno?: CarDesignId | null;
  colores?: CarColors | null;
  className?: string;
  showGlow?: boolean;
}

export const CustomF1Car: React.FC<CustomF1CarProps> = ({
  modelo = "actual_2026",
  diseno = "diseno_1",
  colores,
  className = "w-full h-auto",
  showGlow = false,
}) => {
  const modelId: CarModelId = modelo || "actual_2026";
  const designId: CarDesignId = diseno || "diseno_1";

  const cPrim = colores?.colorPrincipal || "#E10600";
  const cSec = colores?.colorSecundario || "#15151E";
  const cDet = colores?.colorDetalle || "#FFFFFF";

  // Identificador único para degradados/filtros en SVG
  const uid = React.useId().replace(/:/g, "");

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {showGlow && (
        <div
          className="absolute inset-x-8 inset-y-2 rounded-full blur-xl opacity-30 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: cPrim }}
        />
      )}

      <svg
        viewBox="0 0 400 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
      >
        <defs>
          {/* Sombras y acabados de fibra de carbono / metal */}
          <linearGradient id={`gradBody_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>

          <linearGradient id={`gradRubber_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2A2A32" />
            <stop offset="50%" stopColor="#121216" />
            <stop offset="100%" stopColor="#08080A" />
          </linearGradient>

          <linearGradient id={`gradRim_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A4A55" />
            <stop offset="50%" stopColor="#222228" />
            <stop offset="100%" stopColor="#15151A" />
          </linearGradient>

          <linearGradient id={`chromeExhaust_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="40%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#9E9E9E" />
            <stop offset="100%" stopColor="#424242" />
          </linearGradient>

          <filter id={`shadow_${uid}`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* =========================================================
            MODELO 1: CLASICO FANGIO (Años 50)
            Cigarro/tubo estilizado, sin alas, ruedas de rayos, cockpit abierto
           ========================================================= */}
        {modelId === "clasico_fangio" && (
          <g id="clasico_fangio">
            {/* Sombra proyectada en el suelo */}
            <ellipse cx="200" cy="136" rx="160" ry="8" fill="#000000" fillOpacity="0.4" />

            {/* Suspensión delantera y trasera (brazos metálicos expuestos) */}
            <g stroke="#8A8A93" strokeWidth="2.5" strokeLinecap="round">
              <line x1="75" y1="108" x2="110" y2="112" />
              <line x1="75" y1="116" x2="115" y2="120" />
              <line x1="315" y1="108" x2="280" y2="112" />
              <line x1="315" y1="116" x2="275" y2="120" />
            </g>

            {/* Tubo de escape cromado clásico lateral */}
            <path
              d="M 125 104 C 110 104 80 108 55 116 L 48 119"
              stroke={`url(#chromeExhaust_${uid})`}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Bridas del escape */}
            <line x1="120" y1="101" x2="120" y2="107" stroke="#333" strokeWidth="2" />
            <line x1="100" y1="103" x2="100" y2="109" stroke="#333" strokeWidth="2" />

            {/* Carrocería Base (Puro de carreras) */}
            <path
              d="M 50 114 C 45 98 65 88 120 86 C 160 84 200 84 240 86 C 300 88 360 96 375 108 C 378 111 376 117 370 120 C 340 126 280 127 220 127 C 150 127 80 126 55 122 Z"
              fill={cPrim}
            />
            {/* Brillo/sombreado de volumen cilíndrico */}
            <path
              d="M 50 114 C 45 98 65 88 120 86 C 160 84 200 84 240 86 C 300 88 360 96 375 108 C 378 111 376 117 370 120 C 340 126 280 127 220 127 C 150 127 80 126 55 122 Z"
              fill={`url(#gradBody_${uid})`}
            />

            {/* Parrilla frontal ovalada clásica */}
            <ellipse cx="370" cy="112" rx="4" ry="7" fill="#15151A" stroke="#71717A" strokeWidth="1.5" />
            {/* Rejilla interna */}
            <line x1="370" y1="107" x2="370" y2="117" stroke="#A1A1AA" strokeWidth="1" />

            {/* PATRONES DE LIVERY PARA CLASICO */}
            {designId === "diseno_1" && (
              // Doble franja central clásica
              <g>
                <path
                  d="M 55 102 C 120 96 240 96 368 110"
                  stroke={cSec}
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M 58 107 C 120 102 240 102 365 113"
                  stroke={cDet}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            )}

            {designId === "diseno_2" && (
              // Nariz contrastante (estilo Maserati/Alfa Romeo histórico)
              <path
                d="M 320 92 C 345 98 365 104 372 108 C 376 111 373 118 368 120 C 350 124 330 126 315 126 L 310 93 Z"
                fill={cSec}
              />
            )}

            {designId === "diseno_3" && (
              // Acentos geométricos retro
              <g fill={cSec}>
                <polygon points="130,90 170,90 150,118 120,118" opacity="0.9" />
                <polygon points="180,90 220,90 200,118 170,118" fill={cDet} opacity="0.8" />
              </g>
            )}

            {designId === "diseno_4" && (
              // Franjas de cola y nariz
              <g stroke={cDet} strokeWidth="4">
                <line x1="80" y1="92" x2="68" y2="120" />
                <line x1="330" y1="92" x2="335" y2="124" stroke={cSec} strokeWidth="6" />
              </g>
            )}

            {/* Cockpit abierto y Piloto Clásico */}
            {/* Abertura del habitáculo */}
            <ellipse cx="185" cy="88" rx="26" ry="6" fill="#18181B" stroke="#27272A" strokeWidth="2" />
            {/* Casco y gafas de Fangio */}
            <circle cx="182" cy="74" r="11" fill="#E4E4E7" stroke="#71717A" strokeWidth="1" />
            {/* Visera / Gafas de cuero */}
            <rect x="180" y="72" width="12" height="4" rx="2" fill="#3F3F46" />
            <circle cx="184" cy="74" r="2.5" fill="#60A5FA" />
            <circle cx="189" cy="74" r="2.5" fill="#60A5FA" />
            {/* Parabrisas aero clásico (pequeña cúpula) */}
            <path
              d="M 205 85 C 205 76 215 76 220 86 Z"
              fill="#93C5FD"
              fillOpacity="0.45"
              stroke="#60A5FA"
              strokeWidth="1"
            />
            {/* Volante de madera clásico */}
            <line x1="198" y1="80" x2="194" y2="90" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />

            {/* RUEDAS CLÁSICAS DE RAYOS (Frente y Atrás) */}
            {/* Rueda Trasera */}
            <g transform="translate(75, 114)">
              <circle cx="0" cy="0" r="28" fill={`url(#gradRubber_${uid})`} stroke="#111" strokeWidth="2" />
              <circle cx="0" cy="0" r="17" fill="none" stroke="#D4D4D8" strokeWidth="1.5" />
              {/* Rayos metálicos */}
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <line
                  key={deg}
                  x1="-16"
                  y1="0"
                  x2="16"
                  y2="0"
                  stroke="#E4E4E7"
                  strokeWidth="0.8"
                  transform={`rotate(${deg})`}
                />
              ))}
              {/* Buje central cromado tipo mariposa */}
              <circle cx="0" cy="0" r="4.5" fill="#F4F4F5" stroke="#71717A" strokeWidth="1" />
              <circle cx="0" cy="0" r="2" fill={cDet} />
            </g>

            {/* Rueda Delantera */}
            <g transform="translate(320, 114)">
              <circle cx="0" cy="0" r="27" fill={`url(#gradRubber_${uid})`} stroke="#111" strokeWidth="2" />
              <circle cx="0" cy="0" r="16" fill="none" stroke="#D4D4D8" strokeWidth="1.5" />
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <line
                  key={deg}
                  x1="-15"
                  y1="0"
                  x2="15"
                  y2="0"
                  stroke="#E4E4E7"
                  strokeWidth="0.8"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle cx="0" cy="0" r="4.5" fill="#F4F4F5" stroke="#71717A" strokeWidth="1" />
              <circle cx="0" cy="0" r="2" fill={cDet} />
            </g>
          </g>
        )}

        {/* =========================================================
            MODELO 2: RETRO SENNA (Fines 80s / Inicios 90s)
            Alerón trasero gigante, toma de aire alta, alerón delantero recto
           ========================================================= */}
        {modelId === "retro_senna" && (
          <g id="retro_senna">
            {/* Sombra */}
            <ellipse cx="200" cy="136" rx="165" ry="9" fill="#000000" fillOpacity="0.45" />

            {/* ALERÓN TRASERO GIGANTE OCHENTERO */}
            {/* Placa terminal trasera (Endplate) */}
            <path
              d="M 32 50 L 72 50 L 68 116 L 36 116 Z"
              fill={cDet}
              stroke="#111"
              strokeWidth="1.5"
            />
            {/* Planos del alerón trasero */}
            <rect x="42" y="54" width="28" height="6" rx="1" fill={cSec} />
            <rect x="42" y="66" width="26" height="5" rx="1" fill={cPrim} />

            {/* Brazo de suspensión trasero */}
            <line x1="72" y1="110" x2="110" y2="114" stroke="#222" strokeWidth="3" />

            {/* TOMA DE AIRE / AIRBOX ELEVADO Y CUBIERTA MOTOR */}
            <path
              d="M 125 75 L 155 46 C 165 44 175 48 178 60 L 180 82 Z"
              fill={cPrim}
            />
            <path
              d="M 125 75 L 155 46 C 165 44 175 48 178 60 L 180 82 Z"
              fill={`url(#gradBody_${uid})`}
            />
            {/* Boca del Airbox */}
            <ellipse cx="170" cy="52" rx="4" ry="7" fill="#111" stroke="#333" strokeWidth="1" />

            {/* CARROCERÍA Y PONTONES ANCHOS (Wedge Shape) */}
            <path
              d="M 70 106 L 120 78 L 180 82 L 235 90 L 325 110 L 358 118 L 355 125 L 220 127 L 70 126 Z"
              fill={cPrim}
            />
            <path
              d="M 70 106 L 120 78 L 180 82 L 235 90 L 325 110 L 358 118 L 355 125 L 220 127 L 70 126 Z"
              fill={`url(#gradBody_${uid})`}
            />

            {/* Pontón lateral / Radiador */}
            <path
              d="M 130 96 L 210 96 L 220 123 L 130 123 Z"
              fill={cSec}
              stroke="#18181B"
              strokeWidth="1"
            />
            {/* Entrada de aire del pontón */}
            <polygon points="208,98 218,98 218,120 208,120" fill="#0A0A0C" />

            {/* PATRONES DE LIVERY PARA RETRO SENNA */}
            {designId === "diseno_1" && (
              // Rayas dobles racing sobre pontón y trompa
              <g stroke={cDet} strokeWidth="5" strokeLinecap="round">
                <line x1="90" y1="92" x2="340" y2="116" />
                <line x1="95" y1="102" x2="330" y2="120" stroke={cSec} strokeWidth="3" />
              </g>
            )}

            {designId === "diseno_2" && (
              // Bicolor diagonal tipo Marlboro clásico Senna
              <polygon
                points="170,82 240,90 220,123 150,123"
                fill={cDet}
              />
            )}

            {designId === "diseno_3" && (
              // Trazado Tech retro en pontón
              <g fill={cDet} opacity="0.85">
                <rect x="140" y="102" width="10" height="15" rx="1" />
                <rect x="155" y="102" width="10" height="15" rx="1" />
                <rect x="170" y="102" width="10" height="15" rx="1" />
                <rect x="185" y="102" width="10" height="15" rx="1" />
              </g>
            )}

            {designId === "diseno_4" && (
              // Alerones contrastantes fluorescentes
              <path
                d="M 330 112 L 360 119 L 355 125 L 325 125 Z"
                fill={cDet}
              />
            )}

            {/* Cockpit y Casco icónico de Senna */}
            <ellipse cx="205" cy="88" rx="20" ry="7" fill="#111" />
            {/* Casco amarillo vibrante con franjas */}
            <circle cx="202" cy="76" r="10.5" fill="#FACC15" stroke="#CA8A04" strokeWidth="1" />
            <path d="M 194 77 Q 202 79 212 77" stroke="#1E3A8A" strokeWidth="2.5" />
            <path d="M 194 79.5 Q 202 81.5 212 79.5" stroke="#16A34A" strokeWidth="1.5" />
            <rect x="201" y="73" width="11" height="4" rx="1.5" fill="#18181B" />

            {/* ALERÓN DELANTERO RECTO 80s */}
            <path
              d="M 345 116 L 380 116 L 378 126 L 342 126 Z"
              fill={cDet}
              stroke="#111"
              strokeWidth="1.5"
            />
            <rect x="350" y="118" width="26" height="4" fill={cSec} />

            {/* NEUMÁTICOS SLICK ANCHOS (BBS Rims) */}
            {/* Rueda Trasera (Slick ancha) */}
            <g transform="translate(80, 114)">
              <rect x="-18" y="-28" width="36" height="56" rx="8" fill={`url(#gradRubber_${uid})`} stroke="#000" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="16" fill={`url(#gradRim_${uid})`} stroke="#EAB308" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="6" fill="#111" />
              <circle cx="0" cy="0" r="3" fill="#E10600" />
            </g>

            {/* Rueda Delantera */}
            <g transform="translate(315, 116)">
              <rect x="-14" y="-24" width="28" height="48" rx="6" fill={`url(#gradRubber_${uid})`} stroke="#000" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="14" fill={`url(#gradRim_${uid})`} stroke="#EAB308" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="5" fill="#111" />
              <circle cx="0" cy="0" r="2.5" fill="#E10600" />
            </g>
          </g>
        )}

        {/* =========================================================
            MODELO 3: V10 SCHUMACHER (Años 2000s)
            Nariz alta con pilares curvos, branquias aerodinámicas, alerón bajo
           ========================================================= */}
        {modelId === "v10_schumacher" && (
          <g id="v10_schumacher">
            {/* Sombra */}
            <ellipse cx="200" cy="136" rx="165" ry="8" fill="#000000" fillOpacity="0.45" />

            {/* ALERÓN TRASERO CURVADO 2000s */}
            <path
              d="M 40 68 L 74 68 L 68 116 L 44 116 Z"
              fill={cSec}
              stroke="#111"
              strokeWidth="1.5"
            />
            <rect x="48" y="72" width="22" height="5" rx="1" fill={cDet} />
            <rect x="48" y="80" width="20" height="4" rx="1" fill={cPrim} />

            {/* CUBIERTA DE MOTOR Y TOMA DE AIRE V10 */}
            <path
              d="M 100 84 C 115 62 145 54 165 54 C 172 54 176 60 178 72 L 180 84 Z"
              fill={cPrim}
            />
            <path
              d="M 100 84 C 115 62 145 54 165 54 C 172 54 176 60 178 72 L 180 84 Z"
              fill={`url(#gradBody_${uid})`}
            />
            {/* Airbox ovalado V10 */}
            <ellipse cx="168" cy="62" rx="3.5" ry="6" fill="#111" />

            {/* CHIMENEAS Y BRANQUIAS DE REFRIGERACIÓN (Icono 2000s) */}
            <path d="M 145 78 L 148 70 L 153 71 L 150 79 Z" fill="#27272A" stroke="#52525B" strokeWidth="0.8" />
            <line x1="130" y1="84" x2="140" y2="84" stroke="#18181B" strokeWidth="1.5" />
            <line x1="128" y1="87" x2="138" y2="87" stroke="#18181B" strokeWidth="1.5" />
            <line x1="126" y1="90" x2="136" y2="90" stroke="#18181B" strokeWidth="1.5" />

            {/* FUSELAJE CON NARIZ ALTA Y FLUIDA */}
            <path
              d="M 72 108 L 115 82 L 185 84 L 245 88 L 330 96 L 360 102 L 350 114 L 320 114 L 235 125 L 75 126 Z"
              fill={cPrim}
            />
            <path
              d="M 72 108 L 115 82 L 185 84 L 245 88 L 330 96 L 360 102 L 350 114 L 320 114 L 235 125 L 75 126 Z"
              fill={`url(#gradBody_${uid})`}
            />

            {/* Pilares curvos colgantes hacia el alerón delantero */}
            <path d="M 345 104 L 350 120 L 354 120 L 352 105 Z" fill="#27272A" />

            {/* Pontón esculpido con corte bajo */}
            <path
              d="M 125 96 C 160 95 200 95 225 104 L 220 124 L 125 124 Z"
              fill={cSec}
            />

            {/* PATRONES DE LIVERY PARA V10 */}
            {designId === "diseno_1" && (
              // Líneas aerodinámicas curvas
              <path
                d="M 90 92 Q 220 85 350 103"
                stroke={cDet}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {designId === "diseno_2" && (
              // División en flecha deportiva
              <polygon
                points="240,88 335,97 320,114 225,114"
                fill={cDet}
              />
            )}

            {designId === "diseno_3" && (
              // Patrón dinámico de velocidad en pontones
              <g stroke={cDet} strokeWidth="3" strokeLinecap="round">
                <line x1="140" y1="102" x2="160" y2="120" />
                <line x1="155" y1="102" x2="175" y2="120" />
                <line x1="170" y1="102" x2="190" y2="120" />
                <line x1="185" y1="102" x2="205" y2="120" />
              </g>
            )}

            {designId === "diseno_4" && (
              // Detalles alares y espejos
              <g fill={cDet}>
                <polygon points="340,116 375,116 372,124 338,124" />
                <circle cx="230" cy="85" r="3" />
              </g>
            )}

            {/* Cockpit & Piloto Schumacher */}
            <ellipse cx="206" cy="87" rx="18" ry="6" fill="#18181B" />
            <circle cx="203" cy="76" r="10" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
            <rect x="202" y="73" width="10" height="4" rx="1.5" fill="#18181B" />
            {/* Espejos retrovisores aerodinámicos */}
            <rect x="230" y="84" width="4" height="6" rx="1" fill="#27272A" />

            {/* ALERÓN DELANTERO EN FLECHA */}
            <path
              d="M 335 118 L 375 118 L 370 125 L 332 125 Z"
              fill={cDet}
              stroke="#111"
              strokeWidth="1"
            />

            {/* NEUMÁTICOS CON SURCOS REGLAMENTARIOS (Grooved tires) */}
            {/* Rueda Trasera */}
            <g transform="translate(80, 114)">
              <circle cx="0" cy="0" r="27" fill={`url(#gradRubber_${uid})`} stroke="#111" strokeWidth="2" />
              {/* 4 surcos circulares concéntricos */}
              <circle cx="0" cy="0" r="23" fill="none" stroke="#3F3F46" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="15" fill={`url(#gradRim_${uid})`} stroke="#71717A" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="5" fill="#111" />
              <circle cx="0" cy="0" r="2.5" fill={cDet} />
            </g>

            {/* Rueda Delantera */}
            <g transform="translate(315, 114)">
              <circle cx="0" cy="0" r="25" fill={`url(#gradRubber_${uid})`} stroke="#111" strokeWidth="2" />
              <circle cx="0" cy="0" r="21" fill="none" stroke="#3F3F46" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="14" fill={`url(#gradRim_${uid})`} stroke="#71717A" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="4.5" fill="#111" />
              <circle cx="0" cy="0" r="2" fill={cDet} />
            </g>
          </g>
        )}

        {/* =========================================================
            MODELO 4: ACTUAL 2026 (Efecto Suelo, Halo, Llantas 18", Aletas)
           ========================================================= */}
        {modelId === "actual_2026" && (
          <g id="actual_2026">
            {/* Sombra */}
            <ellipse cx="200" cy="136" rx="168" ry="8" fill="#000000" fillOpacity="0.45" />

            {/* ALERÓN TRASERO CURVO Y MODERNO CON ACTUADOR DRS */}
            <path
              d="M 38 60 C 50 60 72 65 72 75 L 68 116 L 40 116 Z"
              fill={cSec}
              stroke="#111"
              strokeWidth="1.5"
            />
            {/* Flap principal y DRS */}
            <path d="M 45 62 L 70 65 L 68 70 L 44 68 Z" fill={cDet} />
            <rect x="52" y="58" width="6" height="4" rx="1" fill="#E10600" />
            {/* Luces LED de lluvia en el borde del endplate */}
            <line x1="40" y1="75" x2="40" y2="105" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* ALETA DE TIBURÓN (Shark Fin en cubierta de motor) */}
            <polygon points="90,82 155,54 165,80 90,82" fill={cSec} opacity="0.95" />
            <line x1="90" y1="82" x2="155" y2="54" stroke={cDet} strokeWidth="2" />

            {/* TOMA DE AIRE / AIRBOX MODERNO */}
            <path
              d="M 120 78 L 155 52 C 165 50 174 54 176 66 L 178 82 Z"
              fill={cPrim}
            />
            <path
              d="M 120 78 L 155 52 C 165 50 174 54 176 66 L 178 82 Z"
              fill={`url(#gradBody_${uid})`}
            />
            {/* Cámara T-Cam en el techo del airbox */}
            <rect x="157" y="47" width="8" height="4" rx="1" fill="#000000" stroke="#FACC15" strokeWidth="1" />

            {/* CARROCERÍA CON EFECTO SUELO Y SUELO ESCULPIDO */}
            <path
              d="M 68 112 L 115 82 L 180 84 L 245 88 L 330 102 L 372 116 L 366 125 L 230 126 L 68 126 Z"
              fill={cPrim}
            />
            <path
              d="M 68 112 L 115 82 L 180 84 L 245 88 L 330 102 L 372 116 L 366 125 L 230 126 L 68 126 Z"
              fill={`url(#gradBody_${uid})`}
            />

            {/* Túneles de efecto suelo en la parte inferior */}
            <path
              d="M 120 104 C 160 102 200 102 225 108 L 220 125 L 115 125 Z"
              fill={cSec}
              stroke="#09090B"
              strokeWidth="1"
            />
            {/* Borde del piso de carbono (Floor edge wing) */}
            <rect x="130" y="122" width="85" height="3" rx="1" fill="#27272A" stroke={cDet} strokeWidth="0.8" />

            {/* PATRONES DE LIVERY PARA MODERNO 2026 */}
            {designId === "diseno_1" && (
              // Franjas aerodinámicas fluidas
              <g fill="none" strokeWidth="4" strokeLinecap="round">
                <path d="M 85 96 C 180 88 280 96 360 114" stroke={cSec} strokeWidth="6" />
                <path d="M 90 102 C 180 94 280 102 355 118" stroke={cDet} strokeWidth="2.5" />
              </g>
            )}

            {designId === "diseno_2" && (
              // Flecha bífida moderna
              <polygon
                points="235,90 345,104 330,118 220,118"
                fill={cDet}
              />
            )}

            {designId === "diseno_3" && (
              // Polígonos de tecnología avanzada / Mesh
              <g fill={cDet} opacity="0.85">
                <polygon points="140,104 150,96 160,104 150,112" />
                <polygon points="165,104 175,96 185,104 175,112" />
                <polygon points="190,104 200,96 210,104 200,112" />
              </g>
            )}

            {designId === "diseno_4" && (
              // Acentos integrados en difusor y pontones
              <g stroke={cDet} strokeWidth="3" fill="none">
                <path d="M 125 115 L 220 115" />
                <path d="M 335 110 L 368 122" />
              </g>
            )}

            {/* COCKPIT Y HALO DE TITANIO (Distintivo F1 moderna) */}
            <ellipse cx="206" cy="88" rx="20" ry="7" fill="#111" />
            {/* Piloto */}
            <circle cx="204" cy="78" r="9" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <rect x="202" y="75" width="10" height="4" rx="1.5" fill="#38BDF8" />
            {/* Estructura HALO */}
            {/* Pilar frontal central */}
            <line x1="242" y1="88" x2="238" y2="76" stroke={cDet} strokeWidth="3.5" strokeLinecap="round" />
            {/* Anillo de protección superior */}
            <path
              d="M 188 78 C 190 73 236 73 240 76"
              fill="none"
              stroke={cDet}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 188 78 C 190 73 236 73 240 76"
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.3"
            />

            {/* ALERÓN DELANTERO MODERNO Y DEFLECTORES DE RUEDAS (Eyebrows) */}
            {/* Deflector sobre la rueda delantera */}
            <path
              d="M 292 98 C 305 92 325 94 338 102"
              fill="none"
              stroke="#27272A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Alerón delantero curvado de 4 planos */}
            <path
              d="M 345 115 C 360 115 380 118 382 124 L 340 126 Z"
              fill={cDet}
              stroke="#18181B"
              strokeWidth="1"
            />
            <path d="M 348 118 L 378 120" stroke={cSec} strokeWidth="2" />

            {/* RUEDAS MODERNAS DE 18 PULGADAS CON TAPACUBOS */}
            {/* Rueda Trasera */}
            <g transform="translate(80, 114)">
              <circle cx="0" cy="0" r="28" fill={`url(#gradRubber_${uid})`} stroke="#000" strokeWidth="2" />
              {/* Llanta de 18 pulgadas (radio mayor que las antiguas de 13) */}
              <circle cx="0" cy="0" r="19" fill={`url(#gradRim_${uid})`} stroke="#3F3F46" strokeWidth="1.5" />
              {/* Tapacubos aerodinámico (Wheel cover con color secundario) */}
              <circle cx="0" cy="0" r="14" fill="#18181B" stroke={cSec} strokeWidth="2" />
              {/* Acento central */}
              <circle cx="0" cy="0" r="5" fill={cDet} />
              <circle cx="0" cy="0" r="2" fill="#E10600" />
            </g>

            {/* Rueda Delantera */}
            <g transform="translate(315, 114)">
              <circle cx="0" cy="0" r="28" fill={`url(#gradRubber_${uid})`} stroke="#000" strokeWidth="2" />
              <circle cx="0" cy="0" r="19" fill={`url(#gradRim_${uid})`} stroke="#3F3F46" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="14" fill="#18181B" stroke={cSec} strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill={cDet} />
              <circle cx="0" cy="0" r="2" fill="#E10600" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
