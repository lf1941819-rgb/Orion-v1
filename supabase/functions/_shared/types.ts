// Contrato JSON rígido para análise de ideias teológicas via Gemini

export interface DetectedMetadata {
  input_type: "phrase" | "verse" | "question" | "narrative" | "mixed";
  detected_verse_ref: string | null;
  claim_type: "ontological" | "juridical" | "narrative" | "pastoral" | "mixed";
  axis: "truth" | "justice" | "judgment" | "mixed";
  emotional_tone: string; // curto, ex: "neutral", "contemplative"
  keywords: string[]; // máx 8 itens
}

export interface StructureAnalysis {
  thesis: string; // <=160 chars, sem \n\n
  premises: string[]; // máx 5 itens, cada <=120 chars
  antithesis: string; // <=160 chars, sem \n\n
  implications: string[]; // máx 5 itens, cada <=120 chars
}

export interface BiblicalReference {
  ref: string;
  question: string; // termina com "?"
}

export interface Questions {
  structural: string[]; // máx 8, cada <=180 chars, termina com "?"
  tension: string[]; // máx 8, cada <=180 chars, termina com "?"
  axis: string[]; // máx 8, cada <=180 chars, termina com "?"
  biblical: BiblicalReference[]; // máx 8
  exegetical: string[]; // máx 8, cada <=180 chars, termina com "?"
}

export interface AnalysisResponse {
  detected: DetectedMetadata;
  structure: StructureAnalysis;
  questions: Questions;
  connections_suggested: {
    notes: string[]; // máx 5, cada <=160 chars
  };
  warnings: string[]; // máx 5, cada <=160 chars
}

// Request
export interface AnalyzeIdeaRequest {
  text: string;
}

// Fallback mínimo (sempre válido)
export function createFallbackResponse(): AnalysisResponse {
  return {
    detected: {
      input_type: "phrase",
      detected_verse_ref: null,
      claim_type: "ontological",
      axis: "truth",
      emotional_tone: "neutral",
      keywords: ["análise"]
    },
    structure: {
      thesis: "Análise indisponível (saída inválida do modelo).",
      premises: [
        "Serviço de análise temporariamente indisponível.",
        "Usando modo fallback seguro."
      ],
      antithesis: "Análise não pôde ser processada.",
      implications: [
        "Consulte análise manual ou tente novamente.",
        "Dados salvos localmente para revisão."
      ]
    },
    questions: {
      structural: [
        "Como se estrutura esta entrada?",
        "Qual o núcleo da ideia?",
        "Quais elementos são primários?"
      ],
      tension: [
        "Existem conflitos internos?",
        "Há contradições aparentes?"
      ],
      axis: [
        "Como se relaciona com verdade?",
        "Qual eixo é predominante?"
      ],
      biblical: [],
      exegetical: [
        "Como interpretar contextualmente?",
        "Quais referências são sugeridas?"
      ]
    },
    connections_suggested: {
      notes: []
    },
    warnings: ["FALLBACK_MODE_ACTIVE", "ANÁLISE_INCOMPLETA"]
  };
}
