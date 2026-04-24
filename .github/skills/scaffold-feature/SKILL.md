---
name: scaffold-feature
description: 'Scaffold a new feature with the standard file structure. Use when creating a new module, component, or domain from scratch to ensure consistent layout across the codebase.'
argument-hint: 'Feature name in kebab-case (e.g. user-auth, payment-flow, search)'
user-invocable: true
---

# Scaffold Feature

Create a new feature named `{{args}}` under `src/features/{{args}}/`.

## Files to Create

1. **`src/features/{{args}}/index.ts`**
   Public API — re-export everything the rest of the app needs. Start empty.

2. **`src/features/{{args}}/{{args}}.ts`**
   Core implementation. Add stub functions/class with `// TODO(critical): implement` comments.

3. **`src/features/{{args}}/{{args}}.types.ts`**
   TypeScript interfaces and types for this feature. Add at least one placeholder interface.

4. **`src/features/{{args}}/{{args}}.test.ts`**
   Test file with one failing placeholder test:
   ```ts
   it('{{args}}: implement me', () => { expect(false).toBe(true); });
   ```

5. **`src/features/{{args}}/README.md`**
   One paragraph describing the feature's responsibility and public API surface.

## After Creating Files

- Run `npm run build` to confirm no TypeScript errors from the new files.
- Report each created file path and a one-line summary of its purpose.
