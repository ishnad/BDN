# Vendor Wrangler (Ops Concierge) — Project Overview

**Hackathon:** Push to Prod — Singapore, April 24 2026

## What We're Building

AI-native delegation platform that places live phone calls to vendors on behalf of users.

```
User types natural language request
        ↓
Claude converts it into a structured job spec
        ↓
Genspark + Twilio dials the vendor over PSTN
        ↓
Claude cleans the transcript and extracts key facts
        ↓
Structured JSON report saved to Supabase, visible on user dashboard
```

## Core Value Proposition

- No more sitting on hold — the AI calls on your behalf
- Natural language in → structured JSON outcome out
- Full audit trail saved per user in Supabase (RLS-scoped)
- Role-based dashboard: both customers and suppliers can submit and view their own call reports

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | Web dashboard & UI |
| AI | Anthropic Claude 3.5/3.7 Sonnet (`@anthropic-ai/sdk`) | Planning & extraction |
| Calling | Genspark "Call for Me" + Twilio PSTN | Live phone calls |
| Database & Auth | Supabase (Postgres + RLS + Auth) | Storage, auth, per-user scoping |

## MVP — Five States End-to-End

| State | Label | Description |
|-------|-------|-------------|
| 1 | Request Intake | User types natural language command + vendor phone number |
| 2 | Planning | Claude converts request into strict JSON job specification |
| 3 | Execution | Genspark dials vendor; UI shows `Queued → Dialing → In Progress → Completed` |
| 4 | Normalization | Claude cleans transcript; extracts key facts into JSON schema |
| 5 | Triage + Save | Claude recommends next step; report saved to Supabase; visible on dashboard |

## User Roles

Both `customer` and `supplier` roles use the same dashboard route. Supabase Row Level Security
automatically scopes each user's data — no manual `WHERE user_id = X` needed anywhere in the code.

| Role | Can Do |
|------|--------|
| customer | Submit calls, view own reports |
| supplier | Submit calls, view own reports |
