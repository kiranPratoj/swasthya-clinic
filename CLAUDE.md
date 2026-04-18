# Medilite AI — Claude Guide

Claude should use the same canonical reading order as every other agent:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/app/BUSINESS_LOGIC.md`
4. `docs/app/USER_FLOWS.md`
5. `docs/engineering/ARCHITECTURE.md`

Key rules:

- Treat those docs plus the current code as the source of truth.
- Use `pnpm` only.
- Keep server actions in `src/app/actions.ts`.
- Do not modify `src/app/globals.css` unless the user explicitly asked for a global style change.
- If a change affects workflow/business logic, update `docs/app/BUSINESS_LOGIC.md` before commit.
