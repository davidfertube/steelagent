/**
 * Timeout Utility for Async Operations
 * =====================================
 *
 * This module provides utilities for adding timeouts to async operations.
 * It prevents operations from hanging indefinitely, which is critical for:
 * - LLM API calls that may hang
 * - Database queries that may be slow
 * - External service calls
 *
 * Usage:
 *   import { withTimeout, TIMEOUTS } from '@/lib/timeout';
 *   const result = await withTimeout(
 *     someAsyncOperation(),
 *     TIMEOUTS.LLM_GENERATION,
 *     'LLM response'
 *   );
 */

/**
 * Custom error class for timeout errors
 * Allows callers to distinguish timeout errors from other errors
 */
export class TimeoutError extends Error {
  public readonly timeoutMs: number;
  public readonly operationName: string;

  constructor(message: string, timeoutMs: number, operationName: string) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.operationName = operationName;
  }
}

/**
 * Wrap an async operation with a timeout
 *
 * If the operation takes longer than the specified timeout,
 * it will be rejected with a TimeoutError.
 *
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param operationName - Human-readable name for error messages
 * @returns The result of the promise if it completes in time
 * @throws TimeoutError if the operation takes too long
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API request'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  // Validate timeout value
  if (timeoutMs <= 0) {
    throw new Error(`Timeout must be positive, got ${timeoutMs}ms`);
  }

  // Store the timeout ID so we can clear it
  let timeoutId: NodeJS.Timeout;

  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(
        `${operationName} timed out after ${timeoutMs}ms. ` +
        `This may indicate a slow network or an unresponsive service.`,
        timeoutMs,
        operationName
      ));
    }, timeoutMs);
  });

  try {
    // Race the original promise against the timeout
    const result = await Promise.race([promise, timeoutPromise]);

    // If we get here, the original promise won - clear the timeout
    clearTimeout(timeoutId!);

    return result;
  } catch (error) {
    // Always clear the timeout, even on error
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Common timeout values for different operations
 *
 * These are carefully chosen defaults based on typical operation times:
 * - LLM calls: Can be slow, especially for long responses
 * - Embeddings: Faster than full LLM calls, but still external API
 * - Database: Should be fast, timeout catches issues
 * - File uploads: Larger files need more time
 */
export const TIMEOUTS = {
  /**
   * Timeout for LLM text generation (30 seconds)
   * LLM responses can be slow, especially for longer outputs
   */
  LLM_GENERATION: 30_000,

  /**
   * Timeout for generating a single embedding (10 seconds)
   * Embedding generation is faster than full LLM responses
   */
  EMBEDDING_SINGLE: 10_000,

  /**
   * Timeout for batch embedding operations (60 seconds)
   * Batch operations need more time for multiple embeddings
   */
  EMBEDDING_BATCH: 60_000,

  /**
   * Timeout for database queries (5 seconds)
   * Database operations should be fast; timeout catches connection issues
   */
  DATABASE_QUERY: 5_000,

  /**
   * Timeout for file uploads (60 seconds)
   * File uploads depend on file size and network speed
   */
  FILE_UPLOAD: 60_000,

  /**
   * Timeout for health checks (5 seconds)
   * Health checks should be fast
   */
  HEALTH_CHECK: 5_000,

  /**
   * Timeout for vector similarity search (10 seconds)
   * Vector search can be slow with large datasets
   */
  VECTOR_SEARCH: 10_000,
} as const;

/**
 * Type for timeout constants
 */
export type TimeoutKey = keyof typeof TIMEOUTS;

/**
 * Check if an error is a timeout error
 *
 * @param error - The error to check
 * @returns true if the error is a TimeoutError
 *
 * @example
 * ```typescript
 * try {
 *   await withTimeout(operation(), 5000, 'my operation');
 * } catch (error) {
 *   if (isTimeoutError(error)) {
 *     console.log('Operation timed out');
 *   }
 * }
 * ```
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
