import { supabase } from '../lib/supabase';

// Fallback stub (quando Edge Function falha)
function getStubResponse() {
  return {
    detected: {
      input_type: "phrase" as const,
      detected_verse_ref: null,
      claim_type: "ontological" as const,
      axis: "truth" as const,
      emotional_tone: "neutral",
      keywords: ["exemplo"]
    },
    structure: {
      thesis: "Análise indisponível (modo local).",
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
    warnings: ["EDGE_UNAVAILABLE"]
  };
}

export const analyzeIdea = async (text: string) => {
  try {
    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('analyze_idea', {
      body: { text }
    });

    if (error) {
      console.error("Edge Function error:", error);
      // Retornar fallback se Edge Function falha
      const stub = getStubResponse();
      return stub;
    }

    // Se a resposta contém erro (ex: validation)
    if (data?.error) {
      console.warn("Edge Function returned error:", data.error);
      const stub = getStubResponse();
      return stub;
    }

    // Se a resposta é direto o resultado (sucesso)
    if (data?.detected) {
      return data;
    }

    // Se a resposta tem data wrapper (sucesso com wrapper)
    if (data?.data?.detected) {
      return data.data;
    }

    // Fallback caso resposta inesperada
    console.warn("Unexpected Edge Function response format");
    const stub = getStubResponse();
    return stub;
  } catch (error) {
    console.error("analyzeIdea exception:", error);
    // Em caso de exceção (offline, network, etc), retornar stub
    const stub = getStubResponse();
    return stub;
  }
};
