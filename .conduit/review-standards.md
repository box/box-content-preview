# Review Standards

These are the standards contributors to this repo already follow — check PRs against them.

- **High** — Tests must follow the existing conventions: colocated in `__tests__/` directories, named `*-test.js` or `*-test.tsx`.
- **High** — No Box-internal information in code, comments, docs, or the PR title and body: internal hostnames or URLs (any Box domain that is not publicly reachable), employee or customer names, emails, or internal Slack channels.
- **High** — No references to private Box repositories or internal services in comments, docs, or the PR title and body. Only name repositories that are public under `github.com/box`. Runtime string values, such as a client name, are not references.
- **Medium** — New React UI code uses TypeScript, matching the existing `src/lib/viewers/controls/` convention.
- **Medium** — No issue-tracker ticket IDs (an uppercase project key, a dash, and a number, such as `ABC-123`) in code, comments, docs, or the PR title and body, including `TODO` comments.
- **Low** — CSS classes use the `bp-` prefix.
