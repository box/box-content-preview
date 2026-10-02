# Review Standards

These are the standards contributors to this repo already follow — check PRs against them.

- **High** — Commit subject lines must be 72 characters or fewer, in Conventional Commits format (e.g. `feat:`, `fix:`, `chore:`).
- **High** — Tests must follow the existing conventions: colocated in `__tests__/` directories, named `*-test.js` or `*-test.tsx`.
- **Medium** — New React UI code uses TypeScript, matching the existing `src/lib/viewers/controls/` convention.
- **Medium** — Code must pass ESLint and Stylelint (`yarn lint`) before merge.
- **Low** — CSS classes use the `bp-` prefix.
