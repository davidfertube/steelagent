import { NextRequest, NextResponse } from 'next/server';
import { serverAuth, createServiceAuthClient } from '@/lib/auth';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 });
  }

  const user = await serverAuth.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await serverAuth.getUserProfile(user.id);
  if (!profile || !profile.workspace_id) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const { priceId } = await request.json();
  if (!priceId) {
    return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
  }

  try {
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Fetch existing Stripe customer ID to avoid creating duplicates
    const supabase = createServiceAuthClient();
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', profile.workspace_id)
      .single();

    const session = await createCheckoutSession({
      customerId: workspace?.stripe_customer_id || undefined,
      customerEmail: user.email!,
      priceId,
      workspaceId: profile.workspace_id,
      successUrl: `${origin}/account?billing=success`,
      cancelUrl: `${origin}/account?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
