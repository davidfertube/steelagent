'use client';

/**
 * Usage Stats Component
 * Displays quota usage for queries and documents
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium uppercase">
          {usage.plan} Plan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queries Usage */}
        <div className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">Queries</h4>
            <span className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(queriesPercent)}`}>
              {usage.queries_used} / {usage.queries_limit}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor(queriesPercent)}`}
              style={{ width: `${Math.min(queriesPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Documents Usage */}
        <div className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">Documents</h4>
            <span className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(documentsPercent)}`}>
              {usage.documents_used} / {usage.documents_limit}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor(documentsPercent)}`}
              style={{ width: `${Math.min(documentsPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {usage.plan === 'free' && (queriesPercent >= 75 || documentsPercent >= 75) && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg text-center">
          <p className="text-white mb-2">Running low on quota?</p>
          <Link
            href="/#contact"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}
    </div>
  );
}
