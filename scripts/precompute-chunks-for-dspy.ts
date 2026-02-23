/**
 * Pre-compute Retrieval Chunks for DSPy Optimization
 *
 * Queries the live RAG pipeline for each of the 20 core golden queries
 * and saves the retrieved chunks to dspy-optimize/data/precomputed-chunks/.
 * This decouples DSPy prompt optimization from the live retrieval system.
 *
 * Usage:
 *   npm run precompute:dspy
 *   # Requires: dev server running on localhost:3000
 */

export {};

import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "dspy-optimize", "data", "precomputed-chunks");
const GOLDEN_DATASET = path.join(__dirname, "..", "tests", "golden-dataset", "core-20.json");
const TIMEOUT = 180_000;
const DELAY = 2_000;

interface GoldenQuery {
  id: string;
  question: string;
}

interface GoldenDataset {
  qa_pairs: GoldenQuery[];
}

interface ChunkSource {
  ref: string;
  document: string;
  page: string;
  content_preview: string;
}

interface RAGResponse {
  response: string;
  sources: ChunkSource[];
  confidence?: { overall: number };
  error?: string;
}

async function main() {
  // Load golden dataset
  const dataset: GoldenDataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET, "utf-8"));
  const queries = dataset.qa_pairs;

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Pre-computing chunks for ${queries.length} golden queries...`);
  console.log(`Server: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Check server
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok && res.status !== 405) throw new Error(`Status ${res.status}`);
  } catch {
    console.error(`Server not available at ${BASE_URL}. Start with: npm run dev`);
    process.exit(1);
  }

  let success = 0;
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`[${i + 1}/${queries.length}] ${query.id}: "${query.question.slice(0, 60)}..."`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);

      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": BASE_URL },
        body: JSON.stringify({ query: query.question, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        console.log(`  ERROR: HTTP ${res.status}: ${text.slice(0, 100)}`);
        continue;
      }

      const data: RAGResponse = await res.json();

      // Build chunk format expected by convert_golden.py
      const chunks = (data.sources || []).map((source) => ({
        content: source.content_preview || "",
        document: source.document || "Unknown",
        page: parseInt(source.page) || 0,
        combined_score: 0.8, // Approximate — actual scores not in API response
      }));

      const output = {
        query_id: query.id,
        question: query.question,
        chunks,
        response_preview: data.response?.slice(0, 200),
        confidence: data.confidence?.overall,
        retrieved_at: new Date().toISOString(),
      };

      const outPath = path.join(OUTPUT_DIR, `${query.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log(`  Saved ${chunks.length} chunks → ${query.id}.json`);
      success++;
    } catch (error) {
      console.log(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  console.log(`\nDone: ${success}/${queries.length} queries pre-computed.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
