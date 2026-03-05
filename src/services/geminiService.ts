export const analyzeIdea = async (text: string) => {
  // Stub temporário - análise indisponível aguardando Edge Function
  return {
    detected: {
      input_type: "phrase",
      detected_verse_ref: null,
      claim_type: "ontological",
      axis: "truth",
      emotional_tone: "neutral",
      keywords: ["exemplo"]
    },
    structure: {
      thesis: "Análise indisponível (aguardando Edge Function).",
      premises: [
        "Premissa de exemplo 1.",
        "Premissa de exemplo 2."
      ],
      antithesis: "Antítese de exemplo.",
      implications: [
        "Implicação de exemplo 1.",
        "Implicação de exemplo 2."
      ]
    },
    questions: {
      structural: [
        "Qual a estrutura principal?",
        "Como se organiza?",
        "Quais os elementos centrais?"
      ],
      tension: [
        "Há conflitos internos?",
        "Quais tensões aparecem?"
      ],
      axis: [
        "Como se relaciona com verdade?",
        "Quais eixos são ativados?"
      ],
      biblical: [],
      exegetical: [
        "Como interpretar este texto?",
        "Quais referências bíblicas?",
        "Qual o contexto histórico?"
      ]
    },
    connections_suggested: {
      notes: []
    },
    warnings: []
  };
};
