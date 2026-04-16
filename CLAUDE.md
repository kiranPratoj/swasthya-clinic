# Swasthya Clinic — Claude Code Project Guide

## Product
Multi-tenant clinic management SaaS. Each clinic has a **slug** (e.g. `drpriya`). Staff roles: `admin`, `doctor`, `receptionist`. Patients are unauthenticated (magic link or token-based access).

## Stack
- **Framework:** Next.js 16 App Router (TypeScript)
- **Database:** Supabase (PostgreSQL) — multi-tenant via `clinic_id`
- **Auth:** HMAC-signed cookie `swasthya_session` for staff; UUID magic links for patients
- **AI:** Sarvam AI (`sarvam-30b`) for text/tool-calling; Sarvam Document Intelligence for image OCR
- **Package manager:** `pnpm` — always use pnpm, never npm or yarn

## Commands
```bash
pnpm dev          # local dev server
pnpm build        # production build — run after every change to verify
pnpm lint         # eslint check
pnpm test         # node test runner (src/lib/*.test.ts)
supabase db push  # apply migrations to remote Supabase
```

## Key Architecture Rules

### Database
- All clinic-scoped DB access goes through `getClinicDb(clinicId)` — never raw `getDb()` for clinic data
- `patient_access_tokens` is intentionally NOT in `CLINIC_SCOPED_TABLES` — uses `getDb()` directly
- Mutations auto-inject `clinic_id`; never pass it manually in insert payloads for scoped tables
- New tables → add to `CLINIC_SCOPED_TABLES` in `src/lib/db.ts` AND write a migration in `supabase/migrations/`

### Server Actions
- All server actions live in `src/app/actions.ts` — do not scatter them across files
- Every action that touches DB must call `getClinicId()` from headers (set by proxy middleware)
- Staff actions must call `requireSession()` or `verifyRole()` first

### Routing & Auth
- Proxy (`src/proxy.ts`) enforces staff auth for all `/{slug}/*` routes
- Public clinic routes listed in `PUBLIC_SLUG_SUFFIXES` — currently `/book` and `/portal`
- Patient portal: `/{slug}/portal?t={uuid}` — validated via `src/lib/patientToken.ts`
- Existing patient token portal: `/{slug}/patient/[token]` — legacy, sequential token auth

### Components
- Server components fetch data directly (no `useEffect`)
- Client components (`'use client'`) only for interactivity: forms, tabs, dropdowns
- Inline styles only (no Tailwind, no CSS modules) — follow existing pattern
- Reuse existing components before creating new ones:
  - `ReportCard` — `src/components/reports/ReportCard.tsx`
  - `HistoryCard` — `src/app/[slug]/patient/[token]/HistoryCard.tsx`
  - `PatientBottomNav` — `src/app/[slug]/patient/[token]/PatientBottomNav.tsx`

### AI / Parsing
- Text structuring → `requestSarvamToolObject()` in `src/lib/sarvamChatAdapter.ts`
- Image OCR → Sarvam Document Intelligence (async job: create → upload ZIP → poll → download markdown)
- PDF text extraction → `pdf-parse` (v2 class API: `new PDFParse({ data: buffer })`)
- Never use `generateObject` (removed in AI SDK v6) — use `generateText` with `output: Output.object()`

### WhatsApp
- All outbound messages via `src/lib/whatsappAdapter.ts`
- Requires `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` env vars
- Log every send to `communication_events` table

## File Structure (critical paths)
```
src/
  app/
    actions.ts              ← ALL server actions
    [slug]/
      queue/                ← appointment queue (staff)
      patients/             ← patient list + profile (staff)
      portal/               ← patient self-service portal (public)
      patient/[token]/      ← legacy patient portal (sequential token)
      consult/              ← doctor consultation form
  lib/
    db.ts                   ← Supabase client + clinic-scoped proxy
    session.ts              ← staff HMAC auth
    patientToken.ts         ← patient magic link tokens
    types.ts                ← ALL shared TypeScript types
    sarvamChatAdapter.ts    ← Sarvam AI tool-calling
    reportParsingAdapter.ts ← PDF + image report parsing
    whatsappAdapter.ts      ← WhatsApp Graph API
  proxy.ts                  ← Next.js routing middleware
components/
  reports/
    ReportCard.tsx
    ReportUploadForm.tsx
supabase/migrations/        ← SQL migration files (timestamped)
```

## Git Workflow
- Commit after every completed feature — do NOT let changes sit uncommitted
- Never auto-push — only push when explicitly asked
- Commit message format: `feat:`, `fix:`, `refactor:`, `chore:`
- Always run `pnpm build` before committing

## Environment Variables
```
SARVAM_API_KEY              # Sarvam AI (STT, TTS, chat, document intelligence)
NEXT_PUBLIC_SUPABASE_URL    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET              # HMAC signing key for staff sessions
WHATSAPP_TOKEN              # Meta Graph API token (optional)
WHATSAPP_PHONE_NUMBER_ID    # (optional)
APP_URL                     # e.g. https://swasthya.vercel.app (for portal links)
```

## Do NOT
- Add Tailwind, CSS modules, or external UI libraries
- Use `npm` or `yarn` — always `pnpm`
- Create new files unless necessary — edit existing ones
- Add `console.log` to production code
- Use `generateObject` (removed in AI SDK v6)
- Add `clinic_id` to `CLINIC_SCOPED_TABLES` inserts manually — proxy handles it
