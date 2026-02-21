/**
 * Demo 5-Query Accuracy Test
 *
 * Five complex queries designed to stress the critical failure modes
 * that matter most for demo audiences (materials engineers evaluating
 * enterprise purchase).
 *
 * Tests:
 * - Q1: Cross-spec confusion (A789 vs A790 yield for S32205)
 * - Q2: Multi-property table extraction (hardness + elongation)
 * - Q3: Two-document comparison (tensile strength across specs)
 * - Q4: Correct refusal (PREN not in A790)
 * - Q5: API spec numerical accuracy (P110 casing)
 *
 * Usage:
 *   npx tsx scripts/demo-5-query-test.ts
 *
 * Requires: dev server running on localhost:3000
 */

export {};

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const QUERY_TIMEOUT = 180_000;
const DELAY_BETWEEN_QUERIES = 2_000;

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

interface TestCase {
  id: string;
  label: string;
  query: string;
  validate: (data: RAGResponse) => { pass: boolean; issues: string[]; notes: string[] };
}

const TEST_CASES: TestCase[] = [
  // Q-DEMO-01: Cross-spec yield comparison (THE critical test)
  // A789 S32205 = 70 ksi, A790 S32205 = 65 ksi — must NOT mix these up
  {
    id: "DEMO-01",
    label: "A789 vs A790 yield",
    query: "Compare the minimum yield strength requirements for S32205 duplex stainless steel between ASTM A789 and ASTM A790. What is the difference and why might it vary?",
    validate: (data) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const resp = data.response || "";

      if (/I cannot/i.test(resp)) issues.push("False refusal");

      const has70 = /70\s*ksi|485\s*MPa/i.test(resp);
      const has65 = /65\s*ksi|450\s*MPa/i.test(resp);
      if (!has70) issues.push("Missing A789 yield: 70 ksi / 485 MPa");
      if (!has65) issues.push("Missing A790 yield: 65 ksi / 450 MPa");

      // Check that sources come from BOTH documents
      const srcA789 = data.sources?.some(s => /a789/i.test(s.document));
      const srcA790 = data.sources?.some(s => /a790/i.test(s.document));
      if (!srcA789) issues.push("Missing A789 source document");
      if (!srcA790) issues.push("Missing A790 source document");

      if (has70 && has65) notes.push("Both yield values correct");
      if (srcA789 && srcA790) notes.push("Both documents cited");
      if (/\[\d+\]/.test(resp)) notes.push("Citations present");

      return { pass: issues.length === 0, issues, notes };
    },
  },

  // Q-DEMO-02: Multi-property table extraction
  {
    id: "DEMO-02",
    label: "S32750 hardness + elongation",
    query: "For UNS S32750 super duplex stainless steel, what are the maximum hardness and minimum elongation requirements per ASTM A790? Give the values in all units specified.",
    validate: (data) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const resp = data.response || "";

      if (/I cannot/i.test(resp)) issues.push("False refusal");

      const srcA790 = data.sources?.some(s => /a790/i.test(s.document));
      if (!srcA790) issues.push("No A790 source");

      // Hardness: 32 HRC max (or 293 HBW)
      if (/32\s*HRC/i.test(resp) || /293\s*HBW/i.test(resp)) {
        notes.push("Hardness value found");
      } else {
        issues.push("Missing hardness value (32 HRC / 293 HBW)");
      }

      // Elongation: 15% min
      if (/15\s*%/i.test(resp)) {
        notes.push("Elongation value found");
      } else {
        issues.push("Missing elongation value (15%)");
      }

      if (/\[\d+\]/.test(resp)) notes.push("Citations present");

      return { pass: issues.length === 0, issues, notes };
    },
  },

  // Q-DEMO-03: Two-document tensile comparison
  {
    id: "DEMO-03",
    label: "S31803 tensile across specs",
    query: "What is the minimum tensile strength for UNS S31803 in each of the following product forms: tubing per ASTM A789 and pipe per ASTM A790?",
    validate: (data) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const resp = data.response || "";

      if (/I cannot/i.test(resp)) issues.push("False refusal");

      // Both specs should be cited
      const srcA789 = data.sources?.some(s => /a789/i.test(s.document));
      const srcA790 = data.sources?.some(s => /a790/i.test(s.document));
      if (!srcA789) issues.push("Missing A789 source");
      if (!srcA790) issues.push("Missing A790 source");

      // S31803 tensile: 90 ksi / 620 MPa in both A789 and A790
      if (/90\s*ksi|620\s*MPa/i.test(resp)) {
        notes.push("Tensile value found (90 ksi / 620 MPa)");
      } else {
        issues.push("Missing tensile value (90 ksi / 620 MPa)");
      }

      if (/\[\d+\]/.test(resp)) notes.push("Citations present");

      return { pass: issues.length === 0, issues, notes };
    },
  },

  // Q-DEMO-04: Correct refusal test (PREN not in A790)
  {
    id: "DEMO-04",
    label: "PREN refusal test",
    query: "What PREN value does ASTM A790 specify as the minimum for S32750 super duplex to qualify for chloride service environments?",
    validate: (data) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const resp = data.response || "";

      // This SHOULD be a refusal or caveat — A790 does NOT specify PREN thresholds
      const hasRefusalOrCaveat = /does not specify|not specified|not include|not contain|no.*PREN.*requirement|not.*found|does not.*define/i.test(resp);
      const hallucinated = /PREN.*(?:of|is|=|:)\s*\d+/i.test(resp) && !hasRefusalOrCaveat;

      if (hallucinated) issues.push("Hallucinated PREN threshold from A790");
      if (hasRefusalOrCaveat) notes.push("Correctly noted PREN not in A790");
      else if (!hallucinated) issues.push("Neither refused nor hallucinated — ambiguous");

      if (/\[\d+\]/.test(resp)) notes.push("Citations present");

      return { pass: issues.length === 0, issues, notes };
    },
  },

  // Q-DEMO-05: API spec numerical accuracy
  {
    id: "DEMO-05",
    label: "API 5CT P110 yield/tensile",
    query: "For P110 grade casing per API 5CT, what are the minimum and maximum yield strength requirements, and what is the minimum tensile strength?",
    validate: (data) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const resp = data.response || "";

      if (/I cannot/i.test(resp)) issues.push("False refusal");

      // P110: min yield 110 ksi, max yield 140 ksi, min tensile 125 ksi
      if (/110\s*ksi/i.test(resp)) notes.push("Min yield 110 ksi found");
      else issues.push("Missing min yield: 110 ksi");

      if (/140\s*ksi/i.test(resp)) notes.push("Max yield 140 ksi found");
      else issues.push("Missing max yield: 140 ksi");

      if (/125\s*ksi/i.test(resp)) notes.push("Min tensile 125 ksi found");
      else issues.push("Missing min tensile: 125 ksi");

      const has5CT = data.sources?.some(s => /5ct/i.test(s.document));
      if (!has5CT) issues.push("No API 5CT source");

      if (/\[\d+\]/.test(resp)) notes.push("Citations present");

      return { pass: issues.length === 0, issues, notes };
    },
  },
];

async function queryRAG(query: string): Promise<{ data: RAGResponse; latencyMs: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  console.log("  SpecVault Demo 5-Query Accuracy Test");
  console.log("  Enterprise demo readiness validation");
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

  const results: { id: string; label: string; pass: boolean; latencyMs: number; confidence: number; issues: string[]; notes: string[] }[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`  [${i + 1}/${TEST_CASES.length}] ${tc.id} — ${tc.label}`);
    console.log(`  Query: "${tc.query.slice(0, 100)}${tc.query.length > 100 ? '...' : ''}"`);
    console.log();

    try {
      const { data, latencyMs } = await queryRAG(tc.query);
      const { pass, issues, notes } = tc.validate(data);

      const preview = (data.response || "").replace(/\n/g, " ").slice(0, 200);
      console.log(`  Response: ${preview}...`);
      console.log(`  Sources:  ${data.sources?.map(s => `${s.ref} ${s.document} p.${s.page}`).join(" | ") || "none"}`);
      console.log(`  Confidence: ${data.confidence?.overall || 'N/A'}% (R:${data.confidence?.retrieval || '?'}% G:${data.confidence?.grounding || '?'}% C:${data.confidence?.coherence || '?'}%)`);
      console.log(`  Latency:  ${(latencyMs / 1000).toFixed(1)}s`);
      console.log(`  Result:   ${pass ? "PASS" : "FAIL"}`);

      if (issues.length > 0) for (const issue of issues) console.log(`    ISSUE: ${issue}`);
      if (notes.length > 0) for (const note of notes) console.log(`    NOTE:  ${note}`);

      results.push({ id: tc.id, label: tc.label, pass, latencyMs, confidence: data.confidence?.overall ?? 0, issues, notes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${msg.slice(0, 150)}`);
      results.push({ id: tc.id, label: tc.label, pass: false, latencyMs: 0, confidence: 0, issues: [msg.slice(0, 200)], notes: [] });
    }

    console.log();
    console.log("  " + "-".repeat(66));
    console.log();

    if (i < TEST_CASES.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_QUERIES));
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const activeResults = results.filter(r => r.latencyMs > 0);
  const avgLatency = activeResults.reduce((s, r) => s + r.latencyMs, 0) / Math.max(activeResults.length, 1);
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / Math.max(results.length, 1);

  console.log("=".repeat(70));
  console.log("  DEMO 5-QUERY TEST RESULTS");
  console.log("=".repeat(70));
  console.log();
  console.log(`  Pass Rate:       ${passed}/${total} (${((passed / total) * 100).toFixed(0)}%)`);
  console.log(`  Avg Latency:     ${(avgLatency / 1000).toFixed(1)}s`);
  console.log(`  Avg Confidence:  ${avgConfidence.toFixed(0)}%`);
  console.log();

  console.log("  ID         Label                        Pass  Latency  Confidence");
  console.log("  " + "\u2500".repeat(66));
  for (const r of results) {
    const pass = r.pass ? " OK " : "FAIL";
    const lat = r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : "N/A";
    const conf = r.confidence > 0 ? `${r.confidence}%` : "N/A";
    console.log(`  ${r.id.padEnd(9)} ${r.label.padEnd(28)} ${pass}  ${lat.padStart(7)}  ${conf.padStart(10)}`);
  }
  console.log();

  // Failure analysis
  const failures = results.filter(r => !r.pass);
  if (failures.length > 0) {
    console.log("  FAILURE ANALYSIS:");
    for (const f of failures) {
      console.log(`    ${f.id} (${f.label}): ${f.issues.join("; ")}`);
    }
    console.log();
  }

  if (passed === total) {
    console.log("  ALL 5 DEMO QUERIES PASSED — ready for demo!");
  } else {
    console.log(`  ${failures.length} QUERIES FAILED — see analysis above`);
  }
  console.log();
}

runTest().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
