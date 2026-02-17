# Security Policy -- SteelAgent

## Implemented Protections

These security measures are live in production:

### Authentication & Authorization

| Feature | Implementation | File |
|---------|---------------|------|
| **Email/Password Auth** | Supabase Auth with email verification | `lib/auth.ts` |
| **API Key Auth** | SK-prefixed, SHA-256 hashed, expiration support | `lib/auth.ts` |
| **Session Management** | Secure cookies, HTTP-only, SameSite | `middleware.ts` |
| **Route Protection** | Middleware checks session or API key on protected routes | `middleware.ts` |
| **Role-Based Access** | User/Admin/Enterprise roles on `users` table | `003_add_user_tables.sql` |

### Input Validation & Rate Limiting

| Feature | Implementation | File |
|---------|---------------|------|
| **Rate Limiting** | Upstash Redis (sliding window) + in-memory fallback | `lib/rate-limit.ts` |
| **Per-Route Limits** | `/api/chat`: 30/min, `/api/documents/*`: 5-10/min | `middleware.ts` |
| **Quota Enforcement** | Per-workspace query/document/API call limits | `lib/quota.ts` |
| **Input Length Validation** | Max query length, file size limits (50MB) | API route handlers |
| **File Type Validation** | PDF-only uploads with MIME type checking | `documents/upload/route.ts` |

### Data Isolation

| Feature | Implementation | File |
|---------|---------------|------|
| **Row Level Security (RLS)** | Workspace-scoped policies on all tables | `006_update_rls_policies.sql` |
| **Document Scoping** | Documents/chunks filtered by workspace_id | RLS policies |
| **API Key Scoping** | Keys belong to specific workspaces | `003_add_user_tables.sql` |
| **Anonymous Access Blocked** | `REVOKE ALL ON ALL TABLES FROM anon` (except leads) | `006_update_rls_policies.sql` |

### Network Security

| Feature | Implementation | File |
|---------|---------------|------|
| **CSRF Protection** | Origin/Referer validation on state-changing requests; rejects requests missing both headers | `middleware.ts` |
| **CORS Whitelist** | Exact-match origin validation: `localhost:3000`, `localhost:3001`, `steelagent.ai`, `NEXT_PUBLIC_APP_URL` | `middleware.ts` |
| **Stripe Webhook Verification** | HMAC-SHA256 signature verification on all Stripe webhook events via `stripe.webhooks.constructEvent()` | `api/webhooks/stripe/route.ts` |
| **Error Sanitization** | Server errors return generic messages, no stack traces | API route handlers |
| **HTTPS** | Enforced by Vercel (auto SSL) | Vercel configuration |

### Audit & Observability

| Feature | Implementation | File |
|---------|---------------|------|
| **Audit Logging** | Document uploads, deletions, API key creation/revocation | `006_update_rls_policies.sql` |
| **Request Logging** | Method, path, IP, duration, rate limit remaining | `middleware.ts` |
| **Pipeline Tracing** | Full query lifecycle tracing (Langfuse) | `lib/langfuse.ts` |

---

## Security Architecture

### Middleware Flow

Every request to protected routes goes through this pipeline:

```
Request
  |
  +-- 1. Authentication Check
  |     - Check session cookie (browser)
  |     - Check x-api-key header (programmatic)
  |     - Unauthenticated? -> 401 (API) or redirect to /auth/login (page)
  |
  +-- 2. CSRF Protection
  |     - Validate Origin or Referer header on POST/PUT/DELETE/PATCH
  |     - Mismatch? -> 403 Forbidden
  |
  +-- 3. Rate Limiting
  |     - Check per-route limit (Upstash Redis sliding window)
  |     - Exceeded? -> 429 Too Many Requests + Retry-After header
  |
  +-- 4. Quota Enforcement
  |     - Check workspace query/document/API call quotas
  |     - Exceeded? -> 429 Quota Exceeded + reset date
  |
  +-- 5. Route Handler
        - Process request with validated, authenticated, rate-limited context
```

### Route Classification

| Route Pattern | Access Level | Auth Required | Rate Limited |
|--------------|-------------|---------------|--------------|
| `/` | Public | No | No |
| `/auth/*` | Public | No | No |
| `/privacy`, `/terms` | Public | No | No |
| `/api/leads` | Public | No | Yes (10/min) |
| `/api/chat` | Protected | Yes | Yes (30/min) |
| `/api/documents/*` | Protected | Yes | Yes (5-10/min) |
| `/api/feedback` | Protected | Yes | Yes (30/min) |
| `/api/billing/*` | Protected | Yes | No |
| `/api/webhooks/stripe` | Public | No (signature-verified) | No |
| `/pricing` | Public | No | No |
| `/api/auth/api-keys` | Protected | Yes | Yes |
| `/dashboard/*` | Protected | Yes | No |
| `/account/*` | Protected | Yes | No |

### RLS Policy Summary

| Table | Policy | Scope |
|-------|--------|-------|
| `documents` | SELECT/INSERT/UPDATE/DELETE | Workspace members only |
| `chunks` | SELECT/INSERT | Workspace members only |
| `feedback` | SELECT/INSERT | Workspace members only |
| `users` | SELECT own profile, UPDATE own profile | Self only |
| `workspaces` | SELECT/UPDATE | Workspace owner only |
| `user_api_keys` | SELECT/INSERT/DELETE | Key owner only |
| `usage_quotas` | SELECT | Workspace members only |
| `leads` | INSERT | Anonymous (public) |

---

## Planned Security Enhancements

### High Priority (Pre-Revenue)

- [x] **Stripe Webhook Signature Verification** -- Implemented in `app/api/webhooks/stripe/route.ts` using `stripe.webhooks.constructEvent()`. Prevents forged subscription events.

- [ ] **Content Security Policy (CSP)** -- Add CSP headers to prevent XSS:
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
  ```

- [ ] **HSTS (Strict-Transport-Security)** -- Force HTTPS:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

- [x] **CORS Exact-Match Validation** -- Fixed `startsWith()` bypass vulnerability. Origins are now validated via exact match only. Localhost included for development only.

### Medium Priority (Post-Revenue)

- [ ] **API Key Rotation Reminders** -- Notify users when API keys are > 90 days old.
- [ ] **Bcrypt for API Keys** -- Upgrade from SHA-256 to bcrypt hashing (slower but more secure against brute force).
- [ ] **IP Allowlisting** -- Enterprise feature: restrict API access to specific IP ranges.
- [ ] **Request Signing** -- HMAC-signed requests for enterprise API integrations.

### Long-Term (Enterprise Compliance)

- [ ] **SOC 2 Type I Audit** -- Security controls baseline (target Q4 2026).
- [ ] **SOC 2 Type II Audit** -- Ongoing compliance verification (target Q2 2027).
- [ ] **Penetration Testing** -- Annual third-party security audit.
- [ ] **ISO 27001 Certification** -- International information security standard.
- [ ] **GDPR Data Subject Requests** -- Automated data export and deletion workflows.

---

## Human-in-the-Loop Safety

Materials compliance is safety-critical. Incorrect specification data can lead to material failures in structural, pressure, or corrosive service applications.

### AI Disclaimer

All AI-generated responses must include:

> *"This information is AI-generated from indexed specifications. It is not a substitute for professional engineering judgment. Always verify critical data against the original specification document."*

### Confidence Transparency

Every response includes a confidence score (0-100%) derived from:
- Retrieval quality (35% weight)
- Answer grounding (25% weight)
- Response coherence (40% weight)

Users can see exactly how confident the system is in each answer.

### Planned: Confidence-Gated Human Review

| Confidence | Action | Rationale |
|-----------|--------|-----------|
| **> 70%** | Auto-deliver with disclaimer | High confidence, verified against sources |
| **55-70%** | Deliver with "low confidence" warning | Potentially incomplete, suggest manual verification |
| **< 55%** | Queue for human expert review | Insufficient evidence, needs human validation |

Enterprise customers can designate a qualified materials engineer as a reviewer. Every human review is logged in the `audit_logs` table for compliance.

### No Training on Customer Data

All LLM calls use the Anthropic API. Per Anthropic's data policy, **customer inputs are not used for model training**. Documents are processed locally for text extraction and embedding only -- the full document content is never sent to the LLM (only retrieved chunks are included in prompts).

---

## Data Handling

### Storage

| Data Type | Location | Encryption | Retention |
|-----------|----------|------------|-----------|
| User profiles | Supabase PostgreSQL | At-rest (AES-256) | Account lifetime |
| Documents (PDF) | Supabase Storage | At-rest (AES-256) | Until user deletes |
| Text chunks + embeddings | Supabase PostgreSQL | At-rest (AES-256) | Until document deleted |
| Query history | Not stored persistently | N/A | Session only |
| Feedback | Supabase PostgreSQL | At-rest (AES-256) | Indefinite (anonymizable) |
| API keys | Supabase PostgreSQL | SHA-256 hashed | Until revoked |

### Data Deletion

Users can:
1. Delete individual documents (cascades to chunks and embeddings)
2. Revoke API keys
3. Request full account deletion (removes user, workspace, all associated data)

Enterprise customers can request data deletion via their account manager.

---

## Vulnerability Reporting

### Private Disclosure

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email the security team with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow reasonable time for remediation before disclosure

### Scope

In scope:
- Authentication bypasses
- Authorization failures (accessing other workspaces' data)
- SQL injection, XSS, CSRF
- API key leakage
- Rate limit bypasses
- Data exposure

Out of scope:
- Social engineering
- Denial of service attacks
- Issues in third-party services (Supabase, Vercel, Anthropic)
- Theoretical attacks without proof of concept

### Response Timeline

| Severity | Response Time | Fix Timeline |
|----------|--------------|--------------|
| Critical (data breach, auth bypass) | 24 hours | 48 hours |
| High (privilege escalation) | 48 hours | 1 week |
| Medium (information disclosure) | 1 week | 2 weeks |
| Low (best practice) | 2 weeks | Next release |
