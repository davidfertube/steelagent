import { NextRequest, NextResponse } from "next/server";
import { searchSimilarChunks, getDocumentById } from "@/lib/vectorstore";
import { validateQuery } from "@/lib/validation";
import { withTimeout, TIMEOUTS } from "@/lib/timeout";
import { handleApiError, createValidationError, getErrorStatusCode } from "@/lib/errors";
import { getModelFallbackClient } from "@/lib/model-fallback";

/**
 * Chat API Route - RAG-powered Q&A
 *
 * This endpoint:
 * 1. Validates the user query
 * 2. Searches for relevant document chunks
 * 3. Builds context from retrieved documents
 * 4. Generates a response with citations using Gemini
 *
 * Rate Limit Handling:
 * - Uses ModelFallbackClient for automatic model fallback
 * - If primary model (gemini-2.5-flash) is rate limited, falls back to alternatives
 * - Prevents API failures and avoids overage charges
 *
 * Security features:
 * - Input validation and sanitization
 * - Timeout protection on LLM calls
 * - Safe error handling (no internal details leaked)
 */

export async function POST(request: NextRequest) {
  try {
    // ========================================
    // Step 1: Parse and Validate Input
    // ========================================
    const body = await request.json();
    const { query } = body;

    // Validate query using our validation utility
    const validation = validateQuery(query);
    if (!validation.isValid) {
      const error = createValidationError(validation.error || "Invalid query");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // Use the cleaned, sanitized query
    const cleanedQuery = validation.cleanedQuery!;

    // ========================================
    // Step 2: Search for Relevant Documents
    // ========================================
    let chunks: Awaited<ReturnType<typeof searchSimilarChunks>> = [];
    try {
      // Wrap vector search with timeout for reliability
      chunks = await withTimeout(
        searchSimilarChunks(cleanedQuery, 5, 0.5),
        TIMEOUTS.VECTOR_SEARCH,
        "Vector search"
      );
    } catch (searchError) {
      // Log but continue - we can still provide a response without documents
      console.warn("[Chat API] Vector search failed, continuing without context:", searchError);
      // Don't throw - we'll continue with empty chunks
    }

    // ========================================
    // Step 3: Build Document Context
    // ========================================
    const documentIds = [...new Set(chunks.map((c) => c.document_id))];
    const documents = await Promise.all(
      documentIds.map((id) => getDocumentById(id))
    );
    const docMap = new Map(
      documents.filter((d): d is NonNullable<typeof d> => d !== null).map((d) => [d.id, d])
    );

    // Build context string from retrieved chunks
    const context = chunks.length > 0
      ? chunks
          .map((chunk, index) => {
            const doc = docMap.get(chunk.document_id);
            return `[${index + 1}] From "${doc?.filename || "Unknown"}" (Page ${chunk.page_number}):\n${chunk.content}`;
          })
          .join("\n\n---\n\n")
      : "No documents have been uploaded yet.";

    // ========================================
    // Step 4: Generate LLM Response
    // ========================================
    // Use ModelFallbackClient for automatic fallback on rate limits
    const fallbackClient = getModelFallbackClient();

    const systemPrompt = `You are a senior materials engineer specializing in steel specifications, NACE/ASTM/API standards, and O&G compliance.

CRITICAL RULES:
1. ONLY answer based on the provided document context. Do NOT use external knowledge for specific values.
2. ALWAYS cite sources using [1], [2], etc. - every fact needs a citation.
3. For numerical values (yield strength, hardness, PREN), quote EXACTLY as written in the source.
4. If the context doesn't contain the answer, say: "This information is not in the uploaded documents."
5. Never hallucinate specifications or compliance requirements.

RESPONSE FORMAT:
**Answer:** [Direct answer with citations]

**Details:** [Supporting technical details from documents]

**Sources:** [List which documents were used]

EXAMPLE:
Q: "What is the yield strength of 316L stainless steel?"
A: **Answer:** The minimum yield strength of 316L is 170 MPa (25 ksi) [1].
**Details:** Per ASTM A240, 316L has lower carbon content (<0.03%) which reduces yield strength compared to 316 [1].
**Sources:** [1] ASTM_A240_Stainless_Steel.pdf, Page 3`;

    const userPrompt = chunks.length > 0
      ? `RETRIEVED DOCUMENT CONTEXT:
${context}

---
USER QUESTION: ${cleanedQuery}

Instructions: Answer ONLY using the context above. Cite every fact with [1], [2], etc. If the answer isn't in the context, say so.`
      : `USER QUESTION: ${cleanedQuery}

NOTE: No documents have been uploaded to the knowledge base yet.

Please provide general guidance based on industry standards (ASTM, NACE, API), but clearly state:
1. This is general knowledge, not from uploaded documents
2. User should upload relevant specification PDFs for verified, citable answers
3. Do not provide specific numerical values without document sources`;

    // Generate response with timeout protection and automatic model fallback
    // If gemini-2.5-flash is rate limited, automatically tries fallback models
    const fullPrompt = systemPrompt + "\n\n" + userPrompt;

    const { text: responseText, modelUsed } = await withTimeout(
      fallbackClient.generateContent(fullPrompt, "gemini-2.5-flash"),
      TIMEOUTS.LLM_GENERATION,
      "LLM response generation"
    );

    // Log which model was used (helpful for monitoring rate limits)
    if (modelUsed !== "gemini-2.5-flash") {
      console.log(`[Chat API] Used fallback model: ${modelUsed}`);
    }

    // ========================================
    // Step 5: Build Sources Array
    // ========================================
    const sources = chunks.map((chunk, index) => {
      const doc = docMap.get(chunk.document_id);
      return {
        ref: `[${index + 1}]`,
        document: doc?.filename || "Unknown",
        page: String(chunk.page_number),
        content_preview: chunk.content.slice(0, 150) + "...",
      };
    });

    // ========================================
    // Step 6: Return Response
    // ========================================
    return NextResponse.json({
      response: responseText,
      sources,
    });

  } catch (error) {
    // Use our safe error handler - never leaks internal details
    const { response, status } = handleApiError(error, "Chat API");
    return NextResponse.json(response, { status });
  }
}
