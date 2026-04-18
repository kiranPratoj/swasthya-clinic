# Documentation Sync Policy

## Goal

Prevent prompt files and implementation from drifting away from actual app behavior.

## Canonical Files

- Product/business logic: `docs/app/BUSINESS_LOGIC.md`
- Route flows: `docs/app/USER_FLOWS.md`
- Technical architecture: `docs/engineering/ARCHITECTURE.md`

## Prompt File Rules

- Prompt files must point to the canonical docs.
- Prompt files must not contain long phase-specific implementation plans that can become stale.
- Prompt files must not instruct global theme changes unless the user explicitly asks for them.

## Commit Hook Rule

The repository pre-commit hook blocks commits when app logic files changed but `docs/app/BUSINESS_LOGIC.md` was not updated in the same commit.

The hook is versioned in `.githooks/pre-commit` and is auto-configured by `pnpm install` through `pnpm prepare`. If hooks stop running locally, re-run `pnpm hooks:setup`.

## What Counts As App Logic

The hook treats these paths as app-logic surfaces:

- `src/app/`
- `src/lib/`
- `src/components/`
- `src/proxy.ts`
- `supabase/migrations/`

Pure doc-only commits are unaffected.

## Expected Workflow

1. Make the code change.
2. Update `docs/app/BUSINESS_LOGIC.md` if the change affects workflow/business behavior.
3. Stage both the code and doc changes.
4. Commit.

If a commit is truly technical and does not affect business behavior, you can still satisfy the rule with a small note in `BUSINESS_LOGIC.md` only when needed. The real goal is to stop silent workflow drift.
