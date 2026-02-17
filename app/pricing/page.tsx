'use client';

/**
 * Pricing Page
 * Public page showing 3 subscription tiers: Free, Pro, Enterprise
 * Matches landing page design system (light/dark mode, green accents)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Search steel specs instantly. No credit card required.',
    features: [
      '10 queries per month',
      '1 document',
      '100 API calls',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For materials engineers who need fast, reliable spec lookups daily.',
    features: [
      '500 queries per month',
      '50 documents',
      '5,000 API calls',
      'Email support',
      'Priority processing',
      'Advanced RAG pipeline',
    ],
    cta: 'Subscribe',
    priceEnvKey: 'pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/mo',
    description: 'For O&G teams running high-volume compliance and procurement checks.',
    features: [
      '5,000 queries per month',
      '500 documents',
      '50,000 API calls',
      'Dedicated support',
      'Priority processing',
      'Advanced RAG pipeline',
      'Custom integrations',
      'SSO & team management',
    ],
    cta: 'Subscribe',
    priceEnvKey: 'enterprise',
    highlight: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan?.toLowerCase() || 'free');
        }
      } catch {
        // Not logged in or error — no current plan badge
      }
    }
    fetchPlan();
  }, []);

  async function handleSubscribe(tier: string) {
    setLoading(tier);
    try {
      const priceId =
        tier === 'pro'
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID;

      if (!priceId) {
        toast.error('Stripe price ID is not configured. Please contact support.');
        return;
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth/login?redirect=/pricing';
          return;
        }
        toast.error(data.error || 'Failed to create checkout session');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950 text-black dark:text-white">
      {/* Header — matches landing page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-black dark:text-white hover:opacity-80 transition-opacity">
              <Logo size={24} />
              SpecVault
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6">
              <Link href="/dashboard" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-black dark:text-white">
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-black/90 dark:hover:bg-white/90 transition-colors"
              >
                Sign In
              </Link>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-white mb-4">
              Plans for every team size
            </h1>
            <p className="text-black/60 dark:text-white/60 text-lg max-w-2xl mx-auto">
              From solo materials engineers to enterprise procurement teams. Cancel anytime.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 flex flex-col transition-shadow duration-300 hover:shadow-lg ${
                  tier.highlight
                    ? 'bg-green-50/50 dark:bg-green-950/20 border-2 border-green-500 dark:border-green-600 shadow-lg shadow-green-500/10'
                    : 'bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10'
                }`}
              >
                {/* Most Popular Badge */}
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {currentPlan === tier.name.toLowerCase() && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Tier Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-black dark:text-white mb-2">{tier.name}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-black dark:text-white">{tier.price}</span>
                    {tier.period && (
                      <span className="text-black/40 dark:text-white/40 text-lg">{tier.period}</span>
                    )}
                  </div>
                  <p className="text-black/60 dark:text-white/60 text-sm mt-2">{tier.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-black/70 dark:text-white/70 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {currentPlan === tier.name.toLowerCase() ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-lg font-semibold bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : tier.href ? (
                  <Link
                    href={tier.href}
                    className={`block w-full text-center py-3 rounded-lg font-semibold transition-all duration-200 ${
                      tier.highlight
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                        : 'bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90'
                    }`}
                  >
                    {currentPlan ? 'Upgrade' : tier.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier.priceEnvKey!)}
                    disabled={loading === tier.priceEnvKey}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      tier.highlight
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                        : 'bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90'
                    }`}
                  >
                    {loading === tier.priceEnvKey ? 'Redirecting...' : tier.cta}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Trust Section */}
          <div className="mt-16 text-center">
            <p className="text-black/40 dark:text-white/40 text-sm">
              All plans include encryption in transit, built on enterprise-grade infrastructure (Supabase, Vercel, Stripe).
            </p>
            <p className="text-black/40 dark:text-white/40 text-sm mt-2">
              Questions? Contact us at{' '}
              <a href="mailto:support@specvault.app" className="text-green-600 dark:text-green-400 hover:underline">
                support@specvault.app
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer — matches landing page */}
      <footer className="border-t border-black/5 dark:border-white/5 py-8 bg-white dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center gap-4 text-xs text-black/40 dark:text-white/40">
            <Link href="/" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Home</Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Terms</Link>
            <span>&middot;</span>
            <Link href="/privacy" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
