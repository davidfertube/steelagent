/**
 * LangFuse Observability Client
 *
 * Opt-in tracing for the RAG pipeline. Set LANGFUSE_SECRET_KEY to enable.
 * When disabled (no env var), all functions return null — zero runtime cost.
 *
 * Other modules import TraceSpan and helpers instead of the Langfuse SDK
 * directly, keeping the dependency isolated to this file.
 */

import { Langfuse } from "langfuse";

// ============================================================================
// Lightweight type so pipeline modules don't import the Langfuse SDK
// ============================================================================

/** Minimal interface that covers span() / end() / generation(). */
export interface TraceSpan {
  span(args: { name: string; input?: unknown }): TraceSpan;
  end(args?: { output?: unknown }): void;
}

// ============================================================================
// Singleton client
// ============================================================================

let langfuseClient: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY) return null;
  if (!langfuseClient) {
    langfuseClient = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    });
  }
  return langfuseClient;
}

/**
 * Flush pending traces. Call at the end of each request.
 */
export async function flushLangfuse(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.flushAsync();
  }
}

// ============================================================================
// Ergonomic helpers — tracing never crashes the pipeline
// ============================================================================

/**
 * Create a child span. Returns null when parent is null (Langfuse disabled).
 * Wrapped in try/catch so tracing failures never affect the pipeline.
 */
export function createSpan(
  parent: TraceSpan | null | undefined,
  name: string,
  input?: unknown,
): TraceSpan | null {
  if (!parent) return null;
  try {
    return parent.span({ name, input: input ?? undefined });
  } catch {
    return null;
  }
}

/**
 * End a span safely. No-op when span is null.
 */
export function endSpan(
  span: TraceSpan | null | undefined,
  output?: unknown,
): void {
  if (!span) return;
  try {
    span.end({ output: output ?? undefined });
  } catch { /* tracing should never block the pipeline */ }
}
