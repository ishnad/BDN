# BDN — Vendor Wrangler (Ops Concierge)

**Push to Prod Hackathon** — Singapore, April 2026

## What This Is

**Vendor Wrangler** is an AI-native vendor call delegation platform. Instead of spending hours on back-and-forth phone calls with vendors and suppliers, users can simply type a natural language request. 

The system takes over:
1. **Plan:** Claude Sonnet generates a structured job specification.
2. **Call:** Genspark's "Call for Me" API dials the vendor via PSTN and executes the conversation.
3. **Extract:** Claude processes the raw call transcript, extracting structured JSON outcomes and saving the report to the user's dashboard.

## 🚀 Key Features

*   **Automated AI Calling:** Seamless integration with Genspark for live PSTN phone calls to suppliers.
*   **Intelligent Processing:** Claude Sonnet (`claude-sonnet-4-6`) used for pre-call planning and post-call data extraction.
*   **Dual-Sided Marketplace:** Specialized dashboards for both **Customers** (managing inventory and supply requests) and **Suppliers** (creating offers and tracking stats).
*   **Demo-Safe Mode:** Includes built-in bypasses (`USE_MOCK_CALL=true`) for safe, reliable presentations without executing live calls.
*   **Secure Infrastructure:** Powered by Supabase for PostgreSQL databases, authentication, and strict Row-Level Security (RLS).

## 🛠️ Tech Stack

*   **Frontend:** [Next.js 15](https://nextjs.org/) (App Router), React, TypeScript, Tailwind CSS
*   **AI Models:** Anthropic Claude Sonnet (`@anthropic-ai/sdk`)
*   **Telephony:** Genspark (Call for Me) + Twilio PSTN
*   **Database & Auth:** [Supabase](https://supabase.com/) (Postgres + RLS + Auth)

## 📂 Project Structure

```text
src/
├── app/
│   ├── api/          # Next.js API Routes (plan, call, extract, inventory, etc.)
│   ├── auth/         # Login, signup, and callback pages
│   ├── customer/     # Customer-facing views and reports
│   ├── dashboard/    # Main call reports and dashboard overview
│   └── supplier/     # Supplier-facing management and analytics
├── components/       # Shared UI components (Nav, Tables, Forms, State Machines)
├── lib/
│   ├── supabase/     # Supabase clients (browser & server specific)
│   └── utils.ts      # Utility functions (Tailwind cn, formatters)
└── types/            # Shared TypeScript interfaces
```

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or pnpm
*   Supabase project
*   Anthropic API Key
*   Genspark API Key

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/bdn.git
cd bdn
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add the following:
```env
ANTHROPIC_API_KEY=your_anthropic_key
GENSPARK_API_KEY=your_genspark_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Demo Safety Flags
USE_MOCK_CALL=false        # Set to true to skip live PSTN calls (demo safety)
SHOW_PRESENTER_BANNER=true # Shows demo alert bar in UI
```

### 3. Build Local External Tools (MCP)
Run this once after cloning to build the internal agent tools:
```bash
npm run mcp:build
```

### 4. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application.

## 🧪 Demo Safety & Presentation

For hackathon presentations, we've built-in fail-safes to ensure smooth demonstrations:
*   Set `USE_MOCK_CALL=true` in `.env.local` to bypass Genspark entirely. The full pipeline (Plan -> Call UI -> Extract) will still run using mock transcripts.
*   The `SHOW_PRESENTER_BANNER=true` flag displays an alert bar in the UI to indicate the environment status.

## 📖 Documentation

Further technical details and specs are located in the `/docs` directory:
*   **Architecture:** `/docs/architecture/system-architecture.md`
*   **Runbooks:** `/docs/guides/demo-runbook.md`
*   **Planning:** `/docs/planning/project-overview.md`

