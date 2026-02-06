/**
 * RAG Evaluation Metrics (RAGAS-inspired)
 *
 * Implements four key metrics using LLM-as-judge pattern:
 * 1. Faithfulness: Does the answer only contain info from the context?
 * 2. Answer Relevancy: Does the answer address the question?
 * 3. Context Precision: Are retrieved chunks relevant to the question?
 * 4. Context Recall: Did retrieval find all needed information?
 *
 * Uses the existing model fallback chain as the judge LLM.
 */

import {
  judgeFaithfulness,
  judgeRelevancy,
  judgeContextPrecision,
  judgeContextRecall,
} from "./llm-judge";

export interface RAGMetrics {
  /** Fraction of answer claims supported by context (0-1) */
  faithfulness: number;
  /** How well the answer addresses the question (0-1) */
  answerRelevancy: number;
  /** Fraction of retrieved chunks that are relevant (0-1) */
  contextPrecision: number;
  /** Fraction of ground truth covered by context (0-1, requires groundTruth) */
  contextRecall: number | null;
  /** Fraction of claims NOT in context (1 - faithfulness) */
  hallucination: number;
}

export interface RAGEvalInput {
  /** The user's question */
  question: string;
  /** The RAG system's answer */
  answer: string;
  /** The retrieved chunk contents */
  contexts: string[];
  /** Optional reference answer for recall calculation */
  groundTruth?: string;
}

export interface DetailedRAGMetrics extends RAGMetrics {
  details: {
    faithfulness: {
      claims: { text: string; supported: boolean }[];
    };
    relevancy: {
      generatedQuestions: string[];
    };
    contextPrecision: {
      relevancePerChunk: boolean[];
    };
    contextRecall: {
      coveredStatements: { text: string; covered: boolean }[];
    } | null;
  };
}

/**
 * Evaluate a RAG response using all four RAGAS-style metrics.
 * Runs all metric evaluations in parallel for efficiency.
 */
export async function evaluateRAGMetrics(
  input: RAGEvalInput
): Promise<DetailedRAGMetrics> {
  const { question, answer, contexts, groundTruth } = input;

  // Run evaluations in parallel
  const [faithfulnessResult, relevancyResult, precisionResult, recallResult] =
    await Promise.all([
      judgeFaithfulness(answer, contexts),
      judgeRelevancy(question, answer),
      judgeContextPrecision(question, contexts),
      groundTruth
        ? judgeContextRecall(groundTruth, contexts)
        : Promise.resolve(null),
    ]);

  return {
    faithfulness: faithfulnessResult.score,
    answerRelevancy: relevancyResult.score,
    contextPrecision: precisionResult.score,
    contextRecall: recallResult?.score ?? null,
    hallucination: 1 - faithfulnessResult.score,
    details: {
      faithfulness: { claims: faithfulnessResult.claims },
      relevancy: { generatedQuestions: relevancyResult.generatedQuestions },
      contextPrecision: {
        relevancePerChunk: precisionResult.relevancePerChunk,
      },
      contextRecall: recallResult
        ? { coveredStatements: recallResult.coveredStatements }
        : null,
    },
  };
}

/**
 * Compute a single composite score from RAG metrics.
 * Weighted average: faithfulness (0.3) + relevancy (0.3) + precision (0.2) + recall (0.2)
 */
export function computeCompositeScore(metrics: RAGMetrics): number {
  const weights = {
    faithfulness: 0.3,
    answerRelevancy: 0.3,
    contextPrecision: 0.2,
    contextRecall: 0.2,
  };

  let score = 0;
  let totalWeight = 0;

  score += metrics.faithfulness * weights.faithfulness;
  totalWeight += weights.faithfulness;

  score += metrics.answerRelevancy * weights.answerRelevancy;
  totalWeight += weights.answerRelevancy;

  score += metrics.contextPrecision * weights.contextPrecision;
  totalWeight += weights.contextPrecision;

  if (metrics.contextRecall !== null) {
    score += metrics.contextRecall * weights.contextRecall;
    totalWeight += weights.contextRecall;
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}
