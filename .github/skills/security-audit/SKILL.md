---
name: security-audit
description: 'OWASP-based security audit. Use before merging PRs that touch auth, payments, or data handling, after adding new dependencies, or when a security concern is raised.'
user-invocable: true
---

# Security Audit

Perform a security review of the current codebase. Work through each step and report findings.

## Step 1 — Dependency Vulnerabilities
Run `npm audit --json` and summarize:
- Total vulnerabilities by severity (critical / high / moderate / low)
- Any critical or high findings with package name and fix recommendation

## Step 2 — Secret Scanning
Search for hardcoded secrets using these patterns:
- `(?i)(api_key|secret|password|token|private_key)\s*[:=]\s*['"][^'"]{8,}`
- String prefixes that indicate live credentials: `sk-`, `ghp_`, `AKIA`, `xoxb-`, `ya29.`

Report any matches with file and line number. Flag as FAIL if found.

## Step 3 — OWASP Top 10 Quick-Check
Load [owasp-checklist.md](./references/owasp-checklist.md) and evaluate the five highest-risk items
for this project:
- A01 Broken Access Control
- A02 Cryptographic Failures
- A03 Injection
- A05 Security Misconfiguration
- A07 Identification & Authentication Failures

## Step 4 — Report
Output a summary table:

| Area | Status | Notes |
|------|--------|-------|
| Dependencies | ✅ / ⚠️ / ❌ | |
| Secrets | ✅ / ❌ | |
| A01 Access Control | ✅ / ⚠️ / ❌ | |
| ... | | |

End with **SECURE** (no critical findings) or **ACTION REQUIRED** (list items to fix first).
