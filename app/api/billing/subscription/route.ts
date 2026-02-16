import { NextResponse } from 'next/server';
import { serverAuth } from '@/lib/auth';
import { getQuotaStatus } from '@/lib/quota';

export async function GET() {
  const user = await serverAuth.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await serverAuth.getUserProfile(user.id);
  if (!profile || !profile.workspace_id) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const workspace = await serverAuth.getWorkspace(profile.workspace_id);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const quotaStatus = await getQuotaStatus(profile.workspace_id);

  return NextResponse.json({
    plan: workspace.plan || 'free',
    stripeCustomerId: workspace.stripe_customer_id || null,
    queries: quotaStatus?.queries || { used: 0, limit: 10, remaining: 10 },
    documents: quotaStatus?.documents || { used: 0, limit: 1, remaining: 1 },
    apiCalls: quotaStatus?.apiCalls || { used: 0, limit: 100, remaining: 100 },
    periodEnd: quotaStatus?.periodEnd || null,
  });
}
