/**
 * Input Validation Utilities
 * ===========================
 *
 * This module provides validation functions for user inputs.
 * All validation functions return a result object with:
 * - isValid: boolean indicating if validation passed
 * - cleanedValue: the sanitized value (if valid)
 * - error: human-readable error message (if invalid)
 *
 * This pattern allows callers to handle validation errors gracefully
 * and provide meaningful feedback to users.
 */

// ============================================
// Query Validation
// ============================================

/**
 * Maximum allowed query length (characters)
 * This prevents DoS via extremely large queries that consume tokens
 */
const MAX_QUERY_LENGTH = 2000;

/**
 * Minimum required query length (characters)
 * Prevents empty or meaningless queries
 */
const MIN_QUERY_LENGTH = 3;

/**
 * Result type for query validation
 */
export interface QueryValidationResult {
  isValid: boolean;
  cleanedQuery?: string;
  error?: string;
}

/**
 * Validate and sanitize a user query
 *
 * Checks:
 * - Type is string
 * - Length is within bounds
 * - Sanitizes control characters
 * - Normalizes whitespace
 *
 * @param query - The raw query input (unknown type for safety)
 * @returns Validation result with cleaned query or error
 *
 * @example
 * ```typescript
 * const result = validateQuery(userInput);
 * if (!result.isValid) {
 *   return { error: result.error };
 * }
 * const cleanQuery = result.cleanedQuery;
 * ```
 */
export function validateQuery(query: unknown): QueryValidationResult {
  // Type check - must be a string
  if (typeof query !== 'string') {
    return {
      isValid: false,
      error: 'Query must be a string',
    };
  }

  // Trim whitespace from both ends
  const trimmed = query.trim();

  // Check minimum length
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return {
      isValid: false,
      error: `Query too short. Please enter at least ${MIN_QUERY_LENGTH} characters.`,
    };
  }

  // Check maximum length
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return {
      isValid: false,
      error: `Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed. ` +
             `Your query has ${trimmed.length} characters.`,
    };
  }

  // Sanitize the query:
  // 1. Remove control characters (except newlines and tabs)
  // 2. Normalize multiple spaces to single space
  // 3. Keep newlines and tabs for formatting
  const sanitized = trimmed
    // Remove null bytes and other dangerous control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize multiple spaces to single space
    .replace(/ +/g, ' ')
    // Normalize multiple newlines to max 2
    .replace(/\n{3,}/g, '\n\n');

  return {
    isValid: true,
    cleanedQuery: sanitized,
  };
}

// ============================================
// PDF Validation
// ============================================

/**
 * Maximum file size for PDF uploads (50MB)
 * Large spec documents can be big, but we need a reasonable limit
 */
export const MAX_PDF_SIZE = 50 * 1024 * 1024;

/**
 * PDF magic bytes: %PDF- (hex: 25 50 44 46 2D)
 * All valid PDFs start with this sequence
 */
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2D];

/**
 * Result type for PDF validation
 */
export interface PdfValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate that a file is actually a PDF by checking magic bytes
 *
 * This is more secure than checking MIME type, which is client-controlled.
 * A malicious user could set any MIME type, but they can't fake magic bytes
 * without actually providing valid PDF content.
 *
 * @param file - The File object to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = await validatePdfMagicBytes(uploadedFile);
 * if (!result.isValid) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export async function validatePdfMagicBytes(file: File): Promise<PdfValidationResult> {
  try {
    // Check file size first (fast check)
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty. Please upload a valid PDF document.',
      };
    }

    if (file.size > MAX_PDF_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (MAX_PDF_SIZE / (1024 * 1024)).toFixed(0);
      return {
        isValid: false,
        error: `File too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`,
      };
    }

    // Read the first 5 bytes to check magic bytes
    const headerSlice = file.slice(0, 5);
    const buffer = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check if we have enough bytes
    if (bytes.length < PDF_MAGIC_BYTES.length) {
      return {
        isValid: false,
        error: 'File is too small to be a valid PDF.',
      };
    }

    // Compare magic bytes
    const isPdf = PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);

    if (!isPdf) {
      return {
        isValid: false,
        error: 'Invalid PDF file. The file does not appear to be a valid PDF document. ' +
               'Please ensure you are uploading an actual PDF file.',
      };
    }

    return { isValid: true };
  } catch (error) {
    // If we can't read the file, it's invalid
    console.error('[Validation] Error reading file for PDF validation:', error);
    return {
      isValid: false,
      error: 'Unable to read file. Please try uploading again.',
    };
  }
}

// ============================================
// Email Validation
// ============================================

/**
 * Result type for email validation
 */
export interface EmailValidationResult {
  isValid: boolean;
  cleanedEmail?: string;
  error?: string;
}

/**
 * Validate and normalize an email address
 *
 * This is a pragmatic email validation that:
 * - Checks for basic email format
 * - Trims and lowercases
 * - Is more permissive than RFC 5322 (which is very complex)
 *
 * @param email - The email to validate
 * @returns Validation result
 */
export function validateEmail(email: unknown): EmailValidationResult {
  if (typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a string',
    };
  }

  // Trim and lowercase
  const cleaned = email.trim().toLowerCase();

  if (cleaned.length === 0) {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  if (cleaned.length > 254) {
    return {
      isValid: false,
      error: 'Email address is too long',
    };
  }

  // Basic email regex - not RFC 5322 compliant but practical
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  // Check for consecutive dots (invalid in most email systems)
  if (cleaned.includes('..')) {
    return {
      isValid: false,
      error: 'Email address contains invalid characters',
    };
  }

  return {
    isValid: true,
    cleanedEmail: cleaned,
  };
}

// ============================================
// String Field Validation
// ============================================

/**
 * Options for string field validation
 */
export interface StringFieldOptions {
  fieldName: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
}

/**
 * Result type for string field validation
 */
export interface StringFieldResult {
  isValid: boolean;
  cleanedValue?: string;
  error?: string;
}

/**
 * Generic string field validator
 *
 * @param value - The value to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateStringField(
  value: unknown,
  options: StringFieldOptions
): StringFieldResult {
  const { fieldName, minLength = 0, maxLength = 1000, required = false, pattern, patternMessage } = options;

  // Type check
  if (typeof value !== 'string') {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true, cleanedValue: undefined };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Check if empty
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true, cleanedValue: undefined };
  }

  // Length checks
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxLength} characters`,
    };
  }

  // Pattern check
  if (pattern && !pattern.test(trimmed)) {
    return {
      isValid: false,
      error: patternMessage || `${fieldName} format is invalid`,
    };
  }

  return {
    isValid: true,
    cleanedValue: trimmed,
  };
}
