/**
 * Centralized Configuration Validation
 * =====================================
 *
 * This module validates all required environment variables at startup.
 * If any required variable is missing, it throws immediately with a clear error.
 *
 * This follows the "fail fast" principle - better to crash at startup with
 * a clear error than to fail cryptically when the variable is first used.
 *
 * Usage:
 *   import { CONFIG } from '@/lib/config';
 *   const apiKey = CONFIG.GOOGLE_API_KEY;
 */

/**
 * Helper function to validate and retrieve an environment variable
 *
 * @param name - The name of the environment variable
 * @param options - Configuration options
 * @returns The value of the environment variable
 * @throws Error if the variable is missing and required
 */
function requireEnv(
  name: string,
  options: {
    optional?: boolean;
    defaultValue?: string;
  } = {}
): string {
  const value = process.env[name];

  // If value exists and is not empty, return it
  if (value && value.trim() !== '') {
    return value;
  }

  // If a default value is provided, use it
  if (options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  // If optional, return empty string
  if (options.optional) {
    return '';
  }

  // Otherwise, throw a clear error message
  throw new Error(
    `\n` +
    `========================================\n` +
    `MISSING ENVIRONMENT VARIABLE: ${name}\n` +
    `========================================\n` +
    `\n` +
    `This variable is required for the application to run.\n` +
    `\n` +
    `To fix this:\n` +
    `1. Copy .env.example to .env.local (if you haven't already)\n` +
    `2. Add ${name}=your_value to .env.local\n` +
    `3. Restart the development server\n` +
    `\n`
  );
}

/**
 * Application Configuration
 *
 * All environment variables are validated at module load time.
 * This ensures the app fails fast if configuration is missing.
 */
export const CONFIG = {
  // ============================================
  // Google AI (Gemini) Configuration
  // ============================================

  /**
   * Google API Key for Gemini LLM and embeddings
   * Get this from: https://makersuite.google.com/app/apikey
   */
  GOOGLE_API_KEY: requireEnv('GOOGLE_API_KEY'),

  // ============================================
  // Supabase Configuration
  // ============================================

  /**
   * Supabase Project URL
   * Format: https://[project-id].supabase.co
   */
  SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),

  /**
   * Supabase Anonymous Key
   * This is the public anon key, safe to expose in client-side code
   */
  SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // ============================================
  // Application Settings
  // ============================================

  /**
   * API URL for the backend (defaults to localhost in development)
   */
  API_URL: requireEnv('NEXT_PUBLIC_API_URL', {
    defaultValue: 'http://localhost:8000'
  }),

  /**
   * Node environment
   */
  NODE_ENV: process.env.NODE_ENV || 'development',

  /**
   * Is the application running in production?
   */
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

} as const;

/**
 * Type for the configuration object
 * Use this for type-safe access to config values
 */
export type Config = typeof CONFIG;

/**
 * Validate that all required config is present
 * This function can be called at startup to ensure config is valid
 */
export function validateConfig(): void {
  // Simply accessing CONFIG will trigger validation
  // due to the requireEnv calls above
  const _ = CONFIG;
  console.log('[Config] All required environment variables are present');
}
