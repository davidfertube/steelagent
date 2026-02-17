/**
 * Fix: audit_document_upload trigger references wrong column name
 * The trigger uses NEW.size_bytes but the actual column is file_size
 *
 * Run: node scripts/fix-audit-trigger.mjs
 */
import pg from 'pg';

const DATABASE_URL = `postgresql://postgres.pmufyzyztmmwpurexbou:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const sql = `
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
`;

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('Set SUPABASE_DB_PASSWORD env var (Supabase Dashboard → Settings → Database → Connection String → password)');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to Supabase database');

    await client.query(sql);
    console.log('✓ Fixed audit_document_upload trigger (size_bytes → file_size)');

    // Verify
    const result = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'audit_document_upload'
    `);
    if (result.rows[0]?.prosrc?.includes('file_size')) {
      console.log('✓ Verified: trigger now references file_size');
    } else {
      console.error('✗ Verification failed');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
