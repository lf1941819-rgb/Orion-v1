import { supabase } from "../lib/supabaseClient";

export interface AnalysisPayload {
  detected?: {
    input_type: string;
    detected_verse_ref?: string;
    claim_type: string;
    axis: string;
    emotional_tone: string;
    keywords: string[];
  };
  structure?: {
    thesis: string;
    premises: string[];
    antithesis: string;
    implications: string[];
  };
  questions?: {
    structural?: string[];
    tension?: string[];
    axis?: string[];
    biblical?: Array<{ ref: string; question: string }> | string[];
    exegetical?: string[];
  } | string[]; // Can be simple array
  warnings?: string[];
}

export const normalizeAnalysisPayload = (payload: any) => {
  if (!payload) {
    return {
      analysis: {
        claim_type: 'mixed',
        axis: 'mixed',
        emotional_tone: 'mixed',
        keywords: [],
        thesis: 'Análise indisponível',
        premises: [],
        antithesis: '',
        implications: [],
        warnings: ['PAYLOAD_NULL'],
        biblical_links: []
      },
      questions: [
        { kind: 'structural', question: 'O que esta afirmação pressupõe?', priority: 3, status: 'open' },
        { kind: 'structural', question: 'Quais as implicações práticas?', priority: 3, status: 'open' }
      ],
      detected: null
    };
  }

  const analysis = {
    claim_type: payload.detected?.claim_type || 'mixed',
    axis: payload.detected?.axis || 'mixed',
    emotional_tone: payload.detected?.emotional_tone || 'mixed',
    keywords: payload.detected?.keywords || [],
    thesis: payload.structure?.thesis || payload.thesis || 'Análise em andamento...',
    premises: payload.structure?.premises || payload.premises || [],
    antithesis: payload.structure?.antithesis || payload.antithesis || '',
    implications: payload.structure?.implications || payload.implications || [],
    warnings: payload.warnings || [],
    biblical_links: payload.biblical_links || []
  };

  const questions: any[] = [];

  if (payload.questions) {
    if (Array.isArray(payload.questions)) {
      // Simple array of questions
      payload.questions.forEach((q: string) => {
        if (typeof q === 'string') {
          questions.push({ kind: 'structural', question: q, priority: 3, status: 'open' });
        }
      });
    } else {
      // Structured questions
      const qObj = payload.questions;
      ['structural', 'tension', 'axis', 'biblical', 'exegetical'].forEach(kind => {
        if (qObj[kind] && Array.isArray(qObj[kind])) {
          qObj[kind].forEach((q: any) => {
            const questionText = typeof q === 'string' ? q : (q.question || JSON.stringify(q));
            questions.push({ kind, question: questionText, priority: 3, status: 'open' });
          });
        }
      });
    }
  }

  // Fallback if no questions
  if (questions.length === 0) {
    ['O que esta afirmação pressupõe?', 'Quais as implicações práticas?', 'Existe alguma tensão teológica aqui?'].forEach(q => {
      questions.push({ kind: 'structural', question: q, priority: 3, status: 'open' });
    });
  }

  return { analysis, questions, detected: payload.detected };
};

export const analyzeIdea = async (text: string): Promise<AnalysisPayload> => {
  if (!supabase) throw new Error('Supabase not initialized');

  try {
    const { data, error } = await supabase.functions.invoke("analyze_idea", {
      body: { text }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Edge Function Error:', error);
    // Fallback payload
    return {
      structure: {
        thesis: text.substring(0, 160),
        premises: [],
        antithesis: "Análise indisponível no momento.",
        implications: []
      },
      warnings: ["EDGE_UNAVAILABLE"],
      questions: [
        "Como este texto se relaciona com a soberania de Deus?",
        "Qual o impacto desta verdade na vida cristã?",
        "Como podemos aplicar este princípio hoje?"
      ]
    };
  }
};
