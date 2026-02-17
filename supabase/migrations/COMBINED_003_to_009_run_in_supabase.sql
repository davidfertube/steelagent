-- ================================================================
-- COMBINED MIGRATION: 003 + 004 + 006 + 007 + 009
-- Run this ONCE in Supabase SQL Editor
-- Idempotent: safe to re-run if something fails partway through
-- ================================================================

BEGIN;

-- ============================================================
-- MIGRATION 003: User Authentication Tables
-- NOTE: workspaces created FIRST to break circular FK dependency
-- ============================================================

-- Step 1: Create workspaces FIRST (owner_id FK added later)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID, -- FK to users added after users table exists
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Step 2: Create users with FK to workspaces
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'enterprise')),
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);

-- Step 3: Add FK from workspaces.owner_id -> users.id (safely)
DO $$ BEGIN
  ALTER TABLE workspaces
    ADD CONSTRAINT fk_workspace_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User API keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Usage logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id and workspace_id to existing tables
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Indexes for migration 003
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON user_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_workspace_id ON usage_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
-- NOTE: chunks table does not have user_id/workspace_id columns.
-- Authorization is derived from the parent document's workspace via document_id.
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_workspace_id ON feedback(workspace_id);

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for workspaces
DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
CREATE POLICY "Workspace members can view workspace" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Workspace owners can update workspace" ON workspaces;
CREATE POLICY "Workspace owners can update workspace" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- RLS policies for user_api_keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON user_api_keys;
CREATE POLICY "Users can view their own API keys" ON user_api_keys
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own API keys" ON user_api_keys;
CREATE POLICY "Users can create their own API keys" ON user_api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;
CREATE POLICY "Users can delete their own API keys" ON user_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for usage_logs
DROP POLICY IF EXISTS "Users can view their own usage logs" ON usage_logs;
CREATE POLICY "Users can view their own usage logs" ON usage_logs
  FOR SELECT USING (user_id = auth.uid());

-- RLS policies for workspace_invitations
DROP POLICY IF EXISTS "Invited users can view their invitations" ON workspace_invitations;
CREATE POLICY "Invited users can view their invitations" ON workspace_invitations
  FOR SELECT USING (invited_email = (SELECT email FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Workspace admins can manage invitations" ON workspace_invitations;
CREATE POLICY "Workspace admins can manage invitations" ON workspace_invitations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'enterprise')
    )
  );

-- Function: auto-create workspace on user signup
CREATE OR REPLACE FUNCTION create_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_slug TEXT;
BEGIN
  workspace_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  IF EXISTS (SELECT 1 FROM workspaces WHERE slug = workspace_slug) THEN
    workspace_slug := workspace_slug || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8);
  END IF;
  INSERT INTO workspaces (name, slug, owner_id, plan)
  VALUES (
    COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1)) || '''s Workspace',
    workspace_slug,
    NEW.id,
    'free'
  );
  UPDATE users
  SET workspace_id = (SELECT id FROM workspaces WHERE slug = workspace_slug)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_workspace();

-- Function: update workspace timestamp
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_updated ON workspaces;
CREATE TRIGGER workspace_updated
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_timestamp();

-- Grant permissions for 003
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON workspaces TO authenticated;
GRANT ALL ON user_api_keys TO authenticated;
GRANT ALL ON usage_logs TO authenticated;
GRANT ALL ON workspace_invitations TO authenticated;


-- ============================================================
-- MIGRATION 004: Subscription and Billing Tables
-- ============================================================

-- Stripe customers table (1:1 with workspaces)
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage quotas table (per billing cycle)
CREATE TABLE IF NOT EXISTS usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  queries_limit INTEGER NOT NULL,
  queries_used INTEGER DEFAULT 0,
  documents_limit INTEGER NOT NULL,
  documents_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER NOT NULL,
  api_calls_used INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  billing_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('card', 'bank_account', 'sepa_debit')),
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription events table (audit log)
CREATE TABLE IF NOT EXISTS subscription_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for 004
CREATE INDEX IF NOT EXISTS idx_stripe_customers_workspace_id ON stripe_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_subscription_id ON stripe_customers(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_status ON stripe_customers(status);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_workspace_id ON usage_quotas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_period_end ON usage_quotas(period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_workspace_id ON payment_methods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_workspace_id ON subscription_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);

-- Enable RLS for 004
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for stripe_customers
DROP POLICY IF EXISTS "Workspace members can view subscription" ON stripe_customers;
CREATE POLICY "Workspace members can view subscription" ON stripe_customers
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- RLS policies for usage_quotas
DROP POLICY IF EXISTS "Workspace members can view quotas" ON usage_quotas;
CREATE POLICY "Workspace members can view quotas" ON usage_quotas
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- RLS policies for invoices
DROP POLICY IF EXISTS "Workspace members can view invoices" ON invoices;
CREATE POLICY "Workspace members can view invoices" ON invoices
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- RLS policies for payment_methods
DROP POLICY IF EXISTS "Workspace members can view payment methods" ON payment_methods;
CREATE POLICY "Workspace members can view payment methods" ON payment_methods
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- RLS policies for subscription_events
DROP POLICY IF EXISTS "Workspace admins can view subscription events" ON subscription_events;
CREATE POLICY "Workspace admins can view subscription events" ON subscription_events
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'enterprise')
    )
  );

-- Function: initialize free tier quota on workspace creation
CREATE OR REPLACE FUNCTION initialize_free_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_quotas (
    workspace_id, plan,
    queries_limit, queries_used,
    documents_limit, documents_used,
    api_calls_limit, api_calls_used,
    period_start, period_end
  ) VALUES (
    NEW.id, 'free',
    10, 0,
    1, 0,
    100, 0,
    NOW(), NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created_quota ON workspaces;
CREATE TRIGGER on_workspace_created_quota
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION initialize_free_quota();

-- Function: update stripe_customers timestamp
CREATE OR REPLACE FUNCTION update_stripe_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stripe_customers_updated ON stripe_customers;
CREATE TRIGGER stripe_customers_updated
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_customers_timestamp();

-- Function: update usage_quotas timestamp
CREATE OR REPLACE FUNCTION update_usage_quotas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usage_quotas_updated ON usage_quotas;
CREATE TRIGGER usage_quotas_updated
  BEFORE UPDATE ON usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_quotas_timestamp();

-- Function: check_quota
CREATE OR REPLACE FUNCTION check_quota(
  p_workspace_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT * INTO v_quota FROM usage_quotas WHERE workspace_id = p_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No quota found for workspace %', p_workspace_id;
  END IF;
  CASE p_quota_type
    WHEN 'query' THEN v_limit := v_quota.queries_limit; v_used := v_quota.queries_used;
    WHEN 'document' THEN v_limit := v_quota.documents_limit; v_used := v_quota.documents_used;
    WHEN 'api_call' THEN v_limit := v_quota.api_calls_limit; v_used := v_quota.api_calls_used;
    ELSE RAISE EXCEPTION 'Invalid quota type: %', p_quota_type;
  END CASE;
  IF v_used + p_increment > v_limit THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: increment_quota
CREATE OR REPLACE FUNCTION increment_quota(
  p_workspace_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  CASE p_quota_type
    WHEN 'query' THEN
      UPDATE usage_quotas SET queries_used = queries_used + p_increment WHERE workspace_id = p_workspace_id;
    WHEN 'document' THEN
      UPDATE usage_quotas SET documents_used = documents_used + p_increment WHERE workspace_id = p_workspace_id;
    WHEN 'api_call' THEN
      UPDATE usage_quotas SET api_calls_used = api_calls_used + p_increment WHERE workspace_id = p_workspace_id;
    ELSE RAISE EXCEPTION 'Invalid quota type: %', p_quota_type;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: reset_quota_if_expired
CREATE OR REPLACE FUNCTION reset_quota_if_expired()
RETURNS VOID AS $$
BEGIN
  UPDATE usage_quotas SET
    queries_used = 0, documents_used = 0, api_calls_used = 0,
    period_start = NOW(), period_end = NOW() + INTERVAL '1 month'
  WHERE period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for 004
GRANT ALL ON stripe_customers TO authenticated;
GRANT ALL ON usage_quotas TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON payment_methods TO authenticated;
GRANT ALL ON subscription_events TO authenticated;


-- ============================================================
-- MIGRATION 006: Update RLS Policies for Multi-Tenant Security
-- ============================================================

-- DOCUMENTS: Drop old anonymous policies, add workspace-scoped
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable insert for all users" ON documents;
DROP POLICY IF EXISTS "Enable update for all users" ON documents;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON documents;

REVOKE ALL ON documents FROM anon;

DROP POLICY IF EXISTS "Workspace members can view documents" ON documents;
CREATE POLICY "Workspace members can view documents" ON documents
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Workspace members can upload documents" ON documents;
CREATE POLICY "Workspace members can upload documents" ON documents
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Document owners can update documents" ON documents;
CREATE POLICY "Document owners can update documents" ON documents
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Document owners can delete documents" ON documents;
CREATE POLICY "Document owners can delete documents" ON documents
  FOR DELETE USING (user_id = auth.uid());

-- CHUNKS: Drop old policies, add workspace-scoped (via documents join)
-- NOTE: chunks table does NOT have workspace_id/user_id columns.
-- Authorization is derived from the parent document's workspace.
DROP POLICY IF EXISTS "Enable read access for all users" ON chunks;
DROP POLICY IF EXISTS "Enable insert for all users" ON chunks;
DROP POLICY IF EXISTS "Enable update for all users" ON chunks;

REVOKE ALL ON chunks FROM anon;

DROP POLICY IF EXISTS "Workspace members can view chunks" ON chunks;
CREATE POLICY "Workspace members can view chunks" ON chunks
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members can insert chunks" ON chunks;
CREATE POLICY "Workspace members can insert chunks" ON chunks
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Chunk owners can update chunks" ON chunks;
CREATE POLICY "Chunk owners can update chunks" ON chunks
  FOR UPDATE USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Chunk owners can delete chunks" ON chunks;
CREATE POLICY "Chunk owners can delete chunks" ON chunks
  FOR DELETE USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- FEEDBACK: Drop old policies, add workspace-scoped
DROP POLICY IF EXISTS "Enable insert for all users" ON feedback;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON feedback;

REVOKE ALL ON feedback FROM anon;

DROP POLICY IF EXISTS "Workspace members can view feedback" ON feedback;
CREATE POLICY "Workspace members can view feedback" ON feedback
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Workspace members can submit feedback" ON feedback;
CREATE POLICY "Workspace members can submit feedback" ON feedback
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Feedback owners can update feedback" ON feedback;
CREATE POLICY "Feedback owners can update feedback" ON feedback
  FOR UPDATE USING (user_id = auth.uid());

-- LEADS: Duplicate prevention (only if leads table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    CREATE OR REPLACE FUNCTION prevent_duplicate_leads()
    RETURNS TRIGGER AS $fn$
    BEGIN
      IF EXISTS (SELECT 1 FROM leads WHERE email = NEW.email) THEN
        RAISE EXCEPTION 'Email already registered in waitlist'
          USING ERRCODE = '23505';
      END IF;
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS prevent_duplicate_leads_trigger ON leads;
    CREATE TRIGGER prevent_duplicate_leads_trigger
      BEFORE INSERT ON leads
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_leads();
  END IF;
END $$;

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins can view audit logs" ON audit_logs;
CREATE POLICY "Workspace admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'enterprise')
    )
  );

-- Audit helper function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_workspace_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, workspace_id, action, resource_type, resource_id, metadata, created_at)
  VALUES (p_user_id, p_workspace_id, p_action, p_resource_type, p_resource_id, p_metadata, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-audit triggers for documents
CREATE OR REPLACE FUNCTION audit_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id, NEW.workspace_id, 'document.upload', 'document',
    NEW.id::TEXT, jsonb_build_object('filename', NEW.filename, 'file_size', NEW.file_size)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_document_upload_trigger ON documents;
CREATE TRIGGER audit_document_upload_trigger
  AFTER INSERT ON documents FOR EACH ROW
  EXECUTE FUNCTION audit_document_upload();

CREATE OR REPLACE FUNCTION audit_document_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    OLD.user_id, OLD.workspace_id, 'document.delete', 'document',
    OLD.id::TEXT, jsonb_build_object('filename', OLD.filename)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_document_delete_trigger ON documents;
CREATE TRIGGER audit_document_delete_trigger
  BEFORE DELETE ON documents FOR EACH ROW
  EXECUTE FUNCTION audit_document_delete();

-- Auto-audit triggers for API keys
CREATE OR REPLACE FUNCTION audit_api_key_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id, NEW.workspace_id, 'api_key.create', 'api_key',
    NEW.id::TEXT, jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_api_key_create_trigger ON user_api_keys;
CREATE TRIGGER audit_api_key_create_trigger
  AFTER INSERT ON user_api_keys FOR EACH ROW
  EXECUTE FUNCTION audit_api_key_create();

CREATE OR REPLACE FUNCTION audit_api_key_revoke()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    PERFORM log_audit_event(
      NEW.user_id, NEW.workspace_id, 'api_key.revoke', 'api_key',
      NEW.id::TEXT, jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_api_key_revoke_trigger ON user_api_keys;
CREATE TRIGGER audit_api_key_revoke_trigger
  AFTER UPDATE ON user_api_keys FOR EACH ROW
  EXECUTE FUNCTION audit_api_key_revoke();

-- Force RLS + service role bypass for existing tables
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass for documents" ON documents;
CREATE POLICY "Service role bypass for documents" ON documents
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for chunks" ON chunks;
CREATE POLICY "Service role bypass for chunks" ON chunks
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for feedback" ON feedback;
CREATE POLICY "Service role bypass for feedback" ON feedback
  FOR ALL USING (current_user = 'service_role');

-- Admin role can view all workspace data
DROP POLICY IF EXISTS "Admins can view all workspace documents" ON documents;
CREATE POLICY "Admins can view all workspace documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND workspace_id = documents.workspace_id
        AND role IN ('admin', 'enterprise')
    )
  );

DROP POLICY IF EXISTS "Admins can view all workspace chunks" ON chunks;
CREATE POLICY "Admins can view all workspace chunks" ON chunks
  FOR SELECT USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN users u ON u.workspace_id = d.workspace_id
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'enterprise')
    )
  );

DROP POLICY IF EXISTS "Admins can view all workspace feedback" ON feedback;
CREATE POLICY "Admins can view all workspace feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND workspace_id = feedback.workspace_id
        AND role IN ('admin', 'enterprise')
    )
  );

-- Grant permissions for 006
GRANT ALL ON documents TO authenticated;
GRANT ALL ON chunks TO authenticated;
GRANT ALL ON feedback TO authenticated;
GRANT ALL ON audit_logs TO authenticated;


-- ============================================================
-- MIGRATION 007: OAuth User Sync Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, company, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'preferred_username'
    ),
    NEW.raw_user_meta_data->>'company',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- MIGRATION 009: Fix Quota RPC + Stripe/Anonymous Columns
-- ============================================================

-- Fix 1: Correct atomic quota check-and-increment RPC
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

  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 0::INTEGER, 0::INTEGER, (NOW() + INTERVAL '30 days')::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_period_expired THEN
    UPDATE usage_quotas SET
      queries_used = 0, documents_used = 0, api_calls_used = 0,
      period_start = NOW(), period_end = NOW() + INTERVAL '30 days'
    WHERE workspace_id = p_workspace_id;
    v_used := 0;
    v_period_end := NOW() + INTERVAL '30 days';
  END IF;

  IF v_used + p_increment > v_limit THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_used::INTEGER, v_limit::INTEGER, v_period_end::TIMESTAMPTZ;
    RETURN;
  END IF;

  CASE p_quota_type
    WHEN 'query' THEN
      UPDATE usage_quotas SET queries_used = queries_used + p_increment WHERE workspace_id = p_workspace_id;
    WHEN 'document' THEN
      UPDATE usage_quotas SET documents_used = documents_used + p_increment WHERE workspace_id = p_workspace_id;
    WHEN 'api_call' THEN
      UPDATE usage_quotas SET api_calls_used = api_calls_used + p_increment WHERE workspace_id = p_workspace_id;
  END CASE;

  RETURN QUERY SELECT TRUE::BOOLEAN, (v_used + p_increment)::INTEGER, v_limit::INTEGER, v_period_end::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Add stripe_customer_id to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer_id ON workspaces(stripe_customer_id);

-- Fix 3: Add anonymous_session_id to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS anonymous_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_anonymous_session ON documents(anonymous_session_id);

-- Service role bypass for billing tables
DROP POLICY IF EXISTS "Service role full access on usage_quotas" ON usage_quotas;
CREATE POLICY "Service role full access on usage_quotas" ON usage_quotas
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role full access on stripe_customers" ON stripe_customers;
CREATE POLICY "Service role full access on stripe_customers" ON stripe_customers
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role full access on subscription_events" ON subscription_events;
CREATE POLICY "Service role full access on subscription_events" ON subscription_events
  FOR ALL USING (current_user = 'service_role');

-- Service role bypass for users/workspaces (needed for webhook + anonymous ops)
DROP POLICY IF EXISTS "Service role bypass for users" ON users;
CREATE POLICY "Service role bypass for users" ON users
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for workspaces" ON workspaces;
CREATE POLICY "Service role bypass for workspaces" ON workspaces
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for user_api_keys" ON user_api_keys;
CREATE POLICY "Service role bypass for user_api_keys" ON user_api_keys
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for audit_logs" ON audit_logs;
CREATE POLICY "Service role bypass for audit_logs" ON audit_logs
  FOR ALL USING (current_user = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for usage_logs" ON usage_logs;
CREATE POLICY "Service role bypass for usage_logs" ON usage_logs
  FOR ALL USING (current_user = 'service_role');

COMMIT;
