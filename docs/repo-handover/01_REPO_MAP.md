# 01_REPO_MAP

## Top-Level Folder Tree
```text
/
├── .agent/              # Agent task tracking, queue, and logs (ignore during dev)
├── docs/                # Project documentation and handover files
├── public/              # Static assets (SVGs)
├── scripts/             # Utility scripts (seeding DB, smoke testing)
├── src/
│   ├── app/             # Next.js App Router (Pages, Layouts, API Routes, Actions)
│   ├── components/      # Shared/Reusable React Components
│   ├── lib/             # Core logic, types, adapters, and database singletons
│   └── proxy.ts         # Custom Next.js middleware for tenant/auth routing
└── supabase/
    ├── migrations/      # PostgreSQL schema definitions (source of DB truth)
    └── seed.sql         # Seed data for local dev
```

## App Route Map (`src/app/`)
- `/` - Landing page (Public)
- `/onboard` - Clinic registration flow (Public)
- `/login` - Staff login page (Public)
- `/[slug]/` - Tenant-scoped clinic routes:
  - `/admin` - Analytics and dashboard
  - `/intake` - Receptionist patient registration (Voice/Manual)
  - `/queue` - Doctor/Staff queue view
  - `/queue/[appointmentId]/consult` - AI Scribe consultation view
  - `/patients` - Patient directory
  - `/patients/[id]` - Patient profile edit
  - `/settings` - Clinic settings (hours, doctor profile)
  - `/patient/[token]` - Public patient portal (History, Status)
  - `/book` - Public self-booking
- `/api/`
  - `/auth/login`, `/auth/logout` - Session management
  - `/health` - System health check
  - `/intake-voice` - STT endpoint for receptionist
  - `/soap-note` - LLM endpoint for consult summaries
  - `/transcribe-chunk` - Live STT chunks
  - `/tts` - Text-to-Speech for patient portal
  - `/whatsapp/send` - Outbound messaging

## Route Groups and Layouts
- `src/app/layout.tsx`: Root layout (contains global CSS).
- `src/app/[slug]/layout.tsx`: Tenant layout. Validates `x-clinic-id` and sets up the primary navigation shell based on the user's role (`admin`, `receptionist`, `doctor`).

## Major Reusable Components
- `src/components/PatientBottomNav.tsx`: Navigation for patient portal.
- `src/components/StaffBottomNav.tsx`: Main application navigation for staff.
- `src/components/feedback/RouteErrorState.tsx`, `RouteLoadingState.tsx`: Universal error/loading boundaries.

## Server-Side vs Client-Side Modules
- **Server-Side:**
  - `src/app/actions.ts` (All database mutations)
  - `src/proxy.ts` (Middleware)
  - All files in `src/lib/` EXCEPT components.
  - All `page.tsx` files (unless marked `'use client'`).
- **Client-Side:**
  - All `*Form.tsx` files (e.g., `PatientIntakeForm.tsx`, `ConsultForm.tsx`, `SettingsForm.tsx`).
  - Interactive components like `QueueDisplay.tsx`, `DateNavigator.tsx`, `QueueAutoRefresh.tsx`.

## Where AI Integrations Live
All AI domain logic resides in `src/lib/`:
- `voiceAdapter.ts`: Handles file validation, chunking, and STT calls.
- `sarvamChatAdapter.ts`: Wrapper around Sarvam LLM for prompt processing and JSON extraction.
- `patientExtractionAdapter.ts`: Specific prompt logic for taking transcripts and returning structured `PatientIntakeDraft`.
- `ttsAdapter.ts`: Handles text-to-speech calls.

## Where Database/Schema Truth Lives
- **Database DDL:** `supabase/migrations/*.sql`
- **TypeScript Models:** `src/lib/types.ts`
- **Client Access:** `src/lib/db.ts`
