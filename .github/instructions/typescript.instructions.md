---
description: "TypeScript coding standards for this project. Applied when writing or reviewing TypeScript files."
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Standards

- No `any` types — use `unknown` with type guards, or proper generics
- Prefer `interface` for object shapes; `type` for unions, intersections, and mapped types
- All exported functions must have explicit return type annotations
- Use `const` by default; `let` only when reassignment is genuinely required
- Named exports over default exports (enables accurate refactoring across the codebase)
- Avoid non-null assertions (`!`) — handle nullability explicitly with checks or optional chaining
- Enums: prefer `const` object + `typeof` union over TypeScript `enum`
- Async functions must handle rejection — no floating promises
