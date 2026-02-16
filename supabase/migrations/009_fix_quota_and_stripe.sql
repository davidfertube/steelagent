-- Migration 009: Fix Quota RPC + Add Stripe/Anonymous Support Columns
-- Fixes:
-- 1. check_and_increment_quota RPC referenced non-existent workspace_quotas table (should be usage_quotas)
-- 2. workspaces table missing stripe_customer_id column (webhook handler needs it)
-- 3. documents table needs anonymous_session_id for pre-signup trial

-- ============================================
-- Fix 1: Correct the atomic quota check RPC
-- ============================================
-- Migration 008 created this function referencing workspace_quotas,
-- but the actual table is usage_quotas (created in migration 004).

CREATE OR REPLACE FUNCTION check_and_increment_quota(
  p_workspace_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(
  allowed BOOLEAN,
  used_count INTEGER,
  limit_count INTEGER,
  period_end TIMESTAMPTZ
) AS $$
DECLARE
  v_used INTEGER;
  v_limit INTEGER;
  v_period_end TIMESTAMPTZ;
  v_period_expired BOOLEAN;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT
    uq.period_end,
    uq.period_end < NOW(),
    CASE p_quota_type
      WHEN 'query' THEN uq.queries_used
      WHEN 'document' THEN uq.documents_used
      WHEN 'api_call' THEN uq.api_calls_used
    END,
    CASE p_quota_type
      WHEN 'query' THEN uq.queries_limit
      WHEN 'document' THEN uq.documents_limit
      WHEN 'api_call' THEN uq.api_calls_limit
    END
  INTO v_period_end, v_period_expired, v_used, v_limit
  FROM usage_quotas uq
  WHERE uq.workspace_id = p_workspace_id
  FOR UPDATE;

  -- No quota record found — allow by default
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      TRUE::BOOLEAN,
      0::INTEGER,
      0::INTEGER,
      (NOW() + INTERVAL '30 days')::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Reset if period expired
  IF v_period_expired THEN
    UPDATE usage_quotas SET
      queries_used = 0,
      documents_used = 0,
      api_calls_used = 0,
      period_start = NOW(),
      period_end = NOW() + INTERVAL '30 days'
    WHERE workspace_id = p_workspace_id;

    v_used := 0;
    v_period_end := NOW() + INTERVAL '30 days';
  END IF;

  -- Check if within limits
  IF v_used + p_increment > v_limit THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      v_used::INTEGER,
      v_limit::INTEGER,
      v_period_end::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Increment atomically
  CASE p_quota_type
    WHEN 'query' THEN
      UPDATE usage_quotas SET queries_used = queries_used + p_increment
      WHERE workspace_id = p_workspace_id;
    WHEN 'document' THEN
      UPDATE usage_quotas SET documents_used = documents_used + p_increment
      WHERE workspace_id = p_workspace_id;
    WHEN 'api_call' THEN
      UPDATE usage_quotas SET api_calls_used = api_calls_used + p_increment
      WHERE workspace_id = p_workspace_id;
  END CASE;

  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    (v_used + p_increment)::INTEGER,
    v_limit::INTEGER,
    v_period_end::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fix 2: Add stripe_customer_id to workspaces
-- ============================================
-- Webhook handler and billing portal write/read this column.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer_id ON workspaces(stripe_customer_id);

-- ============================================
-- Fix 3: Add anonymous_session_id to documents
-- ============================================
-- Anonymous users (pre-signup trial) upload documents tracked by session cookie.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS anonymous_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_anonymous_session ON documents(anonymous_session_id);

-- Service role bypass policies for webhook/anonymous operations
CREATE POLICY IF NOT EXISTS "Service role full access on usage_quotas" ON usage_quotas
  FOR ALL USING (current_user = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role full access on stripe_customers" ON stripe_customers
  FOR ALL USING (current_user = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role full access on subscription_events" ON subscription_events
  FOR ALL USING (current_user = 'service_role');
