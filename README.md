# SpecVault

Enterprise AI for materials compliance. Upload steel specifications (ASTM, API, NACE), ask technical questions, get cited answers with zero hallucinations. Self-correcting agentic pipeline with answer grounding, false refusal detection, and confidence scoring.

---

## Overview

SpecVault is an AI-powered search engine for steel and materials specifications. Engineers type a question in plain English and get an accurate, cited answer in seconds, instead of manually searching through hundreds of pages of ASTM, API, and NACE standards.

**Target users:** Materials engineers, QA/QC inspectors, procurement teams, and compliance officers in oil & gas.

### Key Metrics

| Metric | Value |
|--------|-------|
| **Accuracy** | 91.3% (73/80 golden queries) |
| **Hallucination Rate** | ~0% |
| **Citation Rate** | 96.3% (77/80) |
| **Response Time** | 13s median, 24.2s P95 |
| **Unit Tests** | 189 passing |
| **Indexed Specifications** | 15 documents |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16, React 19, Tailwind CSS |
| **Primary LLM** | Claude Sonnet 4.6 via Anthropic API |
| **Fallback LLMs** | Groq -> Cerebras -> SambaNova -> OpenRouter (Llama 3.3 70B) |
| **Embeddings** | Voyage AI voyage-3-lite (1024-dim, 200M tokens free/month) |
| **Re-ranker** | Voyage AI rerank-2 (cross-encoder, ~200ms) |
| **Database** | Supabase PostgreSQL + pgvector (HNSW) |
| **Hosting** | Vercel |
| **Auth** | Supabase Auth (email/password, OAuth, API keys) |
| **Rate Limiting** | Upstash Redis + in-memory fallback |
| **Payments** | Stripe |
| **OCR** | Google Gemini Vision |
| **Observability** | Langfuse |

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- API keys: Anthropic, Voyage AI, Supabase (see [Environment Variables](#environment-variables))

### Installation

```bash
git clone <repo-url>
cd steelagent
npm install
cp .env.example .env.local   # Edit with your API keys
npm run dev                   # http://localhost:3000
```

### Environment Variables

#### Required

```bash
ANTHROPIC_API_KEY=sk-ant-...              # Claude Sonnet 4.6 (console.anthropic.com)
VOYAGE_API_KEY=pa-...                     # Voyage AI (voyageai.com)
NEXT_PUBLIC_SUPABASE_URL=https://...      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...         # Supabase anon key
SUPABASE_SERVICE_KEY=...                  # Supabase service role key (quota, admin ops)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # App URL (production: https://steelagent.ai)
```

#### Optional (Fallback LLMs + Integrations)

```bash
GROQ_API_KEY=gsk_...              # Groq fallback (console.groq.com)
CEREBRAS_API_KEY=csk_...          # Cerebras fallback
SAMBANOVA_API_KEY=...             # SambaNova fallback
OPENROUTER_API_KEY=sk-or-...      # OpenRouter fallback (openrouter.ai)
GOOGLE_API_KEY=...                # Gemini Vision OCR (ai.google.dev)
UPSTASH_REDIS_REST_URL=...        # Rate limiting (upstash.com)
UPSTASH_REDIS_REST_TOKEN=...      # Falls back to in-memory if not set
LANGFUSE_SECRET_KEY=sk-lf-...     # Observability (langfuse.com)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
FEEDBACK_ADMIN_KEY=...            # Required to read feedback via GET /api/feedback
```

#### Stripe Billing

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Email (Planned)

```bash
RESEND_API_KEY=re_...             # Billing notifications, quota warnings
```

### Database Setup

#### 1. Create Supabase Project

1. Create a project at https://supabase.com/dashboard
2. Copy URL and anon key from Settings -> API
3. Copy service role key from Settings -> API (keep secret)

#### 2. Run Migrations

Run in Supabase SQL Editor, in order:

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
| 10 | `004_add_subscription_tables.sql` | Stripe customers, quotas, invoices |
| 11 | `006_update_rls_policies.sql` | RLS policies, audit logs, triggers |
| 12 | `007_add_oauth_user_trigger.sql` | OAuth user auto-provisioning |
| 13 | `008_atomic_quota_check.sql` | Atomic quota enforcement |
| 14 | `009_fix_quota_and_stripe.sql` | Quota and Stripe fixes |

**Shortcut:** Run `COMBINED_003_to_009_run_in_supabase.sql` instead of steps 9-14.

**Additional standalone migrations:**
- `supabase/feedback-migration.sql` — Feedback table
- `supabase/dedup-migration.sql` — Dedup cleanup (run if duplicates exist)

#### 3. Enable Storage

1. Create a storage bucket named `documents` in Supabase Dashboard
2. Set bucket to **Private** (authenticated access only)

### Deployment (Vercel)

1. Import GitHub repository at https://vercel.com/dashboard
2. Set all environment variables in Settings -> Environment Variables
3. Set `NEXT_PUBLIC_APP_URL` to your deployment URL
4. Push to `main` — auto-deploys via GitHub Actions

**GitHub Secrets for CI/CD:**

```bash
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
VOYAGE_API_KEY=...
```

---

## Architecture

### Agentic RAG Pipeline (7 Stages)

```
User Query
  -> 1. Query Analysis          (regex, ~1ms)
  -> 2. Query Decomposition     (LLM, ~2s for complex queries)
  -> 3. Hybrid Search           (BM25 + vector, ~3s)
  -> 4. Re-ranking              (Voyage AI rerank-2, ~200ms)
  -> 5. Generation              (Claude Sonnet 4.6, ~10s)
  -> 6. Post-Generation Agents  (grounding + refusal + coherence, ~5s)
  -> 7. Confidence Gate         (score -> return or regenerate)
       -> Cited Response + Confidence Score
```

| Stage | Module | Key Features |
|-------|--------|--------------|
| **1. Query Analysis** | `query-preprocessing.ts` | Extracts UNS/ASTM/API codes, sets adaptive BM25/vector weights |
| **2. Decomposition** | `multi-query-rag.ts` | Expands complex queries into parallel sub-queries (skipped for simple lookups) |
| **3. Hybrid Search** | `hybrid-search.ts` | BM25 + vector fusion with document-scoped filtering, table boosting |
| **4. Re-ranking** | `reranker.ts` | Voyage AI rerank-2 (primary) + LLM fallback, dynamic topK (8 for API/comparisons, 5 standard) |
| **5. Generation** | `chat/route.ts` | Claude Sonnet 4.6 with CoT system prompt, SSE streaming |
| **6. Verification** | `answer-grounding.ts`, `response-validator.ts` | Regex numerical verification + LLM coherence judge |
| **7. Confidence Gate** | `chat/route.ts` | Weighted score (retrieval 35% + grounding 25% + coherence 40%), regenerates if < 55% |

### Post-Generation Verification Agents

| Agent | Method | Purpose | Regen Budget |
|-------|--------|---------|--------------|
| **Answer Grounding** | Regex (no LLM) | Verify numerical claims match source chunks | 1 |
| **Anti-Refusal** | Pattern matching | Catch false "I cannot answer" responses | 2 |
| **Partial Refusal** | Pattern matching | Catch hedged "limited information" responses | 2 |
| **Coherence Validation** | LLM judge (fast) | Ensure response addresses the question | 2 |

Shared regeneration budget: **max 3 attempts total** across all agents.

### Multi-Provider LLM Fallback

`model-fallback.ts` chains providers with progressive backoff (500ms x 2^n, cap 4s):

Anthropic (Claude) -> Groq -> Cerebras -> SambaNova -> OpenRouter

### Key Modules

| File | Purpose |
|------|---------|
| `lib/multi-query-rag.ts` | Query decomposition + parallel retrieval |
| `lib/hybrid-search.ts` | BM25 + vector fusion search |
| `lib/reranker.ts` | Voyage AI rerank-2 + LLM fallback (800-char window) |
| `lib/query-preprocessing.ts` | UNS/ASTM code extraction + adaptive weights |
| `lib/semantic-chunking.ts` | Table-preserving chunking (1500 chars, 200 overlap) |
| `lib/document-mapper.ts` | Resolves ASTM codes to document IDs |
| `lib/model-fallback.ts` | Multi-provider LLM fallback chain |
| `lib/answer-grounding.ts` | Numerical claim verification (regex, no LLM) |
| `lib/response-validator.ts` | Coherence validation (LLM judge) |
| `lib/retrieval-evaluator.ts` | Retrieval quality assessment (LLM judge) |
| `lib/coverage-validator.ts` | Sub-query coverage checking (regex) |
| `lib/query-complexity.ts` | Query complexity analysis + timed operations |
| `lib/auth.ts` | Authentication, session management, API keys |
| `lib/quota.ts` | Usage quota enforcement (per-workspace) |
| `lib/rate-limit.ts` | Upstash Redis rate limiting + in-memory fallback |
| `lib/langfuse.ts` | Observability + RAG pipeline tracing |
| `lib/stripe.ts` | Stripe billing client + plan configuration |
| `lib/embeddings.ts` | Voyage AI embedding generation |
| `lib/vectorstore.ts` | Chunk storage + vector search retrieval |
| `lib/embedding-cache.ts` | In-memory embedding cache (1h TTL, 1000 max) |
| `middleware.ts` | Security middleware (auth, CSRF, rate limiting, headers) |

---

## API Reference

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/chat` | `{ query, stream?, verified?, documentId? }` | SSE stream -> `{ response, sources, confidence }` |
| POST | `/api/chat/compare` | `{ query }` | `{ response }` (generic LLM, no RAG) |
| POST | `/api/documents/upload` | `FormData(file)` | `{ success, message }` |
| POST | `/api/documents/upload-url` | `{ filename, contentType }` | `{ signedUrl }` |
| POST | `/api/documents/process` | `{ documentId }` | `{ success, chunks }` |
| POST/GET | `/api/feedback` | `{ query, response, sources, confidence, rating, issue_type?, comment? }` | `{ success }` / `{ data[] }` |
| POST | `/api/auth/api-keys` | `{ name, expiresAt? }` | `{ key, id }` |
| DELETE | `/api/auth/api-keys/[id]` | — | `{ success }` |
| POST | `/api/leads` | `{ firstName, lastName, email, company?, phone? }` | `{ success }` |
| GET | `/api/health` | — | `{ status: "ok" }` |
| DELETE | `/api/account/delete` | — | `{ success }` |
| POST | `/api/billing/checkout` | `{ priceId }` | `{ url }` |
| POST | `/api/billing/portal` | — | `{ url }` |
| GET | `/api/billing/subscription` | — | `{ plan, status, periodEnd, quota }` |
| POST | `/api/webhooks/stripe` | Stripe event payload | `{ received: true }` |

---

## Testing

```bash
# Unit tests (fast, no server needed)
npm test                                # All tests (vitest)

# Accuracy tests (requires running dev server on localhost:3000)
npm run test:accuracy                   # 80-query suite across all 8 documents
npm run test:accuracy:verbose           # Same, with detailed per-query output

# Core golden dataset
npm run test:core20                     # 20-query golden dataset
npm run test:hard10                     # 10 hardest queries

# Production smoke test (requires server + API keys)
npx tsx scripts/production-smoke-test.ts

# RAGAS LLM-as-judge evaluation
npm run evaluation:rag
npm run evaluation:rag:verbose

# A789/A790 confusion matrix
npm run test:confusion

# Performance profiling
npm run test:performance
npm run test:bottleneck

# Quick post-improvement validation
npx tsx scripts/mvp-10-query-test.ts

# Feedback diagnostics
npx tsx scripts/feedback-report.ts

# Document deduplication
npx tsx scripts/dedup-documents.ts              # Dry run
npx tsx scripts/dedup-documents.ts --apply      # Execute
```

### Build & Deploy

```bash
npm run build     # Production build (catches type errors)
npm run lint      # ESLint
git push origin main  # Auto-deploys to Vercel
```

### Golden Datasets

Located in `tests/golden-dataset/*.json` — 8 specification files, 80+ queries with expected answers and validation patterns.

---

## Security

### Authentication & Authorization

| Feature | Implementation |
|---------|---------------|
| Email/Password Auth | Supabase Auth with email verification |
| API Key Auth | SK-prefixed, SHA-256 hashed, expiration support |
| Session Management | Secure cookies, HTTP-only, SameSite |
| Route Protection | Middleware checks session or API key on protected routes |
| Role-Based Access | User/Admin/Enterprise roles |

### Rate Limiting & Quotas

| Feature | Implementation |
|---------|---------------|
| Rate Limiting | Upstash Redis sliding window + in-memory fallback |
| Per-Route Limits | `/api/chat`: 30/min, `/api/documents/*`: 5-10/min |
| Quota Enforcement | Per-workspace query/document/API call limits |
| Input Validation | Max query length, PDF file size limit (50MB), MIME type checking |

### Data Isolation (RLS)

| Feature | Implementation |
|---------|---------------|
| Row Level Security | Workspace-scoped policies on all tables |
| Document Scoping | Documents/chunks filtered by workspace_id |
| API Key Scoping | Keys belong to specific workspaces |
| Anonymous Access | Blocked (`REVOKE ALL FROM anon`) except leads |

### Network Security

| Feature | Implementation |
|---------|---------------|
| CSRF Protection | Origin/Referer validation on state-changing requests |
| CORS | Exact-match origin whitelist |
| Stripe Webhooks | HMAC-SHA256 signature verification |
| Error Sanitization | Generic error messages, no stack traces leaked |
| HTTPS | Enforced by Vercel (auto SSL) |
| Security Headers | X-Content-Type-Options, X-Frame-Options, HSTS, CSP |

### Middleware Flow

```
Request -> Security Headers -> Auth Check -> CSRF -> Rate Limit -> Quota -> Route Handler
```

**Protected routes:** `/api/chat`, `/api/documents/*`, `/api/feedback`, `/dashboard/*`, `/account/*`
**Public routes:** `/`, `/auth/*`, `/privacy`, `/terms`, `/api/health`, `/api/leads`

### Data Handling

- Documents stored in Supabase Storage (encrypted at rest)
- No customer data used for model training (Anthropic API data privacy)
- Customers can request full data deletion via `/api/account/delete`

---

## Development Tools

### MCP Configuration

MCP servers extend Claude Code with tools for file access, GitHub integration, and database queries. Config: `.mcp/config.json`

| Server | Package | Purpose |
|--------|---------|---------|
| filesystem | `@anthropic/mcp-server-filesystem` | Read/write project files |
| github | `@anthropic/mcp-server-github` | PR and issue management |

**Recommended additions:** context7 (library docs), Supabase MCP (direct DB access), sequential-thinking (complex reasoning). See `.mcp/config.json` for configuration.

### Common Gotchas

**A789/A790 Confusion:** A789 (tubing) and A790 (pipe) have DIFFERENT yield strengths for S32205 — A789: 70 ksi, A790: 65 ksi. `document-mapper.ts` resolves specs to document IDs to prevent cross-contamination.

**Reranker Chunk Window:** Truncates to 800 chars — preserves ~6-8 table rows. Wider windows risk slower reranking without accuracy gains.

**Regeneration Budget:** Post-generation agents share max 3 regenerations total. Each adds ~10-15s latency.

**Groq TPM Limits:** Free tier: 6000 TPM. Chunks limited to 3. `model-fallback.ts` auto-switches on 429 errors.

**Chunk Size:** Semantic chunking: 1500 target, 800 min, 2500 max, 200 overlap. Tables preserved intact.

**Vercel Timeout:** 10-second request limit. SSE streaming with 3s heartbeat keeps connection alive.

**`SUPABASE_SERVICE_KEY`:** Not in `.env.example` intentionally — grants full database access. Set manually in `.env.local` and Vercel.

---

## Project Structure

```
app/
  api/
    chat/route.ts              # Main RAG endpoint (7-stage pipeline)
    chat/compare/route.ts      # Generic LLM comparison (no RAG)
    documents/process/route.ts # PDF extraction -> chunking -> embedding
    documents/upload/route.ts  # Upload confirmation
    documents/upload-url/route.ts # Signed URL for direct upload
    feedback/route.ts          # User feedback collection
    leads/route.ts             # Lead capture
    health/route.ts            # Health check
    auth/api-keys/route.ts     # API key management
    billing/checkout/route.ts  # Stripe checkout
    billing/portal/route.ts    # Stripe customer portal
    billing/subscription/route.ts # Subscription status
    webhooks/stripe/route.ts   # Stripe webhook handler
    account/delete/route.ts    # Account deletion
  auth/                        # Login, signup, password reset pages
  dashboard/page.tsx           # User dashboard
  account/page.tsx             # Account settings + API keys
  workspace/page.tsx           # Workspace settings
components/
  search-form.tsx              # Query input form
  realtime-comparison.tsx      # Side-by-side RAG vs generic LLM
  response-feedback.tsx        # Feedback widget
  document-upload.tsx          # PDF upload
  auth/                        # Login/signup forms
  dashboard/                   # Usage stats, document list
  account/                     # API keys, billing, profile
  layout/                      # Navigation, user menu
  ui/                          # Button, card, logo, separator
lib/                           # 40+ modules (see Key Modules above)
middleware.ts                  # Security (auth, CSRF, rate limiting, headers)
tests/
  golden-dataset/              # 8 spec files, 80+ golden queries
  evaluation/                  # Accuracy + confusion tests
  helpers/                     # Shared test utilities
  performance/                 # Bottleneck profiling
  security/                    # Rate limit + validation tests
scripts/                       # Accuracy tests, smoke tests, diagnostics
supabase/migrations/           # 15 SQL migration files
```

---

## Troubleshooting

**"Unauthorized" errors:** Check `NEXT_PUBLIC_SUPABASE_URL`, verify user is signed in, check RLS policies.

**"Quota Exceeded" errors:** Check `usage_quotas` table. Reset manually if needed:
```sql
UPDATE usage_quotas
SET queries_used = 0, documents_used = 0, api_calls_used = 0,
    period_start = NOW(), period_end = NOW() + INTERVAL '1 month'
WHERE workspace_id = 'your-workspace-id';
```

**Rate limiting not working:** Check Upstash env vars. Falls back to in-memory (resets on deploy).

**SSE streaming timeout:** Check heartbeat implementation in `app/api/chat/route.ts`.

**Build failing:** Verify all env vars set in Vercel. Check that migrations have run.

---

## License

Proprietary — All Rights Reserved

Copyright (c) 2025-2026 David Fernandez. Unauthorized copying, distribution, or modification is strictly prohibited.
