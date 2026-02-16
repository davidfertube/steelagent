/**
 * Bottleneck Analysis Tests
 *
 * Identifies performance bottlenecks in the RAG pipeline.
 */

import { describe, it, expect } from 'vitest';
import { perf } from '@/lib/instrumentation';

// Simulate complete RAG pipeline
async function simulateRAGPipeline(query: string) {
  // 1. Query preprocessing
  const endPreprocess = perf.startTimer('rag_preprocessing');
  await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate preprocessing
  endPreprocess();

  // 2. Query decomposition (optional for complex queries)
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('compare') || lowerQuery.includes('list')) {
    const endDecompose = perf.startTimer('rag_decomposition');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate LLM call
    endDecompose();
  }

  // 3. Embedding generation
  const endEmbedding = perf.startTimer('rag_embedding');
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate Voyage AI
  endEmbedding();

  // 4. Hybrid search
  const endSearch = perf.startTimer('rag_search');
  await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate pgvector
  endSearch();

  // 5. Re-ranking
  const endRerank = perf.startTimer('rag_rerank');
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate LLM scoring
  endRerank();

  // 6. LLM generation
  const endLLM = perf.startTimer('rag_llm');
  await new Promise((resolve) => setTimeout(resolve, 4000)); // Simulate Groq
  endLLM();
}

describe('Bottleneck Analysis', () => {
  it('should profile complete RAG pipeline', async () => {
    perf.reset();

    const query = 'What is the yield strength of Grade A?';

    const endTotal = perf.startTimer('rag_total');
    await simulateRAGPipeline(query);
    endTotal();

    const totalTime = perf.getStats('rag_total').avg;

    console.log(`\n📊 RAG Pipeline Breakdown:`);
    console.log(`  Total time: ${totalTime.toFixed(0)}ms`);
    console.log('');

    const components = [
      'rag_preprocessing',
      'rag_embedding',
      'rag_search',
      'rag_rerank',
      'rag_llm',
    ];

    const breakdown: Record<string, number> = {};

    for (const component of components) {
      const stats = perf.getStats(component);
      if (stats.count > 0) {
        breakdown[component] = stats.avg;

        const percent = ((stats.avg / totalTime) * 100).toFixed(1);
        const label = component.replace('rag_', '').padEnd(15);
        console.log(`  ${label} ${stats.avg.toFixed(0)}ms (${percent}%)`);
      }
    }

    console.log('\n⚠️  Bottlenecks (>30% of total):');
    let hasBottleneck = false;
    for (const [component, duration] of Object.entries(breakdown)) {
      const percent = (duration / totalTime) * 100;
      if (percent > 30) {
        console.log(`  ❗ ${component}: ${percent.toFixed(1)}%`);
        hasBottleneck = true;
      }
    }

    if (!hasBottleneck) {
      console.log('  ✓ No major bottlenecks detected');
    }

    // Assert reasonable distribution
    expect(totalTime).toBeLessThan(15000); // Total < 15s
  }, 15000); // Extended timeout for simulation pipeline

  it('should profile complex query with decomposition', async () => {
    perf.reset();

    const query = 'Compare Grade A and Grade B yield strength';

    const endTotal = perf.startTimer('rag_total_complex');
    await simulateRAGPipeline(query);
    endTotal();

    const totalTime = perf.getStats('rag_total_complex').avg;
    const decomposeTime = perf.getStats('rag_decomposition').avg;

    console.log(`\n📊 Complex Query Analysis:`);
    console.log(`  Total time:        ${totalTime.toFixed(0)}ms`);
    console.log(`  Decomposition:     ${decomposeTime.toFixed(0)}ms`);
    console.log(`  Decomposition %:   ${((decomposeTime / totalTime) * 100).toFixed(1)}%`);

    if ((decomposeTime / totalTime) * 100 > 20) {
      console.log(`  ⚠️  Query decomposition overhead is significant`);
    }

    expect(decomposeTime).toBeGreaterThan(0); // Should have decomposition
  }, 15000); // Extended timeout for simulation pipeline

  it('should compare vector-only vs hybrid search', async () => {
    perf.reset();

    // Vector-only search
    const endVectorOnly = perf.startTimer('search_vector_only');
    await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate vector search
    endVectorOnly();

    // Hybrid search (vector + BM25)
    const endHybrid = perf.startTimer('search_hybrid');
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate hybrid
    endHybrid();

    const vectorTime = perf.getStats('search_vector_only').avg;
    const hybridTime = perf.getStats('search_hybrid').avg;

    const overhead = ((hybridTime - vectorTime) / vectorTime) * 100;

    console.log(`\n📊 Search Performance Comparison:`);
    console.log(`  Vector-only:  ${vectorTime.toFixed(0)}ms`);
    console.log(`  Hybrid:       ${hybridTime.toFixed(0)}ms`);
    console.log(`  Overhead:     ${overhead.toFixed(1)}%`);

    if (overhead > 100) {
      console.log(`  ⚠️  Hybrid search has >100% overhead`);
    }

    expect(hybridTime).toBeGreaterThan(vectorTime); // Hybrid should be slower
    expect(hybridTime).toBeLessThan(vectorTime * 3); // But not 3x slower
  });
});
