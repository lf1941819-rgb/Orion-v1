import { supabase } from "../lib/supabaseClient"

/**
 * Chama a Edge Function para analisar uma ideia.
 */
export const analyzeIdea = async (text: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("analyze_idea", {
      body: { text }
    })

    if (error) throw error
    return data
  } catch (err) {
    console.error("Edge Function error:", err)

    // fallback mínimo para não travar o app
    return {
      thesis: text,
      premises: [
        "A análise automática não pôde ser realizada.",
        "O sistema gerou uma estrutura mínima."
      ],
      antithesis: "A ideia pode possuir interpretação alternativa.",
      implications: [],
      biblical_links: [],
      warnings: ["EDGE_UNAVAILABLE"],
      questions: [
        "Qual texto bíblico sustenta essa afirmação?",
        "Essa tese é ontológica ou jurídica?",
        "Existe contraponto teológico?"
      ]
    }
  }
}

export type NormalizedAnalysis = {
  analysis: {
    engine_version: string
    claim_type: string
    axis: string
    emotional_tone: string
    keywords: string[]
    thesis: string
    premises: string[]
    antithesis: string
    implications: string[]
    biblical_links: any[]
    warnings: string[]
  }
  questions: Array<{
    kind: "structural" | "tension" | "axis" | "biblical" | "exegetical"
    question: string
    priority?: number
    status?: "open" | "answered" | "parked"
    user_notes?: string | null
  }>
  detected?: {
    input_type?: string
    detected_verse_ref?: string | null
  }
}

/**
 * Normaliza qualquer resposta (Edge / fallback) para o formato do DB.
 * IMPORTANTÍSSIMO: este export é usado pelo labStore.
 */
export const normalizeAnalysisPayload = (
  payload: any,
  inputText: string
): NormalizedAnalysis => {
  const thesis = payload?.thesis || inputText

  const premises = Array.isArray(payload?.premises) ? payload.premises : []
  const implications = Array.isArray(payload?.implications)
    ? payload.implications
    : []
  const biblicalLinks = Array.isArray(payload?.biblical_links)
    ? payload.biblical_links
    : []

  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : []

  // perguntas podem vir como array de string ou array de objetos
  const rawQs = Array.isArray(payload?.questions) ? payload.questions : []

  const questions = rawQs
    .map((q: any) => {
      const text =
        typeof q === "string" ? q : typeof q?.question === "string" ? q.question : ""
      if (!text) return null
      return {
        kind: (q?.kind as any) || "structural",
        question: text.endsWith("?") ? text : `${text}?`,
        priority: typeof q?.priority === "number" ? q.priority : 1,
        status: (q?.status as any) || "open",
        user_notes: q?.user_notes ?? null
      }
    })
    .filter(Boolean) as NormalizedAnalysis["questions"]

  // fallback mínimo de perguntas
  if (questions.length === 0) {
    questions.push(
      {
        kind: "structural",
        question: "O que sustenta essa afirmação?",
        priority: 1,
        status: "open"
      },
      {
        kind: "tension",
        question: "Existe um contraponto bíblico?",
        priority: 1,
        status: "open"
      },
      {
        kind: "axis",
        question: "Essa ideia se relaciona com Verdade, Justiça ou Juízo?",
        priority: 1,
        status: "open"
      }
    )
  }

  return {
    analysis: {
      engine_version: payload?.engine_version || "edge-v1",
      claim_type: payload?.claim_type || "mixed",
      axis: payload?.axis || "mixed",
      emotional_tone: payload?.emotional_tone || "mixed",
      keywords: Array.isArray(payload?.keywords) ? payload.keywords : [],
      thesis,
      premises,
      antithesis: payload?.antithesis || "",
      implications,
      biblical_links: biblicalLinks,
      warnings
    },
    questions,
    detected: {
      input_type: payload?.detected?.input_type || "idea",
      detected_verse_ref: payload?.detected?.detected_verse_ref || null
    }
  }
}