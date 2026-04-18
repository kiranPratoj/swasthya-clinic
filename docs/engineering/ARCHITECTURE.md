# Medilite AI Architecture

This file is the maintained technical architecture summary for the current app.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase (Postgres)
- Sarvam AI
- pnpm

## Routing Model

- Clinic routes live under `/{slug}/...`.
- `src/proxy.ts` resolves clinics by subdomain, path slug, or custom domain.
- Public clinic suffixes currently include `/book` and `/portal`.

## Auth Model

### Staff
- Cookie: `swasthya_session`
- Verified by middleware and session helpers.
- Middleware injects clinic and user headers into protected requests.

### Patient
- Cookie: `medilite_patient_session`
- Issued after OTP verification or portal bootstrap.

## Tenant Isolation

- Clinic identity is resolved in middleware.
- Clinic-scoped server data access must use `getClinicDb(clinicId)`.
- `src/lib/db.ts` wraps the Supabase client and auto-injects `clinic_id` filters for scoped tables.
- `patient_access_tokens` intentionally stays outside clinic-scoped proxy automation and uses raw service access.

## Data Access Rules

- Server actions live in `src/app/actions.ts`.
- Staff mutations should first verify session/role.
- Never accept `clinic_id` from the client for clinic-scoped mutations.
- New clinic-scoped tables must be added to `CLINIC_SCOPED_TABLES` and to a migration.

## Major Surfaces

- Intake: `src/app/[slug]/intake`
- Queue: `src/app/[slug]/queue`
- Consult: `src/app/[slug]/queue/[appointmentId]/consult`
- Patients: `src/app/[slug]/patients`
- Portal: `src/app/[slug]/portal`
- Settings: `src/app/[slug]/settings`
- Admin: `src/app/[slug]/admin`

## AI Integration Boundaries

- Voice/transcription/extraction helpers are isolated in lib/adapters and API routes.
- AI output is assistive. Persisted visit/billing/patient state must still come from explicit application writes.

## Styling Rules

- No Tailwind.
- Use inline styles and `src/app/globals.css`.
- Do not change `src/app/globals.css` unless explicitly asked for a global style update.

## Commit-Time Documentation Rule

- If a change affects workflow/business logic, update `docs/app/BUSINESS_LOGIC.md`.
- The pre-commit hook enforces this for app logic changes.
