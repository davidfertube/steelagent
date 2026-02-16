/**
 * API Key Management Endpoint (Single Key)
 * DELETE: Revoke API key
 */

import { NextResponse } from 'next/server';
import { serverAuth, apiKeyAuth } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await serverAuth.requireAuth();

    const { id: keyId } = await params;

    if (!keyId) {
      return NextResponse.json(
        { error: 'Missing key ID' },
        { status: 400 }
      );
    }

    // Revoke API key
    await apiKeyAuth.revokeApiKey(keyId, user.id);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
