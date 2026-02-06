#!/usr/bin/env tsx
/**
 * Comprehensive RAG Evaluation using RAGAS-style metrics
 *
 * Usage:
 *   npx tsx scripts/run-rag-evaluation.ts
 *   npx tsx scripts/run-rag-evaluation.ts --verbose
 *   npx tsx scripts/run-rag-evaluation.ts --output reports/rag-metrics.json
 *
 * Requires:
 *   - Running dev server (npm run dev) OR production deployment
 *   - Environment variables for LLM judge (GOOGLE_API_KEY or GROQ_API_KEY)
 */

import { evaluateRAGMetrics, computeCompositeScore } from "../lib/rag-metrics";
import type { DetailedRAGMetrics } from "../lib/rag-metrics";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const VERBOSE = process.argv.includes("--verbose");

// Parse --output flag
const outputIdx = process.argv.indexOf("--output");
const OUTPUT_PATH =
  outputIdx !== -1 ? process.argv[outputIdx + 1] : undefined;

interface TestQuery {
  id: string;
  query: string;
  groundTruth?: string;
  category: string;
}

// Core evaluation queries
const TEST_QUERIES: TestQuery[] = [
  {
    id: "YIELD-A790",
    query: "What is the yield strength of S32205 per ASTM A790?",
    groundTruth:
      "The minimum yield strength of S32205 per ASTM A790 is 65 ksi [450 MPa].",
    category: "lookup",
  },
  {
    id: "YIELD-A789",
    query: "What is the yield strength of S32205 per ASTM A789?",
    groundTruth:
      "The minimum yield strength of S32205 per ASTM A789 is 70 ksi [485 MPa].",
    category: "lookup",
  },
  {
    id: "COMPOSITION",
    query: "What is the chemical composition of S32205?",
    groundTruth:
      "S32205 composition: C 0.030 max, Cr 22.0-23.0, Ni 4.5-6.5, Mo 3.0-3.5, N 0.14-0.20.",
    category: "lookup",
  },
  {
    id: "COMPARISON",
    query: "Compare yield strength of S32205 in A789 vs A790",
    groundTruth:
      "A789 tubing: 70 ksi [485 MPa]. A790 pipe: 65 ksi [450 MPa]. A789 has higher yield.",
    category: "comparison",
  },
  {
    id: "REFUSAL",
    query: "What is the price per foot of A790 S32205 pipe?",
    groundTruth:
      "This question should be refused - pricing is not in ASTM specifications.",
    category: "refusal",
  },
];

interface EvalResult {
  id: string;
  query: string;
  category: string;
  metrics: DetailedRAGMetrics;
  compositeScore: number;
  ragResponse: string;
  sourceCount: number;
  latencyMs: number;
}

async function queryRAG(
  query: string
): Promise<{ response: string; sources: { content_preview: string }[] }> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function evaluateQuery(testQuery: TestQuery): Promise<EvalResult> {
  const start = Date.now();
  const data = await queryRAG(testQuery.query);
  const latencyMs = Date.now() - start;

  const metrics = await evaluateRAGMetrics({
    question: testQuery.query,
    answer: data.response,
    contexts: data.sources.map((s) => s.content_preview),
    groundTruth: testQuery.groundTruth,
  });

  const compositeScore = computeCompositeScore(metrics);

  return {
    id: testQuery.id,
    query: testQuery.query,
    category: testQuery.category,
    metrics,
    compositeScore,
    ragResponse: data.response,
    sourceCount: data.sources.length,
    latencyMs,
  };
}

async function main() {
  console.log("=== RAGAS-style RAG Evaluation ===");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Queries: ${TEST_QUERIES.length}`);
  console.log();

  const results: EvalResult[] = [];

  for (const testQuery of TEST_QUERIES) {
    process.stdout.write(`[${testQuery.id}] ${testQuery.query.slice(0, 50)}...`);

    try {
      const result = await evaluateQuery(testQuery);
      results.push(result);

      console.log(
        ` => Composite: ${result.compositeScore.toFixed(2)} | Faith: ${result.metrics.faithfulness.toFixed(2)} | Rel: ${result.metrics.answerRelevancy.toFixed(2)} | Prec: ${result.metrics.contextPrecision.toFixed(2)} (${result.latencyMs}ms)`
      );

      if (VERBOSE) {
        console.log(`  Response: ${result.ragResponse.slice(0, 120)}...`);
        console.log(
          `  Sources: ${result.sourceCount} | Recall: ${result.metrics.contextRecall?.toFixed(2) ?? "N/A"}`
        );
        console.log(
          `  Hallucination: ${result.metrics.hallucination.toFixed(2)}`
        );
        console.log();
      }
    } catch (error) {
      console.log(
        ` => ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Summary
  console.log("\n=== Summary ===");

  if (results.length === 0) {
    console.log("No results. Is the server running?");
    process.exit(1);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avgComposite = avg(results.map((r) => r.compositeScore));
  const avgFaithfulness = avg(results.map((r) => r.metrics.faithfulness));
  const avgRelevancy = avg(results.map((r) => r.metrics.answerRelevancy));
  const avgPrecision = avg(results.map((r) => r.metrics.contextPrecision));
  const recallValues = results
    .map((r) => r.metrics.contextRecall)
    .filter((v): v is number => v !== null);
  const avgRecall = recallValues.length > 0 ? avg(recallValues) : null;
  const avgLatency = avg(results.map((r) => r.latencyMs));

  console.log(`Composite Score:    ${avgComposite.toFixed(3)}`);
  console.log(`Faithfulness:       ${avgFaithfulness.toFixed(3)}`);
  console.log(`Answer Relevancy:   ${avgRelevancy.toFixed(3)}`);
  console.log(`Context Precision:  ${avgPrecision.toFixed(3)}`);
  console.log(
    `Context Recall:     ${avgRecall !== null ? avgRecall.toFixed(3) : "N/A"}`
  );
  console.log(`Avg Latency:        ${avgLatency.toFixed(0)}ms`);
  console.log(`Queries Evaluated:  ${results.length}/${TEST_QUERIES.length}`);

  // Breakdown by category
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catAvg = avg(catResults.map((r) => r.compositeScore));
    console.log(`  ${cat}: ${catAvg.toFixed(3)} (${catResults.length} queries)`);
  }

  // Output to file
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      compositeScore: avgComposite,
      faithfulness: avgFaithfulness,
      answerRelevancy: avgRelevancy,
      contextPrecision: avgPrecision,
      contextRecall: avgRecall,
      avgLatencyMs: avgLatency,
      queriesEvaluated: results.length,
      totalQueries: TEST_QUERIES.length,
    },
    results: results.map((r) => ({
      id: r.id,
      query: r.query,
      category: r.category,
      compositeScore: r.compositeScore,
      metrics: {
        faithfulness: r.metrics.faithfulness,
        answerRelevancy: r.metrics.answerRelevancy,
        contextPrecision: r.metrics.contextPrecision,
        contextRecall: r.metrics.contextRecall,
        hallucination: r.metrics.hallucination,
      },
      sourceCount: r.sourceCount,
      latencyMs: r.latencyMs,
    })),
  };

  const outputPath =
    OUTPUT_PATH || path.join("reports", "rag-metrics.json");
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${outputPath}`);

  // Exit with error if composite score is too low
  if (avgComposite < 0.5) {
    console.log("\nWARNING: Composite score below 0.5 threshold");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
