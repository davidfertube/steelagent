/**
 * Unit Tests: Error Handling Module
 *
 * Ensures error responses never leak internal details to clients.
 */

import { describe, it, expect } from 'vitest';
import {
  createSafeErrorResponse,
  categorizeError,
  handleApiError,
  createEmbeddingError,
  createValidationError,
  getErrorStatusCode,
} from '@/lib/errors';

describe('Error Categorization', () => {
  it('should categorize timeout errors', () => {
    const err = new Error('Request timed out after 30s');
    err.name = 'TimeoutError';
    expect(categorizeError(err)).toBe('TIMEOUT');
  });

  it('should categorize API key errors as service unavailable', () => {
    expect(categorizeError(new Error('Invalid API key'))).toBe('SERVICE_UNAVAILABLE');
    expect(categorizeError(new Error('Missing api_key'))).toBe('SERVICE_UNAVAILABLE');
  });

  it('should categorize rate limit errors', () => {
    expect(categorizeError(new Error('Rate limit exceeded'))).toBe('RATE_LIMITED');
    expect(categorizeError(new Error('Too many requests'))).toBe('RATE_LIMITED');
    expect(categorizeError(new Error('Quota exceeded'))).toBe('RATE_LIMITED');
  });

  it('should categorize not found errors', () => {
    expect(categorizeError(new Error('Resource not found'))).toBe('NOT_FOUND');
    expect(categorizeError(new Error('Document does not exist'))).toBe('NOT_FOUND');
  });

  it('should categorize network errors', () => {
    expect(categorizeError(new Error('ECONNREFUSED'))).toBe('SERVICE_UNAVAILABLE');
    expect(categorizeError(new Error('fetch failed'))).toBe('SERVICE_UNAVAILABLE');
  });

  it('should default to INTERNAL_ERROR for unknown errors', () => {
    expect(categorizeError(new Error('something weird'))).toBe('INTERNAL_ERROR');
    expect(categorizeError('string error')).toBe('INTERNAL_ERROR');
    expect(categorizeError(42)).toBe('INTERNAL_ERROR');
    expect(categorizeError(null)).toBe('INTERNAL_ERROR');
  });
});

describe('Safe Error Responses', () => {
  it('should never include stack traces', () => {
    const err = new Error('Database connection failed at /var/app/db.ts:42');
    const response = createSafeErrorResponse(err, 'INTERNAL_ERROR');
    expect(JSON.stringify(response)).not.toContain('/var/app');
    expect(JSON.stringify(response)).not.toContain('db.ts');
    expect(JSON.stringify(response)).not.toContain('stack');
  });

  it('should never include error.message in response', () => {
    const err = new Error('SUPABASE_SERVICE_KEY invalid: sk-xxxx');
    const response = createSafeErrorResponse(err, 'INTERNAL_ERROR');
    expect(response.error).not.toContain('SUPABASE');
    expect(response.error).not.toContain('sk-xxxx');
  });

  it('should return correct status codes', () => {
    expect(getErrorStatusCode('VALIDATION_ERROR')).toBe(400);
    expect(getErrorStatusCode('UNAUTHORIZED')).toBe(401);
    expect(getErrorStatusCode('FORBIDDEN')).toBe(403);
    expect(getErrorStatusCode('NOT_FOUND')).toBe(404);
    expect(getErrorStatusCode('RATE_LIMITED')).toBe(429);
    expect(getErrorStatusCode('INTERNAL_ERROR')).toBe(500);
    expect(getErrorStatusCode('SERVICE_UNAVAILABLE')).toBe(503);
    expect(getErrorStatusCode('TIMEOUT')).toBe(504);
  });

  it('should include error code in response', () => {
    const response = createSafeErrorResponse(new Error('test'), 'FORBIDDEN');
    expect(response.code).toBe('FORBIDDEN');
  });
});

describe('Embedding Error Safety', () => {
  it('should not leak Voyage AI details', () => {
    const err = new Error('VoyageAI API returned 403: invalid api key voy-xxx123');
    const response = createEmbeddingError(err);
    expect(response.error).not.toContain('voy-xxx123');
    expect(response.error).not.toContain('403');
    expect(response.error).not.toContain('VoyageAI');
    expect(response.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should not leak API key values', () => {
    const err = new Error('Invalid API key: sk-1234567890abcdef');
    const response = createEmbeddingError(err);
    expect(response.error).not.toContain('sk-1234567890abcdef');
    expect(response.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should handle rate limit errors gracefully', () => {
    const err = new Error('Rate limit exceeded for resource exhausted');
    const response = createEmbeddingError(err);
    expect(response.code).toBe('RATE_LIMITED');
    expect(response.error).not.toContain('resource exhausted');
  });

  it('should handle missing VOYAGE_API_KEY', () => {
    const err = new Error('VOYAGE_API_KEY is not set');
    const response = createEmbeddingError(err);
    expect(response.code).toBe('SERVICE_UNAVAILABLE');
    expect(response.error).toContain('not configured');
  });

  it('should handle unknown embedding errors safely', () => {
    const response = createEmbeddingError('unexpected error type');
    expect(response.code).toBe('INTERNAL_ERROR');
    expect(response.error).not.toContain('unexpected');
  });
});

describe('handleApiError', () => {
  it('should return response and status', () => {
    const { response, status } = handleApiError(new Error('Network failed'), 'Chat API');
    expect(response.error).toBeTruthy();
    expect(response.code).toBeTruthy();
    expect(status).toBeGreaterThanOrEqual(400);
    expect(response.error).not.toContain('Network failed');
  });
});

describe('createValidationError', () => {
  it('should pass through validation messages', () => {
    const response = createValidationError('Email is required');
    expect(response.error).toBe('Email is required');
    expect(response.code).toBe('VALIDATION_ERROR');
  });
});
