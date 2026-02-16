'use client';

/**
 * Pricing Page
 * Public page showing 3 subscription tiers: Free, Pro, Enterprise
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Get started with basic access to SteelAgent.',
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
    description: 'For professionals who need reliable spec analysis.',
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
    description: 'For teams with high-volume specification needs.',
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
        alert('Stripe price ID is not configured. Please contact support.');
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
        alert(data.error || 'Failed to create checkout session');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#16213e]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            SteelAgent
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/pricing" className="text-white hover:text-blue-400 transition-colors">
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your specification analysis needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 ${
                tier.highlight
                  ? 'bg-blue-600/10 border-2 border-blue-500'
                  : 'bg-[#16213e]/50 border border-gray-800'
              } backdrop-blur-sm flex flex-col`}
            >
              {/* Most Popular Badge */}
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
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
                <h2 className="text-xl font-bold text-white mb-2">{tier.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-gray-400 text-lg">{tier.period}</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-2">{tier.description}</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {currentPlan === tier.name.toLowerCase() ? (
                <button
                  disabled
                  className="w-full py-3 rounded-lg font-semibold bg-gray-600 text-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : tier.href ? (
                <Link
                  href={tier.href}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    tier.highlight
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {currentPlan ? 'Upgrade' : tier.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleSubscribe(tier.priceEnvKey!)}
                  disabled={loading === tier.priceEnvKey}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.highlight
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {loading === tier.priceEnvKey ? 'Redirecting...' : tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ / Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            All plans include end-to-end encryption, 99.9% uptime SLA, and SOC 2 compliant infrastructure.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:support@steelagent.com" className="text-blue-400 hover:underline">
              support@steelagent.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
