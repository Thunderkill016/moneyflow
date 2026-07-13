<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow project rules

- MoneyFlow is a Vietnamese-first personal finance product. The core promise is to show how much a person can safely spend today.
- Prioritize financial correctness, privacy, accessibility, mobile usability, and maintainable code.
- Store money as integer minor units. Never use floating-point arithmetic for persisted money.
- Keep financial rules outside visual components as the domain grows.
- Treat all browser input as untrusted. Resolve the authenticated user on the server once authentication exists.
- Every user-owned database table must use Row Level Security when Supabase is introduced.
- Do not add a dependency without explaining the value it provides.
- Every data page needs loading, empty, error, and responsive states before production release.
- Before coding, inspect the current implementation and relevant local Next.js docs in `node_modules/next/dist/docs/`.
- After coding, run type checking, linting, relevant tests, and the production build.
