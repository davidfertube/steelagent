/**
 * Zod Schemas for RAG Pipeline Validation
 *
 * Centralized schema definitions for all pipeline stage outputs.
 * Replaces manual JSON parsing and normalization with type-safe
 * validation using Zod's .safeParse() pattern.
 */

import { z } from "zod";

// ============================================================================
// Structured Output Schemas (used by verified-generation pipeline)
// ============================================================================

export const NumericalValueSchema = z.object({
  value: z.preprocess(
    (v) => (typeof v === "string" ? parseFloat(v) : v),
    z.number().finite()
  ),
  unit: z.string().min(1).default(""),
  property: z.string().min(1).default("unknown"),
});

export const ClaimSchema = z.object({
  claim: z.string().min(1),
  source_ref: z.string().default("[?]"),
  exact_quote: z.string().default(""),
  confidence: z.enum(["high", "medium", "low"]).catch("medium"),
  numerical_values: z
    .array(NumericalValueSchema)
    .optional()
    .transform((vals) =>
      vals && vals.length > 0 ? vals : undefined
    ),
});

export const StructuredResponseSchema = z.object({
  answer: z.string().min(1),
  claims: z
    .array(ClaimSchema)
    .default([])
    .transform((claims) => claims.filter((c) => c.claim.length > 0)),
  missing_info: z.string().optional().nullable().transform((v) => v || undefined),
  source_type: z.enum(["documents", "general_knowledge"]).catch("documents"),
});

// ============================================================================
// Query Decomposition Schema
// ============================================================================

export const QueryIntentSchema = z.enum([
  "lookup",
  "compare",
  "list",
  "explain",
  "verify",
]);

export const DecomposedQueryLLMSchema = z.object({
  intent: QueryIntentSchema.catch("lookup"),
  subqueries: z
    .array(z.string().min(1))
    .min(1)
    .catch(["fallback"]),
  requires_aggregation: z.boolean().default(false),
  reasoning: z.string().optional(),
});

// ============================================================================
// Retrieval Evaluation Schema
// ============================================================================

export const RetryStrategySchema = z
  .enum(["broader_search", "section_lookup", "more_candidates"])
  .nullable()
  .catch(null);

export const RetrievalEvaluationSchema = z.object({
  confidence: z
    .number()
    .transform((n) => Math.min(100, Math.max(0, Math.round(n))))
    .pipe(z.number().int().min(0).max(100)),
  reason: z.string().default("No reason provided"),
  retry_strategy: RetryStrategySchema.default(null),
});

// ============================================================================
// Coherence Validation Schema
// ============================================================================

export const CoherenceValidationSchema = z.object({
  score: z
    .number()
    .transform((n) => Math.min(100, Math.max(0, Math.round(n))))
    .pipe(z.number().int().min(0).max(100)),
  reason: z.string().default("No reason provided"),
  missing: z.string().nullable().default(null),
});

// ============================================================================
// Confidence Weights
// ============================================================================

export const CONFIDENCE_WEIGHTS = {
  retrieval: 0.35,
  grounding: 0.25,
  coherence: 0.40,
} as const;

// ============================================================================
// Generic Judge Output Parser
// ============================================================================

/**
 * Parse and validate LLM judge output with Zod schema.
 * Returns null on any failure (parse error, validation error).
 * Callers fall back to their existing safe defaults.
 */
export function parseJudgeOutput<T>(
  rawText: string,
  schema: z.ZodSchema<T>,
  context: string
): T | null {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }

  try {
    const raw = JSON.parse(cleaned);
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.warn(
        `[${context}] Schema validation failed:`,
        result.error.flatten()
      );
      return null;
    }
    return result.data;
  } catch (e) {
    console.warn(
      `[${context}] JSON parse failed:`,
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

// ============================================================================
// Inferred Types
// ============================================================================

export type NumericalValueType = z.infer<typeof NumericalValueSchema>;
export type ClaimType = z.infer<typeof ClaimSchema>;
export type StructuredResponseType = z.infer<typeof StructuredResponseSchema>;
export type DecomposedQueryLLMType = z.infer<typeof DecomposedQueryLLMSchema>;
export type RetrievalEvaluationType = z.infer<typeof RetrievalEvaluationSchema>;
export type CoherenceValidationType = z.infer<typeof CoherenceValidationSchema>;
