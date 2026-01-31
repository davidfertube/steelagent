#!/usr/bin/env tsx
/**
 * Real Test Runner - Tests RAG system against actual documents in database
 *
 * This script:
 * 1. Queries the database to see what documents are uploaded
 * 2. Runs test queries against the real API
 * 3. Evaluates responses using pattern matching
 * 4. Reports accuracy metrics
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Source } from "../lib/api";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// Test Case Definitions
// ============================================

interface TestCase {
  id: string;
  query: string;
  expectedPatterns: RegExp[];
  forbiddenPatterns?: RegExp[];
  requiredDocument?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TestResult {
  testCase: TestCase;
  response: string;
  sources: Source[];
  passed: boolean;
  matchedPatterns: string[];
  missedPatterns: string[];
  forbiddenMatches: string[];
  latencyMs: number;
  error?: string;
}

// Test cases for A790 (most common document)
const A790_TESTS: TestCase[] = [
  {
    id: "A790-YIELD-S32205",
    query: "What is the minimum yield strength of S32205 duplex stainless steel pipe per ASTM A790?",
    expectedPatterns: [/65\s*ksi|450\s*MPa/i, /S32205|2205/i],
    forbiddenPatterns: [/70\s*ksi|485\s*MPa/i], // A789 value
    requiredDocument: "A790",
    category: "lookup",
    difficulty: "easy"
  },
  {
    id: "A790-CARBON-S32750",
    query: "What is the maximum carbon content for S32750 super duplex per A790?",
    expectedPatterns: [/0\.030/i, /S32750/i],
    requiredDocument: "A790",
    category: "lookup",
    difficulty: "easy"
  },
  {
    id: "A790-HEAT-S31803",
    query: "What is the heat treatment temperature range for S31803 per A790?",
    expectedPatterns: [/1870|1020/i, /°F|°C/i],
    requiredDocument: "A790",
    category: "lookup",
    difficulty: "easy"
  },
  {
    id: "A790-HARDNESS-S32205",
    query: "What is the maximum hardness for S32205 duplex pipe per A790?",
    expectedPatterns: [/290\s*HBW|30\s*HRC/i],
    requiredDocument: "A790",
    category: "lookup",
    difficulty: "easy"
  },
  {
    id: "A790-TENSILE-COMPARE",
    query: "Compare the tensile strength of S32205 vs S32750 per A790",
    expectedPatterns: [/S32205/i, /S32750/i, /ksi|MPa/i],
    requiredDocument: "A790",
    category: "comparison",
    difficulty: "medium"
  },
  {
    id: "A790-SCOPE",
    query: "What is the scope of ASTM A790? What products does it cover?",
    expectedPatterns: [/pipe/i, /seamless|welded/i, /duplex|ferritic.*austenitic/i],
    requiredDocument: "A790",
    category: "lookup",
    difficulty: "easy"
  },
  {
    id: "A790-REFUSAL-PRICE",
    query: "What is the price per foot of A790 S32205 pipe?",
    expectedPatterns: [/cannot|not\s+(?:in|included|provided)|no\s+(?:information|pricing)|don't\s+have|not\s+contain/i],
    forbiddenPatterns: [/\$|USD|per\s+foot/i],
    requiredDocument: "A790",
    category: "refusal",
    difficulty: "easy"
  },
  {
    id: "A790-REFUSAL-CORROSION",
    query: "What is the corrosion rate of S32750 in seawater at 25C?",
    expectedPatterns: [/cannot|not\s+(?:in|included|provided)|no\s+(?:information|data)|don't\s+have|not\s+contain/i],
    forbiddenPatterns: [/mm\/year|mpy|corrosion\s+rate\s*[=:]\s*\d/i],
    requiredDocument: "A790",
    category: "refusal",
    difficulty: "medium"
  }
];

// Test cases for A789 (tubing - different values)
const A789_TESTS: TestCase[] = [
  {
    id: "A789-YIELD-S32205",
    query: "What is the yield strength of S32205 duplex tubing per ASTM A789?",
    expectedPatterns: [/70\s*ksi|485\s*MPa/i],
    forbiddenPatterns: [/65\s*ksi|450\s*MPa/i], // A790 value
    requiredDocument: "A789",
    category: "lookup",
    difficulty: "medium"
  },
  {
    id: "A789-SCOPE",
    query: "What product form does A789 cover?",
    expectedPatterns: [/tubing|tube/i],
    forbiddenPatterns: [/\bpipe\b/i],
    requiredDocument: "A789",
    category: "lookup",
    difficulty: "easy"
  }
];

// Cross-spec confusion tests
const CONFUSION_TESTS: TestCase[] = [
  {
    id: "CONF-COMPARE-YIELD",
    query: "Compare the yield strength of S32205 in A789 tubing vs A790 pipe specifications",
    expectedPatterns: [/70\s*ksi|485\s*MPa/i, /65\s*ksi|450\s*MPa/i],
    category: "comparison",
    difficulty: "hard"
  }
];

// ============================================
// Test Runner Functions
// ============================================

async function getDocumentsInDatabase(): Promise<{ id: number; filename: string; status: string }[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, filename, status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  return data || [];
}

async function getChunkStats(): Promise<{ totalChunks: number; byDocument: Record<string, number> }> {
  const { data, error } = await supabase
    .from("chunks")
    .select("document_id, documents!inner(filename)")
    .limit(10000);

  if (error) {
    console.error("Error fetching chunks:", error);
    return { totalChunks: 0, byDocument: {} };
  }

  const byDocument: Record<string, number> = {};
  for (const chunk of data || []) {
    const filename = (chunk.documents as { filename?: string })?.filename || "unknown";
    byDocument[filename] = (byDocument[filename] || 0) + 1;
  }

  return {
    totalChunks: data?.length || 0,
    byDocument
  };
}

async function runQuery(query: string): Promise<{ response: string; sources: Source[]; latencyMs: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      response: data.response || "",
      sources: data.sources || [],
      latencyMs
    };
  } catch (error) {
    return {
      response: `Error: ${error}`,
      sources: [],
      latencyMs: Date.now() - startTime
    };
  }
}

function evaluateResponse(testCase: TestCase, response: string): {
  passed: boolean;
  matchedPatterns: string[];
  missedPatterns: string[];
  forbiddenMatches: string[];
} {
  const matchedPatterns: string[] = [];
  const missedPatterns: string[] = [];
  const forbiddenMatches: string[] = [];

  // Check expected patterns
  for (const pattern of testCase.expectedPatterns) {
    if (pattern.test(response)) {
      matchedPatterns.push(pattern.source);
    } else {
      missedPatterns.push(pattern.source);
    }
  }

  // Check forbidden patterns
  if (testCase.forbiddenPatterns) {
    for (const pattern of testCase.forbiddenPatterns) {
      if (pattern.test(response)) {
        forbiddenMatches.push(pattern.source);
      }
    }
  }

  // Pass if at least 50% of expected patterns match AND no forbidden patterns
  const patternPassRate = matchedPatterns.length / testCase.expectedPatterns.length;
  const noForbiddenMatches = forbiddenMatches.length === 0;
  const passed = patternPassRate >= 0.5 && noForbiddenMatches;

  return { passed, matchedPatterns, missedPatterns, forbiddenMatches };
}

async function runTestSuite(tests: TestCase[], availableDocs: string[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of tests) {
    // Skip tests that require documents we don't have
    if (testCase.requiredDocument && !availableDocs.some(d =>
      d.toLowerCase().includes(testCase.requiredDocument!.toLowerCase())
    )) {
      console.log(`⏭️  Skipping ${testCase.id} - missing document ${testCase.requiredDocument}`);
      continue;
    }

    console.log(`🔍 Running: ${testCase.id}`);

    const { response, sources, latencyMs } = await runQuery(testCase.query);
    const evaluation = evaluateResponse(testCase, response);

    const result: TestResult = {
      testCase,
      response,
      sources,
      latencyMs,
      ...evaluation
    };

    results.push(result);

    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${testCase.id} (${latencyMs}ms)`);

    if (!result.passed) {
      console.log(`   Missed: ${result.missedPatterns.join(", ")}`);
      if (result.forbiddenMatches.length > 0) {
        console.log(`   Forbidden: ${result.forbiddenMatches.join(", ")}`);
      }
      console.log(`   Response: ${response.slice(0, 200)}...`);
    }

    // Small delay between queries
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

function generateReport(results: TestResult[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(60));

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";

  console.log(`\nOverall: ${passed}/${total} passed (${passRate}%)`);

  // By category
  const byCategory: Record<string, { passed: number; total: number }> = {};
  for (const r of results) {
    const cat = r.testCase.category;
    if (!byCategory[cat]) byCategory[cat] = { passed: 0, total: 0 };
    byCategory[cat].total++;
    if (r.passed) byCategory[cat].passed++;
  }

  console.log("\nBy Category:");
  for (const [cat, stats] of Object.entries(byCategory)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    console.log(`  ${cat}: ${stats.passed}/${stats.total} (${rate}%)`);
  }

  // By difficulty
  const byDifficulty: Record<string, { passed: number; total: number }> = {};
  for (const r of results) {
    const diff = r.testCase.difficulty;
    if (!byDifficulty[diff]) byDifficulty[diff] = { passed: 0, total: 0 };
    byDifficulty[diff].total++;
    if (r.passed) byDifficulty[diff].passed++;
  }

  console.log("\nBy Difficulty:");
  for (const [diff, stats] of Object.entries(byDifficulty)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    console.log(`  ${diff}: ${stats.passed}/${stats.total} (${rate}%)`);
  }

  // Latency stats
  const latencies = results.map(r => r.latencyMs);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(latencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(latencies.length * 0.95)];

  console.log("\nLatency:");
  console.log(`  Average: ${avgLatency.toFixed(0)}ms`);
  console.log(`  P50: ${p50}ms`);
  console.log(`  P95: ${p95}ms`);

  // Failed tests
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log("\nFailed Tests:");
    for (const r of failedTests) {
      console.log(`\n  ${r.testCase.id}:`);
      console.log(`    Query: ${r.testCase.query}`);
      console.log(`    Missed patterns: ${r.missedPatterns.join(", ")}`);
      if (r.forbiddenMatches.length > 0) {
        console.log(`    Forbidden matches: ${r.forbiddenMatches.join(", ")}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log("🚀 Real Test Runner - Testing RAG System Against Actual Documents\n");

  // Step 1: Check database documents
  console.log("📚 Checking documents in database...\n");

  const documents = await getDocumentsInDatabase();
  console.log("Documents found:");
  for (const doc of documents) {
    console.log(`  - ${doc.filename} (ID: ${doc.id}, Status: ${doc.status})`);
  }

  const chunkStats = await getChunkStats();
  console.log(`\nTotal chunks indexed: ${chunkStats.totalChunks}`);
  for (const [filename, count] of Object.entries(chunkStats.byDocument)) {
    console.log(`  - ${filename}: ${count} chunks`);
  }

  if (documents.length === 0) {
    console.log("\n⚠️  No documents in database! Please upload documents first.");
    process.exit(1);
  }

  const availableDocs = documents.map(d => d.filename);

  // Step 2: Determine which tests to run
  let allTests: TestCase[] = [];

  // Always add A790 tests if we have A790
  if (availableDocs.some(d => d.toLowerCase().includes("a790"))) {
    allTests = allTests.concat(A790_TESTS);
  }

  // Add A789 tests if we have A789
  if (availableDocs.some(d => d.toLowerCase().includes("a789"))) {
    allTests = allTests.concat(A789_TESTS);
  }

  // Add confusion tests if we have both
  const hasA789 = availableDocs.some(d => d.toLowerCase().includes("a789"));
  const hasA790 = availableDocs.some(d => d.toLowerCase().includes("a790"));
  if (hasA789 && hasA790) {
    allTests = allTests.concat(CONFUSION_TESTS);
  }

  if (allTests.length === 0) {
    console.log("\n⚠️  No applicable test cases for uploaded documents.");
    console.log("Upload ASTM A789 or A790 documents to run tests.");
    process.exit(1);
  }

  console.log(`\n🧪 Running ${allTests.length} test cases...\n`);

  // Step 3: Run tests
  const results = await runTestSuite(allTests, availableDocs);

  // Step 4: Generate report
  generateReport(results);

  // Return exit code based on pass rate
  const passRate = results.filter(r => r.passed).length / results.length;
  if (passRate < 0.6) {
    console.log("\n⚠️  Pass rate below 60% - needs improvement");
    process.exit(1);
  } else if (passRate < 0.9) {
    console.log("\n📈 Pass rate between 60-90% - good progress");
    process.exit(0);
  } else {
    console.log("\n🎉 Pass rate above 90% - target achieved!");
    process.exit(0);
  }
}

main().catch(console.error);
