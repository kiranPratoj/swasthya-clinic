# Docs Index

This repository had too many duplicated prompt and handover documents. The maintained structure is now:

## Authoritative Docs

- [app/BUSINESS_LOGIC.md](app/BUSINESS_LOGIC.md)
  What the app does, who uses it, which workflows are in scope, and the business rules that must stay true.

- [app/USER_FLOWS.md](app/USER_FLOWS.md)
  Route-by-route flows for staff, patients, and clinic owners.

- [engineering/ARCHITECTURE.md](engineering/ARCHITECTURE.md)
  Technical boundaries, auth model, tenant isolation, route model, and data-access rules.

- [process/DOC_SYNC_POLICY.md](process/DOC_SYNC_POLICY.md)
  Rules for keeping docs current and the commit hook that enforces business-logic updates.

## Repo Guides

- [../AGENTS.md](../AGENTS.md)
  Working rules for coding in this repo.

- [../README.md](../README.md)
  Quick repo entrypoint.

## Reference / Historical Docs

- `docs/qa/`
  Manual QA guides and test plans.

- `docs/design/`
  Design explorations and UI notes.

- `docs/research/`
  Product and market research inputs.

- `docs/repo-handover/`
  Historical audit/handover notes. Useful for background, but not the primary source of truth for current product behavior.

## Default Reading Order For Any Agent

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/app/BUSINESS_LOGIC.md`
4. `docs/app/USER_FLOWS.md`
5. `docs/engineering/ARCHITECTURE.md`
