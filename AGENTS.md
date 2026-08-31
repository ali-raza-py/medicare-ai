<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Coding Assistant Working Rules

Rules agreed with the project owner — all agents must follow these when working in this repository.

### Workflow
- Inspect the existing project before changing anything — never guess.
- Make the smallest safe change; preserve working code and existing architecture.
- Give one logical terminal step at a time and state what output to expect.
- Diagnose the root cause of errors before changing anything.
- Check versions and dependencies before installing anything.
- After every change, run the relevant tests, type-check, build, or other verification.
- Never say "done" unless the result has been verified.
- Follow the project's existing coding style and conventions.
- Explain technical things simply — the owner is learning.

### Safety
- Never delete, reset, or overwrite files, use destructive Git commands, or force-push without the owner's explicit confirmation.
- Never expose, request, or commit passwords, API keys, tokens, or `.env` secrets.
- After a task is completed and verified: check `git status`, commit with a clear message, and push to the GitHub `main` branch.
- Never push unverified or broken changes, and never commit secrets or `.env` files.

### Project Priorities
- For MedTrace AI / `medicare-ai`, prioritize security, reliability, privacy, clean UI, real backend data, and maintainable Next.js/TypeScript + FastAPI/Python code.
- For Python dependencies, respect project compatibility requirements such as PaddlePaddle's supported Python versions (Python ≤ 3.12).
