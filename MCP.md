# MCP Configuration -- SteelAgent

## Overview

MCP (Model Context Protocol) servers extend Claude Code with tools for file access, GitHub integration, database queries, and documentation lookup. This is a large codebase (~140+ TypeScript files, 45 library modules) so MCP tools are essential for efficient development.

Configuration: `.mcp/config.json`

---

## Active Servers

| Server | Package | Purpose |
|--------|---------|---------|
| filesystem | `@anthropic/mcp-server-filesystem` | Read/write project files |
| github | `@anthropic/mcp-server-github` | PR and issue management |

### Configuration

`.mcp/config.json`:
```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "."]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

---

## Recommended Additions

### context7 (Library Documentation)

Up-to-date docs for Next.js 16, React 19, Supabase, Tailwind CSS, and other dependencies. Essential for a codebase using bleeding-edge framework versions.

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@context7/mcp-server"]
}
```

**Use cases:**
- Look up Next.js 16 App Router APIs
- Check Supabase client methods for RLS-aware queries
- Verify React 19 hook behaviors
- Reference Tailwind CSS utility classes

### Supabase MCP Server (Direct DB Access)

Query the documents table, inspect vector search results, debug indexed chunks, and check RLS policies directly from Claude Code. Critical for debugging RAG pipeline issues.

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server"],
  "env": {
    "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
    "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_KEY}"
  }
}
```

**Use cases:**
- Inspect chunk content for a specific document
- Debug hybrid search results (BM25 + vector scores)
- Check RLS policies are working correctly
- Verify dedup migration results
- Query usage_quotas and audit_logs tables

**Note**: Requires `SUPABASE_SERVICE_KEY` (not the anon key). Only use for development debugging -- never expose the service key in client-side code.

### Sequential Thinking (Complex Reasoning)

Multi-step reasoning for complex debugging and architecture decisions. Useful for tracing issues through the 7-stage agentic pipeline.

```json
"sequential-thinking": {
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-sequential-thinking"]
}
```

**Use cases:**
- Debug multi-stage pipeline failures (which stage failed and why?)
- Plan architectural changes across multiple files
- Trace data flow through the RAG pipeline
- Analyze accuracy regressions systematically

### Brave Search (Web Research)

Search the web for documentation, error messages, and best practices. Useful when working with rapidly-evolving dependencies.

```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "${BRAVE_API_KEY}"
  }
}
```

**Use cases:**
- Look up Voyage AI reranker API changes
- Research Stripe webhook best practices
- Find solutions for Vercel deployment issues
- Check for known Supabase pgvector issues

---

## Full Recommended Configuration

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "."]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-sequential-thinking"]
    }
  }
}
```

---

## Development Workflow with MCP

### Common Development Tasks

| Task | MCP Server | Example |
|------|-----------|---------|
| Find a file by name | filesystem | `list_directory lib/` |
| Read pipeline code | filesystem | `read_file lib/reranker.ts` |
| Check chunk content in DB | supabase | `SELECT content FROM chunks WHERE document_id = '...' LIMIT 5` |
| Debug RLS policies | supabase | `SELECT * FROM pg_policies WHERE tablename = 'documents'` |
| Look up Next.js API | context7 | "How does SSE streaming work in Next.js App Router?" |
| Create a PR | github | `create_pull_request` with title and body |
| Trace pipeline issue | sequential-thinking | Step through the 7 stages systematically |

### Debugging the RAG Pipeline

When a query returns incorrect results, use MCP tools to trace the issue:

1. **Check the query** -- Use filesystem to read `lib/query-preprocessing.ts` and verify code extraction
2. **Inspect search results** -- Use supabase to run the hybrid search function and examine returned chunks
3. **Check document mapping** -- Use supabase to verify the document_id resolution in `lib/document-mapper.ts`
4. **Examine reranker scores** -- Use filesystem to check `lib/reranker.ts` scoring logic
5. **Trace regeneration** -- Use sequential-thinking to reason through why post-generation agents triggered

---

## Custom MCP Server (Future)

A SteelAgent-specific MCP server could provide specialized tools:

| Tool | Purpose |
|------|---------|
| `query_rag` | Run a RAG query and return results (response, sources, confidence) |
| `inspect_chunks` | View all chunks for a given document with metadata |
| `run_accuracy_test` | Execute a single golden query and check pass/fail |
| `check_dedup` | Scan for duplicate documents and report |
| `get_pipeline_trace` | Fetch Langfuse trace for a specific query |
| `quota_status` | Check usage quotas for a workspace |

Implementation: TypeScript MCP server using `@modelcontextprotocol/sdk` that wraps SteelAgent's library functions. Would allow Claude Code to directly interact with the RAG pipeline during development.

---

## Architecture Note

The RAG pipeline runs entirely through Next.js API routes -- not through MCP servers. MCP is used for **development tooling** (file access, GitHub, database debugging), not for the production pipeline.

The agentic pipeline uses Claude Opus 4.6 as the primary LLM, with Groq/Cerebras/SambaNova/OpenRouter as fallbacks. See [AGENTS.md](AGENTS.md) for full pipeline documentation.

---

## Setup

1. Set `GITHUB_TOKEN` in your environment (for PR/issue tools)
2. Run `claude` in the project root -- MCP servers start automatically
3. Edit `.mcp/config.json` to add/remove servers, then restart Claude Code
4. For Supabase MCP: Set `SUPABASE_SERVICE_KEY` in your environment (development only)
