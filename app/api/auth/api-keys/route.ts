/**
 * API Keys Management Endpoint
 * POST: Create new API key
 */

import { NextResponse } from 'next/server';
import { serverAuth, apiKeyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await serverAuth.requireAuth();

    // SECURITY: Derive workspace_id from authenticated user's profile.
    // Never trust client-supplied workspace_id — prevents IDOR attacks.
    const profile = await serverAuth.getUserProfile(user.id);
    if (!profile || !profile.workspace_id) {
      return NextResponse.json(
        { error: 'User profile or workspace not found' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Generate API key using the authenticated user's workspace
    const apiKey = await apiKeyAuth.generateApiKey(user.id, profile.workspace_id, name);

    return NextResponse.json({
      success: true,
      api_key: apiKey,
      message: 'API key created successfully. Save this key securely - you won\'t see it again.',
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
