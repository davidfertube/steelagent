/**
 * Unit Tests: Query Preprocessing
 *
 * Tests ASTM/UNS/API code extraction and BM25 boost detection.
 */

import { describe, it, expect } from 'vitest';
import { preprocessQuery } from '@/lib/query-preprocessing';

describe('Query Preprocessing', () => {
  describe('ASTM Code Detection', () => {
    it('should detect ASTM codes', () => {
      const result = preprocessQuery('What is the yield strength per ASTM A790?');
      expect(result.extractedCodes.astm).toBeDefined();
      expect(result.extractedCodes.astm).toContainEqual(
        expect.stringContaining('A790')
      );
    });

    it('should detect multiple ASTM codes', () => {
      const result = preprocessQuery('Compare A789 and A790 specifications');
      expect(result.extractedCodes.astm).toBeDefined();
      expect(result.extractedCodes.astm!.some(c => c.includes('A789'))).toBe(true);
      expect(result.extractedCodes.astm!.some(c => c.includes('A790'))).toBe(true);
    });

    it('should detect ASTM with prefix', () => {
      const result = preprocessQuery('Requirements per ASTM A312');
      expect(result.extractedCodes.astm).toBeDefined();
      expect(result.extractedCodes.astm!.length).toBeGreaterThan(0);
    });
  });

  describe('UNS Code Detection', () => {
    it('should detect UNS designations', () => {
      const result = preprocessQuery('Properties of UNS S32205 duplex steel');
      expect(result.extractedCodes.uns).toBeDefined();
      expect(result.extractedCodes.uns).toContainEqual(
        expect.stringMatching(/S32205/i)
      );
    });

    it('should detect UNS codes without UNS prefix', () => {
      const result = preprocessQuery('What about S31803 grade?');
      expect(result.extractedCodes.uns).toBeDefined();
      expect(result.extractedCodes.uns!.length).toBeGreaterThan(0);
    });

    it('should detect multiple UNS codes', () => {
      const result = preprocessQuery('Compare S32205 and S32750 grades');
      expect(result.extractedCodes.uns).toBeDefined();
      expect(result.extractedCodes.uns!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('API Code Detection', () => {
    it('should detect API specifications', () => {
      const result = preprocessQuery('API 5CT casing requirements');
      expect(result.extractedCodes.api).toBeDefined();
      expect(result.extractedCodes.api!.some(c => c.includes('5CT'))).toBe(true);
    });
  });

  describe('BM25 Boost Detection', () => {
    it('should enable BM25 boost for code-heavy queries', () => {
      const result = preprocessQuery('A790 S32205 requirements');
      expect(result.boostExactMatch).toBe(true);
    });

    it('should not boost queries without codes', () => {
      const result = preprocessQuery('what are duplex steels?');
      expect(result.boostExactMatch).toBe(false);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract keywords for BM25', () => {
      const result = preprocessQuery('yield strength of S32205');
      expect(result.keywords).toBeDefined();
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should provide semantic query', () => {
      const result = preprocessQuery('yield strength of S32205');
      expect(result.semanticQuery).toBeDefined();
      expect(result.semanticQuery.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query gracefully', () => {
      const result = preprocessQuery('');
      expect(result.extractedCodes.astm).toBeUndefined();
      expect(result.extractedCodes.uns).toBeUndefined();
    });

    it('should handle query with no codes', () => {
      const result = preprocessQuery('What is duplex stainless steel?');
      expect(result.boostExactMatch).toBe(false);
      expect(result.keywords).toBeDefined();
    });

    it('should preserve original query', () => {
      const query = 'What is the yield strength per ASTM A790?';
      const result = preprocessQuery(query);
      expect(result.original).toBe(query);
    });
  });
});
