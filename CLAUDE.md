# CLAUDE.md -- SteelAgent

## Quick Reference

- **Framework**: Next.js 16, React 19, Tailwind CSS
- **Primary LLM**: Claude Opus 4.6 via Anthropic API
- **Fallback LLMs**: Groq -> Cerebras -> SambaNova -> OpenRouter (Llama 3.3 70B)
- **Embeddings**: Voyage AI voyage-3-lite (1024 dim, 200M tokens FREE/month)
- **Re-ranker**: Voyage AI rerank-2 (cross-encoder, ~200ms)
- **Database**: Supabase PostgreSQL + pgvector (HNSW)
- **Hosting**: Vercel (free tier)
- **Auth**: Supabase Auth (email/password, API keys)
- **Rate Limiting**: Upstash Redis (free tier) + in-memory fallback
- **Payments**: Stripe (planned)
- **Email**: Resend (planned)
- **OCR**: Google Gemini Vision (`lib/ocr.ts`)
- **Observability**: Langfuse (`lib/langfuse.ts`)

---

## Codebase Statistics

| Category | Count | Details |
|----------|-------|---------|
| **Library modules** | 45 | `lib/*.ts` -- core pipeline, auth, utilities |
| **API routes** | 11 | `app/api/**/route.ts` |
| **Page components** | 12 | `app/**/page.tsx` -- dashboard, auth, legal |
| **React components** | 20 | `components/**/*.tsx` -- UI, auth, dashboard |
| **SQL migrations** | 11 | `supabase/migrations/*.sql` |
| **CI/CD workflows** | 6 | `.github/workflows/*.yml` |
| **Test files** | 17 | `tests/**/*.test.ts` + helpers |
| **Golden datasets** | 10 | `tests/golden-dataset/*.json` |
| **Scripts** | 12 | `scripts/*.ts` -- accuracy, smoke, feedback, dedup |
| **Total TypeScript** | ~140+ | ~25,000 lines |

---

## Development Workflow

```bash
# First time setup
npm install
cp .env.example .env.local    # Edit with your API keys

# Start development
npm run dev                    # http://localhost:3000
```

### Running Tests

```bash
# Unit tests (fast, no server needed)
npm test                                # All 113 tests (10 files)
npm run test:evaluation:unit            # Evaluation pattern tests only

# Accuracy tests (requires running dev server on localhost:3000)
npm run test:accuracy                   # 80-query suite across all 8 documents
npm run test:accuracy:verbose           # Same, with detailed per-query output

# Production smoke test (requires dev server + API keys)
npx tsx scripts/production-smoke-test.ts  # 8 complex queries, 1 per document

# Integration tests (requires running server + env vars)
npm run test:evaluation:quick           # 5-query smoke test
npm run test:evaluation:full            # Full evaluation suite
npm run test:confusion                  # A789/A790 cross-spec confusion matrix

# RAGAS LLM-as-judge evaluation
npm run evaluation:rag                  # RAGAS metrics (faithfulness, relevancy)
npm run evaluation:rag:verbose          # Same, with detailed scoring

# Performance
npm run test:performance                # Performance analysis
npm run test:bottleneck                 # Bottleneck profiling

# Quick validation (10 queries, budget-friendly)
npx tsx scripts/mvp-10-query-test.ts    # Post-improvement 10-query check

# Feedback & maintenance
npx tsx scripts/feedback-report.ts      # Feedback diagnostic report
npx tsx scripts/dedup-documents.ts      # Dedup dry run (--apply to execute)
```

### Build & Deploy

```bash
npm run build                  # Production build (catches type errors)
npm run lint                   # ESLint
git push origin main           # Auto-deploys to Vercel via GitHub Actions
```

---

## Architecture

### Accuracy Results (Feb 2026)

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Overall accuracy | **91.3%** (73/80) | 90%+ | Exceeded |
| Source citation | **96.3%** (77/80) | 90%+ | Exceeded |
| Hallucination rate | ~0% | 0% | Maintained |
| P50 latency | 13.0s | -- | Good |
| P95 latency | 24.2s | 30-60s | Within target |
| Post-improvement (10-query) | **100%** (10/10) | -- | Validated |

Golden datasets: `tests/golden-dataset/*.json` (8 files, 80+ queries total)

### Agentic RAG Pipeline (7 stages)

The full pipeline is documented in **[AGENTS.md](AGENTS.md)**. Summary:

1. **Query Analysis** -- `query-preprocessing.ts` extracts UNS/ASTM/API codes, sets adaptive search weights
2. **Query Decomposition** -- `multi-query-rag.ts` decomposes complex queries into parallel sub-queries
3. **Hybrid Search** -- `hybrid-search.ts` runs BM25 + vector search with document filtering
4. **Re-ranking** -- `reranker.ts` Voyage AI rerank-2 (primary, ~200ms) + LLM fallback, dynamic topK (8 API/comparison, 5 standard)
5. **Generation** -- Claude Opus 4.6 with CoT system prompt, SSE streaming
6. **Post-Generation Verification** -- answer grounding + false refusal detection + coherence validation
7. **Confidence Gate** -- weighted score (retrieval 35% + grounding 25% + coherence 40%), regenerates if < 55%

### Key Files

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Main RAG endpoint (SSE streaming, agentic verification) |
| `app/api/documents/process/route.ts` | PDF text extraction + embedding + storage |
| `app/api/documents/pdf/route.ts` | PDF retrieval endpoint |
| `app/api/auth/api-keys/route.ts` | API key management (create, list) |
| `app/api/feedback/route.ts` | Feedback submission + retrieval |
| `lib/multi-query-rag.ts` | Query decomposition + multi-hop retrieval |
| `lib/hybrid-search.ts` | BM25 + vector fusion search |
| `lib/reranker.ts` | Voyage AI rerank-2 + LLM fallback (800-char window) |
| `lib/query-preprocessing.ts` | UNS/ASTM code extraction + adaptive weights |
| `lib/model-fallback.ts` | Multi-provider LLM fallback chain |
| `lib/semantic-chunking.ts` | Table-preserving chunking (1500 chars, 200 overlap) |
| `lib/document-mapper.ts` | Resolves ASTM codes to document IDs |
| `lib/verified-generation.ts` | Alternative verified generation pipeline |
| `lib/answer-grounding.ts` | Numerical claim verification (regex, no LLM) |
| `lib/response-validator.ts` | Coherence validation (LLM judge) |
| `lib/retrieval-evaluator.ts` | Retrieval quality assessment (LLM judge) |
| `lib/coverage-validator.ts` | Sub-query coverage checking (regex) |
| `lib/claim-verification.ts` | Claim-level verification engine |
| `lib/structured-output.ts` | Structured JSON output parsing |
| `lib/auth.ts` | Authentication, session management, API keys |
| `lib/quota.ts` | Usage quota enforcement (per-workspace) |
| `lib/rate-limit.ts` | Upstash Redis rate limiting + in-memory fallback |
| `lib/timeout.ts` | Async timeout wrappers (45s LLM, 15s search) |
| `lib/langfuse.ts` | Observability + RAG pipeline tracing |
| `lib/evaluation-engine.ts` | Pattern-based RAG evaluation |
| `lib/rag-metrics.ts` | RAGAS-style LLM-as-judge evaluation |
| `lib/query-cache.ts` | Query result caching |
| `lib/supabase.ts` | Supabase client configuration |
| `middleware.ts` | Security middleware (auth, CSRF, rate limiting) |
| `components/realtime-comparison.tsx` | Side-by-side RAG vs generic LLM display (demo section) |

---

## Common Gotchas

### A789/A790 Confusion
A789 (tubing) and A790 (pipe) have DIFFERENT yield strengths for S32205:
- A789: **70 ksi** / 485 MPa
- A790: **65 ksi** / 450 MPa

`lib/document-mapper.ts` resolves specs to document IDs to prevent cross-contamination.
Content-level dedup in `chat/route.ts` is **document-scoped** -- chunks from different documents are never merged even if they share 80%+ vocabulary overlap.

### Reranker Chunk Window
Reranker truncates chunks to **800 chars** (was 400) for relevance scoring. This preserves ~6-8 table rows -- enough to include header + data rows for most ASTM tables. Increasing further risks slower reranking without proportional accuracy gains.

### Document Filter Patterns
`lib/document-mapper.ts` detects document references via three pattern types:
- **Per-pattern**: "per A790", "according to A312", "ASTM A789"
- **Code-first**: "A789 tubing", "A790 pipe"
- **API pattern**: "API 5CT", "API 6A", "API 16C"

### Regeneration Budget
Post-generation agents share a budget of `MAX_REGENS = 3` to prevent infinite loops:
- C1 (grounding) can use 1
- C1.5 (anti-refusal) can use up to 2
- C2 (coherence) can use up to 2
- C5.5 (confidence gate) can use 1

Total across all checks is capped at 3. Each regen adds ~10-15s latency.

### Groq TPM Limits (Fallback Only)
Groq is now a fallback provider (primary is Claude Opus 4.6).
Free tier: 6000 TPM. Chunks limited to 3 to stay under limit.
If 429 errors occur, `model-fallback.ts` auto-switches providers.

### Chunk Size
Semantic chunking: 1500 chars target, 800 min, 2500 max, 200 overlap.
Tables preserved intact. Increasing chunk size improves coverage but risks TPM limits on fallback providers.

### Vercel Hobby Timeout
10-second request limit. SSE streaming with 3s heartbeat keeps connection alive.
See `app/api/chat/route.ts` lines 70-107.

### SUPABASE_SERVICE_KEY Not in .env.example
`lib/quota.ts` and some admin operations require `SUPABASE_SERVICE_KEY` (not the anon key). This is intentionally excluded from `.env.example` because it grants full database access. Set it manually in `.env.local` and Vercel environment variables.

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=xxx             # Claude Opus 4.6 -- primary LLM (console.anthropic.com)
VOYAGE_API_KEY=xxx                # Voyage AI (voyageai.com)
NEXT_PUBLIC_SUPABASE_URL=xxx      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx # Supabase anon key

# Required for admin operations
SUPABASE_SERVICE_KEY=xxx          # Supabase service role key (quota enforcement, admin)

# Optional (fallback LLMs + OCR)
GOOGLE_API_KEY=xxx                # Gemini (ai.google.dev) -- used for OCR vision
GROQ_API_KEY=xxx                  # Groq fallback (console.groq.com)
CEREBRAS_API_KEY=xxx              # Cerebras fallback
SAMBANOVA_API_KEY=xxx             # SambaNova fallback (sambanova.ai)
OPENROUTER_API_KEY=xxx            # OpenRouter fallback (openrouter.ai)

# Optional (rate limiting)
UPSTASH_REDIS_REST_URL=xxx        # Upstash Redis (upstash.com)
UPSTASH_REDIS_REST_TOKEN=xxx      # Falls back to in-memory if not set

# Optional (observability)
LANGFUSE_SECRET_KEY=xxx           # LangFuse tracing (langfuse.com)
LANGFUSE_PUBLIC_KEY=xxx           # LangFuse public key
LANGFUSE_BASE_URL=xxx             # LangFuse base URL

# Optional (feedback admin)
FEEDBACK_ADMIN_KEY=xxx            # Required to read feedback via GET /api/feedback

# Planned (Stripe billing)
STRIPE_SECRET_KEY=xxx             # Stripe secret key (dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx  # Stripe publishable key (client-side)
STRIPE_WEBHOOK_SECRET=xxx         # Stripe webhook endpoint secret (whsec_...)

# Planned (email service)
RESEND_API_KEY=xxx                # Resend (resend.com) -- billing notifications, quota warnings
```

---

## API Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/chat` | `{ query, stream?, verified?, documentId? }` | SSE stream -> `{ response, sources, confidence }` |
| POST | `/api/chat/compare` | `{ query }` | `{ response }` (generic LLM, no RAG) |
| POST | `/api/documents/upload` | `FormData(file)` | `{ success, message }` |
| POST | `/api/documents/upload-url` | `{ filename, contentType }` | `{ signedUrl }` |
| POST | `/api/documents/process` | `{ documentId }` | `{ success, chunks }` |
| GET | `/api/documents/pdf` | `?id=documentId` | PDF file stream |
| POST/GET | `/api/feedback` | `{ query, response, sources, confidence, rating, issue_type?, comment? }` | `{ success }` / `{ data: FeedbackEntry[] }` |
| POST | `/api/auth/api-keys` | `{ name, expiresAt? }` | `{ key, id }` |
| DELETE | `/api/auth/api-keys/[id]` | -- | `{ success }` |
| POST | `/api/leads` | `{ firstName, lastName, email, company?, phone? }` | `{ success }` |

### Planned Endpoints (Stripe Billing)

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/billing/checkout` | `{ priceId }` | `{ url }` (Stripe Checkout URL) |
| POST | `/api/billing/portal` | -- | `{ url }` (Stripe Portal URL) |
| GET | `/api/billing/subscription` | -- | `{ plan, status, periodEnd }` |
| POST | `/api/webhooks/stripe` | Stripe event payload | `{ received: true }` |

---

## Test Suite

| Category | Count | Runner |
|----------|-------|--------|
| Unit tests | 113 | `npm test` (vitest) |
| Accuracy (golden) | 80 | `npm run test:accuracy` |
| Production smoke | 8 | `npx tsx scripts/production-smoke-test.ts` |
| Quick validation | 10 | `npx tsx scripts/mvp-10-query-test.ts` |
| Integration | varies | `npm run test:evaluation:full` |
| Confusion matrix | varies | `npm run test:confusion` |

All 113 unit tests pass with 0 skips. Tests use auto-detection guards that early-return when the environment (server, API keys) isn't available.

Shared test helpers: `tests/helpers/test-env.ts`, `tests/helpers/citation-validators.ts`.

---

## Human-in-the-Loop (Planned)

Materials compliance is safety-critical -- AI errors can lead to using incorrect materials in structural applications. The planned HITL system uses confidence-gated routing:

| Confidence Level | Action | User Experience |
|-----------------|--------|-----------------|
| **> 70%** | Auto-deliver | Response with AI disclaimer |
| **55-70%** | Deliver with warning | "Low confidence" banner + suggest human review |
| **< 55%** | Queue for human review | "Queued for expert review" notification, email when ready |

**Implementation plan**: Priority queue in Supabase (`human_review_queue` table), email notifications via Resend, enterprise customers can designate their own materials engineer as reviewer. Every human review is logged for audit compliance.

---

## Security Architecture

See **[SECURITY.md](SECURITY.md)** for full details. Summary:

**Middleware flow** (`middleware.ts`):
1. Authentication check (session cookie or API key)
2. CSRF protection (Origin/Referer validation)
3. Rate limiting (Upstash Redis, per-route limits)
4. Quota enforcement (per-workspace limits)
5. Route handler

**Protected routes**: `/api/chat`, `/api/documents/*`, `/api/feedback`, `/dashboard/*`, `/account/*`
**Public routes**: `/`, `/auth/*`, `/privacy`, `/terms`, `/api/health`, `/api/leads`

---

## Deployment Checklist

- [ ] All env vars set in Vercel Dashboard
- [ ] `SUPABASE_SERVICE_KEY` set (not just anon key)
- [ ] `npm run build` passes locally
- [ ] `npm run lint` passes
- [ ] `npm test` passes (113 unit tests, 0 skips)
- [ ] Upload test PDF and verify indexing works
- [ ] Run a query and verify cited response with confidence score
- [ ] Check SSE streaming works (no 504 timeout)
- [ ] Verify rate limiting works (Upstash Redis connected)
- [ ] Verify auth flow (signup -> login -> dashboard)
- [ ] Verify API key creation and authentication
- [ ] *(When Stripe is live)* Stripe webhook endpoint configured
- [ ] *(When Stripe is live)* Test checkout flow end-to-end

---

## Database Migrations

Located in `supabase/migrations/`. Run in order via Supabase SQL Editor:

| File | Purpose |
|------|---------|
| `002_voyage_embeddings.sql` | Voyage AI embedding schema (1024-dim) |
| `add-char-offsets.sql` | Character offset tracking for chunks |
| `add-chunk-metadata.sql` | Chunk enrichment metadata |
| `add-document-filter.sql` | Document filtering for search |
| `add-hybrid-search.sql` | BM25 + vector hybrid search functions |
| `add_uploading_status.sql` | Document upload status tracking |
| `enhance-table-boosting.sql` | Table content score boosting |
| `add-section-boost.sql` | Section-level score boosting |
| `003_add_user_tables.sql` | Users, workspaces, API keys, invitations |
| `004_add_subscription_tables.sql` | Stripe customers, quotas, invoices, payments |
| `006_update_rls_policies.sql` | RLS policies, audit logs, triggers |

Additional standalone SQL:
- `supabase/feedback-migration.sql` -- Feedback table
- `supabase/dedup-migration.sql` -- Dedup cleanup (run via SQL Editor, bypasses RLS)

---

## Related Documentation

- [README.md](README.md) — Project overview
- [AGENTS.md](AGENTS.md) — Agentic RAG pipeline architecture
- [SECURITY.md](SECURITY.md) — Security policy
- [ENVIRONMENT.md](ENVIRONMENT.md) — Environment setup + deployment configuration
- [MCP.md](MCP.md) — MCP server configuration
