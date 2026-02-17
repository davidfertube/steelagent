import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, isStripeConfigured, PLANS, type PlanTier } from '@/lib/stripe';
import { createServiceAuthClient } from '@/lib/auth';
import { sendSubscriptionConfirmation, sendPaymentFailedEmail } from '@/lib/email';
import type Stripe from 'stripe';

async function getWorkspaceOwnerEmail(supabase: ReturnType<typeof createServiceAuthClient>, workspaceId: string): Promise<string | null> {
  const { data } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();
  if (!data?.owner_id) return null;
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', data.owner_id)
    .single();
  return user?.email || null;
}

function getPlanFromPriceId(priceId: string): PlanTier {
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return 'pro'; // Default to pro for unknown price IDs from checkout
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET || !isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use service client — webhooks have no user session, RLS would block all operations
  const supabase = createServiceAuthClient();

  try {
    // Log every webhook event for audit
    let eventWorkspaceId: string | null = null;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const customerId = session.customer as string;

        if (workspaceId && customerId) {
          // Validate workspace exists
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .single();

          if (!workspace) {
            console.error('[Stripe Webhook] Invalid workspace_id:', workspaceId);
            break;
          }

          eventWorkspaceId = workspaceId;
          const subscriptionId = session.subscription as string;

          // Fetch subscription to resolve plan from price ID
          let resolvedPlan: PlanTier = 'pro';
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = sub.items.data[0]?.price.id;
              if (priceId) resolvedPlan = getPlanFromPriceId(priceId);
            } catch {
              // Fallback to pro if subscription lookup fails
            }
          }

          // Update workspace with Stripe customer ID and plan
          await supabase.from('workspaces').update({
            stripe_customer_id: customerId,
            plan: resolvedPlan,
          }).eq('id', workspaceId);

          // Upsert stripe_customers table
          await supabase.from('stripe_customers').upsert({
            workspace_id: workspaceId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: resolvedPlan,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'workspace_id' });

          // Update usage_quotas limits to match new plan
          const planLimits = PLANS[resolvedPlan];
          await supabase.from('usage_quotas').update({
            plan: resolvedPlan,
            queries_limit: planLimits.queries,
            documents_limit: planLimits.documents,
            api_calls_limit: planLimits.apiCalls,
          }).eq('workspace_id', workspaceId);

          console.log(`[Stripe Webhook] Checkout completed: workspace=${workspaceId}, plan=${resolvedPlan}`);

          // Send subscription confirmation email
          const ownerEmail = await getWorkspaceOwnerEmail(supabase, workspaceId);
          if (ownerEmail) {
            sendSubscriptionConfirmation(ownerEmail, resolvedPlan).catch(() => {});
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : 'pro';

        // Update workspace plan
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (workspace) {
          eventWorkspaceId = workspace.id;

          await supabase.from('workspaces').update({ plan }).eq('id', workspace.id);

          // Update stripe_customers
          // Period dates are on the subscription item in newer Stripe API versions
          const subItem = subscription.items.data[0];
          const periodStart = subItem?.current_period_start
            ? new Date(subItem.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const periodEnd = subItem?.current_period_end
            ? new Date(subItem.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from('stripe_customers').update({
            plan,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
          }).eq('workspace_id', workspace.id);

          // Update usage_quotas limits
          const planLimits = PLANS[plan];
          await supabase.from('usage_quotas').update({
            plan,
            queries_limit: planLimits.queries,
            documents_limit: planLimits.documents,
            api_calls_limit: planLimits.apiCalls,
          }).eq('workspace_id', workspace.id);

          console.log(`[Stripe Webhook] Subscription updated: workspace=${workspace.id}, plan=${plan}, status=${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (workspace) {
          eventWorkspaceId = workspace.id;

          // Downgrade to free
          await supabase.from('workspaces').update({ plan: 'free' }).eq('id', workspace.id);

          await supabase.from('stripe_customers').update({
            plan: 'free',
            status: 'canceled',
          }).eq('workspace_id', workspace.id);

          // Reset quota limits to free tier
          const freeLimits = PLANS.free;
          await supabase.from('usage_quotas').update({
            plan: 'free',
            queries_limit: freeLimits.queries,
            documents_limit: freeLimits.documents,
            api_calls_limit: freeLimits.apiCalls,
          }).eq('workspace_id', workspace.id);

          console.log(`[Stripe Webhook] Subscription deleted: workspace=${workspace.id}, downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.warn('[Stripe Webhook] Payment failed for customer:', customerId);

        // Mark subscription as past_due
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (workspace) {
          eventWorkspaceId = workspace.id;
          await supabase.from('stripe_customers').update({
            status: 'past_due',
          }).eq('workspace_id', workspace.id);

          // Send payment failed email
          const ownerEmail = await getWorkspaceOwnerEmail(supabase, workspace.id);
          if (ownerEmail) {
            sendPaymentFailedEmail(ownerEmail).catch(() => {});
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (workspace) {
          eventWorkspaceId = workspace.id;

          // Mirror invoice to database
          await supabase.from('invoices').upsert({
            workspace_id: workspace.id,
            stripe_invoice_id: invoice.id,
            stripe_customer_id: customerId,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            billing_reason: invoice.billing_reason,
            paid_at: new Date().toISOString(),
          }, { onConflict: 'stripe_invoice_id' });

          console.log(`[Stripe Webhook] Invoice paid: workspace=${workspace.id}, amount=${invoice.amount_paid}`);
        }
        break;
      }
    }

    // Log event for audit trail
    if (eventWorkspaceId) {
      await supabase.from('subscription_events').insert({
        workspace_id: eventWorkspaceId,
        event_type: event.type,
        stripe_event_id: event.id,
        data: event.data.object as unknown as Record<string, unknown>,
      }).then(({ error }) => {
        if (error) console.warn('[Stripe Webhook] Failed to log event:', error.message);
      });
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
