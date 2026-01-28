/**
 * Embedding Generation with Rate Limiting
 * ========================================
 *
 * Generates vector embeddings for text using Google's embedding model.
 * Implements rate limiting to stay under the 100 RPM free tier limit.
 *
 * Rate Limit Info (from Google AI Studio):
 * - gemini-embedding-1.0/001: 100 RPM, 30K TPM
 *
 * Strategy:
 * - Throttle requests to ~80 RPM (stay safe under limit)
 * - Add retry logic with exponential backoff on rate limit errors
 * - Process in batches for large documents
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEmbeddingRateLimiter, isRateLimitError } from "@/lib/model-fallback";

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// The embedding model to use
// "gemini-embedding-001" is the current stable model
const EMBEDDING_MODEL = "gemini-embedding-001";

// Maximum retries on rate limit
const MAX_RETRIES = 3;

// Base delay for exponential backoff (ms)
const BASE_RETRY_DELAY = 2000;

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate embedding for a single text with retry logic
 *
 * @param text - The text to embed
 * @returns Vector embedding (array of numbers)
 * @throws Error if all retries fail
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const rateLimiter = getEmbeddingRateLimiter();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Throttle to stay under rate limit
      await rateLimiter.throttle();

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If rate limited, wait and retry
      if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `[Embeddings] Rate limited, waiting ${delay}ms before retry ` +
          `(attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Failed to generate embedding after retries");
}

/**
 * Generate embeddings for multiple texts with rate limiting
 *
 * Uses throttling to stay under the 100 RPM limit.
 * For a 500-page document with ~1500 chunks, this will take:
 * - At 80 RPM: ~19 minutes (1500 / 80 = 18.75 min)
 *
 * @param texts - Array of texts to embed
 * @returns Array of vector embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const rateLimiter = getEmbeddingRateLimiter();

  const embeddings: number[][] = [];
  const total = texts.length;

  console.log(`[Embeddings] Starting batch embedding of ${total} chunks...`);

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    let lastError: Error | null = null;
    let success = false;

    // Retry loop for each text
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Throttle to stay under rate limit
        await rateLimiter.throttle();

        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
        success = true;

        // Progress logging every 50 chunks
        if ((i + 1) % 50 === 0 || i === total - 1) {
          console.log(
            `[Embeddings] Progress: ${i + 1}/${total} chunks ` +
            `(${Math.round(((i + 1) / total) * 100)}%)`
          );
        }

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If rate limited, wait and retry
        if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
          console.warn(
            `[Embeddings] Rate limited at chunk ${i + 1}, ` +
            `waiting ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }

        // Non-rate-limit error or out of retries
        console.error(`[Embeddings] Failed at chunk ${i + 1}:`, lastError.message);
        throw error;
      }
    }

    if (!success) {
      throw lastError || new Error(`Failed to embed chunk ${i + 1}`);
    }
  }

  console.log(`[Embeddings] Completed batch embedding of ${total} chunks`);
  return embeddings;
}

/**
 * Generate embeddings in parallel batches (faster but more aggressive)
 *
 * Use this for smaller documents where you want faster processing
 * and can tolerate some rate limit retries.
 *
 * @param texts - Array of texts to embed
 * @param batchSize - Number of concurrent requests (default: 5)
 * @returns Array of vector embeddings
 */
export async function generateEmbeddingsParallel(
  texts: string[],
  batchSize: number = 5
): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const embeddings: number[][] = new Array(texts.length);

  console.log(
    `[Embeddings] Starting parallel batch embedding of ${texts.length} chunks ` +
    `(batch size: ${batchSize})`
  );

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(async (text, batchIndex) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const result = await model.embedContent(text);
          return { index: i + batchIndex, embedding: result.embedding.values };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
            const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
            console.warn(
              `[Embeddings] Rate limited, waiting ${delay}ms ` +
              `(batch ${Math.floor(i / batchSize) + 1})`
            );
            await sleep(delay);
            continue;
          }

          throw error;
        }
      }

      throw lastError;
    });

    // Wait for all in this batch
    const batchResults = await Promise.all(batchPromises);
    for (const { index, embedding } of batchResults) {
      embeddings[index] = embedding;
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < texts.length) {
      await sleep(200);
    }

    // Progress logging
    const progress = Math.min(i + batchSize, texts.length);
    console.log(
      `[Embeddings] Progress: ${progress}/${texts.length} chunks ` +
      `(${Math.round((progress / texts.length) * 100)}%)`
    );
  }

  console.log(`[Embeddings] Completed parallel embedding of ${texts.length} chunks`);
  return embeddings;
}
