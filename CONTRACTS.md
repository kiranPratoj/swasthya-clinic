# Medilite AI Contracts

This file is now a lightweight entrypoint, not the place to duplicate the full app spec.

## Canonical References

- Product and workflow rules: [docs/app/BUSINESS_LOGIC.md](docs/app/BUSINESS_LOGIC.md)
- User-facing flows and routes: [docs/app/USER_FLOWS.md](docs/app/USER_FLOWS.md)
- Technical architecture and invariants: [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md)
- Shared TypeScript types: [src/lib/types.ts](src/lib/types.ts)

## Contract Rules

1. Do not change workflow/business behavior without updating [docs/app/BUSINESS_LOGIC.md](docs/app/BUSINESS_LOGIC.md).
2. Do not change technical invariants without updating [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md).
3. Do not change shared domain types without updating both `src/lib/types.ts` and the relevant docs.
4. Do not use this file as a second source of truth. Use it as the index to the real ones.
