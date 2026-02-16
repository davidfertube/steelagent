/**
 * Workspace Settings Page
 * Manage workspace details, plan, and team members
 */

import { redirect } from 'next/navigation';
import { serverAuth, createServerAuthClient } from '@/lib/auth';
import { UserMenu } from '@/components/layout/user-menu';
import Link from 'next/link';

export const metadata = {
  title: 'Workspace Settings | SteelAgent',
  description: 'Manage your workspace and team members',
};

export default async function WorkspacePage() {
  const user = await serverAuth.getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await serverAuth.getUserProfile(user.id);

  if (!profile) {
    redirect('/auth/login');
  }

  if (!profile.workspace_id) {
    redirect('/dashboard');
  }

  // Fetch workspace details
  const workspace = await serverAuth.getWorkspace(profile.workspace_id);

  // Fetch workspace members
  const supabase = await createServerAuthClient();
  const { data: members } = await supabase
    .from('users')
    .select('id, email, full_name, role, last_login_at, is_active')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: true });

  const planLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const planColors: Record<string, string> = {
    free: 'bg-gray-600',
    pro: 'bg-blue-600',
    enterprise: 'bg-purple-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#16213e]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            SteelAgent
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/account" className="text-gray-400 hover:text-white transition-colors">
              Account
            </Link>
            <Link href="/workspace" className="text-white hover:text-blue-400 transition-colors">
              Workspace
            </Link>
            <UserMenu profile={profile} />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Workspace Settings</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-8">
          {/* Workspace Info */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Workspace Details</h2>
            <div className="p-6 bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg">
              {workspace ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Workspace Name</p>
                      <p className="text-white text-lg font-semibold">{workspace.name}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-white text-sm font-medium rounded-full ${
                        planColors[workspace.plan] || 'bg-gray-600'
                      }`}
                    >
                      {planLabels[workspace.plan] || workspace.plan}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                    <div>
                      <p className="text-gray-400 text-sm">Slug</p>
                      <p className="text-gray-300">{workspace.slug}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Created</p>
                      <p className="text-gray-300">
                        {new Date(workspace.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Unable to load workspace details.</p>
              )}
            </div>
          </section>

          {/* Members */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Members {members ? `(${members.length})` : ''}
            </h2>
            <div className="bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
              {members && members.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">
                        Member
                      </th>
                      <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">
                        Role
                      </th>
                      <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-gray-800/50 last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {member.full_name || 'Unnamed User'}
                              {member.id === user.id && (
                                <span className="ml-2 text-xs text-blue-400">(you)</span>
                              )}
                            </p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300 capitalize">{member.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm ${
                              member.is_active ? 'text-green-400' : 'text-gray-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                member.is_active ? 'bg-green-400' : 'bg-gray-500'
                              }`}
                            />
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {member.last_login_at
                            ? new Date(member.last_login_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-400">No members found in this workspace.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
