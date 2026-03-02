/**
 * Query Complexity Analysis + Timed Operation Wrapper
 *
 * Fast heuristic analysis of query complexity for pipeline optimization.
 * Determines whether to skip decomposition/reranking for simple queries.
 */

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
// Timed Operation Wrapper
// ============================================================================

interface LatencyMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
}

const recentLatencies: LatencyMetric[] = [];
const MAX_LATENCY_SAMPLES = 100;

function recordLatency(operation: string, durationMs: number): void {
  recentLatencies.push({
    operation,
    durationMs,
    timestamp: Date.now(),
  });

  if (recentLatencies.length > MAX_LATENCY_SAMPLES) {
    recentLatencies.shift();
  }
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
