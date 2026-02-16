/**
 * Security Test Suite: Rate Limiting
 *
 * Tests rate limit enforcement, IP extraction, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const uniqueIp = `test-${Date.now()}-${Math.random()}`;
    const result = await checkRateLimit(uniqueIp, '/api/chat');
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should include correct headers', async () => {
    const uniqueIp = `test-headers-${Date.now()}`;
    const result = await checkRateLimit(uniqueIp, '/api/chat');
    const headers = getRateLimitHeaders(result);

    expect(headers['X-RateLimit-Limit']).toBeDefined();
    expect(headers['X-RateLimit-Remaining']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
    expect(Number(headers['X-RateLimit-Limit'])).toBeGreaterThan(0);
  });

  it('should use default config for unknown endpoints', async () => {
    const uniqueIp = `test-default-${Date.now()}`;
    const result = await checkRateLimit(uniqueIp, '/api/unknown-endpoint');
    expect(result.success).toBe(true);
    expect(result.limit).toBe(60); // default limit
  });

  it('should enforce per-endpoint limits', async () => {
    const uniqueIp = `test-upload-${Date.now()}`;
    // Upload limit is 5/min — exhaust it
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(uniqueIp, '/api/documents/upload');
      expect(result.success).toBe(true);
    }
    // 6th request should be blocked
    const blocked = await checkRateLimit(uniqueIp, '/api/documents/upload');
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('should include Retry-After header when blocked', async () => {
    const uniqueIp = `test-retry-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(uniqueIp, '/api/documents/upload');
    }
    const blocked = await checkRateLimit(uniqueIp, '/api/documents/upload');
    const headers = getRateLimitHeaders(blocked);
    expect(headers['Retry-After']).toBeDefined();
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('should have feedback rate limit config', async () => {
    const uniqueIp = `test-feedback-${Date.now()}`;
    const result = await checkRateLimit(uniqueIp, '/api/feedback');
    expect(result.success).toBe(true);
    expect(result.limit).toBe(20); // feedback limit
  });
});

describe('IP Extraction', () => {
  function createMockRequest(headers: Record<string, string>): Request {
    return {
      headers: {
        get(name: string) {
          return headers[name.toLowerCase()] ?? null;
        },
      },
    } as unknown as Request;
  }

  it('should prefer x-vercel-forwarded-for', () => {
    const req = createMockRequest({
      'x-vercel-forwarded-for': '1.2.3.4',
      'x-real-ip': '5.6.7.8',
      'x-forwarded-for': '9.10.11.12',
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('should fall back to x-real-ip', () => {
    const req = createMockRequest({
      'x-real-ip': '5.6.7.8',
      'x-forwarded-for': '9.10.11.12',
    });
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('should fall back to cf-connecting-ip', () => {
    const req = createMockRequest({
      'cf-connecting-ip': '10.20.30.40',
    });
    expect(getClientIp(req)).toBe('10.20.30.40');
  });

  it('should use first IP from x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('should use first IP from x-vercel-forwarded-for chain', () => {
    const req = createMockRequest({
      'x-vercel-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('should return localhost when no headers present', () => {
    const req = createMockRequest({});
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
