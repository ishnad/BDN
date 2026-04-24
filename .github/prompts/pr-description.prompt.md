---
description: "Generate a structured PR description from the current branch changes."
argument-hint: "Optional: describe any context not obvious from the diff"
agent: agent
---

# PR Description Generator

Analyze the changes on this branch with `git diff main...HEAD` and `git log main...HEAD --oneline`,
then generate a complete PR description.

---

## Summary
<!-- 2-3 bullet points: what changed and WHY (the motivation, not just the what) -->

## Changes
<!-- Per-file or per-area bullet points describing what each change does -->

## Test Plan
<!-- Concrete, checkable steps to verify this works -->
- [ ] `npm test` passes
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] [add manual verification steps specific to these changes]

## Screenshots
<!-- If UI changed, add before/after screenshots here -->
N/A

## Checklist
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] No `console.log` left in `src/`
- [ ] PR title follows `type(scope): description` convention
- [ ] No secrets committed
