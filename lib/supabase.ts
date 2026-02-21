import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Alias for backwards compatibility
export const supabase = {
  get storage() { return getSupabase().storage; },
  get from() { return getSupabase().from.bind(getSupabase()); },
  get rpc() { return getSupabase().rpc.bind(getSupabase()); },
};

// Service client singleton for backend read operations (bypasses RLS)
let serviceInstance: SupabaseClient | null = null;
let serviceWarningLogged = false;

/**
 * Get a Supabase client using the service role key (bypasses RLS).
 * Returns null if SUPABASE_SERVICE_KEY is not configured.
 * Used by backend operations that need to read chunks/documents
 * regardless of RLS policies.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!serviceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      if (!serviceWarningLogged) {
        console.warn('[Supabase] SUPABASE_SERVICE_KEY not set — reads will use anon client (may be blocked by RLS)');
        serviceWarningLogged = true;
      }
      return null;
    }

    serviceInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('[Supabase] Service client initialized for RLS-bypass reads');
  }
  return serviceInstance;
}

/**
 * Get the best available Supabase client for read operations.
 * Prefers service client (bypasses RLS), falls back to anon client.
 */
export function getReadClient(): SupabaseClient {
  return getServiceSupabase() ?? getSupabase();
}

export interface Lead {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  phone?: string;
  created_at?: string;
}

export async function submitLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('leads')
      .insert([lead]);

    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Lead submission error:', err);
    return { success: false, error: 'Failed to submit lead' };
  }
}
