# Vendor Wrangler — Hour-by-Hour Build Plan

Total build window: **5 hours**. Hours 1.5 and 4.5 overlap with adjacent hours — assign to a
second developer or context-switch carefully.

---

## HOUR 1 — Environment Setup & Scaffolding (0:00–1:00)

- [ ] **1.1** Scaffold the Next.js app
  ```
  npx create-next-app@latest vendor-wrangler --typescript --tailwind --eslint --app --src-dir --use-npm
  ```
- [ ] **1.2** Install core packages
  ```
  npm install @anthropic-ai/sdk lucide-react framer-motion clsx tailwind-merge
  npm install @supabase/supabase-js @supabase/ssr
  ```
- [ ] **1.3** Create `.env.local` with all required keys (see Architecture doc for full list)
- [ ] **1.4** Build `src/app/layout.tsx` and `src/app/page.tsx` — enterprise-focused shell UI
- [ ] **1.5** Define all shared TypeScript interfaces in `src/types/index.ts`
  - `UserRole`, `IntakeRequest`, `JobSpec`, `CallOutcomeSummary`, `CallReport`

---

## HOUR 1.5 — Supabase Setup & Auth ★ (runs alongside Hour 1)

- [ ] **S.1** Create Supabase project at supabase.com → copy URL + anon key into `.env.local`
- [ ] **S.2** Run the `profiles` + `call_reports` SQL schema in the Supabase SQL editor (see Architecture doc)
- [ ] **S.3** Create `src/lib/supabase/client.ts` (browser client)
- [ ] **S.3** Create `src/lib/supabase/server.ts` (server client for API routes)
- [ ] **S.4** Build auth pages:
  - `src/app/auth/login/page.tsx` — email + password login
  - `src/app/auth/signup/page.tsx` — signup with Customer / Supplier role selector
  - `src/app/auth/callback/route.ts` — Supabase OAuth callback handler
- [ ] **S.5** Create `src/middleware.ts` — protect all routes, redirect unauthenticated users to `/auth/login`

---

## HOUR 2 — Intake & Planning Layer (1:00–2:00)

- [ ] **2.1** Build request intake form — natural language input field + vendor phone number field
  - Gate behind auth — show logged-in user name and role badge in header
- [ ] **2.2** Create `src/app/api/plan/route.ts` to receive form data from frontend
- [ ] **2.3** Implement Claude structured outputs: `output_config.format → type: "json_schema"` targeting `JobSpec`
- [ ] **2.4** Inject echo mitigation guardrails into every Genspark payload (see Demo Runbook for exact prompt text)

---

## HOUR 3 — Execution Layer & Demo Safety (2:00–3:00)

- [ ] **3.1** Create `src/app/api/call/route.ts` — pass Claude-generated `JobSpec` to Genspark
  - **Check `USE_MOCK_CALL` first** before any Genspark call
- [ ] **3.2** Build call status state machine UI: `Queued → Dialing → In Progress → Completed`
- [ ] **3.3** Implement `USE_MOCK_CALL=true` bypass — skip Genspark, return hardcoded transcript + audio snippet
- [ ] **3.4** Add persistent presenter alert banner: _"1. Enable OS Voice Isolation. 2. Mute dialer after speaking."_

---

## HOUR 4 — Extraction, Normalization & Database Save (3:00–4:00)

- [ ] **4.1** Create `src/app/api/extract/route.ts` to process raw transcript from Genspark
- [ ] **4.2** Claude transcript cleaning prompt — strip filler words, false starts, and echo repetitions
- [ ] **4.3** Second Claude call with structured outputs → `CallOutcomeSummary` schema
  - Required fields: `vendorName`, `resolutionStatus`, `paymentDate`, `confidenceScore`
- [ ] **4.4** Claude triage: categorise as `"Needs Human Approval"` / `"Mark as Resolved"` / `"Draft Email"`
- [ ] **4.5** Insert completed `CallReport` into Supabase `call_reports` table
  - `user_id = auth.uid()` — RLS scopes it automatically

---

## HOUR 4.5 — Receiver Dashboard ★ (3:30–4:30, overlaps Hours 4 & 5)

- [ ] **R.1** `src/app/dashboard/page.tsx` — fetch all `call_reports` for logged-in user (RLS auto-filters)
- [ ] **R.2** `src/components/ReportCard.tsx` — shows vendor name, resolution status, confidence score,
  next step, timestamp; expandable to reveal full cleaned transcript
- [ ] **R.3** `src/app/dashboard/[reportId]/page.tsx` — full report view: job spec, cleaned transcript,
  extracted JSON, triage recommendation
- [ ] **R.4** Role badge in nav — show `"Customer"` or `"Supplier"` pill
- [ ] **R.5** Status filter — All / Needs Approval / Resolved / Draft Email

---

## HOUR 5 — Polish & End-to-End Testing (4:00–5:00)

- [ ] **5.1** Final outcome card component — render `CallReport` as clean operational ticket
- [ ] **5.2** Audio replay component — player synchronised with cleaned transcript
- [ ] **5.3** Human-in-the-loop triage UI — conditional rendering based on `nextStep` value
- [ ] **5.4** E2E test — Customer flow:
  - Sign up as Customer → submit call → mock response → report saved → visible in dashboard
- [ ] **5.4** E2E test — Supplier flow:
  - Sign up as Supplier → same flow → confirm RLS: each user sees only their own reports

---

## Important Gotchas

- Never commit `.env.local`
- RLS means **no manual `WHERE user_id = X`** needed in queries — Supabase handles it
- Use `src/lib/supabase/server.ts` in all API routes and server components, **never** the browser client
- `USE_MOCK_CALL=true` must be checked **first** in `/api/call/route.ts` before any Genspark call
- Echo mitigation prompt must be appended to **every** call brief, not just the first one
