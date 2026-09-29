"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { GrandPrix, RespuestasPrediccion } from "@/types/f1";
import { useAuth } from "@/context/AuthContext";
import {
  getPrediccionUsuario,
  guardarPrediccion,
} from "@/lib/firebase/f1Service";
import {
  normalizeDriverList,
  normalizeDnfCount,
} from "@/lib/scoringEngine";

export interface WizardState {
  q1Eliminated: string[]; // 6 pilotos
  q2Eliminated: string[]; // 6 pilotos
  q3Grid: (string | null)[]; // 10 casilleros (índice 0 = P1 Pole, índice 9 = P10)
  p1: string | null;
  p2: string | null;
  p3: string | null;
  dnfCount: number | null;
  escuderiaId: string | null;
  pilotoDelDiaId: string | null;
  posicionColapinto: number | null; // 1..22 o 0 (DNF)
  sprintPole: string | null;
  sprintP1: string | null;
  sprintP2: string | null;
  sprintP3: string | null;
}

const createInitialWizardState = (): WizardState => ({
  q1Eliminated: [],
  q2Eliminated: [],
  q3Grid: Array(10).fill(null),
  p1: null,
  p2: null,
  p3: null,
  dnfCount: 2,
  escuderiaId: null,
  pilotoDelDiaId: null,
  posicionColapinto: 10,
  sprintPole: null,
  sprintP1: null,
  sprintP2: null,
  sprintP3: null,
});

interface PredictionWizardContextType {
  activeGp: GrandPrix | null;
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  state: WizardState;
  loadingExisting: boolean;
  submitting: boolean;
  isLockedByTime: boolean;
  minutesUntilLock: number | null;
  openWizard: (gp: GrandPrix) => Promise<void>;
  closeWizard: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  toggleQ1Driver: (driverId: string) => void;
  toggleQ2Driver: (driverId: string) => void;
  assignQ3Position: (positionIndex: number, driverId: string | null) => void;
  autoFillRemainingQ3: (availableDrivers: string[]) => void;
  clearQ3Grid: () => void;
  assignRacePodium: (slot: "p1" | "p2" | "p3", driverId: string | null) => void;
  setDnfCount: (count: number | null) => void;
  setEscuderiaId: (teamId: string | null) => void;
  setPilotoDelDiaId: (driverId: string | null) => void;
  setPosicionColapinto: (pos: number | null) => void;
  assignSprintField: (
    slot: "sprintPole" | "sprintP1" | "sprintP2" | "sprintP3",
    driverId: string | null
  ) => void;
  canProceedCurrentStep: () => boolean;
  submitPrediction: () => Promise<boolean>;
}

const PredictionWizardContext = createContext<
  PredictionWizardContextType | undefined
>(undefined);

export const PredictionWizardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const [activeGp, setActiveGp] = useState<GrandPrix | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(createInitialWizardState);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Total de pasos: 7 para GP normal, 8 si tiene carrera Sprint
  const totalSteps = activeGp?.isSprint ? 8 : 7;

  // Bloqueo si faltan menos de 60 minutos para qualyStartTime
  const qualyTimeMs = activeGp
    ? new Date(activeGp.qualyStartTime).getTime()
    : null;
  const nowMs = Date.now();
  const diffMinutes =
    qualyTimeMs && !isNaN(qualyTimeMs)
      ? Math.floor((qualyTimeMs - nowMs) / (1000 * 60))
      : null;
  const isLockedByTime =
    activeGp?.estado === "finalizado" ||
    activeGp?.estado === "cancelado" ||
    (diffMinutes !== null && diffMinutes < 60);

  const openWizard = useCallback(
    async (gp: GrandPrix) => {
      setActiveGp(gp);
      setCurrentStep(1);
      setState(createInitialWizardState());
      setIsOpen(true);

      if (!user) return;
      try {
        setLoadingExisting(true);
        const existing = await getPrediccionUsuario(user.uid, gp.id);
        if (existing?.respuestas) {
          const r = existing.respuestas;
          const q1List = normalizeDriverList(r.q1).slice(0, 6);
          const q2List = normalizeDriverList(r.q2)
            .filter((id) => !q1List.includes(id))
            .slice(0, 6);
          const rawQ3 = normalizeDriverList(r.q3).filter(
            (id) => !q1List.includes(id) && !q2List.includes(id)
          );
          const q3Slots: (string | null)[] = Array(10)
            .fill(null)
            .map((_, idx) => rawQ3[idx] || null);

          setState({
            q1Eliminated: q1List,
            q2Eliminated: q2List,
            q3Grid: q3Slots,
            p1: r.p1 || null,
            p2: r.p2 || null,
            p3: r.p3 || null,
            dnfCount: normalizeDnfCount(r.dnf) ?? 2,
            escuderiaId: r.escuderia || null,
            pilotoDelDiaId: r.piloto_del_dia || null,
            posicionColapinto:
              r.posicion_colapinto !== null &&
              r.posicion_colapinto !== undefined
                ? Number(r.posicion_colapinto)
                : 10,
            sprintPole: r.sprintPole || null,
            sprintP1: r.sprintP1 || null,
            sprintP2: r.sprintP2 || null,
            sprintP3: r.sprintP3 || null,
          });
        }
      } catch (err) {
        console.error("Error al cargar pronóstico previo en el Wizard:", err);
      } finally {
        setLoadingExisting(false);
      }
    },
    [user]
  );

  const closeWizard = useCallback(() => {
    setIsOpen(false);
    setActiveGp(null);
    setCurrentStep(1);
  }, []);

  // Paso 1: Seleccionar 6 eliminados en Q1 (con exclusión en cascada hacia Q2 y Q3)
  const toggleQ1Driver = useCallback((driverId: string) => {
    setState((prev) => {
      const exists = prev.q1Eliminated.includes(driverId);
      let nextQ1: string[];
      if (exists) {
        nextQ1 = prev.q1Eliminated.filter((id) => id !== driverId);
      } else {
        if (prev.q1Eliminated.length >= 6) return prev;
        nextQ1 = [...prev.q1Eliminated, driverId];
      }

      // Regla estricta de exclusión: eliminar de Q2 y Q3 si fue marcado en Q1
      const nextQ2 = prev.q2Eliminated.filter((id) => !nextQ1.includes(id));
      const nextQ3 = prev.q3Grid.map((id) =>
        id && nextQ1.includes(id) ? null : id
      );

      return {
        ...prev,
        q1Eliminated: nextQ1,
        q2Eliminated: nextQ2,
        q3Grid: nextQ3,
      };
    });
  }, []);

  // Paso 2: Seleccionar 6 eliminados en Q2 (excluyendo los de Q1 y limpiando Q3)
  const toggleQ2Driver = useCallback((driverId: string) => {
    setState((prev) => {
      // No permitir si está en Q1
      if (prev.q1Eliminated.includes(driverId)) return prev;

      const exists = prev.q2Eliminated.includes(driverId);
      let nextQ2: string[];
      if (exists) {
        nextQ2 = prev.q2Eliminated.filter((id) => id !== driverId);
      } else {
        if (prev.q2Eliminated.length >= 6) return prev;
        nextQ2 = [...prev.q2Eliminated, driverId];
      }

      // Regla estricta de exclusión: eliminar de Q3 si fue marcado en Q2
      const nextQ3 = prev.q3Grid.map((id) =>
        id && nextQ2.includes(id) ? null : id
      );

      return {
        ...prev,
        q2Eliminated: nextQ2,
        q3Grid: nextQ3,
      };
    });
  }, []);

  // Paso 3: Asignar posición exacta del 1 (Pole) al 10 en Q3
  const assignQ3Position = useCallback(
    (positionIndex: number, driverId: string | null) => {
      setState((prev) => {
        if (
          driverId &&
          (prev.q1Eliminated.includes(driverId) ||
            prev.q2Eliminated.includes(driverId))
        ) {
          return prev;
        }
        const nextGrid = [...prev.q3Grid];
        if (driverId) {
          // Si el piloto ya estaba en otra posición de Q3, liberarla (mutuamente excluyente)
          for (let i = 0; i < nextGrid.length; i++) {
            if (nextGrid[i] === driverId) {
              nextGrid[i] = null;
            }
          }
        }
        nextGrid[positionIndex] = driverId;
        return {
          ...prev,
          q3Grid: nextGrid,
        };
      });
    },
    []
  );

  const autoFillRemainingQ3 = useCallback((availableDrivers: string[]) => {
    setState((prev) => {
      const nextGrid = [...prev.q3Grid];
      const used = new Set(nextGrid.filter(Boolean) as string[]);
      const remaining = availableDrivers.filter((id) => !used.has(id));
      let remIdx = 0;
      for (let i = 0; i < 10; i++) {
        if (!nextGrid[i] && remIdx < remaining.length) {
          nextGrid[i] = remaining[remIdx++];
        }
      }
      return { ...prev, q3Grid: nextGrid };
    });
  }, []);

  const clearQ3Grid = useCallback(() => {
    setState((prev) => ({
      ...prev,
      q3Grid: Array(10).fill(null),
    }));
  }, []);

  // Paso 5: Podio Carrera Principal (P1, P2, P3 mutuamente excluyentes)
  const assignRacePodium = useCallback(
    (slot: "p1" | "p2" | "p3", driverId: string | null) => {
      setState((prev) => {
        const next = {
          p1: prev.p1,
          p2: prev.p2,
          p3: prev.p3,
        };
        if (driverId) {
          if (next.p1 === driverId) next.p1 = null;
          if (next.p2 === driverId) next.p2 = null;
          if (next.p3 === driverId) next.p3 = null;
        }
        next[slot] = driverId;
        return { ...prev, ...next };
      });
    },
    []
  );

  const setDnfCount = useCallback((count: number | null) => {
    setState((prev) => ({ ...prev, dnfCount: count }));
  }, []);

  const setEscuderiaId = useCallback((teamId: string | null) => {
    setState((prev) => ({ ...prev, escuderiaId: teamId }));
  }, []);

  const setPilotoDelDiaId = useCallback((driverId: string | null) => {
    setState((prev) => ({ ...prev, pilotoDelDiaId: driverId }));
  }, []);

  const setPosicionColapinto = useCallback((pos: number | null) => {
    setState((prev) => ({ ...prev, posicionColapinto: pos }));
  }, []);

  // Paso 8: Sprint (sprintP1, sprintP2, sprintP3 mutuamente excluyentes entre sí; sprintPole independiente)
  const assignSprintField = useCallback(
    (
      slot: "sprintPole" | "sprintP1" | "sprintP2" | "sprintP3",
      driverId: string | null
    ) => {
      setState((prev) => {
        const next = {
          sprintPole: prev.sprintPole,
          sprintP1: prev.sprintP1,
          sprintP2: prev.sprintP2,
          sprintP3: prev.sprintP3,
        };
        if (slot !== "sprintPole" && driverId) {
          if (next.sprintP1 === driverId) next.sprintP1 = null;
          if (next.sprintP2 === driverId) next.sprintP2 = null;
          if (next.sprintP3 === driverId) next.sprintP3 = null;
        }
        next[slot] = driverId;
        return { ...prev, ...next };
      });
    },
    []
  );

  const canProceedCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return state.q1Eliminated.length === 6;
      case 2:
        return state.q2Eliminated.length === 6;
      case 3:
        return (
          state.q3Grid.length === 10 &&
          state.q3Grid.every((id) => Boolean(id))
        );
      case 4:
        return (
          state.q3Grid.length === 10 &&
          state.q3Grid.every((id) => Boolean(id))
        );
      case 5:
        return Boolean(state.p1 && state.p2 && state.p3);
      case 6:
        return (
          state.dnfCount !== null &&
          state.dnfCount >= 0 &&
          Boolean(state.escuderiaId)
        );
      case 7:
        return (
          Boolean(state.pilotoDelDiaId) &&
          state.posicionColapinto !== null &&
          state.posicionColapinto >= 0 &&
          state.posicionColapinto <= 22
        );
      case 8:
        if (!activeGp?.isSprint) return true;
        return Boolean(
          state.sprintPole &&
            state.sprintP1 &&
            state.sprintP2 &&
            state.sprintP3
        );
      default:
        return false;
    }
  }, [currentStep, state, activeGp]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps && canProceedCurrentStep()) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps, canProceedCurrentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const submitPrediction = useCallback(async (): Promise<boolean> => {
    if (!user || !activeGp || isLockedByTime) return false;
    try {
      setSubmitting(true);
      const payload: RespuestasPrediccion = {
        q1: state.q1Eliminated,
        q2: state.q2Eliminated,
        q3: state.q3Grid.filter(Boolean) as string[],
        p1: state.p1,
        p2: state.p2,
        p3: state.p3,
        dnf: state.dnfCount,
        escuderia: state.escuderiaId,
        piloto_del_dia: state.pilotoDelDiaId,
        posicion_colapinto: state.posicionColapinto,
      };

      if (activeGp.isSprint) {
        payload.sprintPole = state.sprintPole;
        payload.sprintP1 = state.sprintP1;
        payload.sprintP2 = state.sprintP2;
        payload.sprintP3 = state.sprintP3;
      }

      await guardarPrediccion(user.uid, activeGp.id, payload);
      return true;
    } catch (err) {
      console.error("Error al guardar predicción del Wizard:", err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, activeGp, isLockedByTime, state]);

  return (
    <PredictionWizardContext.Provider
      value={{
        activeGp,
        isOpen,
        currentStep,
        totalSteps,
        state,
        loadingExisting,
        submitting,
        isLockedByTime,
        minutesUntilLock: diffMinutes,
        openWizard,
        closeWizard,
        goToStep,
        nextStep,
        prevStep,
        toggleQ1Driver,
        toggleQ2Driver,
        assignQ3Position,
        autoFillRemainingQ3,
        clearQ3Grid,
        assignRacePodium,
        setDnfCount,
        setEscuderiaId,
        setPilotoDelDiaId,
        setPosicionColapinto,
        assignSprintField,
        canProceedCurrentStep,
        submitPrediction,
      }}
    >
      {children}
    </PredictionWizardContext.Provider>
  );
};

export const usePredictionWizard = () => {
  const ctx = useContext(PredictionWizardContext);
  if (!ctx) {
    throw new Error(
      "usePredictionWizard debe usarse dentro de un PredictionWizardProvider"
    );
  }
  return ctx;
};
