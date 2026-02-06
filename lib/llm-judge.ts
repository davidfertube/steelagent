/**
 * LLM-as-Judge utility for RAG evaluation
 *
 * Sends structured evaluation prompts to the LLM and parses responses.
 * Uses the existing model fallback chain (Gemini → Groq → etc.).
 */

import { getModelFallbackClient } from "./model-fallback";

interface FaithfulnessResult {
  score: number;
  claims: { text: string; supported: boolean }[];
}

interface RelevancyResult {
  score: number;
  generatedQuestions: string[];
}

interface ContextPrecisionResult {
  score: number;
  relevancePerChunk: boolean[];
}

interface ContextRecallResult {
  score: number;
  coveredStatements: { text: string; covered: boolean }[];
}

/**
 * Parse a JSON response from the LLM, handling markdown code fences.
 */
function parseJSONResponse<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

async function callJudge(prompt: string): Promise<string> {
  const client = getModelFallbackClient();
  const { text } = await client.generateContent(prompt);
  return text;
}

/**
 * Evaluate faithfulness: are all claims in the answer supported by the context?
 */
export async function judgeFaithfulness(
  answer: string,
  contexts: string[]
): Promise<FaithfulnessResult> {
  const contextStr = contexts
    .map((c, i) => `[Context ${i + 1}]: ${c}`)
    .join("\n\n");

  const prompt = `You are an evaluation judge. Your task is to assess the faithfulness of an answer relative to provided contexts.

CONTEXTS:
${contextStr}

ANSWER:
${answer}

INSTRUCTIONS:
1. Extract every distinct factual claim from the ANSWER.
2. For each claim, determine if it is supported by the CONTEXTS (true) or not (false).
3. A claim is "supported" if the context contains information that directly supports or implies it.
4. General knowledge or hedging statements ("according to the documents") count as supported.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "claims": [
    { "text": "claim text here", "supported": true },
    { "text": "another claim", "supported": false }
  ]
}`;

  try {
    const response = await callJudge(prompt);
    const parsed = parseJSONResponse<{ claims: FaithfulnessResult["claims"] }>(response);
    const claims = parsed.claims || [];
    const supportedCount = claims.filter((c) => c.supported).length;
    const score = claims.length > 0 ? supportedCount / claims.length : 1;
    return { score, claims };
  } catch {
    return { score: 0, claims: [] };
  }
}

/**
 * Evaluate answer relevancy: does the answer address the question?
 */
export async function judgeRelevancy(
  question: string,
  answer: string
): Promise<RelevancyResult> {
  const prompt = `You are an evaluation judge. Your task is to assess how relevant an answer is to a given question.

QUESTION: ${question}

ANSWER: ${answer}

INSTRUCTIONS:
1. Generate 3 questions that the ANSWER would be a good response to.
2. Rate the overall relevancy of the ANSWER to the QUESTION on a scale of 0.0 to 1.0:
   - 1.0 = perfectly addresses the question
   - 0.7 = mostly relevant with some tangential info
   - 0.4 = partially relevant
   - 0.0 = completely irrelevant or off-topic

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "score": 0.85,
  "generatedQuestions": ["question 1", "question 2", "question 3"]
}`;

  try {
    const response = await callJudge(prompt);
    const parsed = parseJSONResponse<RelevancyResult>(response);
    return {
      score: Math.max(0, Math.min(1, parsed.score || 0)),
      generatedQuestions: parsed.generatedQuestions || [],
    };
  } catch {
    return { score: 0, generatedQuestions: [] };
  }
}

/**
 * Evaluate context precision: are retrieved chunks relevant to the question?
 */
export async function judgeContextPrecision(
  question: string,
  contexts: string[]
): Promise<ContextPrecisionResult> {
  const contextStr = contexts
    .map((c, i) => `[Chunk ${i + 1}]: ${c}`)
    .join("\n\n");

  const prompt = `You are an evaluation judge. Your task is to assess whether retrieved context chunks are relevant to a question.

QUESTION: ${question}

RETRIEVED CHUNKS:
${contextStr}

INSTRUCTIONS:
For each chunk, determine if it contains information relevant to answering the QUESTION (true) or not (false).
A chunk is "relevant" if it contains any information that could help answer the question.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "relevancePerChunk": [true, false, true]
}`;

  try {
    const response = await callJudge(prompt);
    const parsed = parseJSONResponse<{ relevancePerChunk: boolean[] }>(response);
    const relevance = parsed.relevancePerChunk || [];
    const relevantCount = relevance.filter(Boolean).length;
    const score = relevance.length > 0 ? relevantCount / relevance.length : 0;
    return { score, relevancePerChunk: relevance };
  } catch {
    return { score: 0, relevancePerChunk: [] };
  }
}

/**
 * Evaluate context recall: does the context cover the ground truth answer?
 */
export async function judgeContextRecall(
  groundTruth: string,
  contexts: string[]
): Promise<ContextRecallResult> {
  const contextStr = contexts
    .map((c, i) => `[Context ${i + 1}]: ${c}`)
    .join("\n\n");

  const prompt = `You are an evaluation judge. Your task is to assess whether the provided contexts contain the information needed to produce a ground truth answer.

GROUND TRUTH ANSWER: ${groundTruth}

CONTEXTS:
${contextStr}

INSTRUCTIONS:
1. Break the GROUND TRUTH ANSWER into distinct factual statements.
2. For each statement, determine if it can be attributed to the CONTEXTS (true) or not (false).

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "coveredStatements": [
    { "text": "statement from ground truth", "covered": true },
    { "text": "another statement", "covered": false }
  ]
}`;

  try {
    const response = await callJudge(prompt);
    const parsed = parseJSONResponse<{
      coveredStatements: ContextRecallResult["coveredStatements"];
    }>(response);
    const statements = parsed.coveredStatements || [];
    const coveredCount = statements.filter((s) => s.covered).length;
    const score = statements.length > 0 ? coveredCount / statements.length : 0;
    return { score, coveredStatements: statements };
  } catch {
    return { score: 0, coveredStatements: [] };
  }
}
