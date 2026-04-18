# Antigravity Prompt Template

This file replaces the old phase-based task prompt that caused scope drift.

## Required Reading Order

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/app/BUSINESS_LOGIC.md`
4. `docs/app/USER_FLOWS.md`
5. `docs/engineering/ARCHITECTURE.md`

## Prompt Body

```text
You are working on Medilite AI in this repository.

Read first:
- AGENTS.md
- docs/README.md
- docs/app/BUSINESS_LOGIC.md
- docs/app/USER_FLOWS.md
- docs/engineering/ARCHITECTURE.md

Rules:
- Follow the current app behavior described in the docs and code.
- Do not execute pre-baked phase plans from old prompt files.
- Do not change src/app/globals.css unless the user explicitly asked for a global visual/theme change.
- Use pnpm only.
- Do not introduce new packages unless explicitly approved.
- If the task changes workflow/business logic, update docs/app/BUSINESS_LOGIC.md before commit.

Task:
[replace with the actual task]
```
