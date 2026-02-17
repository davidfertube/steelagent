-- Migration 006: Update RLS Policies for Multi-Tenant Security
-- This migration removes anonymous access and enforces workspace-scoped data isolation

-- ============================================================
-- DOCUMENTS TABLE - Workspace Isolation
-- ============================================================

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable insert for all users" ON documents;
DROP POLICY IF EXISTS "Enable update for all users" ON documents;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON documents;

-- Revoke anonymous access
REVOKE ALL ON documents FROM anon;

-- Create workspace-scoped policies
CREATE POLICY "Workspace members can view documents" ON documents
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Workspace members can upload documents" ON documents
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Document owners can update documents" ON documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Document owners can delete documents" ON documents
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- CHUNKS TABLE - Workspace Isolation (via documents join)
-- NOTE: chunks table does NOT have workspace_id/user_id columns.
-- Authorization is derived from the parent document's workspace.
-- ============================================================

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "Enable read access for all users" ON chunks;
DROP POLICY IF EXISTS "Enable insert for all users" ON chunks;
DROP POLICY IF EXISTS "Enable update for all users" ON chunks;

-- Revoke anonymous access
REVOKE ALL ON chunks FROM anon;

-- Create workspace-scoped policies (join through documents table)
CREATE POLICY "Workspace members can view chunks" ON chunks
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can insert chunks" ON chunks
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Chunk owners can update chunks" ON chunks
  FOR UPDATE USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Chunk owners can delete chunks" ON chunks
  FOR DELETE USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- FEEDBACK TABLE - Workspace Isolation
-- ============================================================

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "Enable insert for all users" ON feedback;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON feedback;

-- Revoke anonymous access
REVOKE ALL ON feedback FROM anon;

-- Create workspace-scoped policies
CREATE POLICY "Workspace members can view feedback" ON feedback
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Workspace members can submit feedback" ON feedback
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Feedback owners can update feedback" ON feedback
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- LEADS TABLE - Keep for Public Waitlist
-- ============================================================

-- Leads table remains accessible to anonymous users (public waitlist)
-- No changes needed, but add duplicate prevention

CREATE OR REPLACE FUNCTION prevent_duplicate_leads()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM leads WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email already registered in waitlist'
      USING ERRCODE = '23505'; -- unique_violation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_leads_trigger
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_leads();

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'document.upload', 'query.execute', 'user.invite', etc.
  resource_type TEXT, -- 'document', 'query', 'user', 'subscription', etc.
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

CREATE POLICY "Workspace admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'enterprise')
    )
  );

-- ============================================================
-- HELPER FUNCTIONS FOR AUDIT LOGGING
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_workspace_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    workspace_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTO-AUDIT TRIGGERS FOR CRITICAL ACTIONS
-- ============================================================

-- Audit document uploads
CREATE OR REPLACE FUNCTION audit_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id,
    NEW.workspace_id,
    'document.upload',
    'document',
    NEW.id::TEXT,
    jsonb_build_object('filename', NEW.filename, 'file_size', NEW.file_size)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_document_upload_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_document_upload();

-- Audit document deletions
CREATE OR REPLACE FUNCTION audit_document_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    OLD.user_id,
    OLD.workspace_id,
    'document.delete',
    'document',
    OLD.id::TEXT,
    jsonb_build_object('filename', OLD.filename)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_document_delete_trigger
  BEFORE DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_document_delete();

-- Audit API key creation
CREATE OR REPLACE FUNCTION audit_api_key_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id,
    NEW.workspace_id,
    'api_key.create',
    'api_key',
    NEW.id::TEXT,
    jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_api_key_create_trigger
  AFTER INSERT ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION audit_api_key_create();

-- Audit API key revocation
CREATE OR REPLACE FUNCTION audit_api_key_revoke()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    PERFORM log_audit_event(
      NEW.user_id,
      NEW.workspace_id,
      'api_key.revoke',
      'api_key',
      NEW.id::TEXT,
      jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_api_key_revoke_trigger
  AFTER UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION audit_api_key_revoke();

-- ============================================================
-- SERVICE ROLE BYPASS (for backend operations)
-- ============================================================

-- Service role can bypass RLS for administrative tasks
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

-- Service role policies (explicit bypass)
CREATE POLICY "Service role bypass for documents" ON documents
  FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role bypass for chunks" ON chunks
  FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role bypass for feedback" ON feedback
  FOR ALL USING (current_user = 'service_role');

-- ============================================================
-- ADMIN ROLE PRIVILEGES
-- ============================================================

-- Admin users can view all workspace data
CREATE POLICY "Admins can view all workspace documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND workspace_id = documents.workspace_id
        AND role IN ('admin', 'enterprise')
    )
  );

CREATE POLICY "Admins can view all workspace chunks" ON chunks
  FOR SELECT USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN users u ON u.workspace_id = d.workspace_id
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'enterprise')
    )
  );

CREATE POLICY "Admins can view all workspace feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND workspace_id = feedback.workspace_id
        AND role IN ('admin', 'enterprise')
    )
  );

-- ============================================================
-- GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON chunks TO authenticated;
GRANT ALL ON feedback TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

-- ============================================================
-- MIGRATION VALIDATION QUERIES
-- ============================================================

-- Run these queries after migration to verify setup:
-- 1. Check RLS is enabled:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- 2. Check policies exist:
--    SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
--
-- 3. Verify anon role has no access:
--    SET ROLE anon;
--    SELECT COUNT(*) FROM documents; -- Should be 0 or error
--    RESET ROLE;
--
-- 4. Test workspace isolation:
--    -- As user A, should only see workspace A documents
--    -- As user B, should only see workspace B documents
