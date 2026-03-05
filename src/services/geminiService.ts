import { supabase } from "../lib/supabaseClient"

export const analyzeIdea = async (text: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("analyze_idea", {
      body: { text }
    })

    if (error) throw error

    return data
  } catch (err) {
    console.error("Edge Function error:", err)

    return {
      thesis: "Análise temporariamente indisponível.",
      premises: [
        "O serviço de análise não respondeu.",
        "Verifique conexão com Supabase."
      ],
      antithesis: ["A ideia pode exigir análise contextual."],
      questions: [
        "Qual texto bíblico sustenta essa afirmação?",
        "Essa tese é ontológica ou jurídica?",
        "Existe contraponto teológico?"
      ]
    }
  }
}