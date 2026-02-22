# SteelAgent -- Business Plan

## Executive Summary

**SteelAgent** is a search engine that uses agents for steel and materials specifications. Materials engineers in oil & gas spend 2-4 hours daily manually searching through ASTM, API, and NACE standards to find mechanical properties, chemical compositions, and testing requirements. SteelAgent replaces this manual process with a natural language interface that returns cited, verified answers in 13 seconds.

**The problem:** Generic AI tools (ChatGPT, Gemini) hallucinate technical data. In materials compliance, incorrect specification data can lead to material failures, failed inspections, rejected shipments, or structural failures. There is no existing tool that combines multiple specification standards into a single searchable system with citation verification.

**The solution:** A 7-stage self-correcting agentic RAG pipeline that achieves 91.3% accuracy with approximately zero hallucinations across 80 test queries. Every numerical claim is verified against the source document before returning to the user. Confidence scoring provides transparency on how reliable each answer is.

**Market opportunity:** The global materials testing market is valued at ~$2.4 billion. There are 50,000+ materials engineers in oil & gas alone, with additional demand from QA/QC inspectors, procurement teams, and compliance officers across EPC contractors, steel mills, and pipe manufacturers.

**Revenue model:** SaaS subscriptions -- Free (10 queries/month), Pro ($49/month), Enterprise ($199/month). Break-even at ~14 Pro customers or ~8 mixed Pro/Enterprise customers. Infrastructure costs are near-zero until scale (free-tier Vercel, Supabase, Upstash). Stripe billing (checkout, portal, webhooks) is fully integrated.

**Competitive advantage:** Domain-specific RAG with cross-spec contamination prevention, human-in-the-loop for safety-critical queries, and a feedback loop for continuous improvement. Not a generic AI wrapper -- a purpose-built compliance tool.

**Product readiness:** Live at [steelagent.ai](https://steelagent.ai). Full auth (email, OAuth, API keys), Stripe billing, multi-tenant workspaces, production security (CSP, HSTS, CSRF, RLS, rate limiting), 15 API endpoints, 113 passing unit tests. Ready for first paying customers.

---

## Problem Statement

### The Daily Pain

Materials engineers routinely need to answer questions like:
- *"What is the minimum yield strength for S32205 duplex stainless steel per ASTM A790?"*
- *"What are the chemical composition limits for Grade L80 per API 5CT?"*
- *"Does ASTM A789 require impact testing for S32750?"*

**Current process:** Open the PDF specification (often 50-200 pages), search for the relevant section, navigate tables, cross-reference footnotes, and verify the data. This takes **15-30 minutes per query** for experienced engineers, longer for junior staff.

### The Cross-Spec Trap

Different specifications can have different values for the same material. For example:
- ASTM A789 (tubing): S32205 yield strength = **70 ksi**
- ASTM A790 (pipe): S32205 yield strength = **65 ksi**

Using the wrong specification's data is a compliance failure. Generic AI tools don't distinguish between these specifications -- they often return a blended answer that is wrong for both.

### Why Generic AI Fails

| Tool | Problem |
|------|---------|
| ChatGPT / Claude (generic) | Hallucinate specific values. "S32205 yield strength is 65-70 ksi" is wrong -- it depends on the spec. |
| Google Search | Returns general articles, not spec-specific data. Can't search within proprietary PDFs. |
| MatWeb / Total Materia | Database lookup only -- no natural language, no cross-spec comparison, no citations. |
| Manual PDF search | Slow (15-30 min/query), error-prone, requires domain expertise to navigate. |

---

## Solution

### How It Works (3 Steps)

1. **Upload** -- Drop your specification PDFs into SteelAgent. The system extracts text, preserves tables, creates semantic chunks, and generates vector embeddings.

2. **Ask** -- Type a question in plain English. The system identifies which specification(s) you're asking about, searches across all indexed documents, and retrieves the most relevant sections.

3. **Get Cited Answers** -- Receive an accurate answer with source citations, confidence score, and links to the original document sections. Every numerical claim has been verified against the source.

### What Makes It Different

| Feature | SteelAgent | Generic AI |
|---------|-----------|------------|
| **Accuracy** | 91.3% (verified on 80 golden queries) | Unknown (no evaluation framework) |
| **Hallucinations** | ~0% (regex verification of numerical claims) | Common on technical data |
| **Citations** | 96.3% citation rate | Inconsistent or fabricated |
| **Cross-spec safety** | Document-scoped filtering prevents contamination | Blends data from different specs |
| **Confidence scoring** | Transparent 0-100% score on every answer | No confidence indication |
| **Human-in-the-loop** | Low-confidence answers queued for expert review | No safety net |

---

## Target Market

### Primary: Materials Engineers in Oil & Gas

- **Upstream** (drilling, completion): API 5CT (casing/tubing), API 6A (wellhead equipment)
- **Midstream** (pipelines): ASTM A790 (pipe), ASTM A789 (tubing), API 16C (choke valves)
- **Downstream** (refining, petrochemical): ASTM A312 (austenitic pipe), ASTM A872 (centrifugally cast pipe)

**Estimated market size:** 50,000+ materials engineers in O&G globally.

### Secondary: QA/QC and Procurement

- QA/QC inspectors verifying material certificates against specifications
- Procurement teams evaluating supplier MTRs (Mill Test Reports)
- Compliance officers auditing material traceability

### Tertiary: Adjacent Industries

- EPC contractors (engineering, procurement, construction)
- Steel mills and pipe manufacturers
- Third-party inspection companies (Bureau Veritas, SGS, TUV)
- Nuclear and aerospace (different specs, same workflow)

### TAM / SAM / SOM

| Level | Estimate | Basis |
|-------|----------|-------|
| **TAM** (Total Addressable Market) | $2.4B | Global materials testing market |
| **SAM** (Serviceable Addressable Market) | $240M | O&G materials compliance segment (~10% of TAM) |
| **SOM** (Serviceable Obtainable Market) | $2.4M | 1% of SAM in Year 1-3 |

---

## Revenue Model

### Pricing Tiers

| Feature | Free | Pro ($49/mo) | Enterprise ($199/mo) |
|---------|------|--------------|---------------------|
| Queries/month | 10 | 500 | 5,000 |
| Documents | 1 | 50 | 500 |
| API calls/month | 100 | 5,000 | 50,000 |
| RAG pipeline | Full (all 7 stages) | Full | Full |
| API key access | No | Yes | Yes |
| Workspace members | 1 | 5 | Unlimited |
| Human review queue | No | No | Yes |
| Priority support | No | Email | Dedicated |
| Audit logs | No | 30 days | 1 year |
| Custom integrations | No | No | Yes |

### Unit Economics

| Metric | Free | Pro | Enterprise |
|--------|------|-----|------------|
| Avg queries/user/month | 8 | 200 | 1,500 |
| Avg cost/query (LLM) | $0.003 | $0.003 | $0.003 |
| Monthly LLM cost/user | $0.02 | $0.60 | $4.50 |
| Monthly revenue/user | $0 | $49 | $199 |
| **Gross margin** | -100% | **98.8%** | **97.7%** |

### Break-Even Analysis

| Scenario | Customers Needed | Monthly Revenue | Monthly Cost | Profit |
|----------|-----------------|-----------------|--------------|--------|
| All Pro | 14 | $686 | ~$80 | $606 |
| Mixed (10 Pro + 4 Enterprise) | 14 | $1,286 | ~$80 | $1,206 |
| Target Year 1 | 50 | ~$2,450 | ~$100 | ~$2,350 |

Infrastructure costs are near-zero until scale. The primary cost is the Anthropic API (~$30-75/month), which scales linearly with usage.

---

## Go-to-Market Strategy

### Phase 1: Direct Sales (Months 1-3)

- **LinkedIn outreach** to materials engineers, QA/QC managers, procurement leads at O&G companies
- **Free tier as lead magnet** -- let engineers try the tool with their own specifications
- **Demo videos** showing real spec lookups (A789 vs A790, API 5CT grades)
- **Target companies:** Major O&G operators (Shell, Chevron, ExxonMobil), large EPC firms (Bechtel, Fluor, Technip)

### Phase 2: Content Marketing (Months 3-6)

- **Blog posts:** "How to avoid A789/A790 cross-spec confusion", "Why ChatGPT can't replace your spec library"
- **YouTube demos:** Live queries against real specifications
- **LinkedIn thought leadership:** Technical accuracy case studies, pipeline improvement metrics
- **SEO:** Target "ASTM specification lookup", "API 5CT material properties", "duplex steel grades"

### Phase 3: Channel Partners (Months 6-12)

- **Third-party inspection companies:** Bureau Veritas, SGS, TUV, Intertek
- **Material management software vendors:** Integration partnerships
- **Industry associations:** NACE (now AMPP), API, ASTM membership

### Phase 4: API Marketplace (Year 2+)

- **REST API with OpenAPI spec** for workflow integration
- **SDKs** (Python, JavaScript) for automated MTR verification
- **ERP integration** (SAP, Oracle) for procurement workflows
- **Developer portal** with documentation and sandbox

---

## Competitive Landscape

| Competitor | Type | Strengths | Weaknesses |
|-----------|------|-----------|------------|
| **ChatGPT / Claude** | Generic AI | Large context, general knowledge | Hallucinate specs, no citations, no cross-spec safety |
| **MatWeb** | Materials database | Comprehensive, established | No natural language, no custom specs, no citations |
| **Total Materia** | Materials database | Industry standard, large DB | Expensive ($3K+/year), no AI, no custom uploads |
| **Manual search** | Current process | Accurate (if done correctly) | Slow (15-30 min/query), requires expertise |
| **SteelAgent** | Domain-specific RAG | Accuracy + citations + speed + safety | New product, smaller spec coverage |

### Competitive Moat

1. **Domain-specific pipeline** -- 7-stage agentic verification purpose-built for specs (not a generic RAG wrapper)
2. **Cross-spec safety** -- Document-scoped filtering prevents contamination (unique to SteelAgent)
3. **Evaluation framework** -- 80 golden queries, RAGAS metrics, confusion matrix testing
4. **Feedback loop** -- Production feedback drives continuous pipeline improvements
5. **Data lock-in** -- Once customers upload their spec library, switching costs are high
6. **Production-ready billing** -- Stripe checkout, portal, webhooks, and quota enforcement already shipped
7. **Enterprise security** -- CSP, HSTS, CSRF, RLS, rate limiting, audit logging, webhook signature verification

---

## Technology Overview

### For Non-Technical Stakeholders

SteelAgent works like a very smart, very careful search engine for technical documents:

1. When you upload a PDF specification, the system reads every page, understands the structure (including tables), and creates a searchable index.

2. When you ask a question, the system doesn't just search for matching words -- it understands what you're asking and finds the most relevant sections across all your documents.

3. Before showing you an answer, the system **double-checks** every number against the original document. If something doesn't match, it tries again with more careful instructions. This is why SteelAgent doesn't hallucinate like ChatGPT.

### For Technical Stakeholders

- **Stack:** Next.js 16, React 19, TypeScript (~27,500 LOC), Supabase (PostgreSQL + pgvector), Vercel
- **LLM:** Claude Opus 4.6 (primary) with 4 fallback providers (Groq, Cerebras, SambaNova, OpenRouter)
- **Search:** Hybrid BM25 + vector search with Voyage AI cross-encoder reranking
- **Verification:** Regex-based numerical grounding, LLM coherence judge, confidence gating
- **Billing:** Stripe integration (checkout, portal, webhooks, subscription management)
- **Auth:** Supabase Auth (email/password, OAuth), API keys, JWT sessions
- **Security:** RLS, CSRF, CSP, HSTS, rate limiting (Upstash Redis), audit logging
- **Infrastructure cost:** ~$35-80/month (all free tier except Anthropic API)
- **API:** 15 endpoints including RAG, document management, billing, auth, feedback

Full technical documentation: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md)

---

## Financial Projections

### Year 1

| Quarter | Customers | MRR | Infrastructure | LLM Cost | Net |
|---------|-----------|-----|----------------|----------|-----|
| Q1 | 10 (8 free, 2 pro) | $98 | $0 | $35 | $63 |
| Q2 | 25 (15 free, 8 pro, 2 ent) | $790 | $0 | $50 | $740 |
| Q3 | 40 (20 free, 15 pro, 5 ent) | $1,730 | $25 | $65 | $1,640 |
| Q4 | 50 (20 free, 20 pro, 10 ent) | $2,970 | $45 | $75 | $2,850 |
| **Year 1 Total** | 50 | **~$30K ARR** | $840 | $2,700 | **~$26K** |

### Year 2

| Metric | Projection |
|--------|------------|
| Customers | 200 (60 free, 100 pro, 40 ent) |
| MRR | ~$12,850 |
| ARR | **~$154K** |
| Infrastructure | $1,200/year (Supabase Pro + Vercel Pro) |
| LLM cost | $6,000/year |
| **Net** | **~$147K** |

### Year 3

| Metric | Projection |
|--------|------------|
| Customers | 500 (100 free, 250 pro, 150 ent) |
| MRR | ~$42,100 |
| ARR | **~$505K** |
| Infrastructure | $4,800/year |
| LLM cost | $15,000/year |
| Headcount (2-3 people) | $180,000/year |
| **Net** | **~$305K** |

---

## Legal & Compliance Framework

### Required Legal Documents

| Document | Purpose | Priority |
|----------|---------|----------|
| **Terms of Service (ToS)** | Defines acceptable use, liability limitations, subscription terms | Critical -- before accepting payments |
| **Privacy Policy** | GDPR/CCPA compliance, data handling disclosure | Critical -- before collecting user data |
| **AI Disclaimer** | Limits liability for AI-generated outputs | Critical -- on every response |
| **Data Processing Agreement (DPA)** | Enterprise requirement for handling customer data | High -- before enterprise sales |
| **Acceptable Use Policy (AUP)** | Prevents misuse of the platform | Medium |

### AI Disclaimer (Mandatory)

Every AI-generated response must include:

> *"This information is AI-generated from indexed specifications. It is not a substitute for professional engineering judgment. Always verify critical data against the original specification document."*

This disclaimer is critical because:
1. Materials compliance is safety-critical (incorrect data can cause structural failures)
2. Limits liability for AI errors
3. Sets appropriate user expectations
4. Required by emerging AI regulation (EU AI Act, NIST AI RMF)

### Professional Liability Considerations

SteelAgent provides **AI-assisted lookup**, not **professional engineering advice**. Key distinctions:

| SteelAgent Does | SteelAgent Does NOT |
|---------------|--------------------|
| Search indexed specifications | Provide engineering recommendations |
| Return cited data from source documents | Make material selection decisions |
| Verify numerical claims against sources | Certify compliance |
| Flag low-confidence answers | Replace professional engineering judgment |

**Recommendation:** Consult with a lawyer specializing in software liability and professional services to draft appropriate disclaimers and limitation of liability clauses.

### Intellectual Property Protection

| IP Type | Protection Method |
|---------|------------------|
| **Source code** | Proprietary license, private repository |
| **Agentic pipeline methodology** | Trade secret (document internally, do not publish) |
| **Golden dataset** | Trade secret (proprietary evaluation data) |
| **Brand** | Trademark registration for "SteelAgent" |
| **Patent** | Consider provisional patent for confidence-gated HITL routing |

### Data Privacy

| Regulation | Applicability | Compliance Steps |
|-----------|--------------|-----------------|
| **GDPR** (EU) | If any EU customers | Privacy policy, DPA, right to deletion, data export |
| **CCPA** (California) | If California customers | Privacy disclosure, opt-out mechanism |
| **SOC 2** | Enterprise requirement | Security controls audit (Type I then Type II) |

### Compliance Roadmap

| Milestone | Timeline | Cost Estimate | Status |
|-----------|----------|---------------|--------|
| Terms of Service + Privacy Policy | Q1 2026 | $1,500-3,000 (lawyer) | Pages live (`/privacy`, `/terms`), needs legal review |
| AI Disclaimer implementation | Q1 2026 | $0 (code change) | Pending UI integration |
| Stripe billing + webhook security | Q1 2026 | $0 (code) | Done (`lib/stripe.ts`, HMAC verification) |
| OAuth + account management | Q1 2026 | $0 (code) | Done (signup, login, password reset, deletion) |
| Security headers (CSP, HSTS) | Q1 2026 | $0 (code) | Done (`middleware.ts`) |
| Data Processing Agreement template | Q2 2026 | $1,000-2,000 (lawyer) | Pending |
| Trademark registration | Q2 2026 | $500-1,000 | Pending |
| SOC 2 Type I audit | Q4 2026 | $10,000-20,000 | Pending |
| SOC 2 Type II audit | Q2 2027 | $15,000-30,000 | Pending |

---

## Human-in-the-Loop Strategy

### Why HITL is Essential

Materials compliance is safety-critical. AI errors can result in:
- **Failed inspections** (wrong material properties reported)
- **Rejected shipments** (incorrect specification requirements cited)
- **Structural failures** (wrong materials used in critical applications)
- **Legal liability** (providing incorrect compliance data)

Human-in-the-loop provides a safety net that generic AI tools cannot offer. This is a key enterprise differentiator.

### Confidence-Gated Routing

| Confidence Level | Action | User Experience |
|-----------------|--------|-----------------|
| **> 70%** | Auto-deliver | Response with AI disclaimer. High confidence -- data verified against sources. |
| **55-70%** | Deliver with warning | "Low confidence" banner. Recommend manual verification. |
| **< 55%** | Queue for human review | "Queued for expert review" notification. Email when human-reviewed answer is ready. |

### Implementation Plan

1. **Supabase table:** `human_review_queue` with fields: query, response, confidence, sources, status (pending/reviewed/escalated), reviewer_id, reviewed_at, corrected_response
2. **Email notifications:** Via Resend -- notify user when review is complete, notify reviewer when new items in queue
3. **Review dashboard:** Admin page for reviewers to see pending items, approve/correct/escalate
4. **Audit trail:** Every review logged in `audit_logs` with reviewer identity and timestamp
5. **Enterprise feature:** Customers assign their own materials engineer as designated reviewer

### Cost Model

| Volume | Human Reviewer Cost | Frequency |
|--------|-------------------|-----------|
| < 55% confidence queries | ~5% of total queries | ~25 queries/month at 500 total |
| Review time | ~5 min per review | ~2 hours/month |
| Reviewer cost | $75/hour (materials engineer) | ~$150/month |

At scale, HITL adds ~$150/month in human reviewer costs -- easily covered by Enterprise pricing.

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Accuracy degradation from new specs | Medium | High | Golden dataset testing on every pipeline change |
| Anthropic API outage | Low | High | 4 fallback LLM providers with auto-failover |
| Supabase free tier limits | Medium | Medium | Monitor usage, upgrade to Pro at 400MB |
| Vercel timeout issues | Low | Medium | SSE streaming with heartbeat keeps connections alive |

### Legal Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Liability for incorrect spec data | Medium | High | AI disclaimer, HITL, confidence scoring, ToS limitation of liability |
| Copyright claims from spec publishers | Low | High | Only index customer-uploaded specs (customers own their copies) |
| GDPR violation | Low | Medium | Privacy policy, DPA, data deletion capability |

### Market Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Slow enterprise adoption | Medium | High | Free tier for proof of concept, case studies, demo videos |
| Large competitor (Anthropic/OpenAI) enters space | Low | Medium | Domain expertise moat, evaluation framework, existing customers |
| Total Materia adds AI features | Medium | Medium | Speed to market, better accuracy, lower cost |

---

## Team & Hiring Plan

### Current

**David Fernandez** -- Founder, Full-Stack Engineer + ML
- Built entire platform (~27,500 lines of TypeScript across 131 files)
- 7-stage agentic RAG pipeline with 15 API endpoints
- 91.3% accuracy on golden dataset
- Production deployment with zero-downtime

### Phase 1 Hires (Post-Revenue, Year 1)

| Role | Focus | Why |
|------|-------|-----|
| **Sales (O&G domain expert)** | Direct sales to O&G companies | Domain credibility, industry connections |
| **Customer Success** | Onboarding, support, retention | Reduce churn, collect feedback |

### Phase 2 Hires (Year 2)

| Role | Focus | Why |
|------|-------|-----|
| **Senior ML Engineer** | Pipeline improvements, accuracy optimization | Push accuracy from 91% to 95%+ |
| **DevOps / Platform** | Infrastructure scaling, monitoring | Prepare for enterprise scale |

### Advisory Board (Seek Early)

| Role | Purpose |
|------|---------|
| **Materials Engineering Consultant** | Validate accuracy, expand golden dataset, domain credibility |
| **O&G Industry Advisor** | Market strategy, customer introductions, pricing validation |
| **SaaS Legal Advisor** | ToS, DPA, liability, compliance |

---

## Current Product Status (Feb 2026)

### Shipped

| Category | What's Built | Key Files |
|----------|-------------|-----------|
| **RAG Pipeline** | 7-stage agentic pipeline, 91.3% accuracy, ~0% hallucinations | `app/api/chat/route.ts`, `lib/multi-query-rag.ts` |
| **Document Ingestion** | PDF upload, OCR, semantic chunking, vector embedding | `app/api/documents/*/route.ts`, `lib/semantic-chunking.ts` |
| **Search** | Hybrid BM25 + vector, Voyage AI reranking, document filtering | `lib/hybrid-search.ts`, `lib/reranker.ts` |
| **Verification** | Answer grounding, anti-refusal, coherence validation, confidence gate | `lib/answer-grounding.ts`, `lib/response-validator.ts` |
| **Auth** | Email/password, OAuth, password reset, API keys, sessions | `lib/auth.ts`, `app/auth/*/page.tsx` |
| **Billing** | Stripe checkout, portal, webhooks, subscription management | `lib/stripe.ts`, `app/api/billing/*/route.ts` |
| **Account** | Profile management, API key CRUD, account deletion | `app/account/page.tsx`, `app/api/account/delete/route.ts` |
| **Workspaces** | Multi-tenant, RLS, quota enforcement, workspace settings | `app/workspace/page.tsx`, `lib/quota.ts` |
| **Security** | CSP, HSTS, CSRF, rate limiting, RLS, audit logging | `middleware.ts`, `lib/rate-limit.ts` |
| **Observability** | Langfuse tracing, feedback loop, diagnostic reporting | `lib/langfuse.ts`, `scripts/feedback-report.ts` |
| **Testing** | 113 unit tests, 80 golden queries, 11 scripts, RAGAS evaluation | `tests/`, `scripts/` |
| **Landing Page** | Hero, RAG demo, side-by-side comparison, lead capture | `app/page.tsx`, `components/realtime-comparison.tsx` |

### Not Yet Shipped

| Category | What's Needed | Effort |
|----------|--------------|--------|
| **Quota-Stripe sync** | Tie plan limits to Stripe subscription tier dynamically | Low |
| **AI Disclaimer** | Show on every response in the UI | Low |
| **Human-in-the-Loop** | Review queue, reviewer dashboard, email notifications | Medium |
| **Email Notifications** | Resend integration for billing, quota, HITL | Low (lib exists) |
| **Legal Review** | Lawyer review of ToS/Privacy (pages exist) | External |

---

## Next Steps (Priority Order)

1. ~~**Stripe SDK + Webhook Handler**~~ -- Done: `lib/stripe.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, `app/api/billing/subscription/route.ts`
2. ~~**Checkout Flow**~~ -- Done: Stripe Checkout sessions for Pro/Enterprise upgrade
3. **Billing UI Polish** -- Finalize pricing table, upgrade modals, usage dashboard (`components/account/billing-section.tsx`, `components/upgrade-modal.tsx` exist)
4. **Terms of Service + Privacy Policy** -- Legal foundation before accepting payments (pages exist at `/privacy` and `/terms`)
5. **AI Disclaimer** -- Add to every response in the UI
6. **Human-in-the-Loop** -- Confidence-gated routing, review queue, email notifications
7. **Email Service** -- Resend for billing, quota warnings, HITL notifications (`lib/email.ts` exists)
8. **Team Management UI** -- Workspace invitations, member list, role management (`app/workspace/page.tsx` exists)
9. **Content Marketing** -- Blog, YouTube, LinkedIn (start building audience)
10. **First Paying Customer** -- Direct outreach, free trial, convert to Pro
