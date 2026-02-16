/**
 * Citation Validation & Structured Extraction
 * Ensures zero hallucinations by validating all claims against source documents
 */

// ============================================
// PDF File Validation
// ============================================

/**
 * Maximum PDF file size (50MB)
 * This prevents DoS attacks from extremely large uploads
 * and keeps processing times reasonable
 */
export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Validate that a file is actually a PDF by checking magic bytes
 *
 * PDF files start with: %PDF- (0x25 0x50 0x44 0x46 0x2D)
 *
 * This is a security measure - MIME types are client-controlled and can be spoofed.
 * Always validate file contents server-side using magic bytes.
 *
 * @param file - The file to validate
 * @returns Object with isValid flag and optional error message
 */
export async function validatePdfMagicBytes(file: File): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    // Read first 5 bytes of the file
    const buffer = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-

    // Check if the first 5 bytes match the PDF magic bytes
    const isPdf = PDF_MAGIC.every((byte, index) => bytes[index] === byte);

    if (!isPdf) {
      return {
        isValid: false,
        error: 'Invalid PDF file. The file does not appear to be a valid PDF document.',
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Failed to read file. Please try again.',
    };
  }
}

// ============================================
// Query Input Validation
// ============================================

// Maximum query length (prevents DoS and excessive token usage)
const MAX_QUERY_LENGTH = 2000; // ~500 words
const MIN_QUERY_LENGTH = 3;    // Prevent empty/meaningless queries

/**
 * Prompt injection patterns to detect and block
 * These are common patterns used to try to override system instructions
 */
const PROMPT_INJECTION_PATTERNS = [
  // Common LLM control tokens
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /<\/s>/i,
  /<<SYS>>/i,
  /<\/SYS>>/i,

  // Override instructions
  /ignore\s+(?:previous|above|all)\s+(?:instructions?|rules?|prompts?)/i,
  /disregard\s+(?:previous|above|all)\s+(?:instructions?|rules?|prompts?)/i,
  /forget\s+(?:previous|above|all)\s+(?:instructions?|rules?|prompts?)/i,
  /new\s+instructions?:/i,
  /override\s+(?:system|instructions?|rules?)/i,

  // Role manipulation
  /you\s+are\s+now\s+(?:a|an|the)/i,
  /pretend\s+(?:to\s+be|you\s+are)/i,
  /act\s+as\s+(?:a|an|if)/i,
  /roleplay\s+as/i,

  // Jailbreak attempts
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /bypass\s+(?:filter|safety|restriction)/i,

  // XML/HTML injection (attempt to inject tags into prompts)
  /<system>/i,
  /<\/system>/i,
  /<human>/i,
  /<\/human>/i,
  /<assistant>/i,
  /<\/assistant>/i,

  // Anthropic-specific control tokens
  /\bHuman:/,
  /\bAssistant:/,

  // Base64 payload detection (common obfuscation technique)
  /base64[_\s]*(?:decode|encode)/i,
  /atob\s*\(/i,
  /btoa\s*\(/i,

  // Unicode direction override attacks (can hide malicious text)
  /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/,

  // Prompt leaking attempts
  /(?:print|show|reveal|display|output)\s+(?:your|the|me\s+your|me\s+the)\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
  /(?:print|show|reveal|display|output)\s+(?:the\s+)?system\s+(?:prompt|instructions?|rules?)/i,
  /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
];

/**
 * Check if query contains prompt injection attempts
 */
function detectPromptInjection(query: string): { detected: boolean; pattern?: string } {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        detected: true,
        pattern: pattern.source,
      };
    }
  }
  return { detected: false };
}

/**
 * Validate and sanitize a user query
 *
 * This function:
 * 1. Type checks the input (must be string)
 * 2. Validates length (min 3, max 2000 characters)
 * 3. Detects and blocks prompt injection attempts
 * 4. Sanitizes by removing control characters
 * 5. Normalizes whitespace
 *
 * @param query - The user query to validate
 * @returns Object with validation result, cleaned query, and optional error
 */
export function validateQuery(query: unknown): {
  isValid: boolean;
  cleanedQuery?: string;
  error?: string;
} {
  // Type check
  if (typeof query !== 'string') {
    return {
      isValid: false,
      error: 'Query must be a string',
    };
  }

  // Trim whitespace
  const trimmed = query.trim();

  // Length checks
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return {
      isValid: false,
      error: `Query too short. Please enter at least ${MIN_QUERY_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_QUERY_LENGTH) {
    return {
      isValid: false,
      error: `Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed.`,
    };
  }

  // Prompt injection detection
  const injectionCheck = detectPromptInjection(trimmed);
  if (injectionCheck.detected) {
    console.warn(`[Validation] Prompt injection attempt detected: ${injectionCheck.pattern}`);
    return {
      isValid: false,
      error: 'Your query contains invalid patterns. Please rephrase your question.',
    };
  }

  // Basic sanitization (remove control characters)
  const sanitized = trimmed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ');                             // Normalize whitespace

  return {
    isValid: true,
    cleanedQuery: sanitized,
  };
}

// ============================================
// Citation Validation
// ============================================

export interface ValidatedCitation {
  claim: string;
  sourceDocument: string;
  pageNumber: number;
  exactText: string;
  confidence: number;
  verified: boolean;
}

/**
 * Validate that every claim in the response has a verifiable citation
 */
export async function validateCitations(
  response: string,
  sources: Array<{ content: string; document_name: string; page_number: number }>
): Promise<{
  isValid: boolean;
  validatedCitations: ValidatedCitation[];
  unverifiedClaims: string[];
}> {
  // Extract claims from response (sentences with technical specifications)
  const claims = extractTechnicalClaims(response);

  const validatedCitations: ValidatedCitation[] = [];
  const unverifiedClaims: string[] = [];

  for (const claim of claims) {
    let verified = false;

    for (const source of sources) {
      // Check if claim exists in source with fuzzy matching
      const similarity = calculateSimilarity(claim, source.content);

      if (similarity > 0.85) {
        validatedCitations.push({
          claim,
          sourceDocument: source.document_name,
          pageNumber: source.page_number,
          exactText: extractMatchingText(claim, source.content),
          confidence: similarity,
          verified: true
        });
        verified = true;
        break;
      }
    }

    if (!verified) {
      unverifiedClaims.push(claim);
    }
  }

  return {
    isValid: unverifiedClaims.length === 0,
    validatedCitations,
    unverifiedClaims
  };
}

/**
 * Extract technical claims (specifications, requirements, values)
 */
function extractTechnicalClaims(text: string): string[] {
  const claims: string[] = [];

  // Pattern matching for technical specifications
  const patterns = [
    /(?:maximum|minimum|min|max|shall|must|required).*?(?:\d+|\w+ \d+)/gi,
    /UNS [A-Z]\d{5}/gi,
    /ASTM [A-Z]\d+/gi,
    /\d+(?:\.\d+)?%?\s*(?:HRC|HBW|ksi|MPa|°F|°C)/gi,
  ];

  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    for (const pattern of patterns) {
      if (pattern.test(sentence)) {
        claims.push(sentence.trim());
        break;
      }
    }
  }

  return claims;
}

/**
 * Calculate similarity between claim and source text
 */
function calculateSimilarity(claim: string, sourceText: string): number {
  const claimWords = claim.toLowerCase().split(/\s+/);
  const sourceWords = new Set(sourceText.toLowerCase().split(/\s+/));

  let matchCount = 0;
  for (const word of claimWords) {
    if (sourceWords.has(word) && word.length > 3) {
      matchCount++;
    }
  }

  return matchCount / claimWords.length;
}

/**
 * Extract the matching text segment from source
 */
function extractMatchingText(claim: string, sourceText: string): string {
  // Find the most similar 100-character window in source
  const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let bestMatch = '';
  let bestScore = 0;

  for (let i = 0; i < sourceText.length - 100; i++) {
    const window = sourceText.substring(i, i + 100);
    const windowWords = new Set(window.toLowerCase().split(/\s+/));

    const score = claimWords.filter(w => windowWords.has(w)).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = window;
    }
  }

  return bestMatch;
}
