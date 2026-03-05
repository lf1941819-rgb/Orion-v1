import { corsHeaders, handleCORS } from "../_shared/cors.ts";
import { validateAnalysisResponse } from "../_shared/validate.ts";
import { createFallbackResponse, type AnalysisResponse, type AnalyzeIdeaRequest } from "../_shared/types.ts";

// Detectar se o texto parece um versículo bíblico
function detectVerseHint(text: string): string | null {
  // Padrões simples: "João 3:16", "Romanos 8", "Isaías 53:5", etc.
  // Regex melhorado para incluir acentos e caracteres especiais
  const versePattern = /\b[A-Za-zÀ-ÿ\s]+\s+\d+(?::\d+)?\b/;
  const match = text.match(versePattern);
  if (match) {
    return match[0].trim();
  }
  return null;
}

// Construir o prompt rígido para Gemini
function buildPrompt(text: string, verseHint: string | null): string {
  const verseNote = verseHint 
    ? `\n\nHINT: Input parece ser versículo bíblico: "${verseHint}". Inclua em detected_verse_ref e gere perguntas exegéticas.`
    : "";

  return `Analise a seguinte entrada teológica. Retorne APENAS JSON válido, nenhum markdown, nenhum texto extra.

REGRAS RÍGIDAS:
1. Linguagem observacional, nunca normativa.
2. Teste contra CRÍTICA DO SERMÃO: nenhum "você deve", nenhuma aplicação longa, nenhum parágrafo (máx 160 chars).
3. Limites absolutos:
   - thesis, antithesis: máx 160 chars, SEM "\n\n"
   - premises, implications: máx 5 itens cada; cada item máx 120 chars, SEM "\n\n"
   - Cada pergunta: máx 180 chars, DEVE terminar com "?"
   - keywords: máx 8
   - structural/tension/axis: máx 8 perguntas cada
   - biblical references: máx 8
   - exegetical: máx 8
4. Se detectar versículo: perguntas exegéticas em exegetical array.
5. Nenhuma quebra de linha dupla (\n\n) em nenhum campo.
6. Retorne EXATAMENTE the JSON shape (sem valores extras):
{
  "detected": {
    "input_type": "phrase|verse|question|narrative|mixed",
    "detected_verse_ref": null,
    "claim_type": "ontological|juridical|narrative|pastoral|mixed",
    "axis": "truth|justice|judgment|mixed",
    "emotional_tone": "string",
    "keywords": ["str"]
  },
  "structure": {
    "thesis": "string",
    "premises": ["string"],
    "antithesis": "string",
    "implications": ["string"]
  },
  "questions": {
    "structural": ["question?"],
    "tension": ["question?"],
    "axis": ["question?"],
    "biblical": [{"ref": "string", "question": "question?"}],
    "exegetical": ["question?"]
  },
  "connections_suggested": {
    "notes": ["string"]
  },
  "warnings": ["string"]
}

ENTRADA: "${text}"${verseNote}`;
}

// Chamar Gemini via Google Generative Language API
async function callGemini(
  prompt: string,
  apiKey: string,
  retryCount: number = 0
): Promise<AnalysisResponse> {
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json"
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Gemini API error (${response.status}):`, error.substring(0, 100));
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text in Gemini response");
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Failed to parse Gemini JSON output");
      throw new Error("INVALID_JSON_FROM_MODEL");
    }

    // Validar
    const validation = validateAnalysisResponse(parsed);
    if (!validation.valid) {
      console.error("Validation failed:", validation.errors.slice(0, 3));
      
      // Retry com modo STRICT se ainda há retry disponível
      if (retryCount < 1) {
        console.log("Retrying with STRICT_MODE...");
        const strictPrompt = `${buildPrompt((prompt.match(/ENTRADA: "(.+)"/s)?.[1] || ""), null)}\n\nSTRICT_MODE: Output MUST match schema exactly. No extra text.`;
        return callGemini(strictPrompt, apiKey, retryCount + 1);
      }

      throw new Error("INVALID_MODEL_OUTPUT");
    }

    return parsed as AnalysisResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Gemini call failed:`, message);
    throw error;
  }
}

// Serve handler
async function handler(req: Request): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders() }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const request = body as AnalyzeIdeaRequest;

    // Validar input
    if (!request.text || typeof request.text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' field" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const trimmed = request.text.trim();
    if (trimmed.length < 2) {
      return new Response(
        JSON.stringify({ error: "Text must be at least 2 characters" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (trimmed.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Text exceeds 5000 characters" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Detectar versículo
    const verseHint = detectVerseHint(trimmed);

    // Obter API key do secret
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration",
          data: createFallbackResponse()
        }),
        { status: 503, headers: corsHeaders() }
      );
    }

    // Construir prompt e chamar Gemini
    const prompt = buildPrompt(trimmed, verseHint);
    const analysis = await callGemini(prompt, apiKey);

    return new Response(
      JSON.stringify(analysis),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Request handler error:", message);

    // Retornar fallback com aviso
    const fallback = createFallbackResponse();
    fallback.warnings.push("SERVER_ERROR_FALLBACK_MODE");

    return new Response(
      JSON.stringify({
        error: "Analysis unavailable",
        data: fallback
      }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

export { handler };

// Para Supabase Functions
Deno.serve(handler);
