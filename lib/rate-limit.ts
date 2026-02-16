/**
 * Rate Limiting Module
 *
 * Distributed rate limiting using Upstash Redis.
 * Falls back to in-memory if Upstash is not configured.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Check if Upstash is configured
const UPSTASH_CONFIGURED = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Initialize Upstash Redis if configured
let redis: Redis | null = null;
if (UPSTASH_CONFIGURED) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Create rate limiters for different endpoints
const rateLimiters: Record<string, Ratelimit> = {};

function getRateLimiter(endpoint: string): Ratelimit | null {
  if (!redis) return null;

  if (!rateLimiters[endpoint]) {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
    rateLimiters[endpoint] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
      analytics: true,
      prefix: `ratelimit:${endpoint}`,
    });
  }

  return rateLimiters[endpoint];
}

// Fallback in-memory store (for local dev without Upstash)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (only used if Upstash not configured)
if (!UPSTASH_CONFIGURED) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
}

// Default rate limits per endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/chat': { windowMs: 60 * 1000, maxRequests: 30 },           // 30/min
  '/api/documents/upload-url': { windowMs: 60 * 1000, maxRequests: 5 }, // 5/min
  '/api/documents/upload': { windowMs: 60 * 1000, maxRequests: 5 },     // 5/min
  '/api/documents/process': { windowMs: 60 * 1000, maxRequests: 10 },   // 10/min
  '/api/leads': { windowMs: 60 * 1000, maxRequests: 10 },               // 10/min
  '/api/feedback': { windowMs: 60 * 1000, maxRequests: 20 },            // 20/min
  'default': { windowMs: 60 * 1000, maxRequests: 60 },                  // 60/min default
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * Uses Upstash Redis if configured, falls back to in-memory
 *
 * @param ip - Client IP address
 * @param endpoint - API endpoint path
 * @returns RateLimitResult with success status and headers
 */
export async function checkRateLimit(ip: string, endpoint: string): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];

  // Try Upstash first
  const limiter = getRateLimiter(endpoint);
  if (limiter) {
    try {
      const { success, limit, remaining, reset } = await limiter.limit(ip);
      const now = Date.now();
      const resetTime = reset;

      if (!success) {
        return {
          success: false,
          limit,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        };
      }

      return {
        success: true,
        limit,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.warn('[Rate Limit] Upstash error, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Check if over limit
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Extract client IP from request headers
 * Handles proxied requests (Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: Request): string {
  // Vercel sets this header and it cannot be spoofed by clients
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Prefer platform-set headers (not spoofable) over x-forwarded-for
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // x-forwarded-for as last resort — first IP is the client
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback - shouldn't happen in production
  return '127.0.0.1';
}

/**
 * Check if Upstash is configured and working
 */
export function isUpstashConfigured(): boolean {
  return UPSTASH_CONFIGURED;
}

// ============================================
// Anonymous Trial Quota (3 queries per IP per 30 days)
// ============================================

const ANONYMOUS_QUERY_LIMIT = 3;
const ANONYMOUS_QUERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ANONYMOUS_DOC_LIMIT = 1;

export interface AnonymousQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

// In-memory fallback stores for anonymous tracking
const anonymousQueryStore = new Map<string, { count: number; expiry: number }>();
const anonymousDocStore = new Map<string, Set<number>>();

// Clean up expired anonymous entries every 10 minutes
if (!UPSTASH_CONFIGURED) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of anonymousQueryStore.entries()) {
      if (entry.expiry < now) {
        anonymousQueryStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

/**
 * Check if an anonymous IP has remaining free queries
 */
export async function checkAnonymousQuota(ip: string): Promise<AnonymousQuotaResult> {
  const key = `anon_quota:${ip}`;

  if (redis) {
    try {
      const count = await redis.get<number>(key) || 0;
      const remaining = Math.max(0, ANONYMOUS_QUERY_LIMIT - count);
      return {
        allowed: count < ANONYMOUS_QUERY_LIMIT,
        used: count,
        limit: ANONYMOUS_QUERY_LIMIT,
        remaining,
      };
    } catch (error) {
      console.warn('[Anonymous Quota] Redis error, falling back to in-memory:', error);
    }
  }

  // In-memory fallback
  const entry = anonymousQueryStore.get(key);
  const now = Date.now();

  if (!entry || entry.expiry < now) {
    return { allowed: true, used: 0, limit: ANONYMOUS_QUERY_LIMIT, remaining: ANONYMOUS_QUERY_LIMIT };
  }

  const remaining = Math.max(0, ANONYMOUS_QUERY_LIMIT - entry.count);
  return {
    allowed: entry.count < ANONYMOUS_QUERY_LIMIT,
    used: entry.count,
    limit: ANONYMOUS_QUERY_LIMIT,
    remaining,
  };
}

/**
 * Increment anonymous query counter for an IP
 */
export async function incrementAnonymousQuota(ip: string): Promise<void> {
  const key = `anon_quota:${ip}`;

  if (redis) {
    try {
      const exists = await redis.exists(key);
      await redis.incr(key);
      if (!exists) {
        await redis.expire(key, Math.floor(ANONYMOUS_QUERY_WINDOW_MS / 1000));
      }
      return;
    } catch (error) {
      console.warn('[Anonymous Quota] Redis incr error, falling back:', error);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = anonymousQueryStore.get(key);

  if (!entry || entry.expiry < now) {
    anonymousQueryStore.set(key, { count: 1, expiry: now + ANONYMOUS_QUERY_WINDOW_MS });
  } else {
    entry.count++;
  }
}

/**
 * Track a document uploaded by an anonymous session
 */
export async function trackAnonymousDocument(sessionId: string, documentId: number): Promise<void> {
  const key = `anon_docs:${sessionId}`;

  if (redis) {
    try {
      await redis.sadd(key, documentId);
      await redis.expire(key, Math.floor(ANONYMOUS_QUERY_WINDOW_MS / 1000));
      return;
    } catch (error) {
      console.warn('[Anonymous Docs] Redis error, falling back:', error);
    }
  }

  // In-memory fallback
  if (!anonymousDocStore.has(key)) {
    anonymousDocStore.set(key, new Set());
  }
  anonymousDocStore.get(key)!.add(documentId);
}

/**
 * Check if an anonymous session owns a specific document
 */
export async function isAnonymousDocument(sessionId: string, documentId: number): Promise<boolean> {
  const key = `anon_docs:${sessionId}`;

  if (redis) {
    try {
      const result = await redis.sismember(key, documentId);
      return result === 1;
    } catch (error) {
      console.warn('[Anonymous Docs] Redis error, falling back:', error);
    }
  }

  return anonymousDocStore.get(key)?.has(documentId) ?? false;
}

/**
 * Check how many documents an anonymous session has uploaded
 */
export async function getAnonymousDocCount(sessionId: string): Promise<number> {
  const key = `anon_docs:${sessionId}`;

  if (redis) {
    try {
      return await redis.scard(key);
    } catch (error) {
      console.warn('[Anonymous Docs] Redis error, falling back:', error);
    }
  }

  return anonymousDocStore.get(key)?.size ?? 0;
}
