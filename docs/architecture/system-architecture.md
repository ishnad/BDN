# Vendor Wrangler — System Architecture

## Four-Layer Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Web dashboard & UI |
| Execution | Genspark "Call for Me" + Twilio PSTN | Live phone calls |
| Cognitive | Anthropic Claude 3.5/3.7 Sonnet | Planning & extraction |
| Database & Auth | Supabase (Postgres + RLS + Auth) | Storage, per-user scoping, auth |

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── plan/route.ts       Claude planning endpoint
│   │   ├── call/route.ts       Genspark execution endpoint
│   │   └── extract/route.ts    Transcript processing + Supabase save
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx     includes role selector (Customer / Supplier)
│   │   └── callback/route.ts   Supabase OAuth callback
│   ├── dashboard/
│   │   ├── page.tsx            Reports list (RLS auto-filtered)
│   │   └── [reportId]/page.tsx Full report detail
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ReportCard.tsx
├── lib/
│   └── supabase/
│       ├── client.ts           Browser client (use in client components only)
│       └── server.ts           Server client (use in API routes + server components)
├── middleware.ts                Route protection — redirects to /auth/login
└── types/
    └── index.ts                All shared TypeScript interfaces
```

## TypeScript Interfaces (`src/types/index.ts`)

```ts
type UserRole = 'customer' | 'supplier'

interface IntakeRequest {
  naturalLanguageRequest: string
  vendorPhoneNumber: string
}

interface JobSpec {
  vendor: string
  objective: string
  requiredQuestions: string[]
  escalationGuardrails: string[]
  echoMitigationPrompt: string
}

interface CallOutcomeSummary {
  vendorName: string
  resolutionStatus: string
  paymentDate: string | null
  confidenceScore: number
  nextStep: 'Needs Human Approval' | 'Mark as Resolved' | 'Draft Email'
}

interface CallReport extends CallOutcomeSummary {
  id: string
  userId: string
  naturalLanguageRequest: string
  jobSpec: JobSpec
  rawTranscript: string
  cleanedTranscript: string
  createdAt: string
}
```

## Database Schema (Supabase — run once in SQL editor)

```sql
create table profiles (
  id uuid references auth.users on delete cascade,
  role text check (role in ('customer', 'supplier')),
  company_name text,
  primary key (id)
);

create table call_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  vendor_name text,
  natural_language_request text,
  job_spec jsonb,
  raw_transcript text,
  cleaned_transcript text,
  resolution_status text,
  payment_date text,
  confidence_score float,
  next_step text,
  created_at timestamptz default now()
);

alter table call_reports enable row level security;
create policy "own reports" on call_reports
  for all using (auth.uid() = user_id);
```

## Environment Variables (`.env.local`)

```
ANTHROPIC_API_KEY=
GENSPARK_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
USE_MOCK_CALL=false
```

## Auth & Authorization Rules

- All routes protected by `src/middleware.ts` — unauthenticated users redirect to `/auth/login`
- Role stored in `profiles.role`, set at signup
- Both roles share the same `/dashboard` route — RLS scopes data per `auth.uid()` automatically
- No manual `WHERE user_id = X` needed anywhere in query code

## Coding Conventions

- Named exports only — **no default exports** (exception: `page.tsx` files, required by Next.js)
- All components are functional with explicit TypeScript props interfaces
- Use `src/lib/supabase/server.ts` in API routes and server components
- Use `src/lib/supabase/client.ts` **only** in client components
- Never import server-only modules in client components

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase for DB & Auth | Free tier, instant Postgres, built-in auth, great dashboard — perfect for hackathon speed |
| Row Level Security | Each user sees only their own reports with zero manual filtering in API code |
| Role in `profiles` table | Extends `auth.users` cleanly; supports Customer and Supplier without separate tables |
| Single `/dashboard` route | Scoped by auth — simpler than separate `/customer` and `/supplier` routes |
| Mock fallback toggle | `USE_MOCK_CALL=true` guarantees flawless demo even if live PSTN call fails on stage |
