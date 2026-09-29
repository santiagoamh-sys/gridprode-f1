"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Escuderia, Piloto, GrandPrix } from "@/types/f1";
import {
  INITIAL_ESCUDERIAS,
  INITIAL_PILOTOS,
  INITIAL_GRAND_PRIX,
  SINGAPORE_START_DATE,
  getPilotoById,
  getEscuderiaById,
  getPilotosByEscuderia,
  getEscuderiaColor,
  getPilotoColor,
} from "@/data/f1InitialData";
import {
  getEscuderias,
  getPilotos,
  getGrandPrixList,
  seedFirestoreF1Data,
} from "@/lib/firebase/f1Service";

/**
 * Filtra el calendario para que el listado de pronósticos disponibles arranque
 * estrictamente a partir del Gran Premio de Singapur, ocultando los Grandes Premios
 * anteriores usando la fecha del sistema y la fecha de inicio de Singapur.
 */
export function filterGrandPrixFromSingapore(list: GrandPrix[]): GrandPrix[] {
  const systemNow = new Date();
  const singaporeGp = list.find(
    (gp) =>
      gp.id.toLowerCase().includes("singapur") ||
      gp.nombre.toLowerCase().includes("singapur")
  );

  const singaporeTime = singaporeGp
    ? new Date(singaporeGp.qualyStartTime).getTime()
    : new Date(SINGAPORE_START_DATE).getTime();

  // Usamos la fecha del sistema combinada con el inicio del GP de Singapur
  // para ocultar todos los GPs previos a Singapur.
  const effectiveCutoff = Math.min(
    singaporeTime,
    Math.max(systemNow.getTime(), new Date(SINGAPORE_START_DATE).getTime())
  );

  return list
    .filter((gp) => {
      const gpQualyTime = new Date(gp.qualyStartTime).getTime();
      if (isNaN(gpQualyTime)) return false;
      // Ocultar cualquier GP anterior al Gran Premio de Singapur o anterior al corte del sistema
      return gpQualyTime >= singaporeTime && gpQualyTime >= effectiveCutoff;
    })
    .sort(
      (a, b) =>
        new Date(a.qualyStartTime).getTime() -
        new Date(b.qualyStartTime).getTime()
    );
}

interface F1DataContextType {
  escuderias: Escuderia[];
  pilotos: Piloto[];
  grandPrixList: GrandPrix[];
  allGrandPrixList: GrandPrix[];
  loading: boolean;
  isSeeding: boolean;
  seedStatus: string | null;
  seedFirestore: () => Promise<void>;
  refreshData: () => Promise<void>;
  getPiloto: (id: string | null | undefined) => Piloto | undefined;
  getEscuderia: (id: string | null | undefined) => Escuderia | undefined;
  getPilotosByTeam: (teamId: string) => Piloto[];
  getColor: (id: string | null | undefined) => string;
}

const F1DataContext = createContext<F1DataContextType>({
  escuderias: INITIAL_ESCUDERIAS,
  pilotos: INITIAL_PILOTOS,
  grandPrixList: filterGrandPrixFromSingapore(INITIAL_GRAND_PRIX),
  allGrandPrixList: INITIAL_GRAND_PRIX,
  loading: false,
  isSeeding: false,
  seedStatus: null,
  seedFirestore: async () => {},
  refreshData: async () => {},
  getPiloto: () => undefined,
  getEscuderia: () => undefined,
  getPilotosByTeam: () => [],
  getColor: () => "#6b7280",
});

export const F1DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [escuderias, setEscuderias] = useState<Escuderia[]>(INITIAL_ESCUDERIAS);
  const [pilotos, setPilotos] = useState<Piloto[]>(INITIAL_PILOTOS);
  const [rawGrandPrixList, setRawGrandPrixList] =
    useState<GrandPrix[]>(INITIAL_GRAND_PRIX);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedEscuderias, fetchedPilotos, fetchedGP] = await Promise.all([
        getEscuderias(),
        getPilotos(),
        getGrandPrixList(),
      ]);

      if (fetchedEscuderias.length > 0) setEscuderias(fetchedEscuderias);
      if (fetchedPilotos.length > 0) setPilotos(fetchedPilotos);
      if (fetchedGP.length > 0) setRawGrandPrixList(fetchedGP);
    } catch (err) {
      console.warn("Usando datos iniciales de F1:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listado filtrado estrictamente desde el Gran Premio de Singapur en adelante
  const grandPrixList = useMemo(
    () => filterGrandPrixFromSingapore(rawGrandPrixList),
    [rawGrandPrixList]
  );

  const seedFirestore = async () => {
    try {
      setIsSeeding(true);
      setSeedStatus("Populando colecciones en Firestore...");
      const result = await seedFirestoreF1Data();
      setSeedStatus(
        `¡Éxito! Se popularon ${result.escuderiasCount} escuderías, ${result.pilotosCount} pilotos y ${result.grandPrixCount} carreras en Firestore.`
      );
      await loadData();
    } catch (err: any) {
      console.error("Error al popular Firestore:", err);
      setSeedStatus(
        `Error al popular Firestore: ${err.message || "desconocido"}`
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const getPiloto = (id: string | null | undefined) => {
    if (!id) return undefined;
    return pilotos.find((p) => p.id === id) || getPilotoById(id);
  };

  const getEscuderia = (id: string | null | undefined) => {
    if (!id) return undefined;
    return escuderias.find((e) => e.id === id) || getEscuderiaById(id);
  };

  const getPilotosByTeam = (teamId: string) => {
    return pilotos.filter((p) => p.escuderia_id === teamId);
  };

  const getColor = (id: string | null | undefined) => {
    if (!id) return "#6b7280";
    const esc = escuderias.find((e) => e.id === id);
    if (esc) return esc.color_hex;
    const pil = pilotos.find((p) => p.id === id);
    if (pil) {
      const escTeam = escuderias.find((e) => e.id === pil.escuderia_id);
      return escTeam ? escTeam.color_hex : "#6b7280";
    }
    return getPilotoColor(id);
  };

  return (
    <F1DataContext.Provider
      value={{
        escuderias,
        pilotos,
        grandPrixList,
        allGrandPrixList: rawGrandPrixList,
        loading,
        isSeeding,
        seedStatus,
        seedFirestore,
        refreshData: loadData,
        getPiloto,
        getEscuderia,
        getPilotosByTeam,
        getColor,
      }}
    >
      {children}
    </F1DataContext.Provider>
  );
};

export const useF1Data = () => {
  const context = useContext(F1DataContext);
  if (!context) {
    throw new Error("useF1Data debe usarse dentro de un F1DataProvider");
  }
  return context;
};
