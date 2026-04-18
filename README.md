# Medilite AI

Medilite AI is a multi-tenant clinic workflow SaaS for Indian OPD clinics. It connects receptionist intake, live queue, consultation notes, billing, discharge, reports, and patient access flows in one system.

This repository uses Next.js 16 App Router, Supabase, and Sarvam AI. Staff access is protected by an HMAC-signed session cookie. Clinic isolation is enforced through slug/domain resolution plus clinic-scoped database access.

## Start Here

If you need to understand the app quickly, read these in order:

1. [AGENTS.md](AGENTS.md)
2. [docs/README.md](docs/README.md)
3. [docs/app/BUSINESS_LOGIC.md](docs/app/BUSINESS_LOGIC.md)
4. [docs/app/USER_FLOWS.md](docs/app/USER_FLOWS.md)
5. [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md)

## Local Development

Use `pnpm` only.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

After `pnpm install`, the repo configures `core.hooksPath` to `.githooks` automatically so the business-logic doc sync check runs before commits. If needed, you can re-run it manually with `pnpm hooks:setup`.

Local app:

```text
http://localhost:3000
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
SARVAM_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
APP_URL=
```

## Source Of Truth

- Product and workflow logic: [docs/app/BUSINESS_LOGIC.md](docs/app/BUSINESS_LOGIC.md)
- Route-by-route user flows: [docs/app/USER_FLOWS.md](docs/app/USER_FLOWS.md)
- Technical architecture and invariants: [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md)
- Commit-time doc update rule: [docs/process/DOC_SYNC_POLICY.md](docs/process/DOC_SYNC_POLICY.md)

## Important Rules

- Do not change `src/app/globals.css` unless the user explicitly asks for a global visual change.
- Use `pnpm`, never `npm` or `yarn`.
- Keep server actions in `src/app/actions.ts`.
- Use `getClinicDb(clinicId)` for clinic-scoped data, not raw `getDb()`.
- Update [docs/app/BUSINESS_LOGIC.md](docs/app/BUSINESS_LOGIC.md) when workflow or business logic changes.
