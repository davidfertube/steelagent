import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Plan configuration
export const PLANS = {
  free: { name: 'Free', queries: 10, documents: 1, apiCalls: 100 },
  pro: { name: 'Pro', price: 49, queries: 500, documents: 50, apiCalls: 5000 },
  enterprise: { name: 'Enterprise', price: 199, queries: 5000, documents: 500, apiCalls: 50000 },
} as const;

export type PlanTier = keyof typeof PLANS;

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  priceId: string;
  workspaceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { workspace_id: params.workspaceId },
  });
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
