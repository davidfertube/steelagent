/**
 * Evaluation Engine for Baseline vs RAG Comparison
 *
 * Orchestrates evaluation of queries against both Claude baseline
 * and the MVP RAG system, collecting comprehensive metrics.
 */

import { BaselineClient, getBaselineClient } from './baseline-client';

// Types for test cases and results
export interface GoldenTestCase {
  id: string;
  query: string;
  expectedPatterns: RegExp[];
  forbiddenPatterns?: RegExp[];
  requiredCitations?: string[];
  /** Expected answer text for numerical comparison (optional) */
  expectedAnswer?: string;
  /** Required numerical values that must appear within tolerance */
  requiredValues?: string[];
  category: 'lookup' | 'comparison' | 'list' | 'refusal' | 'edge_case';
  categoryLetter?: 'A' | 'B' | 'C' | 'D' | 'E';
  documents: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export interface PatternMatchResult {
  passed: boolean;
  matchedPatterns: string[];
  missedPatterns: string[];
  forbiddenMatches: string[];
  citationsFound: string[];
  missingCitations: string[];
}

export interface RAGResponse {
  response: string;
  sources: Array<{
    ref: string;
    document: string;
    page: string;
    content_preview?: string;
    document_url?: string;
    char_offset_start?: number;
    char_offset_end?: number;
  }>;
  latency_ms: number;
  success: boolean;
  error?: string;
}

export interface AccuracyMetrics {
  patternMatched: boolean;
  forbiddenPatternTriggered: boolean;
  numericalAccuracy: number | null;
  hallucinationDetected: boolean;
  appropriateRefusal: boolean;
}

export interface CitationMetrics {
  hasCitations: boolean;
  citationCount: number;
  validPageNumbers: boolean;
  charOffsetsPresent: boolean;
  documentNamesCorrect: boolean;
  citationAccuracyPct: number;
}

export interface EvaluationResult {
  queryId: string;
  query: string;
  category: string;
  categoryLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  difficulty: string;

  baseline: {
    response: string;
    latency_ms: number;
    accuracy: AccuracyMetrics;
    patternResult: PatternMatchResult;
  };

  rag: {
    response: string;
    sources: RAGResponse['sources'];
    latency_ms: number;
    accuracy: AccuracyMetrics;
    patternResult: PatternMatchResult;
    citationQuality: CitationMetrics;
  };

  comparison: {
    baselineCorrect: boolean;
    ragCorrect: boolean;
    ragImprovement: boolean; // RAG correct where baseline wrong
    ragRegression: boolean; // Baseline correct where RAG wrong
    bothCorrect: boolean;
    bothWrong: boolean;
  };

  /** Optional RAGAS-style metrics (when includeRagMetrics is enabled) */
  ragMetrics?: import("./rag-metrics").RAGMetrics;
}

export interface ComparisonMetrics {
  // Overall
  totalQueries: number;
  baselineAccuracyPct: number;
  ragAccuracyPct: number;
  accuracyImprovementPct: number;

  // Hallucination
  baselineHallucinationRate: number;
  ragHallucinationRate: number;

  // Refusals (Category E)
  baselineCorrectRefusals: number;
  ragCorrectRefusals: number;
  totalRefusalQueries: number;

  // Citations (RAG only)
  citationAccuracyPct: number;
  validPageNumberPct: number;
  charOffsetPresentPct: number;

  // Performance
  baselineAvgLatencyMs: number;
  ragAvgLatencyMs: number;
  baselineP95LatencyMs: number;
  ragP95LatencyMs: number;

  // By Category
  byCategory: Record<
    string,
    {
      baseline: number;
      rag: number;
      improvement: number;
      count: number;
    }
  >;

  // Comparison breakdown
  ragImprovements: number;
  ragRegressions: number;
  bothCorrect: number;
  bothWrong: number;
}

/**
 * Extract numerical values from text for comparison
 */
function extractNumericalValues(text: string): Map<string, number> {
  const values = new Map<string, number>();

  // Extract stress values (ksi/MPa)
  const stressRegex = /(\d+(?:\.\d+)?)\s*(ksi|MPa)/gi;
  let match;
  while ((match = stressRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const key = `stress_${unit}_${match.index}`;
    values.set(key, value);
  }

  // Extract percentages
  const pctRegex = /(\d+(?:\.\d+)?)\s*%/g;
  while ((match = pctRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    values.set(`pct_${match.index}`, value);
  }

  // Extract temperatures
  const tempRegex = /(\d+(?:\.\d+)?)\s*°([FC])/gi;
  while ((match = tempRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    values.set(`temp_${unit}_${match.index}`, value);
  }

  // Extract hardness
  const hardnessRegex = /(\d+(?:\.\d+)?)\s*(HBW|HRC|HRB)/gi;
  while ((match = hardnessRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const scale = match[2].toUpperCase();
    values.set(`hardness_${scale}_${match.index}`, value);
  }

  return values;
}

/**
 * Compare numerical values with tolerance
 * @param expected - Expected values (from test case)
 * @param actual - Actual values (from response)
 * @param tolerancePct - Tolerance percentage (default: 2%)
 * @returns Accuracy score 0-1
 */
function compareNumericalValues(
  expected: Map<string, number>,
  actual: Map<string, number>,
  tolerancePct: number = 2
): number {
  if (expected.size === 0) return 1; // No numerical values to compare

  let matchedCount = 0;

  for (const [, expectedValue] of expected) {
    // Check if any actual value matches within tolerance
    for (const [, actualValue] of actual) {
      const tolerance = expectedValue * (tolerancePct / 100);
      if (Math.abs(expectedValue - actualValue) <= tolerance) {
        matchedCount++;
        break;
      }
    }
  }

  return matchedCount / expected.size;
}

/**
 * Calculate numerical accuracy between expected and actual response
 * @param expectedAnswer - Expected answer text
 * @param actualResponse - Actual response text
 * @param tolerancePct - Tolerance percentage (default: 2%)
 * @returns Accuracy score 0-100, or null if no numerical values
 */
export function calculateNumericalAccuracy(
  expectedAnswer: string,
  actualResponse: string,
  tolerancePct: number = 2
): number | null {
  const expectedValues = extractNumericalValues(expectedAnswer);
  const actualValues = extractNumericalValues(actualResponse);

  if (expectedValues.size === 0) return null;

  const accuracy = compareNumericalValues(expectedValues, actualValues, tolerancePct);
  return accuracy * 100;
}

/**
 * Evaluate a response against a test case using pattern matching
 * (Matches the existing evaluateResponse function signature)
 */
export function evaluateResponse(response: string, testCase: GoldenTestCase): PatternMatchResult {
  const matchedPatterns: string[] = [];
  const missedPatterns: string[] = [];
  const forbiddenMatches: string[] = [];
  const citationsFound: string[] = [];
  const missingCitations: string[] = [];

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

  // Check required citations
  if (testCase.requiredCitations) {
    for (const citation of testCase.requiredCitations) {
      if (response.includes(citation)) {
        citationsFound.push(citation);
      } else {
        missingCitations.push(citation);
      }
    }
  }

  // Pass if: ≥50% patterns match AND no forbidden patterns AND has citations (if required)
  const patternPassRate = matchedPatterns.length / testCase.expectedPatterns.length;
  const noForbiddenMatches = forbiddenMatches.length === 0;
  const hasCitations = !testCase.requiredCitations || citationsFound.length > 0;

  const passed = patternPassRate >= 0.5 && noForbiddenMatches && hasCitations;

  return {
    passed,
    matchedPatterns,
    missedPatterns,
    forbiddenMatches,
    citationsFound,
    missingCitations,
  };
}

/**
 * Detect hallucination in response
 */
function detectHallucination(response: string, testCase: GoldenTestCase): boolean {
  // For refusal category, hallucination = providing an answer when should refuse
  if (testCase.category === 'refusal' || testCase.categoryLetter === 'E') {
    const refusalPatterns = [
      /cannot\s+answer/i,
      /not\s+(?:in|included|provided|found)/i,
      /no\s+(?:information|data|specification)/i,
      /don'?t\s+have/i,
      /not\s+specified/i,
      /outside\s+(?:the\s+)?scope/i,
    ];

    const hasRefusal = refusalPatterns.some(p => p.test(response));
    return !hasRefusal; // Hallucination if no refusal present
  }

  // For other categories, check for forbidden patterns
  if (testCase.forbiddenPatterns) {
    return testCase.forbiddenPatterns.some(p => p.test(response));
  }

  return false;
}

/**
 * Evaluate citation quality for RAG responses
 */
function evaluateCitationQuality(sources: RAGResponse['sources']): CitationMetrics {
  if (!sources || sources.length === 0) {
    return {
      hasCitations: false,
      citationCount: 0,
      validPageNumbers: false,
      charOffsetsPresent: false,
      documentNamesCorrect: false,
      citationAccuracyPct: 0,
    };
  }

  const validPageNumbers = sources.every(s => {
    const pageNum = parseInt(s.page);
    return !isNaN(pageNum) && pageNum > 0;
  });

  const charOffsetsPresent = sources.every(
    s => s.char_offset_start !== undefined && s.char_offset_end !== undefined
  );

  const documentNamesCorrect = sources.every(s => s.document && s.document.length > 0);

  // Calculate accuracy percentage
  let validCount = 0;
  if (validPageNumbers) validCount++;
  if (charOffsetsPresent) validCount++;
  if (documentNamesCorrect) validCount++;

  return {
    hasCitations: true,
    citationCount: sources.length,
    validPageNumbers,
    charOffsetsPresent,
    documentNamesCorrect,
    citationAccuracyPct: (validCount / 3) * 100,
  };
}

/**
 * Query the RAG system via the /api/chat endpoint
 */
async function queryRAGSystem(
  query: string,
  baseUrl: string = 'http://localhost:3000'
): Promise<RAGResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const latency_ms = Date.now() - startTime;

    if (!response.ok) {
      return {
        response: '',
        sources: [],
        latency_ms,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      response: data.response || '',
      sources: data.sources || [],
      latency_ms,
      success: true,
    };
  } catch (error) {
    return {
      response: '',
      sources: [],
      latency_ms: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map category string to letter
 */
function getCategoryLetter(
  category: string,
  index: number
): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (category === 'refusal') return 'E';
  if (category === 'lookup' && index < 5) return 'A';
  if (category === 'lookup') return 'B';
  if (category === 'comparison') return 'C';
  if (category === 'list' || category === 'edge_case') return 'D';
  return 'A';
}

/**
 * Run comparison between baseline and RAG for a single query
 */
export async function runComparison(
  testCase: GoldenTestCase,
  baselineClient: BaselineClient,
  ragBaseUrl: string = 'http://localhost:3000'
): Promise<EvaluationResult> {
  // Run both queries in parallel
  const [baselineResult, ragResult] = await Promise.all([
    baselineClient.query(testCase.query),
    queryRAGSystem(testCase.query, ragBaseUrl),
  ]);

  // Evaluate both responses
  const baselinePatternResult = evaluateResponse(baselineResult.response, testCase);
  const ragPatternResult = evaluateResponse(ragResult.response, testCase);

  // Calculate numerical accuracy if expected answer is provided
  const baselineNumericalAccuracy = testCase.expectedAnswer
    ? calculateNumericalAccuracy(testCase.expectedAnswer, baselineResult.response)
    : null;
  const ragNumericalAccuracy = testCase.expectedAnswer
    ? calculateNumericalAccuracy(testCase.expectedAnswer, ragResult.response)
    : null;

  // Build accuracy metrics
  const baselineAccuracy: AccuracyMetrics = {
    patternMatched: baselinePatternResult.passed,
    forbiddenPatternTriggered: baselinePatternResult.forbiddenMatches.length > 0,
    numericalAccuracy: baselineNumericalAccuracy,
    hallucinationDetected: detectHallucination(baselineResult.response, testCase),
    appropriateRefusal:
      testCase.category === 'refusal' &&
      !detectHallucination(baselineResult.response, testCase),
  };

  const ragAccuracy: AccuracyMetrics = {
    patternMatched: ragPatternResult.passed,
    forbiddenPatternTriggered: ragPatternResult.forbiddenMatches.length > 0,
    numericalAccuracy: ragNumericalAccuracy,
    hallucinationDetected: detectHallucination(ragResult.response, testCase),
    appropriateRefusal:
      testCase.category === 'refusal' && !detectHallucination(ragResult.response, testCase),
  };

  // Citation quality (RAG only)
  const citationQuality = evaluateCitationQuality(ragResult.sources);

  // Comparison results
  const baselineCorrect = baselinePatternResult.passed;
  const ragCorrect = ragPatternResult.passed;

  return {
    queryId: testCase.id,
    query: testCase.query,
    category: testCase.category,
    categoryLetter: testCase.categoryLetter || getCategoryLetter(testCase.category, 0),
    difficulty: testCase.difficulty,

    baseline: {
      response: baselineResult.response,
      latency_ms: baselineResult.latency_ms,
      accuracy: baselineAccuracy,
      patternResult: baselinePatternResult,
    },

    rag: {
      response: ragResult.response,
      sources: ragResult.sources,
      latency_ms: ragResult.latency_ms,
      accuracy: ragAccuracy,
      patternResult: ragPatternResult,
      citationQuality,
    },

    comparison: {
      baselineCorrect,
      ragCorrect,
      ragImprovement: !baselineCorrect && ragCorrect,
      ragRegression: baselineCorrect && !ragCorrect,
      bothCorrect: baselineCorrect && ragCorrect,
      bothWrong: !baselineCorrect && !ragCorrect,
    },
  };
}

/**
 * Calculate P95 latency from array of values
 */
function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * Aggregate metrics from multiple evaluation results
 */
export function aggregateMetrics(results: EvaluationResult[]): ComparisonMetrics {
  const total = results.length;
  if (total === 0) {
    return {
      totalQueries: 0,
      baselineAccuracyPct: 0,
      ragAccuracyPct: 0,
      accuracyImprovementPct: 0,
      baselineHallucinationRate: 0,
      ragHallucinationRate: 0,
      baselineCorrectRefusals: 0,
      ragCorrectRefusals: 0,
      totalRefusalQueries: 0,
      citationAccuracyPct: 0,
      validPageNumberPct: 0,
      charOffsetPresentPct: 0,
      baselineAvgLatencyMs: 0,
      ragAvgLatencyMs: 0,
      baselineP95LatencyMs: 0,
      ragP95LatencyMs: 0,
      byCategory: {},
      ragImprovements: 0,
      ragRegressions: 0,
      bothCorrect: 0,
      bothWrong: 0,
    };
  }

  // Count correct responses
  const baselineCorrect = results.filter(r => r.comparison.baselineCorrect).length;
  const ragCorrect = results.filter(r => r.comparison.ragCorrect).length;

  // Hallucination counts
  const baselineHallucinations = results.filter(
    r => r.baseline.accuracy.hallucinationDetected
  ).length;
  const ragHallucinations = results.filter(r => r.rag.accuracy.hallucinationDetected).length;

  // Refusal queries
  const refusalQueries = results.filter(r => r.categoryLetter === 'E');
  const baselineCorrectRefusals = refusalQueries.filter(
    r => r.baseline.accuracy.appropriateRefusal
  ).length;
  const ragCorrectRefusals = refusalQueries.filter(
    r => r.rag.accuracy.appropriateRefusal
  ).length;

  // Citation metrics
  const ragWithCitations = results.filter(r => r.rag.citationQuality.hasCitations);
  const validPageNumbers = ragWithCitations.filter(
    r => r.rag.citationQuality.validPageNumbers
  ).length;
  const charOffsetsPresent = ragWithCitations.filter(
    r => r.rag.citationQuality.charOffsetsPresent
  ).length;

  // Latency arrays
  const baselineLatencies = results.map(r => r.baseline.latency_ms);
  const ragLatencies = results.map(r => r.rag.latency_ms);

  // By category
  const byCategory: ComparisonMetrics['byCategory'] = {};
  const categories = ['A', 'B', 'C', 'D', 'E'];
  for (const cat of categories) {
    const catResults = results.filter(r => r.categoryLetter === cat);
    if (catResults.length > 0) {
      const catBaselineCorrect = catResults.filter(r => r.comparison.baselineCorrect).length;
      const catRagCorrect = catResults.filter(r => r.comparison.ragCorrect).length;
      byCategory[cat] = {
        baseline: (catBaselineCorrect / catResults.length) * 100,
        rag: (catRagCorrect / catResults.length) * 100,
        improvement:
          ((catRagCorrect - catBaselineCorrect) / catResults.length) * 100,
        count: catResults.length,
      };
    }
  }

  // Comparison breakdown
  const ragImprovements = results.filter(r => r.comparison.ragImprovement).length;
  const ragRegressions = results.filter(r => r.comparison.ragRegression).length;
  const bothCorrect = results.filter(r => r.comparison.bothCorrect).length;
  const bothWrong = results.filter(r => r.comparison.bothWrong).length;

  return {
    totalQueries: total,
    baselineAccuracyPct: (baselineCorrect / total) * 100,
    ragAccuracyPct: (ragCorrect / total) * 100,
    accuracyImprovementPct: ((ragCorrect - baselineCorrect) / total) * 100,
    baselineHallucinationRate: (baselineHallucinations / total) * 100,
    ragHallucinationRate: (ragHallucinations / total) * 100,
    baselineCorrectRefusals,
    ragCorrectRefusals,
    totalRefusalQueries: refusalQueries.length,
    citationAccuracyPct:
      ragWithCitations.length > 0
        ? ragWithCitations.reduce((sum, r) => sum + r.rag.citationQuality.citationAccuracyPct, 0) /
          ragWithCitations.length
        : 0,
    validPageNumberPct:
      ragWithCitations.length > 0 ? (validPageNumbers / ragWithCitations.length) * 100 : 0,
    charOffsetPresentPct:
      ragWithCitations.length > 0 ? (charOffsetsPresent / ragWithCitations.length) * 100 : 0,
    baselineAvgLatencyMs:
      baselineLatencies.reduce((a, b) => a + b, 0) / baselineLatencies.length,
    ragAvgLatencyMs: ragLatencies.reduce((a, b) => a + b, 0) / ragLatencies.length,
    baselineP95LatencyMs: calculateP95(baselineLatencies),
    ragP95LatencyMs: calculateP95(ragLatencies),
    byCategory,
    ragImprovements,
    ragRegressions,
    bothCorrect,
    bothWrong,
  };
}

/**
 * Run full evaluation suite
 */
export async function runFullEvaluation(
  testCases: GoldenTestCase[],
  options: {
    ragBaseUrl?: string;
    delayBetweenQueries?: number;
    skipBaseline?: boolean;
  } = {}
): Promise<{
  results: EvaluationResult[];
  metrics: ComparisonMetrics;
}> {
  const { ragBaseUrl = 'http://localhost:3000', delayBetweenQueries = 500 } = options;

  const baselineClient = getBaselineClient();
  const results: EvaluationResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Evaluating: ${testCase.id}`);

    const result = await runComparison(testCase, baselineClient, ragBaseUrl);
    results.push(result);

    // Rate limiting delay
    if (i < testCases.length - 1 && delayBetweenQueries > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenQueries));
    }
  }

  const metrics = aggregateMetrics(results);

  return { results, metrics };
}

/**
 * Format metrics as a summary string
 */
export function formatMetricsSummary(metrics: ComparisonMetrics): string {
  const lines: string[] = [];

  lines.push('=== EVALUATION SUMMARY ===\n');

  lines.push('ACCURACY:');
  lines.push(`  Baseline: ${metrics.baselineAccuracyPct.toFixed(1)}%`);
  lines.push(`  RAG:      ${metrics.ragAccuracyPct.toFixed(1)}%`);
  lines.push(
    `  Improvement: ${metrics.accuracyImprovementPct >= 0 ? '+' : ''}${metrics.accuracyImprovementPct.toFixed(1)}%`
  );
  lines.push('');

  lines.push('HALLUCINATION RATE:');
  lines.push(`  Baseline: ${metrics.baselineHallucinationRate.toFixed(1)}%`);
  lines.push(`  RAG:      ${metrics.ragHallucinationRate.toFixed(1)}%`);
  lines.push('');

  lines.push('REFUSAL ACCURACY (Category E):');
  lines.push(
    `  Baseline: ${metrics.baselineCorrectRefusals}/${metrics.totalRefusalQueries} correct`
  );
  lines.push(`  RAG:      ${metrics.ragCorrectRefusals}/${metrics.totalRefusalQueries} correct`);
  lines.push('');

  lines.push('CITATION QUALITY (RAG):');
  lines.push(`  Accuracy:      ${metrics.citationAccuracyPct.toFixed(1)}%`);
  lines.push(`  Valid Pages:   ${metrics.validPageNumberPct.toFixed(1)}%`);
  lines.push(`  Char Offsets:  ${metrics.charOffsetPresentPct.toFixed(1)}%`);
  lines.push('');

  lines.push('LATENCY:');
  lines.push(`  Baseline Avg: ${metrics.baselineAvgLatencyMs.toFixed(0)}ms`);
  lines.push(`  RAG Avg:      ${metrics.ragAvgLatencyMs.toFixed(0)}ms`);
  lines.push(`  RAG P95:      ${metrics.ragP95LatencyMs.toFixed(0)}ms`);
  lines.push('');

  lines.push('BY CATEGORY:');
  for (const [cat, data] of Object.entries(metrics.byCategory)) {
    lines.push(
      `  ${cat}: Baseline ${data.baseline.toFixed(0)}% → RAG ${data.rag.toFixed(0)}% (${data.improvement >= 0 ? '+' : ''}${data.improvement.toFixed(0)}%)`
    );
  }
  lines.push('');

  lines.push('COMPARISON BREAKDOWN:');
  lines.push(`  RAG Improvements: ${metrics.ragImprovements} queries`);
  lines.push(`  RAG Regressions:  ${metrics.ragRegressions} queries`);
  lines.push(`  Both Correct:     ${metrics.bothCorrect} queries`);
  lines.push(`  Both Wrong:       ${metrics.bothWrong} queries`);

  return lines.join('\n');
}
