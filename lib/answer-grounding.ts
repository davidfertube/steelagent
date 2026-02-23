/**
 * Always-On Answer Grounding
 *
 * Lightweight numerical grounding check for the standard RAG path.
 * Extracts numbers from the LLM response and verifies each exists
 * in at least one source chunk. Pure regex — no LLM calls needed.
 *
 * This catches hallucinated numbers (e.g., LLM says "65 ksi" when
 * chunks say "70 ksi") without the overhead of the full verified
 * generation pipeline.
 */

import { extractNumericalValues } from "./structured-output";
import { type TraceSpan, createSpan, endSpan } from "./langfuse";

export interface GroundingResult {
  /** Percentage of response numbers found in chunks (0-100) */
  score: number;
  /** True if score >= 50 */
  passed: boolean;
  /** Total numbers extracted from the response */
  totalNumbers: number;
  /** Numbers verified against source chunks */
  groundedNumbers: number;
  /** Numbers NOT found in any chunk */
  ungroundedNumbers: { value: number; unit: string; original: string }[];
}

/**
 * Check whether numerical values in the LLM response are grounded
 * in the source chunks.
 *
 * Uses extractNumericalValues() from structured-output.ts to find
 * numbers with units (MPa, ksi, HRC, %, etc.) and verifies each
 * exists in at least one chunk with 0.01 tolerance.
 *
 * @param responseText - The LLM's generated response
 * @param chunks - Source chunks used for generation
 * @returns Grounding result with score and ungrounded numbers
 */
export function groundResponse(
  responseText: string,
  chunks: { content: string }[],
  parentSpan?: TraceSpan | null,
): GroundingResult {
  const span = createSpan(parentSpan, "answer-grounding", { responseLength: responseText.length, chunkCount: chunks.length });
  // Extract numbers from response
  const responseNumbers = extractNumericalValues(responseText);

  if (responseNumbers.length === 0) {
    // No numerical claims to verify — neutral score (not perfect)
    // A score of 100 falsely inflates confidence for text-only responses;
    // 70 represents "no evidence of hallucination, but nothing verified either"
    const result: GroundingResult = { score: 70, passed: true, totalNumbers: 0, groundedNumbers: 0, ungroundedNumbers: [] };
    endSpan(span, result);
    return result;
  }

  // Collect all numbers from all source chunks into a flat set
  const sourceNumbers = new Set<number>();
  for (const chunk of chunks) {
    const chunkNumbers = extractNumericalValues(chunk.content);
    for (const n of chunkNumbers) {
      sourceNumbers.add(n.value);
    }
  }

  // Verify each response number against source numbers
  const ungrounded: GroundingResult["ungroundedNumbers"] = [];
  let groundedCount = 0;

  for (const rn of responseNumbers) {
    const isGrounded = hasMatchingNumber(rn.value, sourceNumbers);
    if (isGrounded) {
      groundedCount++;
    } else if ((rn.value > 10 || !Number.isInteger(rn.value)) && hasRawNumberInChunks(rn.value, chunks)) {
      // Secondary check: look for bare number in chunk text (handles table values).
      // ASTM tables store values without adjacent units — units are in the header row.
      // Integer threshold > 10 avoids false positives from page/section numbers.
      // Decimals (e.g., 0.08% carbon) always pass — they're never page numbers.
      groundedCount++;
    } else {
      ungrounded.push(rn);
    }
  }

  const score = Math.round((groundedCount / responseNumbers.length) * 100);

  const result: GroundingResult = {
    score,
    passed: score >= 50,
    totalNumbers: responseNumbers.length,
    groundedNumbers: groundedCount,
    ungroundedNumbers: ungrounded,
  };
  endSpan(span, { score, passed: result.passed, totalNumbers: result.totalNumbers, groundedNumbers: groundedCount });
  return result;
}

/**
 * Check if a number exists in the source set with 0.01 tolerance.
 * Same tolerance as claim-verification.ts verifyNumbers().
 */
function hasMatchingNumber(value: number, sourceNumbers: Set<number>): boolean {
  for (const source of sourceNumbers) {
    if (Math.abs(value - source) < 0.01) {
      return true;
    }
  }
  return false;
}

/**
 * Fallback: check if a bare number appears in any chunk text.
 * Handles ASTM table values where numbers appear without adjacent units
 * (units are in the table header row, not next to each value).
 *
 * Uses word boundaries to avoid partial matches (e.g., "75" won't match "175").
 */
function hasRawNumberInChunks(value: number, chunks: { content: string }[]): boolean {
  const numStr = Number.isInteger(value) ? String(value) : value.toFixed(2);
  const pattern = new RegExp(`\\b${numStr.replace('.', '\\.')}\\b`);
  return chunks.some(chunk => pattern.test(chunk.content));
}
