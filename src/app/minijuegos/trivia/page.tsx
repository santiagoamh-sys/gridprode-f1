"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import {
  Brain,
  ArrowLeft,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Gamepad2,
  Sparkles,
} from "lucide-react";

interface TriviaQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  category: string;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    category: "Historia Argentina en F1",
    question:
      "¿Con qué escudería debutó oficialmente Franco Colapinto en la Fórmula 1 durante el Gran Premio de Italia 2024 en Monza?",
    options: ["Alpine", "Williams Racing", "Sauber", "Haas F1 Team"],
    correctIndex: 1,
  },
  {
    id: 2,
    category: "Récords Históricos",
    question:
      "¿Qué pilotos comparten el récord histórico de 7 Campeonatos Mundiales de Pilotos de Fórmula 1?",
    options: [
      "Ayrton Senna y Alain Prost",
      "Juan Manuel Fangio y Sebastian Vettel",
      "Michael Schumacher y Lewis Hamilton",
      "Max Verstappen y Niki Lauda",
    ],
    correctIndex: 2,
  },
  {
    id: 3,
    category: "Reglamento Técnico",
    question:
      "¿Cómo se llama el sistema aerodinámico móvil del alerón trasero que reduce la resistencia al aire para facilitar los adelantamientos?",
    options: [
      "ERS (Energy Recovery System)",
      "DRS (Drag Reduction System)",
      "KERS (Kinetic Energy System)",
      "MGU-K (Motor Generator Unit)",
    ],
    correctIndex: 1,
  },
  {
    id: 4,
    category: "Circuitos Legendarios",
    question:
      "¿Cuál es la famosa combinación de curvas en subida del circuito de Spa-Francorchamps considerada una de las más exigentes del mundo?",
    options: [
      "Maggotts y Becketts",
      "Parabólica / Alboreto",
      "Eau Rouge y Raidillon",
      "S de Senna",
    ],
    correctIndex: 2,
  },
  {
    id: 5,
    category: "Estrategia de Carrera",
    question:
      "En neumáticos de seco Pirelli de Fórmula 1, ¿qué color identifica al compuesto Blando (Soft), el más rápido a una vuelta?",
    options: ["Blanco", "Amarillo", "Rojo", "Verde"],
    correctIndex: 2,
  },
];

const QUESTION_TIME_MS = 10000; // 10 segundos por pregunta
const TICK_INTERVAL_MS = 100;

export default function TriviaGamePage() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(QUESTION_TIME_MS);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [answersSummary, setAnswersSummary] = useState<
    Array<{ questionId: number; selected: number | null; isCorrect: boolean }>
  >([]);

  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = TRIVIA_QUESTIONS[currentIndex];

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  // Avanza a la siguiente pregunta o finaliza el cuestionario
  const moveToNextQuestion = useCallback(() => {
    clearAdvanceTimeout();
    if (currentIndex + 1 < TRIVIA_QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsLocked(false);
      setTimeLeftMs(QUESTION_TIME_MS);
    } else {
      setIsFinished(true);
    }
  }, [clearAdvanceTimeout, currentIndex]);

  // Procesa la selección de una opción o el vencimiento del tiempo (optionIdx = null)
  const handleSelectOption = useCallback(
    (optionIdx: number | null) => {
      if (isLocked || isFinished) return;
      setIsLocked(true);
      setSelectedOption(optionIdx);

      const isCorrect =
        optionIdx !== null && optionIdx === currentQuestion.correctIndex;

      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      setAnswersSummary((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selected: optionIdx,
          isCorrect,
        },
      ]);

      // Pasar automáticamente a la siguiente pregunta tras breve feedback visual
      advanceTimeoutRef.current = setTimeout(() => {
        moveToNextQuestion();
      }, 650);
    },
    [currentQuestion, isFinished, isLocked, moveToNextQuestion]
  );

  // Temporizador regresivo de 10 segundos por pregunta
  useEffect(() => {
    if (isFinished || isLocked) return;

    const interval = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= TICK_INTERVAL_MS) {
          clearInterval(interval);
          return 0;
        }
        return prev - TICK_INTERVAL_MS;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [currentIndex, isFinished, isLocked]);

  // Cuando el temporizador llega a 0, avanzar automáticamente
  useEffect(() => {
    if (timeLeftMs === 0 && !isLocked && !isFinished) {
      handleSelectOption(null);
    }
  }, [timeLeftMs, isLocked, isFinished, handleSelectOption]);

  useEffect(() => {
    return () => {
      clearAdvanceTimeout();
    };
  }, [clearAdvanceTimeout]);

  const handleRestartTrivia = () => {
    clearAdvanceTimeout();
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsLocked(false);
    setTimeLeftMs(QUESTION_TIME_MS);
    setAnswersSummary([]);
    setIsFinished(false);
  };

  const progressRatio = Math.max(0, Math.min(1, timeLeftMs / QUESTION_TIME_MS));
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const isUrgent = secondsLeft <= 3;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
          {/* Barra superior de navegación */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/minijuegos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F27]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-[#D0D0D2] hover:text-white hover:border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver al Hub de Minijuegos</span>
            </Link>

            {!isFinished && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1F1F27]/80 border border-white/10 text-xs font-bold text-white">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Aciertos: <strong className="text-amber-400">{score}</strong> /{" "}
                  {TRIVIA_QUESTIONS.length}
                </span>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* VISTA DE PREGUNTA ACTIVA                                        */}
          {/* =============================================================== */}
          {!isFinished ? (
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-9 shadow-2xl space-y-7">
              {/* Cabecera: Contador de pregunta + Temporizador numérico */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
                    <Brain className="w-3.5 h-3.5" />
                    {currentQuestion.category}
                  </span>
                  <p className="text-xs font-bold text-[#8E8E93]">
                    Pregunta{" "}
                    <span className="text-white font-black">
                      {currentIndex + 1}
                    </span>{" "}
                    de {TRIVIA_QUESTIONS.length}
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-black transition-colors ${
                    isUrgent
                      ? "bg-red-950/60 border-[#E10600] text-[#E10600] animate-pulse"
                      : "bg-[#15151E] border-white/10 text-white"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{secondsLeft}s</span>
                </div>
              </div>

              {/* Barra de Progreso del Temporizador (10 segundos) animada por transform */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-[#15151E] border border-white/10 overflow-hidden">
                  <div
                    className={`h-full w-full origin-left transition-transform duration-100 ease-linear motion-reduce:transition-none rounded-full ${
                      isUrgent
                        ? "bg-[#E10600] shadow-[0_0_12px_#E10600]"
                        : "bg-gradient-to-r from-amber-400 to-orange-500"
                    }`}
                    style={{ transform: `scaleX(${progressRatio})` }}
                  />
                </div>
              </div>

              {/* Enunciado de la Pregunta */}
              <div className="py-2">
                <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Opciones Múltiple Choice (4 opciones) */}
              <div className="grid grid-cols-1 gap-3.5">
                {currentQuestion.options.map((optionText, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOption = idx === currentQuestion.correctIndex;

                  let buttonStyle =
                    "bg-[#15151E]/90 border-white/10 text-[#D0D0D2] hover:border-amber-400/60 hover:text-white hover:bg-[#1E1E2A]";

                  if (isLocked) {
                    if (isCorrectOption) {
                      buttonStyle =
                        "bg-emerald-950/60 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]";
                    } else if (isSelected && !isCorrectOption) {
                      buttonStyle =
                        "bg-red-950/60 border-[#E10600] text-red-200";
                    } else {
                      buttonStyle =
                        "bg-[#15151E]/40 border-white/5 text-[#8E8E93] opacity-60";
                    }
                  }

                  const optionLetters = ["A", "B", "C", "D"];

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 cursor-pointer disabled:cursor-default ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 border ${
                            isLocked && isCorrectOption
                              ? "bg-emerald-500 text-[#09090D] border-emerald-300"
                              : isLocked && isSelected && !isCorrectOption
                              ? "bg-[#E10600] text-white border-red-300"
                              : "bg-[#1F1F27] text-amber-400 border-white/10"
                          }`}
                        >
                          {optionLetters[idx]}
                        </span>
                        <span className="text-sm sm:text-base font-bold">
                          {optionText}
                        </span>
                      </div>

                      {isLocked && isCorrectOption && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isLocked && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 text-[#E10600] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* PANTALLA DE RESULTADOS FINALES                                  */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-7 sm:p-10 shadow-2xl text-center space-y-8 animate-in fade-in duration-300">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trivia Completada</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Resultados de tu Trivia
                </h1>
                <p className="text-sm text-[#8E8E93] max-w-md mx-auto">
                  {score === 5
                    ? "¡Pleno absoluto! Tienes conocimiento de Ingeniero Jefe de Pista."
                    : score >= 3
                    ? "¡Gran desempeño! Sumaste buenos puntos para el campeonato."
                    : "Sigue entrenando en el simulador para la próxima semana."}
                </p>
              </div>

              {/* Tarjeta de Puntaje Total */}
              <div className="max-w-sm mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-6 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-[#8E8E93]">
                  Puntaje Total Obtenido
                </p>
                <p className="text-5xl font-black font-mono text-white">
                  {score}{" "}
                  <span className="text-2xl text-[#8E8E93]">
                    / {TRIVIA_QUESTIONS.length}
                  </span>
                </p>
                <p className="text-xs font-bold text-amber-400 pt-1">
                  {Math.round((score / TRIVIA_QUESTIONS.length) * 100)}% de efectividad
                </p>
              </div>

              {/* Resumen rápido por pregunta */}
              <div className="flex items-center justify-center gap-2.5">
                {answersSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black border ${
                      item.isCorrect
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                        : "bg-red-950/60 border-[#E10600]/50 text-[#E10600]"
                    }`}
                    title={`Pregunta #${idx + 1}: ${
                      item.isCorrect ? "Correcta" : "Incorrecta / Tiempo agotado"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                ))}
              </div>

              {/* Botones de Acción Final */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleRestartTrivia}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#15151E] hover:bg-[#252532] border border-white/15 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Jugar de Nuevo</span>
                </button>

                <Link
                  href="/minijuegos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
