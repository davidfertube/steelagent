/**
 * User Dashboard Page
 * Shows documents, usage stats, and quick actions
 */

import { redirect } from 'next/navigation';
import { serverAuth } from '@/lib/auth';
import { DocumentList } from '@/components/dashboard/document-list';
import { UsageStats } from '@/components/dashboard/usage-stats';
import { UserMenu } from '@/components/layout/user-menu';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard | SpecVault',
  description: 'Manage your documents and queries',
};

export default async function DashboardPage() {
  const user = await serverAuth.getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await serverAuth.getUserProfile(user.id);

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#16213e]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            SpecVault
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-white hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/account" className="text-gray-400 hover:text-white transition-colors">
              Account
            </Link>
            {profile.role === 'admin' || profile.role === 'enterprise' ? (
              <Link href="/workspace" className="text-gray-400 hover:text-white transition-colors">
                Workspace
              </Link>
            ) : null}
            <UserMenu profile={profile} />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {profile.full_name || profile.email}
          </h1>
          <p className="text-gray-400">
            Manage your documents and track your usage
          </p>
        </div>

        {/* Usage Stats */}
        <div className="mb-8">
          <UsageStats workspaceId={profile.workspace_id!} />
        </div>

        {/* Documents */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Your Documents</h2>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Upload Document
            </Link>
          </div>
          <DocumentList workspaceId={profile.workspace_id!} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/"
            className="group p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg hover:border-blue-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">Ask a Question</h3>
            <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
              Query your documents with AI-powered search
            </p>
          </Link>

          <Link
            href="/account"
            className="group p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg hover:border-blue-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">API Keys</h3>
            <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
              Generate API keys for programmatic access
            </p>
          </Link>

          <Link
            href="/account"
            className="group p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg hover:border-blue-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">Account Settings</h3>
            <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
              Update your profile and preferences
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
