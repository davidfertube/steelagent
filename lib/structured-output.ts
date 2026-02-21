/**
 * Structured Output for Zero Hallucination Pipeline
 *
 * Forces LLM to output structured JSON for easier verification.
 * Each claim is extracted with source references and exact quotes
 * for post-generation verification.
 *
 * Uses Zod schemas for runtime validation of LLM outputs.
 */

import { StructuredResponseSchema } from "./schemas";
import type { ClaimType, StructuredResponseType } from "./schemas";

// ============================================================================
// Types (re-exported from Zod schemas for backward compatibility)
// ============================================================================

export type Claim = ClaimType;
export type StructuredResponse = StructuredResponseType;

/**
 * Parsed response with metadata
 */
export interface ParsedResponse {
  structured: StructuredResponse;
  raw: string;
  parseSuccess: boolean;
  parseError?: string;
}

// ============================================================================
// Prompts
// ============================================================================

/**
 * System prompt that forces structured JSON output
 */
export const STRUCTURED_SYSTEM_PROMPT = `You are a senior materials engineer specializing in steel specifications, NACE/ASTM/API standards, and O&G compliance.

CRITICAL RULES:
1. ONLY answer based on the provided document context. Do NOT use external knowledge for specific values.
2. Output your response as valid JSON matching the schema below.
3. For every factual statement, create a claim entry with the exact source quote.
4. If information is not in documents, set source_type to "general_knowledge" and warn the user.
5. Never hallucinate specifications or compliance requirements.

OUTPUT SCHEMA (respond with ONLY this JSON, no markdown):
{
  "answer": "Direct answer to the question with [1], [2] citations",
  "claims": [
    {
      "claim": "The specific factual statement",
      "source_ref": "[1]",
      "exact_quote": "Exact text copied from the source document",
      "confidence": "high|medium|low",
      "numerical_values": [
        {"value": 170, "unit": "MPa", "property": "yield_strength"}
      ]
    }
  ],
  "missing_info": "What couldn't be found, or null if everything was found",
  "source_type": "documents"
}

CONFIDENCE LEVELS:
- "high": Exact quote found, numbers match perfectly
- "medium": Paraphrased or inferred from context
- "low": Not directly stated, based on general patterns

NUMERICAL VALUE EXTRACTION:
For any number in your claims, extract it with:
- value: The number (e.g., 170)
- unit: The unit (e.g., "MPa", "ksi", "HRC", "%")
- property: What it measures (e.g., "yield_strength", "tensile_strength", "hardness", "elongation")`;

/**
 * Build user prompt for structured output
 */
export function buildStructuredUserPrompt(
  context: string,
  query: string,
  hasDocuments: boolean
): string {
  if (!hasDocuments) {
    return `USER QUESTION: ${query}

NOTE: No documents have been uploaded to the knowledge base yet.

Respond with JSON. Set source_type to "general_knowledge" and include a warning that:
1. This is general knowledge, not from uploaded documents
2. User should upload relevant specification PDFs for verified, citable answers
3. Specific numerical values should not be trusted without document sources`;
  }

  return `RETRIEVED DOCUMENT CONTEXT:
${context}

---
USER QUESTION: ${query}

Instructions:
1. Answer ONLY using the context above
2. Create a claim entry for EVERY factual statement
3. Copy exact_quote VERBATIM from the source
4. If you cannot find exact text for a claim, set confidence to "low"
5. Extract all numerical values with their units
6. Respond with ONLY the JSON object, no other text`;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse LLM response into structured format
 *
 * Uses Zod schema validation for type-safe parsing with automatic
 * coercion and defaults. Falls back to citation-extraction for
 * malformed responses.
 */
export function parseStructuredResponse(rawResponse: string): ParsedResponse {
  // Try to extract JSON from the response
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return createFallbackResponse(rawResponse, "No JSON object found in response");
  }

  try {
    const raw = JSON.parse(jsonMatch[0]);
    const result = StructuredResponseSchema.safeParse(raw);

    if (!result.success) {
      const errors = result.error.flatten();
      console.warn("[Structured Output] Zod validation failed:", errors);
      return createFallbackResponse(
        rawResponse,
        `Schema validation failed: ${JSON.stringify(errors.fieldErrors)}`
      );
    }

    return {
      structured: result.data,
      raw: rawResponse,
      parseSuccess: true,
    };
  } catch (error) {
    return createFallbackResponse(
      rawResponse,
      `JSON parse error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create a fallback response when JSON parsing fails
 */
function createFallbackResponse(rawResponse: string, error: string): ParsedResponse {
  // Create claims from paragraphs that have citations
  const claims: Claim[] = [];
  const paragraphs = rawResponse.split(/\n\n+/);

  for (const para of paragraphs) {
    const citationMatch = para.match(/\[(\d+)\]/);
    if (citationMatch) {
      claims.push({
        claim: para.replace(/\[\d+\]/g, "").trim().substring(0, 200),
        source_ref: citationMatch[0],
        exact_quote: "",
        confidence: "low",
        numerical_values: undefined,
      });
    }
  }

  return {
    structured: {
      answer: rawResponse,
      claims,
      missing_info: undefined,
      source_type: "documents",
    },
    raw: rawResponse,
    parseSuccess: false,
    parseError: error,
  };
}

// ============================================================================
// Extraction Utilities
// ============================================================================

/**
 * Extract all numerical values from text
 *
 * Used for verification - extracts numbers with their units
 */
export function extractNumericalValues(text: string): {
  value: number;
  unit: string;
  original: string;
}[] {
  const results: { value: number; unit: string; original: string }[] = [];

  // Pattern for numbers with units
  // Matches: 170 MPa, 25 ksi, 32 HRC, 0.03%, 550°C, etc.
  const patterns = [
    // Standard number + unit
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(MPa|ksi|psi|HRC|HRB|HBW|HV|%|°[CF]|mm|in|kJ\/m²)/gi,
    // Fractions like 1/2"
    /(\d+\/\d+)\s*("|in|inch)/gi,
    // Ranges like 170-250 MPa
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*[-–]\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(MPa|ksi|psi|HRC|HBW|%)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(value)) {
        results.push({
          value,
          unit: match[match.length - 1] || "",
          original: match[0],
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.value}-${r.unit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract technical specifications from claims
 *
 * Identifies specific types of specifications (yield, tensile, hardness, etc.)
 */
export function categorizeClaimProperty(claim: string): string {
  const lower = claim.toLowerCase();

  if (lower.includes("yield") || lower.includes("ys")) return "yield_strength";
  if (lower.includes("tensile") || lower.includes("uts") || lower.includes("ultimate")) return "tensile_strength";
  if (lower.includes("elongation") || lower.includes("elong")) return "elongation";
  if (lower.includes("hardness") || lower.includes("hrc") || lower.includes("hbw")) return "hardness";
  if (lower.includes("pren")) return "pren";
  if (lower.includes("impact") || lower.includes("charpy")) return "impact";
  if (lower.includes("temperature") || lower.includes("anneal")) return "temperature";
  if (lower.includes("composition") || lower.includes("carbon") || lower.includes("chromium")) return "composition";

  return "other";
}
