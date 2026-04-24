---
description: "Testing conventions for this project. Applied when reading or writing test files."
applyTo: "**/*.test.ts,**/*.spec.ts"
---

# Testing Conventions

## File Layout
- Unit tests: co-located with source — `src/features/foo/foo.test.ts`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

## Structure
- Use `describe` → `it` nesting; test names should read as sentences
- Each `it` block should have one clear assertion focus
- Use `beforeEach` for repeated setup — not top-level variable reassignment
- Group related edge cases under a nested `describe("when <condition>")`

## Reliability
- Tests must be deterministic — no `Math.random()` without a seeded RNG
- No real timers — mock `Date.now` and `setTimeout`
- No real network calls — mock or intercept at the HTTP boundary
- Each test must be independent — no shared mutable state between tests

## Coverage Philosophy
Cover the behaviour contract: happy path + important edge cases + known error conditions.
Do not chase line coverage at the expense of test quality.
