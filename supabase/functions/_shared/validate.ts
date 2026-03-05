import type { AnalysisResponse } from "./types.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAnalysisResponse(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Response is not a valid object."]
    };
  }

  const obj = data as Record<string, unknown>;

  // Verificar campos obrigatórios raiz
  if (!obj.detected || typeof obj.detected !== "object") {
    errors.push("Missing or invalid 'detected' field.");
  } else {
    const detected = obj.detected as Record<string, unknown>;
    if (!detected.input_type || typeof detected.input_type !== "string") {
      errors.push("Missing or invalid 'detected.input_type'.");
    }
    if (!detected.claim_type || typeof detected.claim_type !== "string") {
      errors.push("Missing or invalid 'detected.claim_type'.");
    }
    if (!detected.axis || typeof detected.axis !== "string") {
      errors.push("Missing or invalid 'detected.axis'.");
    }
    if (!detected.emotional_tone || typeof detected.emotional_tone !== "string") {
      errors.push("Missing or invalid 'detected.emotional_tone'.");
    }
    if (!Array.isArray(detected.keywords)) {
      errors.push("'detected.keywords' must be an array.");
    } else if (detected.keywords.length > 8) {
      errors.push("'detected.keywords' exceeds max 8 items.");
    }
  }

  if (!obj.structure || typeof obj.structure !== "object") {
    errors.push("Missing or invalid 'structure' field.");
  } else {
    const structure = obj.structure as Record<string, unknown>;
    if (!structure.thesis || typeof structure.thesis !== "string") {
      errors.push("Missing or invalid 'structure.thesis'.");
    } else if ((structure.thesis as string).length > 160) {
      errors.push("'structure.thesis' exceeds 160 chars.");
    } else if ((structure.thesis as string).includes("\n\n")) {
      errors.push("'structure.thesis' contains double newlines.");
    }
    if (!Array.isArray(structure.premises)) {
      errors.push("'structure.premises' must be an array.");
    } else if (structure.premises.length > 5) {
      errors.push("'structure.premises' exceeds max 5 items.");
    } else {
      (structure.premises as unknown[]).forEach((p: unknown, i: number) => {
        if (typeof p !== "string") {
          errors.push(`'structure.premises[${i}]' is not a string.`);
        } else if (p.length > 120) {
          errors.push(`'structure.premises[${i}]' exceeds 120 chars.`);
        } else if (p.includes("\n\n")) {
          errors.push(`'structure.premises[${i}]' contains double newlines.`);
        }
      });
    }
    if (!structure.antithesis || typeof structure.antithesis !== "string") {
      errors.push("Missing or invalid 'structure.antithesis'.");
    } else if ((structure.antithesis as string).length > 160) {
      errors.push("'structure.antithesis' exceeds 160 chars.");
    } else if ((structure.antithesis as string).includes("\n\n")) {
      errors.push("'structure.antithesis' contains double newlines.");
    }
    if (!Array.isArray(structure.implications)) {
      errors.push("'structure.implications' must be an array.");
    } else if (structure.implications.length > 5) {
      errors.push("'structure.implications' exceeds max 5 items.");
    } else {
      (structure.implications as unknown[]).forEach((imp: unknown, i: number) => {
        if (typeof imp !== "string") {
          errors.push(`'structure.implications[${i}]' is not a string.`);
        } else if (imp.length > 120) {
          errors.push(`'structure.implications[${i}]' exceeds 120 chars.`);
        } else if (imp.includes("\n\n")) {
          errors.push(`'structure.implications[${i}]' contains double newlines.`);
        }
      });
    }
  }

  if (!obj.questions || typeof obj.questions !== "object") {
    errors.push("Missing or invalid 'questions' field.");
  } else {
    const questions = obj.questions as Record<string, unknown>;
    const questionArrays = ["structural", "tension", "axis", "exegetical"];
    for (const key of questionArrays) {
      if (!Array.isArray(questions[key])) {
        errors.push(`'questions.${key}' must be an array.`);
      } else if ((questions[key] as unknown[]).length > 8) {
        errors.push(`'questions.${key}' exceeds max 8 items.`);
      } else {
        (questions[key] as unknown[]).forEach((q: unknown, i: number) => {
          if (typeof q !== "string") {
            errors.push(`'questions.${key}[${i}]' is not a string.`);
          } else if (q.length > 180) {
            errors.push(`'questions.${key}[${i}]' exceeds 180 chars.`);
          } else if (!q.endsWith("?")) {
            errors.push(`'questions.${key}[${i}]' does not end with "?".`);
          } else if (q.includes("\n\n")) {
            errors.push(`'questions.${key}[${i}]' contains double newlines.`);
          }
        });
      }
    }

    if (!Array.isArray(questions.biblical)) {
      errors.push("'questions.biblical' must be an array.");
    } else if ((questions.biblical as unknown[]).length > 8) {
      errors.push("'questions.biblical' exceeds max 8 items.");
    } else {
      (questions.biblical as unknown[]).forEach((b: unknown, i: number) => {
        if (!b || typeof b !== "object") {
          errors.push(`'questions.biblical[${i}]' is not a valid object.`);
        } else {
          const bib = b as Record<string, unknown>;
          if (typeof bib.ref !== "string") {
            errors.push(`'questions.biblical[${i}].ref' is not a string.`);
          }
          if (typeof bib.question !== "string") {
            errors.push(`'questions.biblical[${i}].question' is not a string.`);
          } else if (!bib.question.endsWith("?")) {
            errors.push(`'questions.biblical[${i}].question' does not end with "?".`);
          } else if ((bib.question as string).length > 180) {
            errors.push(`'questions.biblical[${i}].question' exceeds 180 chars.`);
          }
        }
      });
    }
  }

  if (!obj.connections_suggested || typeof obj.connections_suggested !== "object") {
    errors.push("Missing or invalid 'connections_suggested' field.");
  } else {
    const conn = obj.connections_suggested as Record<string, unknown>;
    if (!Array.isArray(conn.notes)) {
      errors.push("'connections_suggested.notes' must be an array.");
    } else if ((conn.notes as unknown[]).length > 5) {
      errors.push("'connections_suggested.notes' exceeds max 5 items.");
    } else {
      (conn.notes as unknown[]).forEach((n: unknown, i: number) => {
        if (typeof n !== "string") {
          errors.push(`'connections_suggested.notes[${i}]' is not a string.`);
        } else if (n.length > 160) {
          errors.push(`'connections_suggested.notes[${i}]' exceeds 160 chars.`);
        } else if (n.includes("\n\n")) {
          errors.push(`'connections_suggested.notes[${i}]' contains double newlines.`);
        }
      });
    }
  }

  if (!Array.isArray(obj.warnings)) {
    errors.push("'warnings' must be an array.");
  } else if ((obj.warnings as unknown[]).length > 5) {
    errors.push("'warnings' exceeds max 5 items.");
  } else {
    (obj.warnings as unknown[]).forEach((w: unknown, i: number) => {
      if (typeof w !== "string") {
        errors.push(`'warnings[${i}]' is not a string.`);
      } else if (w.length > 160) {
        errors.push(`'warnings[${i}]' exceeds 160 chars.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
