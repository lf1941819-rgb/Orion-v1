import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeIdea = async (text: string) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analise a seguinte entrada teológica (pode ser um versículo, frase, pensamento ou narrativa).
    Siga RIGOROSAMENTE as regras do ÓRION LAB:
    1. NÃO gere sermão, mensagem ou aplicação longa.
    2. Use linguagem observacional, nunca normativa.
    3. Retorne APENAS um JSON válido.
    4. Limites duros: tese/antítese <= 160 chars, premissas/implicações <= 120 chars, perguntas <= 180 chars.
    5. Máximo de 5 premissas/implicações. Máximo de 8 perguntas por categoria.
    6. Se detectar versículo, gere perguntas exegéticas.
    
    ENTRADA: "${text}"
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detected: {
            type: Type.OBJECT,
            properties: {
              input_type: { type: Type.STRING, description: "phrase|verse|question|narrative|mixed" },
              detected_verse_ref: { type: Type.STRING, nullable: true },
              claim_type: { type: Type.STRING, description: "ontological|juridical|narrative|pastoral|mixed" },
              axis: { type: Type.STRING, description: "truth|justice|judgment|mixed" },
              emotional_tone: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["input_type", "claim_type", "axis", "emotional_tone", "keywords"]
          },
          structure: {
            type: Type.OBJECT,
            properties: {
              thesis: { type: Type.STRING },
              premises: { type: Type.ARRAY, items: { type: Type.STRING } },
              antithesis: { type: Type.STRING },
              implications: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["thesis", "premises", "antithesis", "implications"]
          },
          questions: {
            type: Type.OBJECT,
            properties: {
              structural: { type: Type.ARRAY, items: { type: Type.STRING } },
              tension: { type: Type.ARRAY, items: { type: Type.STRING } },
              axis: { type: Type.ARRAY, items: { type: Type.STRING } },
              biblical: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    ref: { type: Type.STRING },
                    question: { type: Type.STRING }
                  }
                } 
              },
              exegetical: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["structural", "tension", "axis", "biblical"]
          },
          connections_suggested: {
            type: Type.OBJECT,
            properties: {
              notes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["detected", "structure", "questions"]
      }
    }
  });

  return JSON.parse(response.text);
};
