/**
 * Supabase Auth Integration
 * Provides authentication client and helper functions for SteelAgent
 *
 * Features:
 * - Email/password authentication
 * - OAuth authentication (Google, Microsoft, GitHub)
 * - Session management
 * - User profile CRUD
 * - Workspace context
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
// cookies imported dynamically inside server functions to avoid client component errors

export type UserRole = 'user' | 'admin' | 'enterprise';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: UserRole;
  workspace_id: string | null;
  created_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown>;
  is_active: boolean;
}

// Client-side auth client (for use in Client Components)
export function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During static prerendering (e.g. /_not-found), env vars may be unavailable.
  // Return a placeholder client that will be replaced on hydration.
  if (!url || !key) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}

// Server-side auth client (for use in Server Components and API routes)
export async function createServerAuthClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // setAll is called from Server Components where cookies can't be set
            }
          });
        },
      },
    }
  );
}

// Service client for admin operations (backend only, uses service key)
export function createServiceAuthClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY not configured');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Auth helpers
export const auth = {
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, userData?: { full_name?: string; company?: string }) {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData?.full_name,
          company: userData?.company,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update last_login_at
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    return data;
  },

  /**
   * Sign in with OAuth provider (Google, Microsoft/Azure, GitHub)
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'azure') {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Get user profile with workspace data
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createAuthClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Get workspace for user
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const supabase = createAuthClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }

    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const supabase = createAuthClient();
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update workspace settings
   */
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>) {
    const supabase = createAuthClient();
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) throw error;
  },

  /**
   * Update password (for authenticated user)
   */
  async updatePassword(newPassword: string) {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const supabase = createAuthClient();
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    return !!data;
  },
};

// Server-side auth helpers (for use in Server Components and API routes)
export const serverAuth = {
  /**
   * Get current user from server-side session
   */
  async getCurrentUser() {
    const supabase = await createServerAuthClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  },

  /**
   * Get user profile with workspace (server-side)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createServerAuthClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Get workspace (server-side)
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const supabase = await createServerAuthClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }

    return data;
  },

  /**
   * Require authentication (throws if not authenticated)
   */
  async requireAuth() {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    return user;
  },

  /**
   * Require specific role (throws if user doesn't have role)
   */
  async requireRole(role: UserRole | UserRole[]) {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const profile = await this.getUserProfile(user.id);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(profile.role)) {
      throw new Error(`Forbidden: Requires ${allowedRoles.join(' or ')} role`);
    }

    return { user, profile };
  },
};

// API key authentication helpers
export const apiKeyAuth = {
  /**
   * Validate API key and return associated user
   */
  async validateApiKey(apiKey: string): Promise<UserProfile | null> {
    if (!apiKey.startsWith('sk_')) {
      return null;
    }

    const supabase = createServiceAuthClient();

    // Hash the API key (in production, use bcrypt or similar)
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data, error } = await supabase
      .from('user_api_keys')
      .select(`
        user_id,
        is_active,
        expires_at,
        users!inner (*)
      `)
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last_used_at
    await supabase
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return data.users as unknown as UserProfile;
  },

  /**
   * Generate new API key for user
   */
  async generateApiKey(userId: string, workspaceId: string, name: string, expiresInDays?: number): Promise<string> {
    const crypto = await import('crypto');

    // Generate random API key
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 12); // First 12 chars for display

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const supabase = createServiceAuthClient();
    const { error } = await supabase.from('user_api_keys').insert({
      user_id: userId,
      workspace_id: workspaceId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
      expires_at: expiresAt,
    });

    if (error) throw error;

    return apiKey; // Return once, never stored in plain text
  },

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, userId: string) {
    const supabase = createServiceAuthClient();
    const { error } = await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * List API keys for user
   */
  async listApiKeys(userId: string) {
    const supabase = createServiceAuthClient();
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};
