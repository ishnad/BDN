---
description: "Structured bug investigation session. Use when a bug is reported and you need to systematically diagnose the root cause and fix it."
argument-hint: "Describe the bug: what happened vs. what was expected"
agent: agent
---

# Bug Investigation

Work through this structured process. Do not jump to fixes before completing diagnosis.

## 1 — Reproduce
- Identify the minimal steps to reproduce the bug
- Confirm it is reliably reproducible (not a flaky timing issue)
- Note the environment: local / staging / production, browser/OS if relevant

## 2 — Locate
- Trace the code path that handles the reported behaviour
- Use `git log --all -S "<symptom keyword>"` to find when this last changed
- Narrow to the exact file and function responsible

## 3 — Root Cause
- Identify the specific line or condition causing the failure
- Explain WHY this produces the observed incorrect behaviour
- Check whether this is a regression (worked before) or a new bug (never worked)

## 4 — Fix
- Implement the minimal, targeted fix — no unrelated refactoring
- Add a regression test that would have caught this bug:
  `it('should not [reproduce bug condition]', ...)`

## 5 — Verify
- Confirm the original bug no longer reproduces
- Run the full test suite: `npm test`
- Check that related behaviour still works (no regressions)

Report findings for each step before proceeding to the next.
