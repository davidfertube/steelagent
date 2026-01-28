/**
 * Model Fallback Utility
 * ======================
 *
 * Automatically falls back to alternative models when rate limited.
 * This prevents API failures and avoids charges by using free tier limits
 * across multiple models.
 *
 * Rate Limit Strategy:
 * 1. Try primary model first
 * 2. If rate limited (429), try fallback models in order
 * 3. Add exponential backoff delays between retries
 * 4. For embeddings, add small delays between batches to stay under RPM
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// ============================================
// Model Configuration
// ============================================

/**
 * Available text generation models in order of preference
 * - Primary: gemini-2.5-flash (best quality, 5 RPM free)
 * - Fallback 1: gemini-2.5-flash-lite (faster, 10 RPM free)
 * - Fallback 2: gemini-3-flash (newest, 5 RPM free)
 */
export const TEXT_MODELS = [
  "gemini-2.5-flash",      // Primary - best quality
  "gemini-2.5-flash-lite", // Fallback 1 - faster, higher RPM
  "gemini-3-flash",        // Fallback 2 - newest model
] as const;

/**
 * Available embedding models
 * Note: Google only has one main embedding model, so we can't really
 * fallback to another. Instead, we'll implement rate limiting/throttling.
 */
export const EMBEDDING_MODELS = [
  "gemini-embedding-001",  // Primary (same as gemini-embedding-1.0)
] as const;

export type TextModel = typeof TEXT_MODELS[number];
export type EmbeddingModel = typeof EMBEDDING_MODELS[number];

// ============================================
// Rate Limit Detection
// ============================================

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("too many requests") ||
      message.includes("resource exhausted")
    );
  }
  return false;
}

/**
 * Check if an error is a model not found error
 * (Model might not be available in all regions)
 */
export function isModelNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("not found") ||
      message.includes("model not found") ||
      message.includes("invalid model")
    );
  }
  return false;
}

// ============================================
// Retry Utilities
// ============================================

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms (default 1000)
 * @param maxDelay - Maximum delay in ms (default 30000)
 */
function getBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// ============================================
// Model Fallback Client
// ============================================

/**
 * Configuration for the model fallback client
 */
export interface ModelFallbackConfig {
  apiKey: string;
  maxRetries?: number;
  enableFallback?: boolean;
  logRetries?: boolean;
}

/**
 * Model fallback client that automatically retries with alternative models
 */
export class ModelFallbackClient {
  private genAI: GoogleGenerativeAI;
  private maxRetries: number;
  private enableFallback: boolean;
  private logRetries: boolean;

  constructor(config: ModelFallbackConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.maxRetries = config.maxRetries ?? 3;
    this.enableFallback = config.enableFallback ?? true;
    this.logRetries = config.logRetries ?? true;
  }

  /**
   * Generate content with automatic model fallback
   *
   * Tries the primary model first, then falls back to alternatives
   * if rate limited.
   *
   * @param prompt - The prompt to send
   * @param preferredModel - Preferred model to try first
   * @returns Generated text content
   */
  async generateContent(
    prompt: string,
    preferredModel: TextModel = "gemini-2.5-flash"
  ): Promise<{ text: string; modelUsed: TextModel }> {
    // Build list of models to try (preferred first, then fallbacks)
    const modelsToTry = this.enableFallback
      ? [preferredModel, ...TEXT_MODELS.filter((m) => m !== preferredModel)]
      : [preferredModel];

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });

        if (this.logRetries && modelName !== preferredModel) {
          console.log(`[ModelFallback] Trying fallback model: ${modelName}`);
        }

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = result.response.text();

        if (this.logRetries && modelName !== preferredModel) {
          console.log(`[ModelFallback] Successfully used fallback: ${modelName}`);
        }

        return { text, modelUsed: modelName };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If rate limited or model not found, try next model
        if (isRateLimitError(error) || isModelNotFoundError(error)) {
          if (this.logRetries) {
            console.warn(
              `[ModelFallback] ${modelName} failed: ${lastError.message}`
            );
          }

          // Add a small delay before trying next model
          await sleep(500);
          continue;
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    // All models failed
    throw new Error(
      `All models failed. Last error: ${lastError?.message || "Unknown error"}`
    );
  }

  /**
   * Generate content with retries on rate limit
   *
   * Unlike generateContent, this retries the SAME model with backoff.
   * Use this when you specifically need a certain model.
   *
   * @param prompt - The prompt to send
   * @param modelName - Specific model to use
   * @returns Generated text
   */
  async generateContentWithRetry(
    prompt: string,
    modelName: TextModel = "gemini-2.5-flash"
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        return result.response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (isRateLimitError(error) && attempt < this.maxRetries - 1) {
          const delay = getBackoffDelay(attempt);
          if (this.logRetries) {
            console.warn(
              `[ModelFallback] Rate limited, retrying in ${delay}ms (attempt ${
                attempt + 1
              }/${this.maxRetries})`
            );
          }
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Get a GenerativeModel instance for direct use
   */
  getModel(modelName: TextModel = "gemini-2.5-flash"): GenerativeModel {
    return this.genAI.getGenerativeModel({ model: modelName });
  }
}

// ============================================
// Embedding Rate Limiter
// ============================================

/**
 * Rate limiter for embedding generation
 *
 * Implements a token bucket algorithm to stay under RPM limits.
 * For gemini-embedding-1.0: 100 RPM = ~1.67 requests per second
 */
export class EmbeddingRateLimiter {
  private lastRequestTime: number = 0;
  private minDelayMs: number;

  /**
   * @param requestsPerMinute - Max requests per minute (default 80 to stay safe under 100)
   */
  constructor(requestsPerMinute: number = 80) {
    // Calculate minimum delay between requests
    // 60000ms / 80 RPM = 750ms between requests
    this.minDelayMs = Math.ceil(60000 / requestsPerMinute);
  }

  /**
   * Wait if needed before making the next request
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayMs) {
      const waitTime = this.minDelayMs - timeSinceLastRequest;
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reset the rate limiter (e.g., after a long pause)
   */
  reset(): void {
    this.lastRequestTime = 0;
  }
}

// ============================================
// Singleton Instance
// ============================================

let modelFallbackClient: ModelFallbackClient | null = null;
let embeddingRateLimiter: EmbeddingRateLimiter | null = null;

/**
 * Get the singleton ModelFallbackClient instance
 */
export function getModelFallbackClient(): ModelFallbackClient {
  if (!modelFallbackClient) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }
    modelFallbackClient = new ModelFallbackClient({
      apiKey,
      maxRetries: 3,
      enableFallback: true,
      logRetries: process.env.NODE_ENV !== "production",
    });
  }
  return modelFallbackClient;
}

/**
 * Get the singleton EmbeddingRateLimiter instance
 */
export function getEmbeddingRateLimiter(): EmbeddingRateLimiter {
  if (!embeddingRateLimiter) {
    // Use 80 RPM to stay safely under the 100 RPM limit
    embeddingRateLimiter = new EmbeddingRateLimiter(80);
  }
  return embeddingRateLimiter;
}
