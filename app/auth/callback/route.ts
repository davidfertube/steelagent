/**
 * Auth Callback Route
 * Handles OAuth callback and email verification redirects
 * Migrates anonymous documents to user's workspace on signup
 */

import { createServerAuthClient, serverAuth, createServiceAuthClient } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createServerAuthClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Send welcome email for new users + migrate anonymous documents
    if (data?.session?.user) {
      const userMeta = data.session.user.user_metadata;
      sendWelcomeEmail(
        data.session.user.email || '',
        userMeta?.full_name
      ).catch(() => {});

      const anonSession = request.cookies.get('anon_session')?.value;
      if (anonSession) {
        try {
          const profile = await serverAuth.getUserProfile(data.session.user.id);
          if (profile?.workspace_id) {
            const serviceClient = createServiceAuthClient();
            await serviceClient
              .from('documents')
              .update({ workspace_id: profile.workspace_id, anonymous_session_id: null })
              .eq('anonymous_session_id', anonSession);
          }
        } catch (err) {
          console.error('[Auth Callback] Failed to migrate anonymous documents:', err);
        }
      }
    }
  }

  // Redirect to dashboard or specified page — clear anon_session cookie
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  response.cookies.delete('anon_session');
  return response;
}
