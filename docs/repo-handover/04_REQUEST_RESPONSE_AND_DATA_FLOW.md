# 04_REQUEST_RESPONSE_AND_DATA_FLOW

This document traces the exact path of data for core application flows.

## 1. Clinic Onboarding Flow
1. **User Action:** Submits form on `/onboard`.
2. **Client Code:** `OnboardForm.tsx` handles debounced slug validation (`checkSlugAvailable`). On submit, calls `createClinic(FormData)`.
3. **Server Action:** `actions.ts -> createClinic()`.
   - Inserts row into `clinics`.
   - Inserts default doctor into `doctors` with default `working_hours` (JSONB).
4. **Result:** Redirects to the success screen containing the new subdomain URL.

## 2. Login & Session Flow
1. **User Action:** Enters credentials on `/login`.
2. **Client Code:** `LoginForm.tsx` POSTs to `/api/auth/login`.
3. **API Route:** `api/auth/login/route.ts`.
   - Authenticates against Supabase using anon key.
   - Looks up `clinic_users` table to find role and clinic slug.
   - Signs a custom JWT-like string (`src/lib/session.ts`) and sets `swasthya_session` cookie.
4. **Middleware:** Subsequent requests pass through `src/proxy.ts`. Middleware verifies cookie signature, validates expiration, and injects `x-clinic-id` and `x-user-role` into headers for Server Components.

## 3. Voice Intake Flow (Receptionist)
1. **User Action:** Holds "Record" button on `/[slug]/intake`.
2. **Client Code:** `PatientIntakeForm.tsx` records via MediaRecorder. Sends `FormData` with audio Blob to `/api/intake-voice`.
3. **API Route:** `/api/intake-voice` calls `processRealVoiceInput()`.
   - Transcribes audio via Sarvam STT.
   - Passes text to `extractPatientIntakeDraft` (LLM).
   - LLM extracts `patientName`, `phone`, `complaint`, `visitType`.
4. **State Change:** Client receives `PatientIntakeDraft` and populates form fields. Receptionist can manually correct errors.
5. **Finalization:** Form submit calls `createAppointment(FormData)` in `actions.ts`, saving to DB and redirecting to queue.

## 4. Consultation & AI Scribe Flow (Doctor)
1. **User Action:** Doctor clicks "Consult" from Queue, enters notes or uses voice on `/[slug]/queue/[id]/consult`.
2. **Client Code:** `ConsultForm.tsx` calls `generateSoapNote(transcript)`.
3. **Server Action:** `actions.ts -> generateSoapNote()`.
   - Calls `requestSarvamToolObject` enforcing a JSON schema for SOAP parts (Subjective, Objective, Assessment, Plan, Diagnosis, Prescription).
4. **State Change:** Extracted JSON populates the UI. Doctor reviews.
5. **Finalization:** Submitting calls `saveVisitRecord()`.
   - Concatenates SOAP and Prescriptions into a text `summary`.
   - Updates appointment status to `completed`.
   - Inserts record into `visit_history`.
   - Calls `revalidatePath` to clear cache.

## 5. Queue Transition Flow
1. **Initial State:** Intake creates appointment -> status `confirmed`.
2. **Doctor Action:** Clicks "Call Next Patient" in `/[slug]/queue`.
3. **Server Action:** `actions.ts -> callNextPatient()`.
   - Queries DB for oldest `booked` or `confirmed` appointment for today.
   - Updates status to `in_progress`.
   - Creates an `auditLog` entry.
   - Revalidates queue path.
4. **Client Sync:** `QueueDisplay.tsx` uses Supabase Realtime to listen for `UPDATE` events on `appointments` table and visually moves the patient into the "Consulting" column instantly.

## 6. Admin Analytics Flow
1. **Trigger:** User visits `/[slug]/admin`.
2. **Server Component:** `AdminDashboard` in `page.tsx`.
3. **Data Fetch:** Calls `getDb()` directly or `actions.ts -> getAdminStats()`.
   - Fetches all appointments for `today`.
   - Calculates wait times by comparing `appointments.created_at` against `audit_log` timestamps where status flipped to `in_progress`.
   - Calculates utilization against `working_hours` JSON in `doctors` table.
4. **Render:** Passes calculated stats directly into static inline-styled UI elements. No client state required.
