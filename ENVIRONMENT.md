# Environment Configuration

This document describes the environment setup for SteelAgent's deployment infrastructure.

## Architecture

```
main branch  ->  Vercel (auto-deploy)  ->  steelagent.app  ->  Supabase (prod)
```

All infrastructure runs on **free-tier services** except the Anthropic API (pay-as-you-go).

| Service | Tier | Cost | Purpose |
|---------|------|------|---------|
| **Vercel** | Hobby (free) | $0 | Next.js hosting, CDN, SSL, Edge functions |
| **Supabase** | Free tier | $0 | PostgreSQL + pgvector, Auth, Storage (1GB), 500MB DB |
| **Upstash Redis** | Free tier | $0 | Rate limiting (10K commands/day) |
| **Voyage AI** | Free tier | $0 | Embeddings (200M tokens/month) + reranking |
| **Anthropic** | Pay-as-you-go | ~$30-75/mo | Claude Opus 4.6 (primary LLM) |
| **Stripe** | Pay-per-txn | 2.9% + $0.30 | Only charged when revenue arrives |
| **Resend** | Free tier | $0 | 3,000 emails/month (planned) |
| **Google AI** | Free tier | $0 | Gemini Vision OCR for scanned PDFs |

---

## Required Environment Variables

### Development (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key    # Admin operations (quota, dedup)

# Anthropic API (Primary LLM)
ANTHROPIC_API_KEY=sk-ant-...                  # Claude Opus 4.6

# Voyage AI (Embeddings + Reranking)
VOYAGE_API_KEY=pa-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Fallback LLMs
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=csk_...
SAMBANOVA_API_KEY=...
OPENROUTER_API_KEY=sk-or-...

# Optional: OCR (for scanned PDFs)
GOOGLE_API_KEY=...

# Optional: Rate Limiting
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Optional: Observability
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Optional: Feedback Admin
FEEDBACK_ADMIN_KEY=your-admin-key
```

### Production (Vercel Environment Variables)

Set these in Vercel Project Settings -> Environment Variables -> Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_KEY=your-prod-service-key
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
NEXT_PUBLIC_APP_URL=https://steelagent.app
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### Planned: Stripe Billing

```bash
STRIPE_SECRET_KEY=sk_live_...                       # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...       # Stripe publishable key (client-side)
STRIPE_WEBHOOK_SECRET=whsec_...                      # Webhook endpoint secret
```

### Planned: Email Service (Resend)

```bash
RESEND_API_KEY=re_...                                # Billing notifications, quota warnings
```

---

## Supabase Project Setup

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Create a new project (e.g., `steelagent`)
3. Copy the URL and anon key from Settings -> API
4. Copy the service role key from Settings -> API (keep secret)

### 2. Run Database Migrations

Go to SQL Editor and run these migrations in order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `002_voyage_embeddings.sql` | Voyage AI embedding schema (1024-dim) |
| 2 | `add-char-offsets.sql` | Character offset tracking for chunks |
| 3 | `add-chunk-metadata.sql` | Chunk enrichment metadata |
| 4 | `add-document-filter.sql` | Document filtering for search |
| 5 | `add-hybrid-search.sql` | BM25 + vector hybrid search functions |
| 6 | `add_uploading_status.sql` | Document upload status tracking |
| 7 | `enhance-table-boosting.sql` | Table content score boosting |
| 8 | `add-section-boost.sql` | Section-level score boosting |
| 9 | `003_add_user_tables.sql` | Users, workspaces, API keys, invitations |
| 10 | `004_add_subscription_tables.sql` | Stripe customers, quotas, invoices, payments |
| 11 | `006_update_rls_policies.sql` | RLS policies, audit logs, triggers |

**Additional standalone migrations** (run after the above):
- `supabase/feedback-migration.sql` -- Feedback table
- `supabase/dedup-migration.sql` -- Dedup cleanup (only if duplicates exist)

**Verification Query:**

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected: All tables should have `rowsecurity = true`.

### 3. Enable Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `documents`
3. Set bucket to **Private** (authenticated access only)
4. RLS policies are applied via migration `006_update_rls_policies.sql`

---

## Vercel Project Setup

### 1. Connect Repository

1. Go to https://vercel.com/dashboard
2. Import your GitHub repository
3. Framework preset: Next.js (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next` (default)

### 2. Configure Environment Variables

Go to Settings -> Environment Variables and add all variables from the Production section above.

**Important:**
- `SUPABASE_SERVICE_KEY` must be set (not just the anon key) for quota enforcement
- `NEXT_PUBLIC_*` variables are exposed to the client -- never put secrets in them
- Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL

### 3. Configure Custom Domain

1. Go to Settings -> Domains
2. Add `steelagent.app` (or your custom domain)
3. Configure DNS records per Vercel instructions

---

## GitHub Secrets (for CI/CD)

Add these to GitHub Repository Settings -> Secrets and Variables -> Actions:

```bash
# Vercel
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...

# Supabase (for CI testing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# LLM APIs (for accuracy tests in CI)
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
```

---

## API Keys Setup

### Required APIs

1. **Anthropic** (Primary LLM)
   - Sign up: https://console.anthropic.com
   - Create API key
   - Cost: ~$30-75/month for typical usage
   - Model: Claude Opus 4.6

2. **Voyage AI** (Embeddings + Reranking)
   - Sign up: https://www.voyageai.com
   - Create API key
   - Free tier: 200M tokens/month embeddings
   - Reranking: $0.05 per 1000 rerank calls

### Optional APIs

3. **Groq** (Fallback LLM)
   - Sign up: https://console.groq.com
   - Free tier: 6000 TPM

4. **Cerebras** (Fallback LLM)
   - Sign up: https://cerebras.ai

5. **SambaNova** (Fallback LLM)
   - Sign up: https://sambanova.ai

6. **OpenRouter** (Fallback LLM)
   - Sign up: https://openrouter.ai
   - Pay-as-you-go pricing

7. **Google AI Studio** (OCR for scanned PDFs)
   - Sign up: https://ai.google.dev
   - Free tier available

8. **Upstash** (Rate Limiting)
   - Sign up: https://upstash.com
   - Free tier: 10K commands/day
   - Falls back to in-memory if not configured

---

## Cost Tracking

### Monthly Cost Breakdown

| Service | Free Tier Limit | Expected Usage | Cost |
|---------|----------------|----------------|------|
| **Anthropic** | N/A (pay-as-you-go) | ~500K tokens/day | ~$30-75 |
| **Voyage AI** | 200M tokens/month | ~20M tokens/month | $0 |
| **Voyage AI Rerank** | N/A | ~50K calls/month | ~$2.50 |
| **Supabase** | 500MB DB, 1GB storage | ~100MB DB, ~500MB storage | $0 |
| **Vercel** | 100GB bandwidth | ~10GB/month | $0 |
| **Upstash Redis** | 10K commands/day | ~5K commands/day | $0 |
| **Stripe** | N/A (per-transaction) | Scales with revenue | 2.9% + $0.30/txn |
| **Total** | -- | -- | **~$35-80/month** |

### Scaling Triggers

| Threshold | Action | Est. Cost Increase |
|-----------|--------|--------------------|
| 500MB database | Upgrade Supabase to Pro ($25/mo) | +$25/mo |
| 100GB bandwidth | Upgrade Vercel to Pro ($20/mo) | +$20/mo |
| 10K Redis commands/day | Upgrade Upstash to Pay-as-you-go ($0.2/10K) | +$5/mo |
| 200M embedding tokens/month | Voyage AI paid tier | +$10/mo |

---

## Troubleshooting

### "Unauthorized" errors
- Check `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- Verify user is signed in (check cookies)
- Check RLS policies in Supabase SQL Editor

### "Quota Exceeded" errors
- Check `usage_quotas` table in Supabase
- Verify `period_end` hasn't passed (should auto-reset)
- Manually reset quota if needed:

```sql
UPDATE usage_quotas
SET queries_used = 0, documents_used = 0, api_calls_used = 0,
    period_start = NOW(), period_end = NOW() + INTERVAL '1 month'
WHERE workspace_id = 'your-workspace-id';
```

### Rate limiting not working
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- If not set, falls back to in-memory (resets on deploy)
- Check Upstash dashboard for command usage

### Deployment failing on build
- Check all environment variables are set in Vercel
- Verify database migrations have run
- Check Vercel build logs for specific errors
- Known issue: Next.js 16 `/_global-error` prerendering bug (InvariantError) -- does not affect production

### SSE streaming timeout
- Vercel hobby tier has 10-second request timeout
- SSE streaming with 3-second heartbeat should keep connection alive
- If getting 504s, check `app/api/chat/route.ts` heartbeat implementation
