'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface UsageBar {
  label: string;
  used: number;
  limit: number;
  remaining: number;
}

interface SubscriptionData {
  plan: string;
  stripeCustomerId: string | null;
  queries: UsageBar;
  documents: UsageBar;
  apiCalls: UsageBar;
  periodEnd: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

function UsageProgressBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isHigh = pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className={isHigh ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <motion.div
        className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        whileHover={{ scaleY: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.div
          className={`h-full rounded-full relative overflow-hidden ${
            isHigh ? 'bg-red-500' : 'bg-blue-500'
          }`}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="absolute inset-0 animate-shimmer">
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function BillingSection() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const searchParams = useSearchParams();
  const billingSuccess = searchParams.get('billing') === 'success';

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  async function handleManageSubscription() {
    setManagingSubscription(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    } finally {
      setManagingSubscription(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500">Unable to load billing information.</p>
      </div>
    );
  }

  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const periodEndDate = data.periodEnd
    ? new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {billingSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300 font-medium">
            Subscription activated successfully! Your plan has been upgraded.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[data.plan] || PLAN_COLORS.free}`}>
              {planLabel}
            </span>
            {periodEndDate && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Resets {periodEndDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {data.stripeCustomerId ? (
            <button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {managingSubscription ? 'Loading...' : 'Manage Subscription'}
            </button>
          ) : null}
          {data.plan === 'free' && (
            <motion.a
              href="/#contact"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(37, 99, 235, 0)",
                  "0 0 15px 3px rgba(37, 99, 235, 0.3)",
                  "0 0 0 0 rgba(37, 99, 235, 0)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.05 }}
            >
              Upgrade
            </motion.a>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <UsageProgressBar label="Queries" used={data.queries.used} limit={data.queries.limit} />
        <UsageProgressBar label="Documents" used={data.documents.used} limit={data.documents.limit} />
        <UsageProgressBar label="API Calls" used={data.apiCalls.used} limit={data.apiCalls.limit} />
      </div>
    </motion.div>
  );
}
