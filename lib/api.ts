/**
 * API client for Steel Agent backend
 * Handles communication with the Next.js API routes
 */

// API_URL: Empty string uses relative paths (/api/chat) to same Next.js server
// NOT a separate backend. API routes run on same server as frontend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Source citation type
export interface Source {
  ref: string;           // e.g., "[1]"
  document: string;      // e.g., "ASTM_A106.pdf"
  page: string;          // e.g., "5"
  content_preview: string; // First 200 chars of the chunk
  document_url?: string; // Public URL to open PDF at specific page
  storage_path?: string; // Supabase storage path for PDF proxy
  /** Starting character position within the page for citation highlighting */
  char_offset_start?: number;
  /** Ending character position within the page for citation highlighting */
  char_offset_end?: number;
}

// Response types
export interface ConfidenceScore {
  overall: number;
  retrieval: number;
  grounding: number;
  coherence: number;
}

export interface AnonymousQueryInfo {
  used: number;
  remaining: number;
  limit: number;
}

export interface ChatResponse {
  response: string;
  sources: Source[];
  confidence?: ConfidenceScore;
  disclaimer?: string;
  anonymousQueryInfo?: AnonymousQueryInfo;
  signupPrompt?: string;
}

export interface GenericLLMResponse {
  response: string;
  sources: [];
  isGenericLLM: true;
}

export interface ComparisonResult {
  steelAgent: ChatResponse;
  genericLLM: GenericLLMResponse;
}

export interface HealthResponse {
  status: string;
  version?: string;
}

export interface ApiError {
  detail: string;
}

// Custom error class for API errors
export class ApiRequestError extends Error {
  public code?: string;
  public signupUrl?: string;
  public upgradeUrl?: string;

  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Query the knowledge base with a user question
 * Uses SSE streaming to prevent Vercel Hobby timeout (10s)
 * @param query - The user's question
 * @returns The AI-generated response with source citations
 */
export async function queryKnowledgeBase(query: string, documentId?: number): Promise<ChatResponse> {
  try {
    const controller = new AbortController();
    // 2 minute timeout (120s) - exceeds server RAG pipeline timeout (75s)
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, stream: true, ...(documentId && { documentId }) }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'Failed to query knowledge base';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.detail || errorMessage;

        // Enrich error with quota/auth metadata
        const err = new ApiRequestError(errorMessage, response.status);
        err.code = errorData.code;
        err.signupUrl = errorData.signupUrl;
        err.upgradeUrl = errorData.upgradeUrl;
        throw err;
      } catch (e) {
        if (e instanceof ApiRequestError) throw e;
        errorMessage = response.statusText || errorMessage;
      }
      throw new ApiRequestError(errorMessage, response.status);
    }

    // Handle SSE streaming response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      // Read the stream and extract the final data
      const reader = response.body?.getReader();
      if (!reader) {
        throw new ApiRequestError('No response body', 500);
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;

        // Look for data: line which contains the final response
        const dataMatch = result.match(/data: (.+)\n/);
        if (dataMatch) {
          const jsonStr = dataMatch[1];
          const parsed = JSON.parse(jsonStr);

          // Check if it's an error response
          if (parsed.error) {
            throw new ApiRequestError(parsed.error, 500);
          }

          return parsed as ChatResponse;
        }
      }

      throw new ApiRequestError('No data received from stream', 500);
    }

    // Fallback: regular JSON response (non-streaming)
    return response.json();
  } catch (error) {
    // DEMO MODE DISABLED: Previously fell back to hardcoded responses, causing
    // different queries to return identical results. Now we surface real errors.
    console.error('[API] Query failed:', error);

    // Re-throw the error so the UI can show a proper error message
    throw new ApiRequestError(
      'Failed to query knowledge base. Please try again.',
      error instanceof ApiRequestError ? error.statusCode : 500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Query a generic LLM (without RAG) for comparison purposes
 * @param query - The user's question
 * @returns The generic LLM response (no sources)
 */
export async function queryGenericLLM(query: string): Promise<GenericLLMResponse> {
  try {
    const controller = new AbortController();
    // 2 minute timeout (120s) - allows time for LLM response generation
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_URL}/api/chat/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to query generic LLM');
    }

    return response.json();
  } catch (error) {
    // DEMO MODE DISABLED: Throw real errors instead of fake responses
    console.error('[API] Generic LLM query failed:', error);
    throw new Error('Failed to query generic LLM');
  }
}

/**
 * Query both Steel Agent and generic LLM in parallel for comparison
 * @param query - The user's question
 * @returns Both responses for side-by-side comparison
 */
export async function queryWithComparison(query: string, documentId?: number): Promise<ComparisonResult> {
  const [steelAgent, genericLLM] = await Promise.all([
    queryKnowledgeBase(query, documentId),
    queryGenericLLM(query),
  ]);

  return { steelAgent, genericLLM };
}

/**
 * Check if the backend is healthy and reachable
 * @returns true if healthy, false otherwise
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      // Short timeout for health checks
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the health status with details
 * @returns Health response or null if unhealthy
 */
export async function getHealthStatus(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}
