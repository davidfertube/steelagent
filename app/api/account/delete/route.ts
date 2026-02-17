import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthClient, createServiceAuthClient } from '@/lib/auth';
import { getStripeClient, isStripeConfigured } from '@/lib/stripe';
import { sendAccountDeletionConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const supabase = await createServerAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify confirmation
    const body = await request.json();
    if (body.confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Please type DELETE to confirm' }, { status: 400 });
    }

    const serviceClient = createServiceAuthClient();

    // Get user profile + workspace
    const { data: profile } = await serviceClient
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const workspaceId = profile?.workspace_id;

    // Cancel Stripe subscription if active
    if (workspaceId && isStripeConfigured()) {
      const { data: stripeCustomer } = await serviceClient
        .from('stripe_customers')
        .select('stripe_subscription_id')
        .eq('workspace_id', workspaceId)
        .single();

      if (stripeCustomer?.stripe_subscription_id) {
        try {
          const stripe = getStripeClient();
          await stripe.subscriptions.cancel(stripeCustomer.stripe_subscription_id);
        } catch (err) {
          console.error('[Account Delete] Failed to cancel Stripe subscription:', err);
        }
      }
    }

    // Delete user's documents and embeddings
    if (workspaceId) {
      // Get document IDs for this workspace
      const { data: docs } = await serviceClient
        .from('documents')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (docs && docs.length > 0) {
        const docIds = docs.map(d => d.id);

        // Delete embeddings for those documents
        await serviceClient
          .from('document_chunks')
          .delete()
          .in('document_id', docIds);

        // Delete documents
        await serviceClient
          .from('documents')
          .delete()
          .eq('workspace_id', workspaceId);
      }

      // Delete API keys
      await serviceClient
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id);

      // Delete usage quotas
      await serviceClient
        .from('usage_quotas')
        .delete()
        .eq('workspace_id', workspaceId);

      // Delete stripe customer record
      await serviceClient
        .from('stripe_customers')
        .delete()
        .eq('workspace_id', workspaceId);

      // Delete subscription events
      await serviceClient
        .from('subscription_events')
        .delete()
        .eq('workspace_id', workspaceId);

      // Delete workspace
      await serviceClient
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);
    }

    // Delete user profile
    await serviceClient
      .from('users')
      .delete()
      .eq('id', user.id);

    // Delete auth user (requires admin API)
    await serviceClient.auth.admin.deleteUser(user.id);

    // Send deletion confirmation email
    sendAccountDeletionConfirmation(user.email || '').catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Account Delete] Error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
