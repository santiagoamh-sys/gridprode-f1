export interface TriviaQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  correctAnswer: string;
  category: string;
}

export interface TriviaConfig {
  id: string;
  grandPrixId: string;
  titulo: string;
  circuito: string;
  estado: "activa" | "finalizada";
  totalPreguntas: number;
  tiempoPorPreguntaMs: number;
  preguntas: TriviaQuestion[];
  updatedAt?: any;
}

/**
 * 5 Preguntas Oficiales del Gran Premio de la Ciudad de México
 * Autódromo Hermanos Rodríguez
 */
export const MEXICO_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    category: "GP de México • Autódromo Hermanos Rodríguez",
    question:
      "¿En qué año se reincorporó oficialmente el Gran Premio de México al calendario moderno de la Fórmula 1?",
    options: ["2011", "2015", "2017", "2019"],
    correctIndex: 1,
    correctAnswer: "2015",
  },
  {
    id: 2,
    category: "GP de México • Autódromo Hermanos Rodríguez",
    question:
      "¿Cómo se llama la emblemática sección del circuito de México donde los monoplazas pasan rodeados de tribunas estilo estadio?",
    options: ["Zona del Lago", "Foro Sol", "Curva Peraltada", "S Esquinada"],
    correctIndex: 1,
    correctAnswer: "Foro Sol",
  },
  {
    id: 3,
    category: "GP de México • Autódromo Hermanos Rodríguez",
    question:
      "¿Qué piloto ostenta el récord de mayor cantidad de victorias históricas en el Gran Premio de la Ciudad de México?",
    options: ["Lewis Hamilton", "Max Verstappen", "Ayrton Senna", "Alain Prost"],
    correctIndex: 1,
    correctAnswer: "Max Verstappen",
  },
  {
    id: 4,
    category: "GP de México • Autódromo Hermanos Rodríguez",
    question:
      "¿Cuál es la altitud aproximada sobre el nivel del mar a la que se encuentra el Autódromo Hermanos Rodríguez, afectando la aerodinámica y refrigeración de los motores?",
    options: ["1,200 metros", "2,240 metros", "3,100 metros", "850 metros"],
    correctIndex: 1,
    correctAnswer: "2,240 metros",
  },
  {
    id: 5,
    category: "GP de México • Autódromo Hermanos Rodríguez",
    question:
      "¿Qué nombre lleva la recta principal del Autódromo Hermanos Rodríguez?",
    options: [
      "Recta Carlos Alberto Reutemann",
      "Recta Moisés Solana",
      "Recta Principal / Horacio Avalos",
      "Recta del Lago",
    ],
    correctIndex: 1,
    correctAnswer: "Recta Moisés Solana",
  },
];

export const DEFAULT_MEXICO_TRIVIA: TriviaConfig = {
  id: "mexico_2026",
  grandPrixId: "gp-mexico-2026",
  titulo: "Gran Premio de la Ciudad de México",
  circuito: "Autódromo Hermanos Rodríguez",
  estado: "activa",
  totalPreguntas: 5,
  tiempoPorPreguntaMs: 15000,
  preguntas: MEXICO_TRIVIA_QUESTIONS,
};
