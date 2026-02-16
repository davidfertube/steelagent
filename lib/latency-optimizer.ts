/**
 * Latency Optimizer for RAG Pipeline
 *
 * Targets: P95 latency < 10s (down from 29s)
 *
 * Optimizations:
 * 1. Query result caching - cache full RAG responses for repeat queries
 * 2. Parallel execution - run independent operations concurrently
 * 3. Early termination - skip expensive ops for simple queries
 * 4. Model selection - use faster models for non-critical ops
 */

import crypto from "crypto";
import { type HybridSearchResult } from "./hybrid-search";

// ============================================================================
// Response Cache (Full RAG Response Caching)
// ============================================================================

interface CachedRAGResponse {
  chunks: HybridSearchResult[];
  timestamp: number;
  queryHash: string;
}

const responseCache = new Map<string, CachedRAGResponse>();
const RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (shorter than embedding cache)
const MAX_RESPONSE_CACHE_SIZE = 100;

/**
 * Create a hash for the query
 */
function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  return crypto.createHash("md5").update(normalized).digest("hex");
}

/**
 * Get cached RAG response if available
 */
export function getCachedRAGResponse(query: string): HybridSearchResult[] | null {
  const hash = hashQuery(query);
  const cached = responseCache.get(hash);

  if (cached && Date.now() - cached.timestamp < RESPONSE_CACHE_TTL) {
    console.log(`[Latency Optimizer] RAG cache HIT for: "${query.slice(0, 40)}..."`);
    return cached.chunks;
  }

  return null;
}

/**
 * Cache a RAG response
 */
export function cacheRAGResponse(query: string, chunks: HybridSearchResult[]): void {
  const hash = hashQuery(query);

  // Prune cache if needed
  if (responseCache.size >= MAX_RESPONSE_CACHE_SIZE) {
    const oldest = [...responseCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20);
    oldest.forEach(([key]) => responseCache.delete(key));
  }

  responseCache.set(hash, {
    chunks,
    timestamp: Date.now(),
    queryHash: hash,
  });
}

/**
 * Clear the response cache
 */
export function clearRAGCache(): void {
  responseCache.clear();
  console.log("[Latency Optimizer] RAG cache cleared");
}

// ============================================================================
// Query Complexity Analysis (Fast Path Detection)
// ============================================================================

export type QueryComplexity = 'simple' | 'moderate' | 'complex';

interface ComplexityAnalysis {
  complexity: QueryComplexity;
  skipDecomposition: boolean;
  skipReranking: boolean;
  useParallel: boolean;
  estimatedLatencyMs: number;
}

/**
 * Analyze query complexity to determine optimization strategy
 * This is a fast heuristic check (no LLM calls)
 */
export function analyzeQueryComplexity(query: string): ComplexityAnalysis {
  const wordCount = query.split(/\s+/).length;

  // Complex indicators
  const isComparison = /compare|vs\.?|versus|differ/i.test(query);
  const isList = /list|all|which|what are/i.test(query);
  const hasMultipleEntities = (query.match(/S\d{5}|A\d{3,4}/gi) || []).length > 1;
  const isExplanation = /explain|why|how does|describe/i.test(query);

  // Simple indicators
  const isDirectLookup = /what is|yield|tensile|hardness|composition/i.test(query) &&
    !isComparison && !isList;
  const isShort = wordCount <= 10;

  // Determine complexity
  let complexity: QueryComplexity;
  if (isDirectLookup && isShort && !hasMultipleEntities) {
    complexity = 'simple';
  } else if (isComparison || isList || hasMultipleEntities || isExplanation) {
    complexity = 'complex';
  } else {
    complexity = 'moderate';
  }

  // LATENCY OPTIMIZATION: Skip decomposition for both simple and moderate queries
  // Only truly complex queries (compare, list, multiple entities) need decomposition
  // This saves one LLM call (~3-5s) for most queries
  return {
    complexity,
    skipDecomposition: complexity !== 'complex', // Skip for simple AND moderate
    skipReranking: true, // Always skip reranking for latency
    useParallel: complexity === 'complex',
    estimatedLatencyMs: complexity === 'simple' ? 2000 : complexity === 'moderate' ? 4000 : 8000,
  };
}

// ============================================================================
// Parallel Execution Helpers
// ============================================================================

/**
 * Execute promises in parallel with timeout
 */
export async function parallelWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  label: string
): Promise<T[]> {
  const startTime = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const results = await Promise.race([
      Promise.all(promises),
      timeoutPromise,
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`[Latency Optimizer] ${label} completed in ${elapsed}ms`);

    return results;
  } catch (error) {
    console.error(`[Latency Optimizer] ${label} failed:`, error);
    throw error;
  }
}

/**
 * Execute with early termination if first result is sufficient
 */
export async function raceWithMinimum<T>(
  promises: Promise<T[]>[],
  minResults: number,
  timeoutMs: number
): Promise<T[]> {
  const results: T[] = [];
  const startTime = Date.now();

  const wrappedPromises = promises.map(async (p, i) => {
    try {
      const result = await p;
      return { index: i, result, success: true };
    } catch {
      return { index: i, result: [] as T[], success: false };
    }
  });

  // Add timeout
  const timeoutPromise = new Promise<{ index: number; result: T[]; success: boolean }>((resolve) => {
    setTimeout(() => resolve({ index: -1, result: [], success: false }), timeoutMs);
  });

  // Collect results as they complete
  for (const p of [...wrappedPromises, timeoutPromise]) {
    const outcome = await Promise.race([p, timeoutPromise]);

    if (outcome.success && outcome.result.length > 0) {
      results.push(...outcome.result);

      // Early termination if we have enough results
      if (results.length >= minResults) {
        const elapsed = Date.now() - startTime;
        console.log(`[Latency Optimizer] Early termination with ${results.length} results in ${elapsed}ms`);
        break;
      }
    }

    if (outcome.index === -1) {
      // Timeout reached
      break;
    }
  }

  return results;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

interface LatencyMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
}

const recentLatencies: LatencyMetric[] = [];
const MAX_LATENCY_SAMPLES = 100;

/**
 * Record a latency measurement
 */
export function recordLatency(operation: string, durationMs: number): void {
  recentLatencies.push({
    operation,
    durationMs,
    timestamp: Date.now(),
  });

  // Keep only recent samples
  if (recentLatencies.length > MAX_LATENCY_SAMPLES) {
    recentLatencies.shift();
  }
}

/**
 * Get latency statistics
 */
export function getLatencyStats(): {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  sampleCount: number;
} {
  if (recentLatencies.length === 0) {
    return { avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, sampleCount: 0 };
  }

  const sorted = [...recentLatencies]
    .map(l => l.durationMs)
    .sort((a, b) => a - b);

  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;

  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);

  return {
    avgMs: Math.round(avg),
    p50Ms: sorted[p50Index] || 0,
    p95Ms: sorted[Math.min(p95Index, sorted.length - 1)] || 0,
    p99Ms: sorted[Math.min(p99Index, sorted.length - 1)] || 0,
    sampleCount: sorted.length,
  };
}

/**
 * Wrapper to time an async operation and record its latency
 */
export async function timedOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;
    recordLatency(operation, durationMs);
    console.log(`[Latency] ${operation}: ${durationMs}ms`);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    recordLatency(`${operation}_error`, durationMs);
    throw error;
  }
}
