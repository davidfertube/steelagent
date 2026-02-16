/**
 * Golden Test Suite for ASTM Specification Queries
 *
 * Tests RAG system accuracy against three ASTM specifications:
 * - ASTM A1049: Duplex Stainless Steel Forgings for Pressure Vessels
 * - ASTM A872: Centrifugally Cast Duplex Stainless Steel Pipe
 * - ASTM A790: Seamless & Welded Duplex Stainless Steel Pipe
 *
 * Target KPIs:
 * - Query Success Rate: 90%+
 * - Citation Accuracy: 95%+
 * - Hallucination Rate: <5%
 */

import { describe, it, expect } from 'vitest';

// Types for test data
interface GoldenTestCase {
  id: string;
  query: string;
  expectedPatterns: RegExp[];       // Must match at least one pattern
  forbiddenPatterns?: RegExp[];     // Must NOT match any pattern
  requiredCitations?: string[];     // Required document citations
  category: 'lookup' | 'comparison' | 'list' | 'refusal' | 'edge_case';
  documents: string[];              // Which documents should be searched
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

// ============================================
// Golden Test Cases
// ============================================

export const GOLDEN_TESTS: GoldenTestCase[] = [
  // ==========================================
  // TEST 1: Cross-Document Comparison
  // ==========================================
  {
    id: 'T1',
    query: 'Compare the yield strength requirements across A1049 grade F53, A872 grade J94300, and A790 grade S32750',
    expectedPatterns: [
      /F53.*80\s*ksi|550\s*MPa/i,
      /J94300.*70\s*ksi|480\s*MPa/i,
      /S32750.*80\s*ksi|550\s*MPa/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,          // Should not refuse
      /no\s+(?:information|data)/i,
    ],
    requiredCitations: ['A1049', 'A872', 'A790'],
    category: 'comparison',
    documents: ['A1049', 'A872', 'A790'],
    difficulty: 'hard',
    notes: 'Cross-document comparison requiring all three specs',
  },

  // ==========================================
  // TEST 2: Multi-Document Synthesis
  // ==========================================
  {
    id: 'T2',
    query: 'What are the nitrogen content ranges for duplex grades across all three specifications?',
    expectedPatterns: [
      /0\.08.*0\.20|0\.08-0\.20/i,   // A1049 F51, A872 J93183/J93550
      /0\.24.*0\.32|0\.24-0\.32/i,   // A1049 F53
      /nitrogen/i,
    ],
    requiredCitations: ['A1049', 'A872'],
    category: 'comparison',
    documents: ['A1049', 'A872', 'A790'],
    difficulty: 'hard',
    notes: 'Synthesis of nitrogen content across specifications',
  },

  // ==========================================
  // TEST 3: Table Extraction - Chemical Composition
  // ==========================================
  {
    id: 'T3',
    query: 'What is the complete chemical composition for A1049 grade F51 (UNS S31803)?',
    expectedPatterns: [
      /C(?:arbon)?.*0\.030/i,
      /Cr(?:omium)?.*21\.0.*23\.0|21-23/i,
      /Ni(?:ckel)?.*4\.5.*6\.5|4\.5-6\.5/i,
      /Mo(?:lybdenum)?.*2\.5.*3\.5|2\.5-3\.5/i,
      /N(?:itrogen)?.*0\.08.*0\.20|0\.08-0\.20/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A1049'],
    category: 'lookup',
    documents: ['A1049'],
    difficulty: 'medium',
    notes: 'Table 1 extraction - Chemical Requirements',
  },

  // ==========================================
  // TEST 4: Heat Treatment Lookup
  // ==========================================
  {
    id: 'T4',
    query: 'List all heat treatment temperatures for A790 grades S32205 and S32750',
    expectedPatterns: [
      /S32205.*1870.*2010|1020.*1100/i,
      /S32750.*1880.*2060|1025.*1125/i,
      /°F|°C/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 1 lookup from A790',
  },

  // ==========================================
  // TEST 5: Hardness Limits with Ellipses
  // ==========================================
  {
    id: 'T5',
    query: 'What are the Brinell hardness limits in A872 Table 3?',
    expectedPatterns: [
      /J93183.*290/i,
      /J93550.*297/i,
      // J94300 has no hardness requirement (ellipses in table)
      /J94300.*(no\s+(?:requirement|limit)|not\s+specified|\.{3}|ellips)/i,
    ],
    requiredCitations: ['A872'],
    category: 'lookup',
    documents: ['A872'],
    difficulty: 'medium',
    notes: 'Tests handling of ellipses (no requirement) in tables',
  },

  // ==========================================
  // TEST 6: UNS Designation List
  // ==========================================
  {
    id: 'T6',
    query: 'What UNS designations are covered by ASTM A872?',
    expectedPatterns: [
      /J93183/i,
      /J93550/i,
      /J94300/i,
      /CD4MCuMN/i,  // Alternate name for J94300
    ],
    forbiddenPatterns: [
      /S3\d{4}/i,  // Should not include S-series (those are A790/A1049)
    ],
    requiredCitations: ['A872'],
    category: 'list',
    documents: ['A872'],
    difficulty: 'easy',
    notes: 'Lists J-series UNS designations',
  },

  // ==========================================
  // TEST 7: Formula/Equation Lookup
  // ==========================================
  {
    id: 'T7',
    query: 'What is the PREN formula for A1049 tungsten-bearing grades?',
    expectedPatterns: [
      /PREN\s*=\s*Cr/i,
      /3\.3.*Mo/i,
      /16.*N/i,
      /W|tungsten/i,
    ],
    requiredCitations: ['A1049'],
    category: 'lookup',
    documents: ['A1049'],
    difficulty: 'medium',
    notes: 'Tests extraction of technical formulas from footnotes',
  },

  // ==========================================
  // TEST 8: Elongation Comparison
  // ==========================================
  {
    id: 'T8',
    query: 'Compare elongation requirements between A1049 F55 and A790 S32760',
    expectedPatterns: [
      /F55.*25\s*%/i,
      /S32760.*25\s*%/i,
      /elongation/i,
    ],
    category: 'comparison',
    documents: ['A1049', 'A790'],
    difficulty: 'medium',
    notes: 'Both have 25% elongation - tests equal value comparison',
  },

  // ==========================================
  // TEST 9: Welding Procedure (Partial Info)
  // ==========================================
  {
    id: 'T9',
    query: 'What is the welding procedure for A790 duplex pipe?',
    expectedPatterns: [
      // Should mention Section 15 (Repair by Welding) or acknowledge limited info
      /(?:Section\s+15|Repair\s+by\s+Welding|weld\s+repair|AWS\s+A5\.9|ER2209)/i,
    ],
    // Should NOT claim no information (A790 Section 15 has welding info)
    forbiddenPatterns: [
      /cannot\s+answer.*not\s+in.*documents/i,
    ],
    requiredCitations: ['A790'],
    category: 'edge_case',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'A790 has limited welding info in Section 15',
  },

  // ==========================================
  // TEST 10: No Requirement / Ellipses Handling
  // ==========================================
  {
    id: 'T10',
    query: 'What is the impact energy requirement for A872 grade J93183?',
    expectedPatterns: [
      // Table S7.1 shows ellipses (no requirement) for J93183
      /no\s+(?:requirement|limit|specification)/i,
      /not\s+(?:specified|required|determined)/i,
      /ellips/i,
    ],
    forbiddenPatterns: [
      /\d+\s*(?:ft\.?lbf|J)\s+/i, // Should NOT provide a made-up value
    ],
    requiredCitations: ['A872'],
    category: 'refusal',
    documents: ['A872'],
    difficulty: 'medium',
    notes: 'Tests proper handling of ellipses = no requirement',
  },

  // ==========================================
  // A790-SPECIFIC TESTS (20 Cases)
  // ==========================================

  // Category A: Direct Lookup Queries
  {
    id: 'A790-T1',
    query: 'What is the yield strength of S32205 duplex stainless steel?',
    expectedPatterns: [
      /65\s*ksi|450\s*MPa/i,
      /S32205|2205/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 3 lookup - mechanical properties',
  },
  {
    id: 'A790-T2',
    query: 'What is the maximum carbon content for UNS S32750 (2507)?',
    expectedPatterns: [
      /0\.030/i,
      /S32750|2507/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 2 lookup - chemical composition',
  },
  {
    id: 'A790-T3',
    query: 'What is the heat treatment temperature range for S31803?',
    expectedPatterns: [
      /1870.*2010|1020.*1100/i,
      /°F|°C/i,
      /S31803/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 1 lookup - heat treatment',
  },
  {
    id: 'A790-T4',
    query: 'What is the maximum hardness allowed for S32205?',
    expectedPatterns: [
      /290\s*HBW|30\s*HRC/i,
      /S32205|2205/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 3 lookup - dual hardness scales',
  },
  {
    id: 'A790-T5',
    query: 'What is the minimum elongation for S32750 (2507)?',
    expectedPatterns: [
      /15\s*%/i,
      /S32750|2507/i,
      /elongation/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Table 3 lookup - elongation percentage',
  },

  // Category B: Code/Standard Interpretation Queries
  {
    id: 'A790-T6',
    query: 'What ASTM standards are referenced in A790?',
    expectedPatterns: [
      /A370/i,
      /A923/i,
      /A999/i,
      /E213/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'list',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Section 2.1 list extraction',
  },
  {
    id: 'A790-T7',
    query: 'What quenching methods are acceptable for duplex pipe per A790?',
    expectedPatterns: [
      /water/i,
      /rapid.*(?:cool|air)|air.*cool/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Table 1 quench methods',
  },
  {
    id: 'A790-T8',
    query: 'What is the scope of ASTM A790?',
    expectedPatterns: [
      /seamless/i,
      /welded/i,
      /ferritic.*austenitic|duplex/i,
      /corrosive?\s*service|stress\s*corrosion/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Section 1.1 scope extraction',
  },
  {
    id: 'A790-T9',
    query: 'What supplementary requirements are available in A790?',
    expectedPatterns: [
      /S1.*product\s*analysis|product\s*analysis/i,
      /S2.*transverse.*tension|transverse.*tension/i,
      /S3.*flattening|flattening/i,
      /S4.*etch/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'list',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Supplementary requirements section',
  },
  {
    id: 'A790-T10',
    query: 'What NDE methods are permitted by A790?',
    expectedPatterns: [
      /E213|ultrasonic|UT/i,
      /E309|E426|eddy.*current|ET/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'list',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Section 14.3 NDE methods',
  },

  // Category C: Comparison Queries
  {
    id: 'A790-T11',
    query: 'Compare the tensile strength of S32205 and S32750',
    expectedPatterns: [
      /S32205.*95\s*ksi|95\s*ksi.*S32205|S32205.*655\s*MPa|655\s*MPa.*S32205/i,
      /S32750.*116\s*ksi|116\s*ksi.*S32750|S32750.*800\s*MPa|800\s*MPa.*S32750/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'comparison',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Table 3 multi-value comparison',
  },
  {
    id: 'A790-T12',
    query: 'Which grade has higher nitrogen content: 2205 or 2507?',
    expectedPatterns: [
      /2507|S32750/i,
      /higher|more|greater/i,
      /0\.24.*0\.32|0\.14.*0\.20/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'comparison',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Table 2 range comparison',
  },
  {
    id: 'A790-T13',
    query: 'What is the difference in Mo content between S31803 and S32205?',
    expectedPatterns: [
      /S31803.*2\.5.*3\.5|2\.5.*3\.5.*S31803/i,
      /S32205.*3\.0.*3\.5|3\.0.*3\.5.*S32205/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'comparison',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'Table 2 molybdenum comparison',
  },

  // Category D: Complex/Multi-Part Queries
  {
    id: 'A790-T14',
    query: 'What are the chemical and mechanical requirements for 2205 duplex?',
    expectedPatterns: [
      /Cr.*22\.0.*23\.0|22-23/i,           // Chemical - Chromium
      /Ni.*4\.5.*6\.5|4\.5-6\.5/i,         // Chemical - Nickel
      /95\s*ksi|655\s*MPa/i,               // Tensile strength
      /65\s*ksi|450\s*MPa/i,               // Yield strength
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'Multi-table synthesis - Tables 2 & 3',
  },
  {
    id: 'A790-T15',
    query: 'What tests are required for A790 pipe and what are the acceptance criteria?',
    expectedPatterns: [
      /tension|tensile/i,
      /flattening/i,
      /hardness/i,
      /hydrostatic|nondestructive|NDE/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'list',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'Sections 13 & 14 multi-section extraction',
  },
  {
    id: 'A790-T16',
    query: 'What are the pipe dimensions and wall thickness per A790?',
    expectedPatterns: [
      /schedule|NPS|nominal\s*pipe\s*size/i,
      /wall.*thickness|thickness/i,
      /ANSI\s*B36\.19|Table\s*X1/i,
    ],
    forbiddenPatterns: [
      /cannot\s+answer/i,
    ],
    requiredCitations: ['A790'],
    category: 'lookup',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'Appendix X1 and Table X1.1',
  },

  // Category E: Hallucination Detection Queries
  {
    id: 'A790-T17',
    query: 'What is the PREN formula for S32205?',
    expectedPatterns: [
      // A790 does NOT contain PREN formula - should refuse OR note it's not in the document
      // Some footnotes in Table 2 mention PREN thresholds but not the formula
      /not\s*(?:in|contained|found|specified)|cannot\s*answer|no.*formula|PREN\s*(?:value|threshold|≥|>=)/i,
    ],
    requiredCitations: ['A790'],
    category: 'refusal',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'PREN formula NOT in A790 - tests hallucination prevention',
  },
  {
    id: 'A790-T18',
    query: 'What is the price of A790 pipe?',
    expectedPatterns: [
      /not\s*(?:in|contained|found|specified)|cannot\s*answer|no.*(?:price|cost|pricing)/i,
    ],
    forbiddenPatterns: [
      /\$\d+|\d+\s*(?:USD|dollars|per)/i,  // Should NOT make up prices
    ],
    category: 'refusal',
    documents: ['A790'],
    difficulty: 'easy',
    notes: 'Out-of-scope query - no pricing info in specs',
  },
  {
    id: 'A790-T19',
    query: 'What corrosion rate should I expect from 2205 in seawater?',
    expectedPatterns: [
      /not\s*(?:in|contained|found|specified)|cannot\s*answer|no.*(?:corrosion\s*rate|data)/i,
    ],
    forbiddenPatterns: [
      /\d+\s*(?:mm\/yr|mpy|mils?\s*per\s*year)/i,  // Should NOT make up corrosion rates
    ],
    category: 'refusal',
    documents: ['A790'],
    difficulty: 'medium',
    notes: 'External knowledge filtering - no corrosion rate data in spec',
  },
  {
    id: 'A790-T20',
    query: 'What is the recommended welding procedure for A790 pipe?',
    expectedPatterns: [
      // A790 Section 15 has LIMITED welding info (repair by welding only)
      // Should mention Section 15, AWS A5.9, ER2209, or acknowledge limited info
      /Section\s*15|repair.*weld|AWS\s*A5\.9|ER2209|gas\s*tungsten.*arc|GTAW|limited/i,
    ],
    forbiddenPatterns: [
      /complete\s*welding\s*procedure|detailed\s*WPS/i,  // Should not claim full procedure exists
    ],
    requiredCitations: ['A790'],
    category: 'edge_case',
    documents: ['A790'],
    difficulty: 'hard',
    notes: 'Partial information - only Section 15 repair welding exists',
  },
];

// ============================================
// Test Utilities
// ============================================

interface TestResult {
  passed: boolean;
  matchedPatterns: string[];
  missedPatterns: string[];
  forbiddenMatches: string[];
  citationsFound: string[];
  missingCitations: string[];
}

function evaluateResponse(response: string, testCase: GoldenTestCase): TestResult {
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

  // Determine pass/fail
  // Must match at least 50% of expected patterns AND no forbidden patterns
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

// ============================================
// Test Suite
// ============================================

describe('Golden Test Suite - ASTM Specifications', () => {
  // These tests require the RAG API to be running
  // In CI, they can be mocked or run against a test instance

  describe('Golden Test Cases', () => {
    // Generate individual test cases
    for (const testCase of GOLDEN_TESTS) {
      it(`[${testCase.id}] ${testCase.category}: ${testCase.query.slice(0, 50)}...`, async () => {
        // This test requires the API to be available
        // Skip in unit test mode, run in integration test mode
        const isIntegrationTest = process.env.INTEGRATION_TEST === 'true';

        if (!isIntegrationTest) {
          // In unit test mode, just verify test case structure
          expect(testCase.query.length).toBeGreaterThan(0);
          expect(testCase.expectedPatterns.length).toBeGreaterThan(0);
          expect(testCase.documents.length).toBeGreaterThan(0);
          return;
        }

        // Integration test mode - call actual API
        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: testCase.query }),
        });

        expect(response.ok).toBe(true);

        const data = await response.json();
        const result = evaluateResponse(data.response, testCase);

        // Log details for debugging
        if (!result.passed) {
          console.log(`\nFailed Test: ${testCase.id}`);
          console.log(`Query: ${testCase.query}`);
          console.log(`Matched: ${result.matchedPatterns.join(', ')}`);
          console.log(`Missed: ${result.missedPatterns.join(', ')}`);
          console.log(`Forbidden matches: ${result.forbiddenMatches.join(', ')}`);
          console.log(`Response preview: ${data.response.slice(0, 500)}...`);
        }

        expect(result.passed).toBe(true);
      });
    }
  });
});

// ============================================
// Test Summary Report
// ============================================

export function generateTestReport(results: Array<{ testCase: GoldenTestCase; result: TestResult }>) {
  const total = results.length;
  const passed = results.filter(r => r.result.passed).length;
  const byCategory: Record<string, { passed: number; total: number }> = {};
  const byDifficulty: Record<string, { passed: number; total: number }> = {};

  for (const { testCase, result } of results) {
    // Category stats
    if (!byCategory[testCase.category]) {
      byCategory[testCase.category] = { passed: 0, total: 0 };
    }
    byCategory[testCase.category].total++;
    if (result.passed) byCategory[testCase.category].passed++;

    // Difficulty stats
    if (!byDifficulty[testCase.difficulty]) {
      byDifficulty[testCase.difficulty] = { passed: 0, total: 0 };
    }
    byDifficulty[testCase.difficulty].total++;
    if (result.passed) byDifficulty[testCase.difficulty].passed++;
  }

  return {
    summary: {
      total,
      passed,
      failed: total - passed,
      passRate: ((passed / total) * 100).toFixed(1) + '%',
    },
    byCategory,
    byDifficulty,
    failedTests: results
      .filter(r => !r.result.passed)
      .map(r => ({
        id: r.testCase.id,
        query: r.testCase.query,
        missedPatterns: r.result.missedPatterns,
        forbiddenMatches: r.result.forbiddenMatches,
      })),
  };
}
