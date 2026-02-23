/**
 * Hard 10-Query Multi-Document Test
 *
 * Stress-tests the RAG pipeline with deliberately difficult queries:
 * - Cross-spec comparisons (A789 vs A790 vs A872)
 * - Multi-value extractions (chemical compositions with ranges)
 * - Complex reasoning (yield-to-tensile ratios, heat treatment comparison)
 * - Nuanced refusals (out-of-scope but plausible questions)
 *
 * Usage:
 *   npx tsx scripts/hard-10-test.ts
 *   npx tsx scripts/hard-10-test.ts --verbose
 *
 * Requires: dev server running on localhost:3000
 */

export {};

import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const QUERY_TIMEOUT = 180_000;
const DELAY_BETWEEN_QUERIES = 3_000; // Slightly longer for complex queries
const VERBOSE = process.argv.includes("--verbose");

interface Source {
  ref: string;
  document: string;
  page: string;
}

interface RAGResponse {
  response: string;
  sources: Source[];
  confidence?: {
    overall: number;
    retrieval: number;
    grounding: number;
    coherence: number;
  };
  error?: string;
}

interface GoldenQuery {
  id: string;
  question: string;
  expected_values?: string[];
  expected_answer?: string;
  expect_refusal?: boolean;
  difficulty: string;
  tags: string[];
}

interface GoldenDataset {
  name: string;
  qa_pairs: GoldenQuery[];
}

interface TestResult {
  id: string;
  difficulty: string;
  pass: boolean;
  latencyMs: number;
  confidence: number;
  issues: string[];
  notes: string[];
  hasCitations: boolean;
  sourceCount: number;
}

const datasetPath = path.join(__dirname, "..", "tests", "golden-dataset", "hard-10.json");
const dataset: GoldenDataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

/**
 * Normalize Unicode for robust comparison.
 */
function normalizeForComparison(text: string): string {
  return text
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0\u2009\u200A\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateResponse(query: GoldenQuery, data: RAGResponse): { pass: boolean; issues: string[]; notes: string[] } {
  const issues: string[] = [];
  const notes: string[] = [];
  const resp = normalizeForComparison(data.response || "");

  if (query.expect_refusal) {
    const isRefusal = /I cannot|not (available|provided|included|found|covered)|does not (contain|cover|specify)|unable to|is not covered|cannot provide a confident answer|not included in/i.test(resp);
    if (isRefusal) {
      notes.push("Correctly refused");
    } else {
      const confidence = data.confidence?.overall ?? 100;
      if (confidence < 45) {
        notes.push(`Low confidence (${confidence}%) — treated as implicit refusal`);
      } else {
        issues.push("Expected refusal but got substantive response");
      }
    }
    return { pass: issues.length === 0, issues, notes };
  }

  // Non-refusal: check for false refusals
  if (/I cannot (provide|answer|find|determine)/i.test(resp)) {
    issues.push("False refusal");
  }

  // Check expected values with flexible matching
  if (query.expected_values && query.expected_values.length > 0) {
    const matchedValues: string[] = [];
    const missedValues: string[] = [];

    for (const val of query.expected_values) {
      const normalizedVal = normalizeForComparison(val);
      const escaped = normalizedVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const flexPattern = escaped.replace(/ /g, "\\s+");
      if (new RegExp(flexPattern, "i").test(resp)) {
        matchedValues.push(val);
      } else {
        missedValues.push(val);
      }
    }

    // For hard queries, require at least half the expected values
    const threshold = Math.ceil(query.expected_values.length / 2);
    if (matchedValues.length >= threshold) {
      notes.push(`Values found: ${matchedValues.join(", ")} (${matchedValues.length}/${query.expected_values.length})`);
    } else {
      issues.push(`Insufficient values found: ${matchedValues.length}/${query.expected_values.length} (need ${threshold}+). Found: [${matchedValues.join(", ")}], Missing: [${missedValues.join(", ")}]`);
    }
  }

  // Check citations
  if (/\[\d+\]/.test(resp)) {
    notes.push("Citations present");
  } else {
    issues.push("No citations");
  }

  // For cross-spec queries, check that multiple documents are referenced
  if (query.tags.includes("cross-spec") || query.tags.includes("multi-doc")) {
    const docCount = data.sources?.length ?? 0;
    if (docCount >= 2) {
      notes.push(`Multi-doc: ${docCount} sources`);
    } else {
      notes.push(`Warning: Only ${docCount} source(s) for cross-spec query`);
    }
  }

  if (resp.length < 80) {
    issues.push("Response too short for complex query");
  }

  return { pass: issues.length === 0, issues, notes };
}

async function queryRAG(query: string): Promise<{ data: RAGResponse; latencyMs: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": BASE_URL },
      body: JSON.stringify({ query, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as RAGResponse;
    return { data, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}

async function runTest(): Promise<void> {
  console.log("=".repeat(70));
  console.log("  SteelAgent Hard 10-Query Multi-Document Test");
  console.log("  Cross-spec comparisons, complex reasoning, nuanced refusals");
  console.log("=".repeat(70));
  console.log();

  // Check server
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok && res.status !== 405) throw new Error(`Status ${res.status}`);
  } catch {
    console.error(`Server not available at ${BASE_URL}. Start with: npm run dev`);
    process.exit(1);
  }

  const results: TestResult[] = [];
  const queries = dataset.qa_pairs;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`  [${i + 1}/${queries.length}] ${q.id} (${q.difficulty})`);
    console.log(`  Query: "${q.question.slice(0, 100)}${q.question.length > 100 ? "..." : ""}"`);
    console.log();

    try {
      const { data, latencyMs } = await queryRAG(q.question);
      const { pass, issues, notes } = validateResponse(q, data);

      const hasCitations = /\[\d+\]/.test(data.response || "");
      const sourceCount = data.sources?.length ?? 0;

      if (VERBOSE) {
        const preview = (data.response || "").replace(/\n/g, " ").slice(0, 400);
        console.log(`  Response: ${preview}...`);
        console.log(`  Sources:  ${data.sources?.map(s => `${s.ref} ${s.document} p.${s.page}`).join(" | ") || "none"}`);
      }
      console.log(`  Confidence: ${data.confidence?.overall || "N/A"}% (R:${data.confidence?.retrieval || "?"}% G:${data.confidence?.grounding || "?"}% C:${data.confidence?.coherence || "?"}%)`);
      console.log(`  Latency:  ${(latencyMs / 1000).toFixed(1)}s`);
      console.log(`  Sources:  ${sourceCount}`);
      console.log(`  Result:   ${pass ? "PASS" : "FAIL"}`);

      if (issues.length > 0) for (const issue of issues) console.log(`    ISSUE: ${issue}`);
      if (notes.length > 0) for (const note of notes) console.log(`    NOTE:  ${note}`);

      results.push({
        id: q.id,
        difficulty: q.difficulty,
        pass,
        latencyMs,
        confidence: data.confidence?.overall ?? 0,
        issues,
        notes,
        hasCitations,
        sourceCount,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${msg.slice(0, 150)}`);
      results.push({
        id: q.id,
        difficulty: q.difficulty,
        pass: false,
        latencyMs: 0,
        confidence: 0,
        issues: [msg.slice(0, 200)],
        notes: [],
        hasCitations: false,
        sourceCount: 0,
      });
    }

    console.log();
    console.log("  " + "-".repeat(66));
    console.log();

    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_QUERIES));
    }
  }

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const activeResults = results.filter((r) => r.latencyMs > 0);
  const latencies = activeResults.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgLatency = activeResults.reduce((s, r) => s + r.latencyMs, 0) / Math.max(activeResults.length, 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / Math.max(results.length, 1);
  const citationRate = results.filter((r) => r.hasCitations).length / total;
  const avgSourceCount = results.reduce((s, r) => s + r.sourceCount, 0) / Math.max(results.length, 1);

  const refusalResults = results.filter((r) => dataset.qa_pairs.find((q) => q.id === r.id)?.expect_refusal);
  const nonRefusalResults = results.filter((r) => !dataset.qa_pairs.find((q) => q.id === r.id)?.expect_refusal);

  console.log("=".repeat(70));
  console.log("  HARD 10-QUERY TEST RESULTS");
  console.log("=".repeat(70));
  console.log();
  console.log(`  Overall Accuracy:     ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`  Citation Rate:        ${((citationRate) * 100).toFixed(1)}%`);
  console.log(`  Avg Confidence:       ${avgConfidence.toFixed(0)}%`);
  console.log(`  Avg Source Count:     ${avgSourceCount.toFixed(1)}`);
  console.log(`  Avg Latency:          ${(avgLatency / 1000).toFixed(1)}s`);
  console.log(`  P50 Latency:          ${(p50 / 1000).toFixed(1)}s`);
  console.log(`  P95 Latency:          ${(p95 / 1000).toFixed(1)}s`);
  console.log();

  console.log("  By Type:");
  const refusalPassed = refusalResults.filter((r) => r.pass).length;
  const nonRefusalPassed = nonRefusalResults.filter((r) => r.pass).length;
  console.log(`    Substantive:   ${nonRefusalPassed}/${nonRefusalResults.length} (${((nonRefusalPassed / Math.max(nonRefusalResults.length, 1)) * 100).toFixed(0)}%)`);
  console.log(`    Refusal/Trap:  ${refusalPassed}/${refusalResults.length} (${((refusalPassed / Math.max(refusalResults.length, 1)) * 100).toFixed(0)}%)`);
  console.log();

  // Per-query table
  console.log("  ID               Pass  Latency  Confidence  Sources");
  console.log("  " + "\u2500".repeat(58));
  for (const r of results) {
    const pass = r.pass ? " OK " : "FAIL";
    const lat = r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : "N/A";
    const conf = r.confidence > 0 ? `${r.confidence}%` : "N/A";
    console.log(`  ${r.id.padEnd(17)} ${pass}  ${lat.padStart(7)}  ${conf.padStart(10)}  ${r.sourceCount}`);
  }
  console.log();

  const failures = results.filter((r) => !r.pass);
  if (failures.length > 0) {
    console.log("  FAILURE ANALYSIS:");
    for (const f of failures) {
      console.log(`    ${f.id}: ${f.issues.join("; ")}`);
    }
    console.log();
  }

  if (passed === total) {
    console.log("  ALL 10 HARD QUERIES PASSED!");
  } else {
    console.log(`  ${failures.length} QUERIES FAILED -- see analysis above`);
  }
  console.log();
}

runTest().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
