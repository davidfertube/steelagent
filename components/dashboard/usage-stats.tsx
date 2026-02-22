'use client';

/**
 * Usage Stats Component
 * Displays quota usage for queries and documents
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createAuthClient } from '@/lib/auth';

interface UsageData {
  plan: string;
  queries_used: number;
  queries_limit: number;
  documents_used: number;
  documents_limit: number;
  period_end: string;
}

export function UsageStats({ workspaceId }: { workspaceId: string }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const supabase = createAuthClient();
        const { data, error } = await supabase
          .from('usage_quotas')
          .select('*')
          .eq('workspace_id', workspaceId)
          .single();

        if (error) throw error;
        setUsage(data);
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg animate-pulse"
          >
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-10 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg text-center text-gray-400">
        Unable to load usage data
      </div>
    );
  }

  const queriesPercent = (usage.queries_used / usage.queries_limit) * 100;
  const documentsPercent = (usage.documents_used / usage.documents_limit) * 100;

  const getColorClass = (percent: number) => {
    if (percent >= 90) return 'text-red-500 bg-red-500/20';
    if (percent >= 75) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-green-500 bg-green-500/20';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const periodEnd = new Date(usage.period_end).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Plan Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Usage This Month</h3>
          <p className="text-sm text-gray-400">Resets on {periodEnd}</p>
        </div>
        <motion.span
          className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium uppercase"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {usage.plan} Plan
        </motion.span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queries Usage */}
        <motion.div
          className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg"
          whileHover={{
            y: -4,
            borderColor: "rgba(59, 130, 246, 0.5)",
            boxShadow: "0 0 20px 2px rgba(59, 130, 246, 0.1)"
          }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">Queries</h4>
            <motion.span
              className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(queriesPercent)}`}
              whileHover={{ scale: 1.1 }}
            >
              {usage.queries_used} / {usage.queries_limit}
            </motion.span>
          </div>
          <motion.div
            className="w-full bg-gray-700 rounded-full h-3 overflow-hidden cursor-pointer"
            whileHover={{ scaleY: 1.6 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div
              className={`h-full rounded-full relative overflow-hidden ${getProgressColor(queriesPercent)}`}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(queriesPercent, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute inset-0 animate-shimmer">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <div className="absolute inset-0 animate-bar-pulse origin-left" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Documents Usage */}
        <motion.div
          className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg"
          whileHover={{
            y: -4,
            borderColor: "rgba(59, 130, 246, 0.5)",
            boxShadow: "0 0 20px 2px rgba(59, 130, 246, 0.1)"
          }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">Documents</h4>
            <motion.span
              className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(documentsPercent)}`}
              whileHover={{ scale: 1.1 }}
            >
              {usage.documents_used} / {usage.documents_limit}
            </motion.span>
          </div>
          <motion.div
            className="w-full bg-gray-700 rounded-full h-3 overflow-hidden cursor-pointer"
            whileHover={{ scaleY: 1.6 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div
              className={`h-full rounded-full relative overflow-hidden ${getProgressColor(documentsPercent)}`}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(documentsPercent, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute inset-0 animate-shimmer">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <div className="absolute inset-0 animate-bar-pulse origin-left" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Upgrade CTA */}
      {usage.plan === 'free' && (queriesPercent >= 75 || documentsPercent >= 75) && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg text-center">
          <p className="text-white mb-2">Running low on quota?</p>
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(37, 99, 235, 0)",
                "0 0 15px 3px rgba(37, 99, 235, 0.3)",
                "0 0 0 0 rgba(37, 99, 235, 0)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block rounded-lg"
          >
            <Link
              href="/#contact"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Upgrade to Pro
            </Link>
          </motion.div>
        </div>
      )}
    </div>
  );
}
