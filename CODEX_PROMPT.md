# Codex Prompt Template

Use this as the starting prompt when handing work to Codex.

## Required Reading Order

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/app/BUSINESS_LOGIC.md`
4. `docs/app/USER_FLOWS.md`
5. `docs/engineering/ARCHITECTURE.md`

## Prompt Body

```text
You are working on Medilite AI in this repository.

Before coding, read:
- AGENTS.md
- docs/README.md
- docs/app/BUSINESS_LOGIC.md
- docs/app/USER_FLOWS.md
- docs/engineering/ARCHITECTURE.md

Rules:
- Treat those docs plus the current code as the source of truth.
- Do not invent product behavior not described there.
- Do not modify src/app/globals.css unless the user explicitly asked for a global visual change.
- Use pnpm only.
- Keep server actions in src/app/actions.ts.
- Use getClinicDb(clinicId) for clinic-scoped data.
- If your change affects product behavior, routes, permissions, statuses, billing flow, portal flow, or communications flow, update docs/app/BUSINESS_LOGIC.md before commit.

Task:
[replace with the actual task]
```
