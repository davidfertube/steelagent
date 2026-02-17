# SteelAgent

[![Tests](https://github.com/davidfertube/steelagent/actions/workflows/test.yml/badge.svg)](https://github.com/davidfertube/steelagent/actions/workflows/test.yml)
[![Enterprise](https://img.shields.io/badge/Grade-Enterprise-blue)](https://steelagent.ai)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF)](https://stripe.com)

**Enterprise AI for materials compliance.** Upload steel specifications (ASTM, API, NACE), ask technical questions, get cited answers with zero hallucinations. Self-correcting agentic pipeline with answer grounding, false refusal detection, and confidence scoring.

[Live Demo](https://steelagent.ai) | [Agentic Pipeline](AGENTS.md) | [Developer Docs](CLAUDE.md) | [Security](SECURITY.md)

---

## What is SteelAgent?

SteelAgent is an AI-powered search engine for steel and materials specifications. Instead of manually flipping through hundreds of pages of ASTM, API, and NACE standards, engineers can type a question in plain English and get an accurate, cited answer in seconds.

**Who it's for:** Materials engineers, QA/QC inspectors, procurement teams, and compliance officers in the oil & gas industry. Anyone who needs to look up mechanical properties, chemical compositions, testing requirements, or manufacturing tolerances from technical standards.

**Why it matters:** In materials compliance, wrong data causes real problems — failed inspections, rejected pipe shipments, or worse, structural failures. Generic AI tools like ChatGPT hallucinate technical data. SteelAgent uses a 7-stage self-correcting pipeline that verifies every numerical claim against the source document before returning an answer. The result: **91.3% accuracy with approximately zero hallucinations** across 80 test queries.

---

## Key Numbers

| Metric | Value | What It Means |
|--------|-------|---------------|
| **Accuracy** | 91.3% (73/80) | 9 out of 10 queries answered correctly |
| **Hallucination Rate** | ~0% | Every number is verified against the source document |
| **Citation Rate** | 96.3% (77/80) | Almost every answer includes the exact source reference |
| **Response Time** | 13s median | Faster than manual lookup (15-30 min per query) |
| **Post-Dedup Validation** | 100% (10/10) | Perfect score after removing duplicate documents |
| **Unit Tests** | 113/113 passing | Comprehensive test coverage, zero skipped |
| **Indexed Specifications** | 15 documents | ASTM A789, A790, A312, A872, A1049 + API 5CT, 6A, 16C + more |

---

## How It Works

A user asks a question like *"What is the minimum yield strength for S32205 duplex per ASTM A790?"* The system searches across all indexed specifications, finds the relevant sections, verifies the data against the source, and returns a cited answer: **65 ksi (450 MPa), per ASTM A790 Table 2.**

Under the hood, this goes through a 7-stage agentic pipeline that includes query analysis, hybrid search (keyword + semantic), AI-powered reranking, answer generation, and post-generation verification. If the system detects a hallucination, false refusal, or incoherent answer, it automatically regenerates with corrective guidance.

For the full technical pipeline documentation, see **[AGENTS.md](AGENTS.md)**.

```mermaid
graph LR
    A[User Query] --> B[Query Analysis<br/>Extract ASTM/API codes]
    B --> C[Decomposition<br/>Multi-hop expansion]
    C --> D[Hybrid Search<br/>BM25 + Vector + Filter]
    D --> E[Voyage AI Rerank<br/>Cross-encoder scoring]
    E --> F[Claude Generation<br/>CoT with citations]
    F --> G[Verification Agents<br/>Grounding + Coherence]
    G --> H[Confidence Gate<br/>35/25/40 weights]
    H --> I[Cited Response<br/>+ Confidence Score]

    style A fill:#1a1a2e,color:#fff
    style I fill:#16213e,color:#fff
```

---

## Architecture

### Agentic RAG Pipeline (7 Stages)

| Stage | Module | Key Features |
|-------|--------|--------------|
| **1. Query Analysis** | `query-preprocessing.ts` | Extracts UNS/ASTM/API codes, sets adaptive search weights |
| **2. Decomposition** | `multi-query-rag.ts` | Expands complex queries into parallel sub-queries |
| **3. Hybrid Search** | `hybrid-search.ts` | BM25 + vector fusion with document-scoped filtering |
| **4. Re-ranking** | `reranker.ts` | Voyage AI rerank-2 (primary, ~200ms) + LLM fallback, dynamic topK |
| **5. Generation** | `chat/route.ts` | Claude Opus 4.6 with chain-of-thought system prompt |
| **6. Verification** | `answer-grounding.ts`, `response-validator.ts` | Regex numerical verification + LLM coherence judge |
| **7. Confidence Gate** | `chat/route.ts` | Weighted score (35/25/40), regenerates if < 55% |

### Post-Generation Agents

| Agent | Method | Purpose | Regen Budget |
|-------|--------|---------|--------------|
| **Answer Grounding** | Regex (no LLM) | Verify numerical claims match source chunks | 1 |
| **Anti-Refusal** | Pattern matching | Catch false "I cannot answer" responses | 2 |
| **Partial Refusal** | Pattern matching | Catch hedged "limited information" responses | 2 |
| **Coherence Validation** | LLM judge (fast) | Ensure response addresses the question | 2 |

Shared regeneration budget: **max 3 attempts total** across all agents to prevent infinite loops.

Full pipeline documentation: **[AGENTS.md](AGENTS.md)**

### Document Ingestion

```mermaid
graph LR
    A[PDF Upload] --> B[Text Extraction]
    B --> C[Semantic Chunking]
    C --> D[Embedding]
    D --> E[pgvector Storage]

    style A fill:#1a1a2e,color:#fff
    style E fill:#16213e,color:#fff
```

### Tech Stack

| Layer | Technology | Specs | Rationale |
|-------|------------|-------|-----------|
| **Primary LLM** | Claude Opus 4.6 | 200K context | Best-in-class technical accuracy, zero hallucinations |
| **LLM Fallback** | Groq -> Cerebras -> SambaNova -> OpenRouter | Auto-failover | Progressive backoff (500ms x 2^n, cap 4s) |
| **Embeddings** | Voyage AI voyage-3-lite | 1024-dim | 200M tokens/month free tier |
| **Re-ranker** | Voyage AI rerank-2 | Cross-encoder | ~200ms latency, 10-50x faster than LLM reranking |
| **Vector DB** | Supabase PostgreSQL + pgvector | HNSW index | Free tier, managed, metadata filtering |
| **Chunking** | Semantic + table-aware | 1500/800/2500/200 | Variable-size, preserves table integrity |
| **OCR** | Google Gemini Vision | Multi-modal | Handles scanned PDFs with embedded tables |
| **Framework** | Next.js 16 + React 19 | TypeScript | App Router, Server Components, streaming SSE |
| **Hosting** | Vercel | Free tier | CDN, SSL, Edge functions, auto-deploy |
| **Storage** | Supabase Storage | 1GB free | PDF document storage |
| **Cache** | Upstash Redis | Free tier | Rate limiting (10K commands/day) |
| **Auth** | Supabase Auth | Email/password | Session cookies, API keys, JWT |
| **Payments** | Stripe | SaaS billing | Subscriptions, checkout, customer portal (planned) |
| **Observability** | Langfuse | RAG tracing | Pipeline debugging, latency tracking |

---

## Performance

### Accuracy by Query Type

| Query Type | Accuracy | Sample Size | Notes |
|------------|----------|-------------|-------|
| **Single-spec lookup** | 88.2% | 34/80 | Table lookups, property queries |
| **Multi-hop reasoning** | 96.9% | 32/80 | Comparisons, multi-part questions |
| **Cross-spec comparison** | 100% | 10/10 | A789 vs A790 (post-dedup validation) |
| **API 5CT queries** | 80% | 4/80 | Limited to Purchasing Guidelines only |
| **Overall** | **91.3%** | 73/80 | Exceeds 90% target |

**Insight**: Multi-hop queries perform **better** than single-lookups due to query decomposition and parallel retrieval.

### Latency Breakdown (P50/P95)

| Stage | P50 | P95 | Optimization |
|-------|-----|-----|--------------|
| Query preprocessing | 50ms | 120ms | Regex-based, no LLM |
| Hybrid search (BM25 + vector) | 800ms | 1.5s | HNSW index, parallel execution |
| Voyage AI reranking | 200ms | 400ms | Cross-encoder, 800-char window |
| Claude generation | 8s | 15s | Streaming SSE, early flush |
| Answer grounding | 100ms | 250ms | Regex verification, no LLM |
| Coherence validation | 2s | 5s | Fast LLM call with timeout |
| **Total (P50 / P95)** | **13s** | **24.2s** | Target: <30s P95 |

### Resource Utilization

| Resource | Usage | Cost (Monthly) | Notes |
|----------|-------|----------------|-------|
| **Anthropic API** | ~500K tokens/day | ~$30-75 | Primary LLM (Claude Opus 4.6) |
| **Voyage AI** | ~20M tokens/month | **$0** | Embeddings (200M free tier) |
| **Voyage AI Rerank** | ~50K rerank calls/month | ~$2.50 | $0.05 per 1000 reranks |
| **Supabase** | PostgreSQL + pgvector + Auth + Storage | **$0** | Free tier (500MB DB, 1GB storage) |
| **Vercel** | Hosting + CDN + SSL | **$0** | Free tier (hobby plan) |
| **Upstash Redis** | Rate limiting | **$0** | Free tier (10K commands/day) |
| **Stripe Fees** | 2.9% + $0.30/txn | Variable | Only when revenue comes in |
| **Total** | -- | **~$35-80** | Nearly all free tier |

### Document Corpus (Post-Dedup, Feb 2026)

| Metric | Value | Notes |
|--------|-------|-------|
| **Unique Documents** | 15 | ASTM + API specifications |
| **Total Chunks** | ~8,500 | After removing 7,454 duplicates |
| **Avg Chunk Size** | 1,420 chars | Target: 1500, min: 800, max: 2500 |
| **Overlap** | 200 chars | Preserves context across boundaries |
| **Dedup Savings** | 46.7% | Removed 46 duplicate docs |

### Accuracy Progression

| Date | Accuracy | Key Change |
|------|----------|------------|
| Nov 2025 | 57% | Naive RAG baseline |
| Dec 2025 | 81% | Hybrid search + semantic chunking |
| Jan 2026 | 88% | LLM reranking + answer grounding |
| Feb 2026 | **91.3%** | Voyage AI reranking + full agentic pipeline |

---

## Engineering Highlights

### Self-Correcting Agentic Pipeline

Post-generation agents detect hallucinated numbers, false refusals, and incoherent responses. Each verification step can trigger targeted regeneration with specific guidance. The system catches errors that would pass through a naive retrieve-and-generate pipeline. Shared regeneration budget (max 3) prevents infinite loops.

### Cross-Spec Contamination Prevention

A789 (tubing) and A790 (pipe) share ~90% content but have **different** mechanical properties. S32205 yields **70 ksi** in A789 but **65 ksi** in A790. `document-mapper.ts` resolves ASTM/API codes to specific document IDs. Cross-spec confusion matrix testing validates separation.

### Table-Preserving Semantic Chunking

Variable-size chunks (1500 target, 800 min, 2500 max, 200 overlap) detect table boundaries and keep them intact. ASTM specification tables are never split mid-row.

### Evaluation-Driven Development

80 golden queries with pattern-based validation across 8 specifications. RAGAS LLM-as-judge metrics. A789/A790 confusion matrix testing. Accuracy progression from 57% to 91.3% through systematic root cause analysis.

### Multi-Provider LLM Failover

`model-fallback.ts` chains Anthropic -> Groq -> Cerebras -> SambaNova -> OpenRouter with progressive backoff (500ms x 2^n, cap 4s). Zero-downtime on any single provider outage.

### Content-Hash Deduplication

Removed 46 duplicate documents (7,454 redundant chunks). ~75% noise reduction while maintaining 100% accuracy on post-dedup validation.

### Production Feedback Loop

In-app feedback (thumbs up/down + issue classification) with automated diagnostic reporting. `scripts/feedback-report.ts` classifies root causes and routes to relevant pipeline modules.

---

## Quick Start

```bash
git clone https://github.com/davidfertube/steelagent.git
cd steelagent

npm install
cp .env.example .env.local
# Edit .env.local with your API keys:
#   ANTHROPIC_API_KEY     (required — Claude Opus 4.6)
#   VOYAGE_API_KEY        (required — embeddings + reranking)
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY

npm run dev    # http://localhost:3000
```

See [ENVIRONMENT.md](ENVIRONMENT.md) for full environment setup including Supabase project creation, database migrations, and deployment configuration.

---

## Testing

```bash
# Unit tests (113 tests, 0 skips)
npm test

# 80-query accuracy suite (requires running dev server)
npm run test:accuracy

# Production smoke test (8 complex queries, 1 per document)
npx tsx scripts/production-smoke-test.ts

# RAGAS LLM-as-judge evaluation
npm run evaluation:rag

# A789/A790 confusion matrix
npm run test:confusion
```

Golden datasets: `tests/golden-dataset/*.json` — 8 specification files, 80+ queries with expected answers and validation patterns.

---

## Project Structure

```
app/
  api/
    chat/route.ts              # Main RAG endpoint (7-stage agentic pipeline)
    chat/compare/route.ts      # Generic LLM comparison (no RAG)
    documents/process/route.ts  # PDF extraction -> chunking -> embedding
    documents/upload/route.ts   # Upload confirmation
    documents/upload-url/route.ts # Signed URL for direct upload
    documents/pdf/route.ts      # PDF retrieval
    feedback/route.ts           # User feedback collection + retrieval
    leads/route.ts             # Lead capture
    auth/api-keys/route.ts     # API key management
    auth/api-keys/[id]/route.ts # API key deletion
  auth/callback/route.ts       # OAuth callback
  dashboard/page.tsx           # User dashboard
  account/page.tsx             # Account settings + API keys
  auth/login/page.tsx          # Login
  auth/signup/page.tsx         # Registration
  privacy/page.tsx             # Privacy policy
  terms/page.tsx               # Terms of service
components/
  search-form.tsx              # Query input form
  realtime-comparison.tsx      # Side-by-side RAG vs generic LLM
  response-feedback.tsx        # Feedback widget (thumbs up/down + issue types)
  document-upload.tsx          # PDF upload component
  auth/login-form.tsx          # Login form
  auth/signup-form.tsx         # Signup form
  dashboard/usage-stats.tsx    # Usage statistics
  dashboard/document-list.tsx  # Uploaded documents
  account/api-key-manager.tsx  # API key CRUD
lib/
  multi-query-rag.ts           # Query decomposition + parallel retrieval
  hybrid-search.ts             # BM25 + vector fusion search
  reranker.ts                  # Voyage AI rerank-2 + LLM fallback (800-char window)
  query-preprocessing.ts       # Technical code extraction + adaptive weights
  semantic-chunking.ts         # Table-preserving variable-size chunking
  document-mapper.ts           # Spec code -> document ID resolution
  model-fallback.ts            # Multi-provider LLM failover chain
  answer-grounding.ts          # Numerical claim verification (regex)
  response-validator.ts        # Coherence validation (LLM judge)
  retrieval-evaluator.ts       # Retrieval quality assessment
  coverage-validator.ts        # Sub-query coverage checking
  verified-generation.ts       # Alternative verified generation pipeline
  claim-verification.ts        # Claim-level verification engine
  structured-output.ts         # Structured JSON output parsing
  auth.ts                      # Authentication + API key management
  quota.ts                     # Usage quota enforcement
  rate-limit.ts                # Rate limiting (Upstash + in-memory fallback)
  timeout.ts                   # Async timeout wrappers
  langfuse.ts                  # Observability + RAG pipeline tracing
  evaluation-engine.ts         # Pattern-based RAG evaluation
  rag-metrics.ts               # RAGAS-style LLM-as-judge metrics
  supabase.ts                  # Database client
  embeddings.ts                # Embedding generation
  vectorstore.ts               # Vector database operations
  query-cache.ts               # Query result caching
middleware.ts                  # Security (auth, CSRF, rate limiting)
tests/
  golden-dataset/              # 8 spec files, 80+ golden queries
  evaluation/                  # Accuracy + confusion tests
  helpers/                     # Shared test utilities
  performance/                 # Bottleneck profiling
  stress/                      # k6 load testing
scripts/
  production-smoke-test.ts     # 8-query end-to-end validation
  mvp-10-query-test.ts         # 10-query post-improvement validation
  feedback-report.ts           # Feedback diagnostic report
  dedup-documents.ts           # Document deduplication
supabase/
  migrations/                  # 11 SQL migration files
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | RAG query with SSE streaming -> `{ response, sources, confidence }` |
| POST | `/api/chat/compare` | Generic LLM comparison (no document context) |
| POST | `/api/documents/upload` | Confirm PDF upload |
| POST | `/api/documents/upload-url` | Get signed upload URL |
| POST | `/api/documents/process` | Process PDF -> extract, chunk, embed, store |
| GET | `/api/documents/pdf` | Retrieve uploaded PDF |
| POST | `/api/feedback` | Submit user feedback on response quality |
| GET | `/api/feedback` | Retrieve feedback (admin key required) |
| POST | `/api/auth/api-keys` | Create API key |
| DELETE | `/api/auth/api-keys/[id]` | Revoke API key |
| POST | `/api/leads` | Lead capture form |

### Planned Endpoints (Stripe Billing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/checkout` | Create Stripe Checkout session |
| POST | `/api/billing/portal` | Open Stripe Customer Portal |
| GET | `/api/billing/subscription` | Get current subscription status |
| POST | `/api/webhooks/stripe` | Handle Stripe webhook events |

---

## Pricing

| Feature | Free | Pro ($49/mo) | Enterprise ($199/mo) |
|---------|------|--------------|---------------------|
| Queries/month | 10 | 500 | 5,000 |
| Documents | 1 | 50 | 500 |
| API calls/month | 100 | 5,000 | 50,000 |
| RAG accuracy | Full pipeline | Full pipeline | Full pipeline |
| API key access | No | Yes | Yes |
| Workspace members | 1 | 5 | Unlimited |
| Human review queue | No | No | Yes |
| Priority support | No | Email | Dedicated |
| Audit logs | No | 30 days | 1 year |
| Custom integrations | No | No | Yes |

Break-even: ~14 Pro customers or ~8 mixed Pro/Enterprise customers cover infrastructure costs.

---

## Roadmap

### Shipped (Feb 2026)
- [x] **Voyage AI cross-encoder re-ranking** -- 10-50x faster than LLM (~200ms vs 5-15s)
- [x] **Content-hash deduplication** -- Removed 46 duplicate docs, 7,454 redundant chunks
- [x] **User feedback loop** -- Thumbs up/down + issue classification + diagnostic reporting
- [x] **Confidence reweighting** -- Tuned to 35/25/40 based on production failure analysis
- [x] **Dynamic topK retrieval** -- 8 chunks for API/comparisons, 5 for standard ASTM
- [x] **Anti-refusal agent** -- Catches false "I cannot answer" responses
- [x] **Progressive LLM fallback** -- 5-provider chain with auto-failover
- [x] **User authentication** -- Supabase Auth (email/password), API keys, JWT sessions
- [x] **Multi-tenant workspaces** -- Workspace model, RLS policies, quota enforcement
- [x] **Rate limiting** -- Per-endpoint limits with Upstash Redis + in-memory fallback
- [x] **Usage quotas** -- Per-workspace query/document/API call limits with auto-reset

### In Progress -- Payment Gateway (Stripe)
- [ ] **Stripe SDK integration** -- Checkout sessions, subscription management
- [ ] **Webhook handler** -- Process subscription lifecycle events
- [ ] **Billing portal** -- Stripe-hosted subscription management
- [ ] **Billing UI** -- Pricing table, usage dashboard, upgrade modals
- [ ] **Quota-Stripe sync** -- Dynamic limits tied to subscription tier

### In Progress -- Enterprise Hardening
- [ ] **Human-in-the-loop** -- Confidence-gated routing to human review queue
- [ ] **AI disclaimers** -- "Not a substitute for professional engineering judgment" on all responses
- [ ] **Audit trail enhancement** -- Full query/response logging for compliance
- [ ] **Terms of Service + Privacy Policy** -- Legal review for SaaS operation
- [ ] **Data Processing Agreement (DPA)** -- Enterprise customer requirement

### Near-Term (Accuracy -> 95%+)
- [ ] Upload actual API 5CT specification (only Purchasing Guidelines currently indexed)
- [ ] Improve retrieval quality for API 5CT, A872, A1049 (worst-performing specs)
- [ ] Table-aware chunking v2 (parse table headers into structured metadata)
- [ ] Citation highlighting in source chunks (highlight exact matched spans)

### Medium-Term (Revenue Growth)
- [ ] Query analytics dashboard (usage trends, failure patterns, latency distribution)
- [ ] Team management UI (workspace invitations, member roles, settings)
- [ ] Email service via Resend (verification, quota warnings, billing notifications)
- [ ] Admin dashboard (user management, revenue analytics, support tools)
- [ ] Conversation memory (multi-turn follow-up questions)
- [ ] Vercel AI SDK migration (replace custom SSE with `ai` package)

### Long-Term (Enterprise Scale)
- [ ] SSO/SAML for enterprise customers
- [ ] In-app PDF viewer with citation highlighting
- [ ] REST API with OpenAPI spec + SDKs
- [ ] On-premise deployment option (Docker + Kubernetes)
- [ ] Multi-language specification support (German DIN, Japanese JIS)
- [ ] Comparative analysis mode (side-by-side spec diff highlighting)
- [ ] SOC 2 Type II certification

---

## Legal & Compliance

### AI Disclaimer (Required)

All AI-generated responses include: *"This information is AI-generated from indexed specifications. It is not a substitute for professional engineering judgment. Always verify critical data against the original specification document."*

### Data Handling

- Customer documents are stored in Supabase Storage (encrypted at rest)
- Documents are processed for text extraction and embedding only
- **No customer data is used for model training** -- all LLM calls use the Anthropic API with data privacy guarantees
- Customers can request full data deletion at any time

### Liability Limitation

SteelAgent provides AI-assisted lookup, not professional engineering advice. The platform includes confidence scoring and human-in-the-loop routing for low-confidence responses to minimize risk. Enterprise customers should designate a qualified materials engineer to review flagged responses.

### Compliance Roadmap

| Milestone | Timeline | Purpose |
|-----------|----------|---------|
| Terms of Service + Privacy Policy | Q1 2026 | Legal foundation for SaaS operation |
| Data Processing Agreement (DPA) | Q2 2026 | Enterprise customer requirement |
| SOC 2 Type I | Q4 2026 | Security audit baseline |
| SOC 2 Type II | Q2 2027 | Ongoing security compliance |
| ISO 27001 | 2027 | International security standard |

---

## Built By

**David Fernandez** -- [Portfolio](https://davidfernandez.dev) | [GitHub](https://github.com/davidfertube)

Solo build over 3 months (Nov 2025 - Feb 2026). ~25,000 lines of TypeScript across 45 library modules, 11 API routes, 20 components, and comprehensive test infrastructure.

**Technical Achievement**: 7-stage agentic RAG pipeline achieving **91.3% accuracy** on 80-query golden dataset with **zero hallucinations**. Shipped 15+ pipeline improvements in February 2026 alone (dedup, Voyage AI reranking, confidence reweighting, feedback loop, dynamic topK).

**Test Infrastructure**: 113 unit tests, 80-query golden dataset, 8 production smoke tests, 10 post-improvement validation queries, RAGAS evaluation, A789/A790 confusion matrix, performance profiling.

**Production-Ready**: Live at [steelagent.ai](https://steelagent.ai). SSE streaming, multi-provider failover, feedback loop, observability, zero-downtime deployments.

---

## License

Proprietary -- All Rights Reserved

Copyright (c) 2025-2026 David Fernandez. This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.
