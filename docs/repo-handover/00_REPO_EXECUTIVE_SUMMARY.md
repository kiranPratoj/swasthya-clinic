# 00_REPO_EXECUTIVE_SUMMARY

## 1. What the Repo Is
This repository contains the codebase for **Sarvam Clinic**, a multi-tenant, queue-first clinic flow system for Indian OPD clinics. It is built using the Next.js 16 App Router (with Turbopack) and Supabase as the backend.

## 2. Core Product Purpose
To help clinic receptionists and doctors move a patient from intake to consult to continuity with minimal friction. The current V1-safe backbone is phone-first lookup, token creation, live queue, manual consult completion, visit history, and lightweight payment marking. AI is assistive and optional.

## 3. Top-Level Architecture Summary
- **Framework:** Next.js 16.2.2 (App Router).
- **Database/Backend:** Supabase (PostgreSQL).
- **Authentication & Multi-Tenancy:** Custom stateless HMAC-signed cookies (`src/lib/session.ts`). A custom Next.js middleware (`src/proxy.ts`) enforces tenant isolation via the URL slug/subdomain and injects `x-clinic-id`, `x-user-id`, and `x-user-role` headers into all protected routes.
- **Data Access:** Server Components and Server Actions (`src/app/actions.ts`) bypass Row Level Security (RLS) by using the Supabase Service Role key (`SUPABASE_SERVICE_ROLE_KEY`), relying entirely on the middleware's header injection to enforce tenant isolation. Client-side data fetching (e.g., realtime queue updates) relies on database-level RLS policies.
- **AI Integrations:** Sarvam AI is used for optional Speech-to-Text (STT) during intake, optional SOAP drafting during consultation, and Text-to-Speech (TTS) for the patient portal.

## 4. Current Implementation Maturity
**Maturity Level:** Demo-Ready / High Prototype.
The receptionist -> queue -> consult -> continuity loop is real and stable enough to freeze as V1. AI-enhanced behaviors and broader operational surfaces still exist, but should be treated as secondary to the core manual flow.

## 5. Strongest Completed Areas
- **Tenant Isolation:** The middleware (`src/proxy.ts`) correctly intercepts routes and enforces `x-clinic-id` strictness.
- **Queue Management:** The patient queue (`/[slug]/queue`) is fully operational with real-time updates and proper database status transitions (`booked` -> `confirmed` -> `in_progress` -> `completed`).
- **Reception Flow:** Intake, token creation, and phone-number-first reuse are wired and usable for small-clinic front desks.
- **Database Schema:** Well-defined normalized tables with strict foreign key constraints and `timestamptz` auditing.

## 6. Weakest / Riskiest Areas
- **AI Dependency Resilience:** While fallbacks exist, the AI-assisted intake and SOAP flows remain vulnerable to upstream API degradation and should not define the V1 promise.
- **Real-Time Consistency:** The app mixes Next.js Server Action revalidation (`revalidatePath`) and Supabase Realtime subscriptions. 
- **RLS Bypass:** Because the server code exclusively uses the service role key, any bug in the middleware's header injection or failure to read `x-clinic-id` in a server action constitutes a critical data leak risk.
- **Scope Drift:** Legacy admin, booking, WhatsApp, and AI-oriented modules still exist in the repo and can be mistaken for first-class V1 commitments if not described carefully.

## 7. How Trustworthy is the Repo Currently?
The codebase is structurally sound and strictly follows React Server Components (RSC) patterns. It does not hallucinate data; what you see in the UI corresponds to real database mutations. The repository truth is robust.

## 8. Top 10 Things a Future LLM Must Understand First
1. **Tenant ID is King:** Read `x-clinic-id` from headers in Server Components/Actions. Do NOT rely on client-side routing params for security.
2. **Server Actions:** All mutations happen in `src/app/actions.ts`. Do not write direct Supabase mutations in Client Components.
3. **Database Client:** Always use `getDb()` from `src/lib/db.ts`. It intelligently falls back to the service role key for server operations.
4. **Middleware Dictates Auth:** `src/proxy.ts` handles session verification via `swasthya_session` cookie. Do not implement duplicate auth logic in routes.
5. **No Tailwind:** The project strictly uses inline styles or vanilla CSS (`src/app/globals.css`). Do NOT import or use Tailwind classes.
6. **Strict Status Enum:** Appointments move strictly through: `booked` -> `confirmed` -> `in_progress` -> `completed` / `no_show` / `cancelled`.
7. **Types as Truth:** `src/lib/types.ts` is the single source of truth for the domain model. Keep it synced with Supabase migrations.
8. **AI Adapters:** All Sarvam AI logic is encapsulated in `src/lib/*Adapter.ts`. Do not sprinkle fetch calls to Sarvam across UI components.
9. **Form Handling:** Forms use standard HTML `FormData` and native Next.js Server Actions. Avoid complex client-side state for simple form submissions.
10. **Revalidation:** After mutating data in an action, you MUST call `revalidatePath` to ensure the Server Components refetch the data.
