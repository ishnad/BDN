# Vendor Wrangler — Ops Concierge

**Hackathon:** Push to Prod, Singapore, April 24 2026

## What This Is
AI-native vendor call delegation. User types a natural language request → Claude generates a job spec → Genspark dials the vendor via PSTN → Claude extracts a structured JSON outcome → report saved to Supabase per-user dashboard.

## Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **AI:** Claude Sonnet (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Calling:** Genspark "Call for Me" + Twilio PSTN
- **DB & Auth:** Supabase (Postgres + RLS + Auth)

## Key Commands
```
npm install          Install all dependencies
npm run dev          Start dev server (localhost:3000)
npm run build        Production build (run before deploy-check)
npm run lint         ESLint check
npm run mcp:build    Compile the local MCP server (run once after clone)
```

## Critical Environment Variables
```
ANTHROPIC_API_KEY
GENSPARK_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
USE_MOCK_CALL=false        # set true to skip live PSTN call (demo safety)
SHOW_PRESENTER_BANNER=true # shows demo alert bar in UI
```

## App Flow (3 API calls in sequence)
1. `POST /api/plan` → Claude converts natural language to `JobSpec`
2. `POST /api/call` → Genspark dials vendor, returns raw transcript
3. `POST /api/extract` → Claude cleans transcript + extracts `CallOutcomeSummary` → saved to Supabase

## Directory Structure
```
src/
├── app/
│   ├── api/plan/         Claude planning route
│   ├── api/call/         Genspark execution + mock fallback
│   ├── api/extract/      Claude extraction + Supabase save
│   ├── auth/             Login, signup, callback
│   └── dashboard/        Report list + [reportId] detail
├── components/           All UI components
├── lib/
│   ├── supabase/         client.ts (browser) + server.ts (server/API)
│   └── utils.ts          cn(), formatConfidence(), formatDate()
├── middleware.ts          Auth guard — redirects to /auth/login
└── types/index.ts        All shared TypeScript interfaces
```

## Supabase Rules
- `profiles(id, role, company_name)` — extends auth.users
- `call_reports` — all columns, RLS policy: `auth.uid() = user_id`
- Never add `WHERE user_id = x` in queries — RLS handles it automatically
- Use `src/lib/supabase/server.ts` in API routes and server components only
- Use `src/lib/supabase/client.ts` only in `'use client'` components

## Coding Conventions
- Named exports everywhere — default exports only for page.tsx (Next.js requirement)
- No `any` types — use proper generics or `unknown` with guards
- `cn()` from `@/lib/utils` for all className composition

## Custom Skills
- `/deploy-check`          Pre-flight before any deployment
- `/scaffold-feature`      Scaffold new feature with standard layout
- `/security-audit`        OWASP + secrets scan

## MCP Tools (project-tools server — run mcp:build first)
- `get_project_status`     Git branch + working tree status
- `check_env_vars`         Validate env vars are set
- `find_todos`             Surface critical TODOs in codebase

## Demo Safety
- Set `USE_MOCK_CALL=true` to bypass Genspark entirely — full pipeline still runs
- Echo mitigation prompt is injected into every Genspark payload in `/api/call/route.ts`
- Presenter banner: set `SHOW_PRESENTER_BANNER=true` in env
