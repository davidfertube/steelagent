import { NextResponse } from 'next/server';
import { serverAuth, createServerAuthClient } from '@/lib/auth';
import { createPortalSession, isStripeConfigured } from '@/lib/stripe';

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 });
  }

  const user = await serverAuth.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await serverAuth.getUserProfile(user.id);
  if (!profile?.workspace_id) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
  }

  const supabase = await createServerAuthClient();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('stripe_customer_id')
    .eq('id', profile.workspace_id)
    .single();

  if (!workspace?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Please subscribe first.' }, { status: 404 });
  }

  try {
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createPortalSession(workspace.stripe_customer_id, `${origin}/account`);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal error:', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
