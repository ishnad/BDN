---
name: deploy-check
description: 'Pre-deployment readiness checklist for Vendor Wrangler. Use before deploying or demoing. Checks build, env vars, mock flag, API routes, no debug code, critical TODOs.'
argument-hint: 'Optional environment (staging, production, demo)'
user-invocable: true
---

# Deploy Check — Vendor Wrangler

Run a pre-deployment readiness checklist and report PASS / WARN / FAIL per item.

## Checks

1. **Build** — Run `npm run build`. FAIL if TypeScript errors or build fails.

2. **API Routes** — Call MCP tool `check_api_routes`. FAIL if any route file is missing.

3. **Env vars** — Call MCP tool `check_env_vars` with no args (reads from `.env.local.example`).
   FAIL if any of these are missing or empty:
   - `ANTHROPIC_API_KEY`
   - `GENSPARK_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Mock flag** — Check if `USE_MOCK_CALL=true` in `.env.local`.
   WARN if true (fine for demo, FAIL for production).

5. **Debug code** — Search `src/` for `console.log`. WARN for each match.

6. **Critical TODOs** — Call `find_todos` with `severity: "critical"`. FAIL if any found.

7. **Git status** — Call `get_project_status`. WARN if uncommitted changes exist.

## Output Format

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Build | ✅ / ❌ | |
| 2 | API Routes | ✅ / ❌ | |
| 3 | Env Vars | ✅ / ❌ | List missing vars |
| 4 | Mock Flag | ✅ / ⚠️ | ⚠️ if USE_MOCK_CALL=true |
| 5 | Debug Code | ✅ / ⚠️ | |
| 6 | Critical TODOs | ✅ / ❌ | |
| 7 | Git Status | ✅ / ⚠️ | |

Final verdict: **READY TO DEPLOY** or **NOT READY** (list blocking items).
