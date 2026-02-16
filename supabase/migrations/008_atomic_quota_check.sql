-- Atomic quota check-and-increment function
-- Prevents TOCTOU race conditions in quota enforcement
-- Uses SELECT ... FOR UPDATE row locking

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
  v_quota RECORD;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT q.used, q.quota_limit, q.period_end
  INTO v_quota
  FROM workspace_quotas q
  WHERE q.workspace_id = p_workspace_id
    AND q.quota_type = p_quota_type
    AND q.period_end > NOW()
  ORDER BY q.period_end DESC
  LIMIT 1
  FOR UPDATE;

  -- No quota record found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      TRUE::BOOLEAN AS allowed,
      0::INTEGER AS used_count,
      0::INTEGER AS limit_count,
      (NOW() + INTERVAL '30 days')::TIMESTAMPTZ AS period_end;
    RETURN;
  END IF;

  -- Check if within limits
  IF v_quota.used + p_increment > v_quota.quota_limit THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN AS allowed,
      v_quota.used::INTEGER AS used_count,
      v_quota.quota_limit::INTEGER AS limit_count,
      v_quota.period_end::TIMESTAMPTZ AS period_end;
    RETURN;
  END IF;

  -- Increment atomically
  UPDATE workspace_quotas
  SET used = used + p_increment
  WHERE workspace_id = p_workspace_id
    AND quota_type = p_quota_type
    AND period_end = v_quota.period_end;

  RETURN QUERY SELECT
    TRUE::BOOLEAN AS allowed,
    (v_quota.used + p_increment)::INTEGER AS used_count,
    v_quota.quota_limit::INTEGER AS limit_count,
    v_quota.period_end::TIMESTAMPTZ AS period_end;
END;
$$ LANGUAGE plpgsql;
