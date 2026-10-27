"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar, isEmailInInitialAdmins } from "@/components/Navbar";
import {
  TriviaConfig,
  TriviaQuestion,
  DEFAULT_MEXICO_TRIVIA,
} from "@/data/triviaData";
import {
  getActiveTrivia,
  checkUserTriviaStatus,
  saveUserTriviaResult,
  resetAndPublishTrivia,
} from "@/lib/firebase/triviaService";
import {
  Brain,
  ArrowLeft,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  Gamepad2,
  Sparkles,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Flag,
} from "lucide-react";

const QUESTION_TIME_MS = 15000; // 15 segundos por pregunta
const TICK_INTERVAL_MS = 100;

export default function TriviaGamePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin =
    isEmailInInitialAdmins(user?.email) || profile?.role === "Administrador";

  // Configuración de Trivia activa (GP de México)
  const [triviaConfig, setTriviaConfig] =
    useState<TriviaConfig>(DEFAULT_MEXICO_TRIVIA);

  // Estados de verificación y bloqueo en Firestore
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [isSavingResult, setIsSavingResult] = useState<boolean>(false);
  const [adminSyncing, setAdminSyncing] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // Estados del juego de Trivia
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

  const questions = triviaConfig.preguntas || DEFAULT_MEXICO_TRIVIA.preguntas;
  const currentQuestion: TriviaQuestion =
    questions[currentIndex] || questions[0];

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  // 1. Cargar la trivia activa y verificar si el usuario ya participó
  const loadTriviaAndUserStatus = useCallback(async () => {
    if (authLoading) return;

    try {
      setCheckingStatus(true);
      // a) Obtener configuración oficial de la trivia en Firebase
      const active = await getActiveTrivia();
      setTriviaConfig(active);

      // b) Si el usuario está autenticado, comprobar si ya jugó a esta trivia específica
      if (user?.uid) {
        const { hasPlayed: played, score: prevScore } =
          await checkUserTriviaStatus(user.uid, active.id);
        setHasPlayed(played);
        setPreviousScore(prevScore);
      } else {
        setHasPlayed(false);
      }
    } catch (error) {
      console.error("Error al cargar trivia y verificar estado:", error);
    } finally {
      setCheckingStatus(false);
    }
  }, [authLoading, user?.uid]);

  useEffect(() => {
    loadTriviaAndUserStatus();
  }, [loadTriviaAndUserStatus]);

  // 2. Guardar resultado final en Firestore al completar las 5 preguntas
  const saveFinalScoreAndFinish = useCallback(
    async (finalScore: number) => {
      try {
        setIsSavingResult(true);
        if (user?.uid) {
          await saveUserTriviaResult(
            user.uid,
            triviaConfig.id,
            finalScore,
            questions.length,
            answersSummary
          );
        }
      } catch (error) {
        console.error("Error al guardar el resultado de la trivia en Firestore:", error);
      } finally {
        setIsSavingResult(false);
        setIsFinished(true);
      }
    },
    [user?.uid, triviaConfig.id, questions.length, answersSummary]
  );

  // Avanza a la siguiente pregunta o guarda y finaliza
  const moveToNextQuestion = useCallback(
    (updatedScore: number) => {
      clearAdvanceTimeout();
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsLocked(false);
        setTimeLeftMs(QUESTION_TIME_MS);
      } else {
        saveFinalScoreAndFinish(updatedScore);
      }
    },
    [clearAdvanceTimeout, currentIndex, questions.length, saveFinalScoreAndFinish]
  );

  // Procesa la selección de una opción o el vencimiento del tiempo
  const handleSelectOption = useCallback(
    (optionIdx: number | null) => {
      if (
        checkingStatus ||
        hasPlayed ||
        isLocked ||
        isFinished ||
        isSavingResult ||
        triviaConfig.estado === "finalizada"
      ) {
        return;
      }
      setIsLocked(true);
      setSelectedOption(optionIdx);

      const isCorrect =
        optionIdx !== null && optionIdx === currentQuestion.correctIndex;

      const nextScore = isCorrect ? score + 1 : score;
      if (isCorrect) {
        setScore(nextScore);
      }

      setAnswersSummary((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selected: optionIdx,
          isCorrect,
        },
      ]);

      advanceTimeoutRef.current = setTimeout(() => {
        moveToNextQuestion(nextScore);
      }, 700);
    },
    [
      checkingStatus,
      currentQuestion,
      hasPlayed,
      isFinished,
      isLocked,
      isSavingResult,
      moveToNextQuestion,
      score,
      triviaConfig.estado,
    ]
  );

  // Temporizador regresivo de 15 segundos
  useEffect(() => {
    if (
      checkingStatus ||
      hasPlayed ||
      isFinished ||
      isLocked ||
      isSavingResult ||
      triviaConfig.estado === "finalizada"
    ) {
      return;
    }

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
  }, [
    checkingStatus,
    currentIndex,
    hasPlayed,
    isFinished,
    isLocked,
    isSavingResult,
    triviaConfig.estado,
  ]);

  // Si el temporizador llega a 0, avanza automáticamente
  useEffect(() => {
    if (
      !checkingStatus &&
      !hasPlayed &&
      timeLeftMs === 0 &&
      !isLocked &&
      !isFinished &&
      !isSavingResult &&
      triviaConfig.estado === "activa"
    ) {
      handleSelectOption(null);
    }
  }, [
    checkingStatus,
    hasPlayed,
    timeLeftMs,
    isLocked,
    isFinished,
    isSavingResult,
    triviaConfig.estado,
    handleSelectOption,
  ]);

  useEffect(() => {
    return () => {
      clearAdvanceTimeout();
    };
  }, [clearAdvanceTimeout]);

  // Función exclusiva para que el Administrador reactive la trivia en Firebase
  const handleAdminResetAndActivate = async () => {
    if (!isAdmin) return;
    try {
      setAdminSyncing(true);
      setAdminMsg(null);
      await resetAndPublishTrivia(DEFAULT_MEXICO_TRIVIA, false);
      await loadTriviaAndUserStatus();
      setAdminMsg("¡Trivia de México activada en Firebase exitosamente!");
      setTimeout(() => setAdminMsg(null), 4000);
    } catch (err: any) {
      console.error("Error al reactivar trivia como admin:", err);
      setAdminMsg(err.message || "Error al activar trivia.");
    } finally {
      setAdminSyncing(false);
    }
  };

  const progressRatio = Math.max(0, Math.min(1, timeLeftMs / QUESTION_TIME_MS));
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const isUrgent = secondsLeft <= 3;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
          {/* BARRA SUPERIOR DE ADMINISTRADOR (SOLO ADMINS) */}
          {isAdmin && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Control de Admin • Estado en Firebase:{" "}
                  <strong className="text-white uppercase">
                    {triviaConfig.estado}
                  </strong>{" "}
                  ({triviaConfig.titulo})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {adminMsg && (
                  <span className="text-[11px] font-bold text-emerald-400">
                    {adminMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAdminResetAndActivate}
                  disabled={adminSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      adminSyncing ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {adminSyncing
                      ? "Actualizando..."
                      : "Publicar / Resetear en Firebase"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Barra superior de navegación */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/minijuegos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F27]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-[#D0D0D2] hover:text-white hover:border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver al Hub de Minijuegos</span>
            </Link>

            {!checkingStatus &&
              !hasPlayed &&
              !isFinished &&
              triviaConfig.estado === "activa" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1F1F27]/80 border border-white/10 text-xs font-bold text-white">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Aciertos:{" "}
                    <strong className="text-amber-400">{score}</strong> /{" "}
                    {questions.length}
                  </span>
                </div>
              )}
          </div>

          {/* =============================================================== */}
          {/* 1. ESTADO DE CARGA                                              */}
          {/* =============================================================== */}
          {checkingStatus || isSavingResult ? (
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-10 sm:p-14 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {isSavingResult
                    ? "Guardando tu puntaje oficial..."
                    : "Cargando trivia del GP de México..."}
                </h2>
                <p className="text-xs sm:text-sm text-[#8E8E93]">
                  {isSavingResult
                    ? "Registrando tus respuestas en Firebase Firestore."
                    : "Comprobando la disponibilidad y tu participación en la base de datos."}
                </p>
              </div>
            </div>
          ) : triviaConfig.estado === "finalizada" ? (
            /* =============================================================== */
            /* 2. PANTALLA DE TRIVIA FINALIZADA                                */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-7 sm:p-10 shadow-2xl text-center space-y-8 animate-in fade-in duration-200">
              <div className="w-20 h-20 rounded-3xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
                <Lock className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider">
                  <span>Trivia Cerrada • {triviaConfig.id.toUpperCase()}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  La trivia de esta semana ha finalizado
                </h1>
                <p className="text-xs sm:text-sm text-[#8E8E93] max-w-md mx-auto leading-relaxed">
                  El período de participación para este Gran Premio ha cerrado. ¡Mantente atento para el próximo evento del calendario!
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-center">
                <Link
                  href="/minijuegos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : hasPlayed ? (
            /* =============================================================== */
            /* 3. PANTALLA ESTÁTICA DE 'YA PARTICIPASTE'                        */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-7 sm:p-10 shadow-2xl text-center space-y-8 animate-in fade-in duration-200">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Lock className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Participación Registrada • {triviaConfig.id.toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Ya completaste la trivia de México de esta semana
                </h1>
                <p className="text-xs sm:text-sm text-[#8E8E93] max-w-md mx-auto leading-relaxed">
                  Solo se permite un intento oficial por Gran Premio. Tu puntaje para el Gran Premio de México ya se encuentra guardado en tu perfil.
                </p>
              </div>

              {/* Tarjeta con el puntaje obtenido */}
              <div className="max-w-sm mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-6 space-y-2 shadow-inner">
                <p className="text-xs font-black uppercase tracking-widest text-[#8E8E93]">
                  Puntaje Obtenido
                </p>
                <p className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
                  {previousScore ?? 0}/{questions.length} respuestas correctas
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-center">
                <Link
                  href="/minijuegos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Volver al Hub de Minijuegos</span>
                </Link>
              </div>
            </div>
          ) : !isFinished ? (
            /* =============================================================== */
            /* 4. VISTA DE PREGUNTA ACTIVA                                     */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-9 shadow-2xl space-y-7">
              {/* Cabecera: Contador de pregunta + Temporizador numérico */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
                    <Flag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentQuestion.category}</span>
                  </span>
                  <p className="text-xs font-bold text-[#8E8E93]">
                    Pregunta{" "}
                    <span className="text-white font-black">
                      {currentIndex + 1}
                    </span>{" "}
                    de {questions.length}
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

              {/* Barra de Progreso del Temporizador (15 segundos) */}
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
            /* 5. PANTALLA DE RESULTADOS FINALES                              */
            /* =============================================================== */
            <div className="rounded-3xl bg-[#1F1F27]/80 backdrop-blur-xl border border-white/10 p-7 sm:p-10 shadow-2xl text-center space-y-8 animate-in fade-in duration-300">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Puntaje Guardado • {triviaConfig.id.toUpperCase()}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Resultados de tu Trivia • GP de México
                </h1>
                <p className="text-sm text-[#8E8E93] max-w-md mx-auto">
                  {score === 5
                    ? "¡Pleno absoluto en el Hermanos Rodríguez! Tu conocimiento sobre el Gran Premio de México es legendario."
                    : score >= 3
                    ? "¡Gran desempeño en México! Tu resultado ha quedado registrado oficialmente."
                    : "Tu participación en el GP de México ha quedado registrada. ¡Nos vemos en Brasil!"}
                </p>
              </div>

              {/* Tarjeta de Puntaje Total */}
              <div className="max-w-sm mx-auto rounded-2xl bg-[#15151E]/95 border border-white/10 p-6 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-[#8E8E93]">
                  Puntaje Total Obtenido
                </p>
                <p className="text-4xl sm:text-5xl font-black font-mono text-white">
                  {score}/{questions.length}
                </p>
                <p className="text-xs font-bold text-amber-400 pt-1">
                  {score}/{questions.length} respuestas correctas (
                  {Math.round((score / questions.length) * 100)}%)
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
                      item.isCorrect
                        ? "Correcta"
                        : "Incorrecta / Tiempo agotado"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                ))}
              </div>

              {/* Botón de retorno al Hub */}
              <div className="flex items-center justify-center pt-4 border-t border-white/10">
                <Link
                  href="/minijuegos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
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
