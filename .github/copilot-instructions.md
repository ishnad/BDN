# BDN — Global Agent Instructions

## About This Project
BDN is a hackathon project (Push to Prod) focused on shipping features quickly and safely to production.

## Core Principles
1. **Ship working code** — Prefer small, focused PRs over large rewrites
2. **Test before deploy** — Always run `/deploy-check` before marking a task done
3. **Security first** — Never expose secrets; validate all user input at system boundaries
4. **TypeScript strictly** — No `any` types; follow `typescript.instructions.md`

## When Starting Any Task
1. Read `CLAUDE.md` for project context and conventions
2. Call `get_project_status` (MCP tool) to understand current repo state
3. Check critical blockers with `find_todos` (severity: "critical")

## Which Tool for Which Job
| Goal | Use |
|------|-----|
| New feature from scratch | `/scaffold-feature <name>` |
| Ready to deploy? | `/deploy-check` |
| Security concerns | `/security-audit` |
| Reviewing code changes | Code Reviewer agent |
| Writing / expanding tests | Test Writer agent |
| Writing a PR description | `/pr-description` prompt |
| Diagnosing a bug | `/bug-report` prompt |

## File Organization
- Business logic: `src/features/<name>/`
- API routes: `src/api/`
- Shared types: `src/types/`
- Tests: co-located as `<file>.test.ts`
