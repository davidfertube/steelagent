/**
 * Response Self-Reflection (Coherence Validator)
 *
 * Fast LLM call to check whether the generated response actually
 * answers the user's question. Part of the agentic post-generation
 * verification layer.
 *
 * Uses Gemini Flash for speed (~1-2s). Fails open on any error
 * to avoid blocking the pipeline.
 */

import { getModelFallbackClient } from "./model-fallback";
import { CoherenceValidationSchema, parseJudgeOutput } from "./schemas";

export interface ValidationResult {
  /** Coherence score 0-100 */
  coherenceScore: number;
  /** True if score >= 50 */
  passed: boolean;
  /** Why the score was given */
  reason: string;
  /** What the response failed to address (if any) */
  missingAspects?: string;
}

/**
 * Validate whether a response coherently answers the user's question.
 *
 * Uses a concise Gemini Flash prompt for speed. Truncates response
 * to 800 chars to minimize tokens.
 *
 * @param query - The user's original query
 * @param response - The LLM's generated response
 * @returns Validation result with coherence score
 */
export async function validateResponseCoherence(
  query: string,
  response: string
): Promise<ValidationResult> {
  const client = getModelFallbackClient();

  const truncatedResponse = response.slice(0, 800);

  const prompt = `You are a response quality judge. Given a user question and an AI response, assess whether the response directly addresses the question.

QUESTION: "${query}"

RESPONSE (first 800 chars): "${truncatedResponse}"

Respond with ONLY valid JSON (no markdown):
{
  "score": <0-100>,
  "reason": "<brief explanation>",
  "missing": "<what's not addressed, or null>"
}

Scoring guide:
- 80-100: Fully answers the question with specific data
- 60-79: Partially answers but misses key aspects
- 30-59: Provides minimal or incomplete information
- 0-29: Refuses to answer OR gives completely irrelevant info

IMPORTANT: If the response says "I cannot answer" or "I cannot provide", score it 0-20 regardless of other content, and always set "missing" to describe what the user was asking for.`;

  try {
    const { text } = await client.generateContent(prompt);

    const parsed = parseJudgeOutput(text, CoherenceValidationSchema, "Response Validator");

    if (!parsed) {
      return {
        coherenceScore: 70,
        passed: true,
        reason: "Parse/validation failed, proceeding with response",
      };
    }

    return {
      coherenceScore: parsed.score,
      passed: parsed.score >= 60,
      reason: parsed.reason,
      missingAspects: parsed.score < 60 && parsed.missing ? parsed.missing : undefined,
    };
  } catch (error) {
    console.warn("[Response Validator] Validation failed, assuming coherent:", error);
    return {
      coherenceScore: 70,
      passed: true,
      reason: "Validation failed, proceeding with response",
    };
  }
}
