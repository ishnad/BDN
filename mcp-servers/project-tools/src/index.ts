import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

const server = new Server(
  { name: "project-tools", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_project_status",
      description:
        "Returns git branch, working tree status, and key package versions. Use at session start.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "check_env_vars",
      description:
        "Validates required environment variables are set in .env.local. Use before running the app or deploying.",
      inputSchema: {
        type: "object",
        properties: {
          vars: {
            type: "array",
            items: { type: "string" },
            description: "Env var names to check. Omit to check all vars from .env.local.example",
          },
        },
        required: [],
      },
    },
    {
      name: "find_todos",
      description:
        "Finds TODO / FIXME / HACK comments in TypeScript and TSX source files.",
      inputSchema: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["all", "critical"],
            description: "all = every TODO/FIXME/HACK; critical = only TODO(critical)",
          },
        },
        required: [],
      },
    },
    {
      name: "check_api_routes",
      description:
        "Lists all Next.js API routes and verifies their files exist. Use when debugging API calls.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_supabase_schema",
      description:
        "Returns the expected Supabase SQL schema for this project. Use when setting up or debugging the database.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "get_project_status") {
    const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    const status = execSync("git status --short", { encoding: "utf8" }).trim();

    let nextVersion = "not installed";
    try {
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      nextVersion = pkg.dependencies?.next ?? "not found";
    } catch {}

    return {
      content: [{
        type: "text",
        text: [
          `Branch: ${branch}`,
          `Next.js: ${nextVersion}`,
          `\nWorking tree:\n${status || "(clean)"}`,
        ].join("\n"),
      }],
    };
  }

  if (name === "check_env_vars") {
    const inputVars = (args as { vars?: string[] })?.vars;

    let varsToCheck = inputVars ?? [];
    if (!varsToCheck.length && existsSync(".env.local.example")) {
      const example = readFileSync(".env.local.example", "utf8");
      varsToCheck = example
        .split("\n")
        .filter(line => line.match(/^[A-Z_]+=/) && !line.startsWith("#"))
        .map(line => line.split("=")[0].trim());
    }

    const envLocal = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
    const setInFile = new Set(
      envLocal
        .split("\n")
        .filter(l => l.includes("=") && !l.startsWith("#"))
        .map(l => l.split("=")[0].trim())
    );

    const results = varsToCheck.map(v => ({
      var: v,
      set: setInFile.has(v),
      hasValue: setInFile.has(v) && envLocal.split("\n").find(l => l.startsWith(v + "="))?.split("=")[1]?.trim() !== "",
    }));

    const missing = results.filter(r => !r.hasValue);
    const ok = results.filter(r => r.hasValue);

    return {
      content: [{
        type: "text",
        text: missing.length === 0
          ? `All ${ok.length} required env vars are set in .env.local.`
          : `Set (${ok.length}): ${ok.map(r => r.var).join(", ") || "none"}\nMissing or empty (${missing.length}): ${missing.map(r => r.var).join(", ")}`,
      }],
    };
  }

  if (name === "find_todos") {
    const severity = (args as { severity?: string })?.severity ?? "all";
    const pattern = severity === "critical" ? "TODO(critical)" : "TODO|FIXME|HACK";
    try {
      const result = execSync(
        `git grep -n "${pattern}" -- "*.ts" "*.tsx"`,
        { encoding: "utf8" }
      ).trim();
      return { content: [{ type: "text", text: result || "No matches found." }] };
    } catch {
      return { content: [{ type: "text", text: "No matches found." }] };
    }
  }

  if (name === "check_api_routes") {
    const expectedRoutes = [
      { route: "POST /api/plan", file: "src/app/api/plan/route.ts" },
      { route: "POST /api/call", file: "src/app/api/call/route.ts" },
      { route: "POST /api/extract", file: "src/app/api/extract/route.ts" },
      { route: "GET /auth/callback", file: "src/app/auth/callback/route.ts" },
    ];

    const results = expectedRoutes.map(r => ({
      ...r,
      exists: existsSync(r.file),
    }));

    const missing = results.filter(r => !r.exists);
    const lines = results.map(r => `${r.exists ? "✓" : "✗"} ${r.route} → ${r.file}`);

    return {
      content: [{
        type: "text",
        text: lines.join("\n") + (missing.length > 0 ? `\n\n${missing.length} route(s) missing!` : "\n\nAll routes present."),
      }],
    };
  }

  if (name === "get_supabase_schema") {
    const schema = `-- Run this in the Supabase SQL editor (Project → SQL Editor)

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
  for all using (auth.uid() = user_id);`;

    return { content: [{ type: "text", text: schema }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
