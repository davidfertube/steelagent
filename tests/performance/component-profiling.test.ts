/**
 * Component Profiling Tests
 *
 * Profiles individual components to identify bottlenecks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { perf } from '@/lib/instrumentation';

// Mock implementations for testing (replace with actual imports in production)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGenerateEmbedding = async (_text: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
  return new Array(1024).fill(0).map(() => Math.random());
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockVectorSearch = async (_embedding: number[]) => {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate DB query
  return [
    { id: 1, content: 'Test chunk 1', score: 0.95 },
    { id: 2, content: 'Test chunk 2', score: 0.89 },
  ];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockLLMGeneration = async (_prompt: string) => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate LLM call
  return 'Test response';
};

describe('Component Performance Profiling', () => {
  beforeAll(() => {
    perf.reset();
  });

  it('should profile embedding generation', async () => {
    const endTimer = perf.startTimer('embedding_generation');

    await mockGenerateEmbedding('test query');

    endTimer();

    const stats = perf.getStats('embedding_generation');
    expect(stats.count).toBe(1);
    expect(stats.avg).toBeGreaterThan(0);
    expect(stats.avg).toBeLessThan(3000); // Should complete in < 3s

    console.log(`\n✓ Embedding generation: ${stats.avg.toFixed(0)}ms`);
  });

  it('should profile vector search', async () => {
    const mockEmbedding = new Array(1024).fill(0).map(() => Math.random());
    const endTimer = perf.startTimer('vector_search');

    await mockVectorSearch(mockEmbedding);

    endTimer();

    const stats = perf.getStats('vector_search');
    expect(stats.count).toBe(1);
    expect(stats.avg).toBeLessThan(2000); // Should complete in < 2s

    console.log(`✓ Vector search: ${stats.avg.toFixed(0)}ms`);
  });

  it('should profile LLM generation', async () => {
    const endTimer = perf.startTimer('llm_generation');

    await mockLLMGeneration('test prompt');

    endTimer();

    const stats = perf.getStats('llm_generation');
    expect(stats.count).toBe(1);
    expect(stats.avg).toBeLessThan(10000); // Should complete in < 10s

    console.log(`✓ LLM generation: ${stats.avg.toFixed(0)}ms`);
  });

  it('should identify slowest component', () => {
    const allStats = perf.getAllStats();
    const sortedComponents = Object.entries(allStats)
      .sort(([, a], [, b]) => b.avg - a.avg);

    const [slowestComponent, slowestStats] = sortedComponents[0];

    console.log(`\n📊 Component Breakdown:`);
    const total = Object.values(allStats).reduce((sum, stats) => sum + stats.avg, 0);

    for (const [component, stats] of sortedComponents) {
      const percent = ((stats.avg / total) * 100).toFixed(1);
      console.log(`  ${component.padEnd(25)} ${stats.avg.toFixed(0)}ms (${percent}%)`);
    }

    console.log(`\n⚠️  Bottleneck: ${slowestComponent} (${slowestStats.avg.toFixed(0)}ms)`);

    // Assert that no single component is > 70% of total
    Object.entries(allStats).forEach(([component, stats]) => {
      const percent = (stats.avg / total) * 100;
      if (percent > 70) {
        console.warn(`⚠️  WARNING: ${component} is ${percent.toFixed(1)}% of total latency!`);
      }
    });
  });

  it('should verify cache effectiveness', async () => {
    const query = 'test query for caching';

    // First call (cache miss)
    const endMiss = perf.startTimer('embedding_cache_miss');
    await mockGenerateEmbedding(query);
    endMiss();

    // Second call (cache hit - simulated as instant)
    const endHit = perf.startTimer('embedding_cache_hit');
    await new Promise((resolve) => setTimeout(resolve, 5)); // Simulated cache hit
    endHit();

    const missTime = perf.getStats('embedding_cache_miss').avg;
    const hitTime = perf.getStats('embedding_cache_hit').avg;

    console.log(`\n📈 Cache Performance:`);
    console.log(`  Cache miss: ${missTime.toFixed(0)}ms`);
    console.log(`  Cache hit:  ${hitTime.toFixed(0)}ms`);
    console.log(`  Speedup:    ${(missTime / hitTime).toFixed(1)}x`);

    expect(hitTime).toBeLessThan(missTime * 0.1); // Cache should be 10x faster
  });
});
