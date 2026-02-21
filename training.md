# NRG Energy -- Gen AI Engineer Interview Prep

**Candidate:** David Fernandez
**Role:** Gen AI Engineer (Contract, 12+ months)
**Company:** NRG Energy, Houston TX (Hybrid, 3 days in office)
**Interview:** 45 minutes
**Interviewers:** Avanth Dannapuneni, Francis Ko (NRG)
**Prepared:** February 20, 2026

---

## Table of Contents

1. [NRG Company Intel](#1-nrg-company-intel)
2. [Strength Alignment Matrix](#2-strength-alignment-matrix)
3. [Most Likely Questions (12)](#3-most-likely-questions--core-45-min)
4. [Technical Deep-Dives (10)](#4-likely-technical-deep-dives)
5. [Behavioral Questions (8)](#5-behavioralsituational-questions)
6. [Energy Domain Questions (5)](#6-energy-domain-questions)
7. [System Design Questions (3)](#7-system-design-questions)
8. [Curveball Questions (5)](#8-curveball-questions)
9. [Questions to Ask Them (8)](#9-questions-to-ask-them)
10. [30-Second Pitch + Numbers to Memorize](#10-30-second-pitch--numbers-to-memorize)

---

## 1. NRG Company Intel

**Know these cold before walking in:**

- **Fortune 200**, ~**$30B revenue**, **7M+ retail electricity customers** across deregulated markets (TX, PA, NY, OH, IL, CT, MA, MD, NJ)
- **Big Three** in deregulated energy alongside Vistra and Constellation Energy
- **Retail brands:** Reliant (TX flagship), Green Mountain Energy (renewable), Direct Energy (Northeast/Midwest), Vivint Smart Home (IoT/energy), CPower (C&I demand response/VPP)
- **CTO: Dak Liyanearachchi** -- driving a **product operating model** (teams organized around products, not projects). Major push to **democratize AI** across the company for non-technical teams
- **Tech stack:** AWS (primary cloud), **Databricks** (data lakehouse), **Salesforce** (CRM + billing), SAP S/4HANA (ERP), Microsoft Power Platform (RPA/Copilot Studio), Google Cloud (VPP partnership)
- Built a **data marketplace** on Databricks/AWS to surface data assets, ownership, and lineage across the org

### AI Initiatives You MUST Reference

| Initiative | Details |
|---|---|
| **Virtual Power Plant (VPP)** | **1 GW** distributed capacity with Google Cloud + Renew Home -- largest residential VPP in the US. AI for load forecasting, dispatch optimization, grid balancing |
| **$50M AI Venture Fund** | Investing in AI startups for energy. First investment: $2.5M in Equilibrium Energy (AI portfolio optimization) |
| **Call Center AI** | NLP-powered agent assist, chatbots, containment/deflection optimization across 7M+ customers |
| **Predictive Maintenance** | ML models monitoring generation asset health (gas turbines, solar, wind) |
| **RPA / Power Automate** | Production bots on Microsoft Power Automate generating "multi-million dollar benefit" |
| **CPower VPP** | 6 GW commercial & industrial demand response network (acquired Jan 2026 via LS Power) |

### Business Model Insight

NRG is unique: they are both a **power generator** (natural gas, solar, wind, battery -- ~25 GW after LS Power acquisition) AND a **retail electricity provider**. This vertical integration means AI can optimize the full stack from generation to customer meter. That's the competitive moat.

### Recent News to Mention

- NRG + GE Vernova + Kiewit: Building **5+ GW of new gas plants** to serve AI data center demand
- Signed **445 MW of data center retail power agreements** in Texas
- Vivint Smart Home acquisition (~$5.2B, 2023) -- expanding into home energy management and edge AI on smart devices

---

## 2. Strength Alignment Matrix

| JD Requirement | Your Direct Experience | Proof Point |
|---|---|---|
| Design/develop AI models | Built full 7-stage agentic RAG pipeline from scratch | **91.3% accuracy**, 0% hallucination on 80-query golden dataset |
| RAG systems | Hybrid search (BM25+vector), Voyage AI reranking, confidence-gated regeneration | P50 latency **13s**, P95 **24.2s** |
| Agentic frameworks | 7 autonomous stages with self-correction, 4 verification agents | Shared **MAX_REGENS=3** budget prevents infinite loops |
| Cloud (AWS/Azure/GCP) | **Azure AI Engineer Associate** certified. Supabase (PostgreSQL on AWS), Vercel (serverless) | Multi-cloud deployment |
| Prompt engineering | CoT system prompts, SCAN-SEARCH-VERIFY-CITE-RESPOND, anti-refusal prompting | 10 refusal detection patterns, formula guards |
| Python + GenAI | Claude Sonnet 4.5, Llama 3.3 70B, Gemini Vision OCR | 5-provider LLM failover chain |
| Docker + DevOps | GitHub Actions CI/CD, Vercel auto-deploy, k6 load testing | 113 unit tests, 80-query golden dataset, confusion matrix |
| Prototype -> production | Solo-built production system in 3 months (~25,700 lines TypeScript) | Live at specvault.app |
| Deploy/maintain AI | Observability (Langfuse), feedback loops, query caching, rate limiting | User feedback with issue classification |
| Collaborate cross-functionally | Testmachine (RL testing + compliance engine bridging ML and business) | MS AI cohort collaboration |
| **Deregulated energy (preferred)** | Steel specs for O&G piping, ASTM/API standards | Pipeline industry compliance knowledge |
| **Databricks (preferred)** | MS in AI coursework on distributed data, familiar with Delta Lake/Unity Catalog | Positioned to learn fast |
| **Salesforce (preferred)** | API integration experience, CRM data pipeline understanding | Can articulate RAG + Salesforce KB integration |

---

## 3. Most Likely Questions -- Core 45-min

### Q1: "Tell me about yourself and why you're interested in NRG."

**Why they ask:** Culture fit, genuine interest, communication skills.

**Answer (60 seconds max):**

> "I'm an AI engineer finishing my MS in AI at CU Boulder, focused on building production GenAI systems. Most recently, I solo-built SpecVault -- a 7-stage agentic RAG pipeline for oil and gas steel specifications that achieves **91.3% accuracy with zero hallucinations** across 80 golden queries on ASTM and API specs.
>
> NRG interests me specifically because of the **VPP initiative with Google Cloud** -- orchestrating 1 GW of distributed energy resources with AI is the kind of complex, high-stakes system I love building. The **$50M AI fund** and Dak's product operating model tell me NRG sees AI as core to the business, not a side project.
>
> I also bring energy domain experience -- I've spent months deep in oil and gas technical standards, so I understand the regulatory and compliance landscape energy companies navigate."

**Numbers to drop:** 91.3% accuracy, 0% hallucination, 7-stage pipeline, 3-month solo build.

---

### Q2: "Walk me through a project where you designed and deployed an AI system end-to-end."

**Why they ask:** JD says "design, develop, and implement AI models." They want proof you can go from zero to production.

**Situation:** "Engineers in O&G were manually searching 100-300 page ASTM and API specifications to find mechanical properties and compliance requirements. A single lookup could take 15-30 minutes, and cross-referencing specs like A789 vs A790 was error-prone -- they share 90% of content but have different yield strengths: **70 ksi vs 65 ksi** for the same alloy."

**Task:** "Build a production RAG system with cited sources, zero hallucinations, and sub-30-second latency."

**Action:** "I designed a 7-stage agentic pipeline:
1. **Query preprocessing** -- regex extracts ASTM/UNS codes, sets adaptive BM25/vector search weights
2. **Query decomposition** -- complex queries split into parallel sub-queries
3. **Hybrid search** -- BM25 + pgvector with document-scoped filtering to prevent cross-spec contamination
4. **Reranking** -- Voyage AI rerank-2 cross-encoder in **~200ms** (was 5-15s with LLM reranking)
5. **Generation** -- Claude Sonnet 4.5 with chain-of-thought prompting, SSE streaming
6. **Post-generation verification** -- 4 agents: answer grounding (regex, 100ms), anti-refusal detection (10 patterns), partial refusal detection, coherence validation (LLM judge)
7. **Confidence gate** -- weighted scoring (**35% retrieval, 25% grounding, 40% coherence**), regenerates below 55%"

**Result:** "**91.3% accuracy** on 80 golden queries. **96.3% source citation accuracy**. **Zero hallucinations**. Multi-hop comparisons score **96.9%** -- higher than single lookups because decomposition handles them better. P95 latency **24.2 seconds**, under the 30s target. Monthly cost: **~$20-35** using free tiers."

---

### Q3: "How do you gather business requirements and translate them to technical solutions?"

**Why they ask:** JD explicitly lists this responsibility.

**Key talking points:**
- "I started by shadowing the user workflow -- watching engineers manually search PDFs. The core requirement wasn't 'build a chatbot' but 'eliminate cross-specification confusion and provide cited, auditable answers.'"
- "That translated to technical requirements: document-scoped search filtering, numerical grounding verification, and confidence scores users could trust."
- "I built an **80-query golden dataset** from actual questions engineers ask, with expected answers validated against source documents. Every improvement was measured against this dataset -- that's how I went from **57% (naive RAG) to 91.3% (agentic pipeline)**."
- "At NRG, I'd apply the same approach: embed with the business team, understand actual workflows, define measurable success criteria, then iterate with evaluation-driven development."

---

### Q4: "How do you handle hallucinations in LLM-powered systems?"

**Why they ask:** THE fundamental risk in enterprise GenAI. Energy sector errors = safety/compliance failures.

**Multi-layered defense:**

1. **Retrieval quality** -- hybrid search with document-scoped filtering. `document-mapper.ts` resolves ASTM codes to specific document IDs. The LLM only sees relevant chunks from the correct spec.

2. **Prompt engineering** -- SCAN-SEARCH-VERIFY-CITE-RESPOND chain-of-thought. LLM instructed to never use training knowledge, only provided context. Formula guard detects formula requests and refuses if formula isn't in the chunks.

3. **Answer grounding** -- extracts every numerical value with units (MPa, ksi, HRC, %) using regex and verifies each exists in source chunks with **0.01 tolerance**. Pure regex = **~100ms**, no LLM call. If grounding < 50%, regenerates with explicit instructions.

4. **Confidence scoring** -- weighted composite: **35% retrieval + 25% grounding + 40% coherence**. Below **55%** triggers regeneration with targeted guidance based on the weakest component.

**Result:** approximately **0% hallucination rate** across 80 production queries.

---

### Q5: "Tell me about a time you had to debug a difficult technical problem."

**Why they ask:** Problem-solving depth, systematic thinking.

**Situation:** "Queries about S32205 duplex steel were returning the wrong yield strength -- 70 ksi instead of 65 ksi -- about 30% of the time. Both values are correct, but for different specs."

**Task:** "Diagnose why the system confused A789 (tubing, 70 ksi) vs A790 (pipe, 65 ksi) and fix it."

**Action:** "I built a **confusion matrix test** for A789 vs A790. Root cause: both documents share ~90% identical text, so vector similarity couldn't distinguish them. Three fixes:
1. `document-mapper.ts` resolves spec codes to document IDs and applies as search filters
2. Document-scoped deduplication -- chunks from different documents never merged even with 80%+ overlap
3. Cross-spec balanced retrieval -- when comparing two specs, each must have at least one chunk in the final set"

**Result:** "Cross-spec comparison accuracy: **100%** (10/10). The confusion matrix test became part of the CI suite. This pattern -- build a targeted test, fix, then regression-test forever -- became my standard approach."

---

### Q6: "How do you evaluate the quality of an AI system?"

**Why they ask:** They need someone who can measure, not just build.

**Test pyramid approach:**
- **Base -- 113 unit tests:** Component-level tests for chunking, query preprocessing, code extraction. Vitest in CI, no server needed.
- **Mid -- 80-query golden dataset:** Pattern-based validation across 8 specs. Each query has expected answer patterns (regex), expected citations, and negative patterns.
- **Top -- 8 production smoke tests:** Complex multi-hop queries, one per document.
- **LLM-as-judge -- RAGAS evaluation:** Faithfulness and relevancy scores.
- **Load testing -- k6 stress tests:** Nightly in CI with regression detection.

**Accuracy progression:** **57% -> 81% -> 88% -> 91.3%** (Nov -> Dec -> Jan -> Feb 2026). Each jump came from systematic failure analysis, not guessing.

**Production feedback loop:** Users provide thumbs up/down with issue classification. Diagnostic script auto-classifies root causes and routes to the specific pipeline module.

---

### Q7: "How do you handle rate limits, downtime, and reliability in production AI systems?"

**Why they ask:** Enterprise reliability is non-negotiable.

- **5-provider LLM fallback chain:** Anthropic Claude (primary) -> Groq -> Cerebras -> SambaNova -> OpenRouter. `ModelFallbackClient` detects 429 errors and auto-switches with **progressive backoff (500ms x 2^n, capped at 4s)**. Model-not-found errors skip immediately.

- **Calibrated timeouts:** 8 different values -- **45s for LLM generation, 15s for vector search, 20s for reranking, 8s for retrieval evaluation**. Non-critical operations fail open.

- **SSE streaming with 3-second heartbeat:** Solves Vercel's 10-second hobby tier timeout. Heartbeat is an SSE comment that clients ignore but proxies treat as activity.

- **Prompt truncation:** When prompts exceed a provider's token limit, truncation preserves whole chunks -- cuts at separator boundaries, not mid-sentence.

---

### Q8: "Where do you see GenAI creating the most value in the energy sector?"

**Why they ask:** Can you connect technology to business outcomes?

1. **Customer experience (biggest ROI):** "NRG's 7M+ customers across Reliant, Green Mountain, Direct Energy. RAG grounded in plan details, billing data, and tariffs -- not generic chatbot. My SpecVault approach maps directly: instead of ASTM specs, the knowledge base is customer plans and regulatory filings."

2. **VPP optimization:** "1 GW distributed resources. Load forecasting, battery dispatch, demand response signals -- prediction + decision problems where GenAI augments traditional ML."

3. **Predictive maintenance:** "Generation assets generate massive telemetry. Agentic AI monitors anomalies, cross-references maintenance manuals (literally RAG on technical documents), generates work orders."

4. **Energy trading and pricing:** "Real-time pricing in deregulated markets using weather, demand, and competitor data. LLMs can analyze regulatory filings and PUC dockets currently reviewed manually."

5. **Internal knowledge management:** "Decades of institutional knowledge across multiple acquisitions. Internal RAG over SOPs, compliance docs, training materials -- similar to what I built for steel specs."

---

### Q9: "Describe your experience with prompt engineering."

**Why they ask:** JD explicitly lists prompt development/refinement.

- **System prompt:** 5-step CoT framework -- **SCAN, SEARCH, VERIFY, CITE, RESPOND**. Reduced hallucinations from ~5% to ~0%. Role definition (materials engineer), specification-specific knowledge, table extraction guidance, hardness scale rules.

- **Multi-layer prompting:** User prompts wrapped in triple-quote delimiters with explicit instructions to treat as literal text (prevents prompt injection).

- **Targeted regeneration:** When answer grounding fails: "Your previous response contained numbers NOT found in source documents: [list]. Only quote values that appear EXACTLY in the context." When anti-refusal triggers: include chunk summary showing the LLM what data IS available.

- **Formula guard:** Detects formula requests, checks if formula exists in chunks. If not, injects refusal instruction preventing LLM from generating formulas from training knowledge.

---

### Q10: "How would you architect an AI system for NRG's scale (7M+ customers)?"

**Why they ask:** Can you think beyond prototypes?

**Three principles: decouple, cache, observe.**

- **Decouple:** Separate embedding pipeline (async, batch via Databricks) from query pipeline (real-time, horizontally scalable API layer). Document ingestion runs independently from query serving.

- **Cache:** At NRG's scale, many queries are variations of the same question ("What's my bill?", "When is my contract up?"). Semantic query caching with similarity thresholds could serve **60-70% of queries** without hitting the LLM. I already have query caching in SpecVault.

- **Observe:** Full pipeline tracing (Langfuse or equivalent). Every query gets a trace ID tracking: preprocessing, search latency, reranking scores, tokens used, verification results, confidence. Feeds into A/B testing.

- **Data layer:** Databricks for ETL + feature engineering, pgvector or Pinecone for vectors, Redis for caching.

---

### Q11: "What's your experience with cloud platforms?"

**Why they ask:** JD requires GCP/Azure/AWS. NRG uses AWS + Databricks.

- **Azure AI Engineer Associate** certification -- covers Azure OpenAI Service, Azure AI Search (vector), Azure ML production workloads.

- **SpecVault:** Vercel (serverless edge) + Supabase (PostgreSQL on AWS with pgvector). HNSW indexing for vector similarity search.

- **Cloud-agnostic design:** `ModelFallbackClient` abstracts provider APIs behind a common interface. Switching from Supabase/pgvector to OpenSearch or Vertex AI Vector Search = changing the search layer, not the app.

- **For NRG:** Leverage existing AWS + Databricks. Databricks for pipeline (Delta Lake for raw data, Unity Catalog for governance), AWS Bedrock or direct API for LLM inference, RDS/pgvector or OpenSearch for vectors.

---

### Q12: "Why should we hire you over other candidates?"

**Why they ask:** Closing question. Differentiate yourself.

**Three differentiators:**

1. **Already built what you're hiring for** -- a production agentic RAG system with verified accuracy, not a demo. 57% to 91.3% accuracy through systematic evaluation, not luck. I understand the gotchas: chunking, cross-document contamination, hallucination prevention, reranker tuning, LLM failover.

2. **Energy domain knowledge** -- months deep in ASTM and API specifications. I understand the stakes of getting technical data wrong in this industry. That translates directly to NRG's regulatory and compliance use cases.

3. **Builder's mindset with engineer's rigor** -- solo-built 25,700 lines of production TypeScript with 113 unit tests, 80 golden queries, and RAGAS evaluation in 3 months. Contribute to open source (AutoGen, LangChain, DSPy). Can prototype fast AND ship production-quality code.

---

## 4. Likely Technical Deep-Dives

### T1: "Explain your RAG architecture in detail."

**What they're testing:** Depth of understanding, not buzzword fluency.

Walk through the 7 stages with specifics:

| Stage | Key Detail | Latency |
|---|---|---|
| 1. Query Preprocessing | Regex extracts UNS/ASTM/API codes. Adaptive weights: exact codes = 0.6 BM25 / 0.4 vector; natural language = 0.3 / 0.7 | ~1ms |
| 2. Query Decomposition | Complex queries split into parallel sub-queries. Simple queries skip (fast path). Coverage validation checks all sub-queries | ~2s |
| 3. Hybrid Search | BM25 + pgvector in parallel via Supabase RPC. Table content gets **+0.15 boost**. Document filtering prevents cross-spec contamination | ~3s |
| 4. Reranking | Voyage AI rerank-2 cross-encoder. **~200ms for 40 docs**. Dynamic topK: 8 for API/comparisons, 5 for standard. LLM fallback | ~200ms |
| 5. Generation | Claude Sonnet 4.5 with CoT. SSE streaming with 3s heartbeat | ~8-10s |
| 6. Verification | 4 agents: grounding (regex, 100ms), anti-refusal (10 patterns), partial refusal (5 patterns), coherence (LLM, ~2s). Shared MAX_REGENS=3 | ~2-5s |
| 7. Confidence Gate | Weighted: 35/25/40. Below 55% triggers regen with targeted guidance | 0-10s |

---

### T2: "How does your hybrid search work? Why not just vector search?"

**What they're testing:** Understanding of retrieval tradeoffs.

- **The problem:** Pure vector search fails on exact identifiers. Embeddings for 'S31803' and 'S32205' are similar (both duplex steel), but they're different alloys with different properties. BM25 catches exact matches vectors miss.

- **Implementation:** BM25 and pgvector run **in parallel** via a single Supabase RPC function. Takes adaptive weights as parameters.

- **Weight adaptation:**
  - Multiple technical codes -> **0.7 BM25 / 0.3 vector**
  - Single code -> **0.6 / 0.4**
  - Property keywords (yield, tensile) -> **0.55 / 0.45**
  - Pure semantic -> **0.3 / 0.7**

- **Table boost:** Chunks with table content (detected via 8 regex patterns) get **+0.15** score boost. ASTM tables contain 90% of the data engineers need.

---

### T3: "How do you chunk documents for RAG?"

**What they're testing:** Chunking is the foundation of RAG quality.

- **Semantic chunking:** **1500 chars target, 800 min, 2500 max, 200 overlap**

- **Table preservation (key innovation):** ASTM specs store critical data in tables. Chunker detects boundaries using ASTM-specific patterns and keeps tables intact -- never splits mid-row.

- **Large table handling:** When a table exceeds max size, split BUT **prepend header row to each subsequent chunk**. Without this, LLM sees numbers without column labels.

- **Metadata per chunk:** page number, section title, chunk type (text/table/list/heading), technical codes detected, confidence score, character offsets for citation highlighting

- **200-char overlap:** Sentences split between chunks appear in both, preserving context.

---

### T4: "How do you ensure LLM responses are grounded in source documents?"

**What they're testing:** Hallucination prevention at implementation level.

- **Answer grounding agent** (`answer-grounding.ts`): **pure regex, ~100ms**

- `extractNumericalValues()` finds all numbers with units (MPa, ksi, HRC, %) in the response. Verifies each exists in source chunks with **0.01 tolerance**.

- Secondary check for bare numbers (ASTM tables often have values without adjacent units -- units are in header row).

- Text-only responses (no numerical claims) get score **70** -- not 100 -- because nothing was verified.

- If grounding < 50%, regenerates with prefix listing specific ungrounded numbers.

---

### T5: "What is your experience with agentic AI frameworks?"

**What they're testing:** JD requires agentic frameworks.

- **SpecVault IS an agentic system** -- 7 autonomous stages that make decisions, evaluate results, and self-correct.

- **Retrieval evaluator:** After retrieval, an LLM call assesses if chunks can answer the query. Low confidence triggers retry with different strategy (broader search, section lookup, more candidates). Up to **2 retries** within **25-second time budget**.

- **Post-generation verification:** 4 agents share **MAX_REGENS=3** budget. Each can trigger targeted regeneration. Constrained multi-agent system that prevents infinite loops.

- **Open source contributions:** AutoGen (human-in-the-loop state preservation), LangChain/LangGraph (enterprise approval workflows), DSPy (signature optimizer for ECR classification, 25% token reduction).

- **For NRG:** LangGraph for complex workflows (customer escalation, regulatory compliance). AutoGen for multi-agent collaboration (data retrieval + analysis + report generation).

---

### T6: "How would you build a RAG system on Databricks?"

**What they're testing:** Can you work with NRG's actual stack?

- **Ingestion:** PDFs land in Unity Catalog volume -> Spark job extracts text and chunks -> Embeddings via Databricks Model Serving endpoint -> Stored in Delta table with vector index

- **Vector search:** Mosaic AI Vector Search backed by Delta Lake. SQL-like filtering for metadata (document type, date, customer segment).

- **Generation:** Databricks Foundation Model API or external API calls (Claude/GPT).

- **NRG advantage:** Customer data in Databricks can join with vector search results. Customer service RAG retrieves plan documents AND billing history in a single pipeline.

- **vs. my current stack:** Databricks handles data engineering (Delta Lake versioning, Unity Catalog governance, Spark parallel chunking). I'd focus on the AI orchestration layer.

---

### T7: "Explain the tradeoffs in your embedding and reranking choices."

**What they're testing:** Do you understand why, not just what.

**Embeddings -- Voyage AI voyage-3-lite (1024 dims):**
1. **200M tokens/month free tier** -- I use ~20M, so $0
2. 1024 dims = sweet spot: enough for semantic fidelity, fast HNSW search
3. Voyage specializes in retrieval embeddings, outperforms generic models

**Reranking -- Voyage AI rerank-2 cross-encoder:**
- Cross-encoders score (query, document) pairs jointly -- fundamentally more accurate than bi-encoder embeddings
- But expensive on many docs. My approach: cheap bi-encoder narrows thousands of chunks to ~40 candidates, then cross-encoder reranks in **~200ms**
- Previous LLM reranking: **5-15 seconds** -- a **10-50x improvement**
- Chunk window: **800-1000 chars**. Tested 400, 800, 1200. At 400, table headers cut off. At 1200, latency increased without accuracy gains. 800 preserves **6-8 table rows** with headers.

---

### T8: "How do you handle streaming responses?"

**What they're testing:** Production deployment skills.

- **SSE (Server-Sent Events)** with `ReadableStream` in Next.js

- **Challenge:** Vercel's **10-second timeout** on hobby tier

- **Solution:** 3-second heartbeat sends SSE comments (`: heartbeat\n\n`). Ignored by clients, treated as activity by proxies/load balancers. Keeps connection alive for full 13-24s pipeline.

- Pipeline runs fully server-side -- retrieval, reranking, generation, verification all complete before final response. Not token-level streaming -- I stream the complete verified response to ensure all post-generation checks have run.

- Error handling: safe error messages via SSE stream (no internals leaked). Heartbeat interval cleared in `finally` block to prevent memory leaks.

---

### T9: "What's your testing strategy for AI systems?"

**What they're testing:** Engineering rigor.

**4-tier pyramid:**

| Tier | What | Count | Runner |
|---|---|---|---|
| Unit tests | Component-level (chunking, preprocessing, scoring) | 113 | `npm test` (Vitest) |
| Golden dataset | End-to-end accuracy with expected patterns | 80 queries | `npm run test:accuracy` |
| Confusion matrix | Cross-spec contamination detection | A789/A790 pairs | `npm run test:confusion` |
| Smoke tests | Complex multi-hop queries, one per doc | 8 | `npx tsx scripts/production-smoke-test.ts` |

Plus: RAGAS LLM-as-judge, k6 load testing (nightly in CI), production feedback loop.

**CI gates:** PRs blocked if RAG accuracy < 90%. Nightly stress tests with regression detection against baseline metrics.

---

### T10: "How do you manage costs when using multiple LLM providers?"

**What they're testing:** Business awareness.

**Monthly cost breakdown: ~$20-35 total**

| Component | Cost | Why |
|---|---|---|
| Embeddings (Voyage AI) | **$0** | 200M tokens/month free, I use ~20M |
| Reranking (Voyage AI) | **~$2.50** | $0.05 per 1000 reranks |
| Primary LLM (Claude) | **$15-30** | ~500K tokens/day |
| Database (Supabase) | **$0** | Free tier (500MB) |
| Hosting (Vercel) | **$0** | Free tier |

**Cost optimization:**
1. Query caching skips entire pipeline for repeat queries
2. Embedding caching avoids re-embedding identical queries
3. Fast path skips decomposition + evaluation for simple queries
4. Prompt truncation with chunk boundary preservation
5. Free-tier fallback providers (Groq, Cerebras, SambaNova) handle overflow at $0

---

## 5. Behavioral/Situational Questions

### B1: "Tell me about a time you failed and what you learned."

**Situation:** "Initial RAG system launched at **57% accuracy** -- barely better than keyword search."

**Action:** "Instead of adding features, I built the 80-query golden dataset and did systematic failure analysis. Categorized every wrong answer: wrong spec cited (35%), missing table data (25%), false refusal (20%), hallucinated numbers (10%), other (10%). Each category pointed to a specific pipeline stage."

**Result:** "That failure-first approach drove 57% -> 91.3%. Lesson: **you can't improve what you don't measure**. Now I always build the evaluation harness before the feature."

---

### B2: "How do you prioritize when you have competing deadlines?"

- "I prioritize by **impact on accuracy metrics**. Voyage AI reranking was the biggest lever (latency AND accuracy), so it went first. Content deduplication (removing 7,454 redundant chunks) was second -- reduced noise for all queries. Confidence reweighting was third -- a tuning change, not a new feature."
- "I use the test suite as a prioritization tool: run the golden dataset, identify most common failures, fix those first."

---

### B3: "Describe a situation where you had to learn a new technology quickly."

- "When I needed cross-encoder reranking, I evaluated three options in a single weekend: Cohere Rerank, Voyage AI rerank-2, and LLM-based scoring. Set up A/B tests using my golden dataset, measured accuracy and latency, shipped Voyage AI by Monday."
- "Key: having evaluation infrastructure already in place. I didn't need to build the test -- just swap the strategy and run the suite."
- "At NRG, if I need Databricks, same approach: small prototype, measure against a benchmark, iterate."

---

### B4: "How do you handle disagreements with teammates about technical approaches?"

- "Data over opinions. When debating Voyage AI reranking vs improved chunking, I ran both experiments against the golden dataset. Reranking won: **+3 percentage points accuracy** with **50x latency improvement**. Chunking improvements added +1 point."
- "At Testmachine, when the ML team wanted to ship a model I believed had insufficient testing, I didn't argue abstractly -- I built the test suite that proved the gaps. Data settled the debate."

---

### B5: "Tell me about explaining a complex concept to a non-technical audience."

- "My SpecVault demo for O&G procurement engineers. I didn't explain embeddings or cross-encoders. I showed the **side-by-side comparison** that runs the same query through RAG and a generic LLM. The generic LLM hallucinated a yield strength. My system returned the correct value with a page citation. That visual made the value proposition instantly clear."

---

### B6: "How do you stay current with the rapidly evolving AI landscape?"

Three channels:
1. **Open source contributions** to AutoGen, LangChain, DSPy -- see PRs and issues before they become blog posts
2. **MS in AI at CU Boulder** -- structured learning with peers building diverse systems
3. **Building production systems** -- the fastest way to learn what works is to deploy it and measure it

---

### B7: "Describe your approach to documentation and knowledge sharing."

- "SpecVault has: `CLAUDE.md` (developer reference), `AGENTS.md` (pipeline architecture), `CONTRIBUTING.md`, inline JSDoc on every export. If a new engineer can't understand the system from docs alone, the docs are insufficient."
- "I document architectural decisions with rationale -- WHY coherence has 40% weight, WHY the reranker window is 800 chars. Future teammates need WHY, not just WHAT."

---

### B8: "Tell me about a time you improved an existing process."

**Situation:** "Reranking used LLM-based scoring -- asking an LLM to rate chunks 0-10. Worked but took **5-15 seconds** and was inconsistent."

**Action:** "Integrated Voyage AI rerank-2 as primary with LLM fallback. Changed interface to normalize Voyage's 0-1 scores to 0-10 scale, added sub-query context, tuned chunk truncation window."

**Result:** "**10-50x latency reduction** (~200ms vs 5-15s). P50 dropped by ~5 seconds. Accuracy maintained at 91.3%. Transparent to users -- same API, faster responses."

---

## 6. Energy Domain Questions

### E1: "What do you know about deregulated energy markets?"

- In deregulated markets like **ERCOT (Texas)**, generation, transmission, and retail are separated. Retail providers compete on price, plan structures, and customer experience. Customers can switch, creating **churn risk**.
- AI opportunities: **churn prediction** (identify and retain), **dynamic pricing** (optimize rates based on wholesale prices, weather, demand), **customer segmentation** (personalize plans using usage patterns).
- NRG's advantage: **vertical integration** -- owning generation assets AND retail brands lets you optimize the full value chain with AI.

---

### E2: "How would AI improve customer service for millions of energy customers?"

- RAG grounded in customer-specific data: plan details, billing history, outage reports, regulatory tariffs. Cited answers like: *"Your current rate is $0.12/kWh under the Reliant Secure-12 plan, expiring March 2026 [source: account #12345]."*
- Multi-language support critical for Texas (English + Spanish). LLMs handle natively.
- Escalation routing: agentic system handles routine queries autonomously (80-90% of volume), escalates complex issues to human agents with full context pre-loaded.

---

### E3: "What is a Virtual Power Plant and how does AI enable it?"

- VPP aggregates distributed energy resources (rooftop solar, batteries, thermostats, EV chargers) and orchestrates them as a single entity for grid services. NRG's VPP with Google Cloud: **1 GW capacity**.
- AI enables: (1) **Load forecasting** at household level; (2) **Dispatch optimization** for battery charge/discharge; (3) **Demand response signals** coordinating millions of devices; (4) **Anomaly detection** for malfunctioning devices.
- GenAI: natural language interfaces for VPP operators + automated regulatory compliance reporting.

---

### E4: "How would you handle sensitive customer data in an AI system?"

1. **Row-Level Security (RLS)** -- I already use this in SpecVault with Supabase. Customers query only their own data.
2. **Data anonymization** for training -- strip PII before model fine-tuning
3. **Signed URLs with short expiry** (I use 5-minute TTLs for document access)
4. **Prompt injection prevention** -- triple-quote delimiters, explicit literal text instructions
- For NRG: Salesforce data via API should never be cached in plain text. Vector embeddings of customer data need same access controls as source data.

---

### E5: "How would you integrate AI with NRG's existing Salesforce and SAP systems?"

- **Salesforce:** REST/SOQL APIs to pull customer records, case histories, plan details into RAG context. Custom RAG grounded in actual contract terms and tariffs goes deeper than Einstein AI.
- **SAP S/4HANA:** API layer for real-time billing, consumption, and asset data. AI answers: "What was my average daily usage last month?" by querying SAP in real-time.
- **Key pattern:** Retrieval augmentation from **structured databases alongside unstructured document search**. My SpecVault architecture handles both: pgvector for documents + SQL for metadata.

---

## 7. System Design Questions

### S1: "Design an AI-powered customer service system for NRG's 7M customers."

```
[Customer Query]
    |
    v
[Intent Classification] -- billing, outage, plan change, technical, escalation
    |
    v
[Context Assembly]
    |-- Salesforce: customer record, plan details, case history
    |-- SAP: billing data, consumption data
    |-- Vector DB: FAQ corpus, regulatory docs, plan terms
    |-- Real-time: outage map API, weather API
    |
    v
[RAG Pipeline]
    |-- Hybrid search (BM25 + vector) over assembled context
    |-- Cross-encoder reranking
    |-- LLM generation with citations
    |-- Grounding verification
    |
    v
[Response + Confidence]
    |-- High (>80%): return directly
    |-- Medium (50-80%): return with disclaimer
    |-- Low (<50%): escalate to human with context
    |
    v
[Feedback Loop] --> retrain classifier, update FAQ, improve prompts
```

**Key decisions:**
- Stateless API layer behind load balancer (horizontal scaling)
- Redis for semantic query cache (skip LLM for repeat questions)
- RLS for customer data isolation
- Target P95 < 10s for routine queries, up to 30s for complex with streaming

---

### S2: "Design a document Q&A system for regulatory filings and compliance."

- "Closest to what I've already built."
- **Ingestion:** PDF -> OCR (Gemini Vision for scans) -> semantic chunking with table preservation -> embeddings -> pgvector/Pinecone
- **Query:** Same 7-stage architecture, document-mapper adapted for regulatory codes
- **Key difference:** Compliance docs change frequently. Need versioning system for document revisions and queries against specific versions.
- **Access control:** RLS policies scoped to team membership.

---

### S3: "Design an AI system for predictive maintenance of generation assets."

- **Data layer:** Telemetry from gas turbines, solar inverters, wind turbines -> Databricks via Kafka. Delta Lake stores raw sensor data with time-travel.
- **ML layer:** Time-series anomaly detection (Prophet, LSTM, or Transformer) trained on historical failure data. Feature engineering in PySpark.
- **GenAI layer:** When anomaly detected, RAG queries equipment maintenance manual to generate recommended action plan with citations to specific manual sections.
- **Output:** Work order in SAP: anomaly description + recommended action with manual citation + predicted time-to-failure + priority score.

---

## 8. Curveball Questions

### G1: "We use Databricks heavily. What's your experience?"

**Honest + pivot:**
- "Haven't used Databricks in production, but I understand the architecture from my MS in AI: Delta Lake for ACID data lakes, Unity Catalog for governance, MLflow for experiment tracking, Mosaic AI for model serving."
- "My SpecVault architecture maps naturally: replace Supabase pgvector with Mosaic AI Vector Search, Spark for parallel chunking instead of single-threaded Node.js, Delta Lake for versioned document storage."
- "What I'd need: Databricks operational patterns, job scheduling, workspace management. The conceptual model is familiar."

---

### G2: "Have you worked with Kafka or event streaming?"

**Honest + pivot:**
- "Not Kafka in production, but my SSE streaming implementation is event-driven -- `ReadableStream` API is architecturally similar to consuming from an event stream."
- "For NRG: Kafka for the event bus (meter data, grid signals, VPP dispatch), Databricks Structured Streaming for real-time processing, trigger AI pipelines on specific event patterns."

---

### G3: "Our primary language is Python. How do you feel about that?"

- "Comfortable. MS in AI at CU Boulder is Python-heavy -- PyTorch, scikit-learn, pandas, NumPy. I chose TypeScript for SpecVault because it's native to Next.js/Vercel, but the patterns are language-agnostic."
- "In Python: LangChain/LangGraph for orchestration, FAISS or ChromaDB for vectors, FastAPI for serving, pytest for testing. Same golden dataset approach, different syntax."

---

### G4: "What's your experience with fine-tuning models?"

**Honest + pivot:**
- "My production work uses **prompt engineering and RAG** rather than fine-tuning, because for enterprise knowledge tasks, RAG gives updatable knowledge without retraining costs."
- "I understand the pipeline: prepare JSONL training data, upload to provider (OpenAI, Anthropic, Databricks Model Serving), train, evaluate on held-out set, A/B test against base model."
- "For NRG: fine-tuning for customer service tone (train on best human agent responses) or domain-adapted model for energy terminology."

---

### G5: "How would you use PySpark for data processing in our AI pipeline?"

- "Ideal for ingestion and feature engineering at NRG's scale. Document processing: `spark.read.binaryFiles()` for parallel PDF loading, UDFs for text extraction and chunking, `broadcast()` for small lookup tables."
- "Customer analytics: PySpark DataFrames for aggregating usage across 7M customers, window functions for time-series features (rolling averages, peak detection), MLlib for batch predictions."
- "Output feeds Mosaic AI Vector Search (for RAG) or Delta tables (for structured features)."

---

## 9. Questions to Ask Them

### 1. "What does the AI/ML team structure look like -- is the Gen AI Engineer embedded in a product team or a centralized platform team?"
Shows you understand the product operating model.

### 2. "Is the VPP dispatch optimization with Google Cloud part of this role's scope, or handled by a separate team?"
Demonstrates you've researched their biggest AI initiative.

### 3. "How are you thinking about build-vs-buy for GenAI tooling -- managed services like AWS Bedrock, or custom pipelines?"
Strategic thinking + helps you understand what you'd actually build.

### 4. "What does the evaluation and testing process look like for AI systems today? Do you have golden datasets or automated accuracy testing in CI?"
Positions you as quality-focused. Lets you offer your evaluation-driven approach.

### 5. "How does data governance work for AI at NRG? With customer data across Salesforce, SAP, and Databricks, how do you handle access controls for LLM systems?"
Shows enterprise awareness.

### 6. "What's the biggest unsolved AI problem at NRG right now -- the one with the most business impact if solved?"
Forward-looking. Shows you want high-impact work.

### 7. "How does NRG measure success for AI initiatives -- cost savings, customer satisfaction, something else?"
Shows you think in business outcomes.

### 8. "What does the first 90 days look like for this role? What would success look like by month three?"
Practical. Shows you're thinking about ramp-up and delivery.

---

## 10. 30-Second Pitch + Numbers to Memorize

### The Pitch

> "I'm David Fernandez, an AI engineer finishing my MS in AI at CU Boulder. I solo-built SpecVault -- a 7-stage agentic RAG pipeline for oil and gas steel specifications that achieves 91.3% accuracy with zero hallucinations across 80 golden queries. It uses hybrid BM25-plus-vector search, Voyage AI cross-encoder reranking, Claude generation, and four post-generation verification agents -- all with a 5-provider LLM failover chain for production reliability. I'm Azure AI certified, I contribute to AutoGen and LangChain, and I bring energy domain expertise. NRG's AI ambitions -- the VPP, the AI venture fund, the product operating model -- are exactly the kind of high-impact work I want to do."

**Practice until 25-30 seconds.** If running long, cut "Azure AI certified" and "contribute to AutoGen and LangChain" -- the SpecVault stats are the hook.

---

### Quick-Reference Numbers to Memorize

| Metric | Value | Context |
|---|---|---|
| Overall accuracy | **91.3%** (73/80) | 80-query golden dataset, 8 specs |
| Source citation | **96.3%** (77/80) | Every claim has page reference |
| Hallucination rate | **~0%** | Regex-based numerical grounding |
| Multi-hop accuracy | **96.9%** | Cross-spec comparisons |
| P50 / P95 latency | **13s / 24.2s** | Target was P95 < 30s |
| Reranking latency | **~200ms** | Was 5-15s with LLM (10-50x faster) |
| Accuracy progression | **57% -> 81% -> 88% -> 91.3%** | Nov -> Dec -> Jan -> Feb 2026 |
| Codebase | **~25,700 lines TypeScript** | 33 lib modules, 7 API routes |
| Build timeline | **3 months** | Solo build, Nov 2025 - Feb 2026 |
| Unit tests | **113** | 0 skipped |
| Monthly cost | **~$20-35** | Free tiers for embeddings, DB, hosting |
| Dedup impact | **7,454 chunks removed** | ~75% noise reduction |
| Confidence weights | **35 / 25 / 40** | Retrieval / Grounding / Coherence |
| Max regenerations | **3** | Shared across all verification agents |
| Chunk sizes | **1500 target, 800 min, 2500 max** | Table-preserving semantic chunking |
| Embedding dimensions | **1024** | Voyage AI voyage-3-lite |

### NRG Numbers to Know

| Metric | Value |
|---|---|
| Revenue | **~$30B** |
| Customers | **7M+** |
| VPP capacity | **1 GW** (residential) + **6 GW** (C&I via CPower) |
| AI venture fund | **$50M** |
| Generation capacity | **~25 GW** (post LS Power acquisition) |
| Vivint households | **2M+** |
| Data center power deals | **445 MW** |
| CTO | **Dak Liyanearachchi** |

---

## Study Schedule Suggestion

**Day 1:** Read through everything. Highlight anything that feels unfamiliar. Practice the 30-second pitch out loud 10 times.

**Day 2:** Practice Q1-Q5 out loud (most likely questions). Time yourself -- each answer should be 60-90 seconds max. Drill the numbers table.

**Day 3:** Practice Q6-Q12 and behavioral questions B1-B4. Practice the system design whiteboard (S1) by drawing it on paper in under 3 minutes.

**Day before:** Quick review of NRG intel section. Practice your 8 questions to ask them. Do one final run-through of the 30-second pitch. Get a good night's sleep.

**In the interview:** Listen more than you talk. Let them guide the conversation. When they ask a broad question, give a concise answer first, then offer to go deeper: "Would you like me to walk through the technical details?" This shows confidence without rambling.
