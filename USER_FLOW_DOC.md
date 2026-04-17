# Medilite AI - Comprehensive End-to-End User Flow & Application Spec

## 1. Executive Summary
Medilite AI is a voice-first, multi-tenant patient appointment and clinic management system built specifically for Indian clinics. It leverages **Next.js 16 (App Router)**, **Supabase** for PostgreSQL/Auth, and **Sarvam AI** for local language Speech-to-Text (STT), Text-to-Speech (TTS), and LLM-based extraction (AI Scribe).

The application strictly adheres to a "No Tailwind" policy, using pure CSS variables (`globals.css`) with a clean, medical teal branding, and is optimized for a mobile-first, responsive experience.

---

## 2. Core Layouts & Navigation Architecture

### 2.1 Visual Language & Styling (`globals.css`)
- **Brand Colors:** Clinical Teal (`--color-primary: #0891b2`), Green for Success (`#16a34a`), Amber for In-Progress/Warnings (`#f59e0b`), Red for Errors/Cancellations (`#dc2626`).
- **Typography:** `Inter` font stack.
- **Surfaces & Cards:** White cards (`.card`) with 1px border (`var(--color-border)`), subtle shadows (`var(--shadow-sm)`), and varied border radii (`--radius-md`, `--radius-xl`).
- **Mobile Safe Areas:** Inputs and bottom-aligned elements respect the `.input-safe-area` and `.mobile-content-shell` classes to prevent mobile keyboards or fixed bottom navigations from obscuring content.

### 2.2 Navigation Shells
- **Global Header (`.bda-header`):** Desktop and top-level mobile header featuring the Medilite AI stethoscope seal, bilingual branding (ಸ್ವಾಸ್ಥ್ಯ ಕ್ಲಿನಿಕ್ / Medilite AI), and a "VOICE-FIRST" badge.
- **Staff Desktop Navigation:** A horizontal sub-nav (`.slug-sub-nav`) rendered just below the main header on viewports `> 768px`.
- **Staff Mobile Navigation (`StaffBottomNav.tsx`):** A fixed bottom navigation bar rendered on viewports `<= 768px`. It provides quick access to:
  - 🏠 Queue (`/[slug]/queue`)
  - 🎤 Intake (`/[slug]/intake`)
  - 👥 Patients (`/[slug]/patients`)
  - 📊 Admin (`/[slug]/admin`)
- **Patient Mobile Navigation (`PatientBottomNav.tsx`):** A fixed bottom navigation bar for the public patient portal with tabs:
  - 📅 Appointments (`?tab=appointments`)
  - 🕒 History (`?tab=history`)
  - ➕ Raise Issue (`?tab=raise`)

---

## 3. End-to-End User Flows

### Flow A: Clinic Owner Onboarding
**Route:** `/onboard`
**Actor:** Clinic Owner / Admin
1. **Step 1 - Clinic Basics:** The owner enters the Clinic Name, Speciality, and a 10-digit Phone Number. A unique `slug` (e.g., `sharma-clinic`) is auto-derived, with live debounced validation against the Supabase DB.
2. **Step 2 - Doctor Profile:** The owner enters the primary Doctor's name, sets working hours (Mon-Sun toggles + start/end times), and selects standard slot durations (10, 15, 20, or 30 mins).
3. **Step 3 - Review & Submit:** A summary card is presented. Upon submission, a server action creates the clinic, doctor, and default milestones.
4. **Success State:** Displays the live URL (`[slug].swasthya.app`) and default login credentials (`admin@[slug].clinic`). A button redirects to the Admin Dashboard.

---

### Flow B: Staff Authentication
**Route:** `/login`
**Actor:** Receptionist, Doctor, Clinic Admin
1. The user enters their email and password.
2. The form posts to `/api/auth/login`.
3. Supabase Auth verifies credentials. Upon success, a secure, HTTP-only `swasthya_session` cookie is set containing an HMAC-signed payload (`userId`, `role`, `clinicId`).
4. Middleware (`src/proxy.ts`) intercepts subsequent requests, verifies the HMAC signature, and injects `x-user-id` and `x-clinic-id` headers for tenant isolation.

---

### Flow C: Receptionist Operations

#### C1. Patient Voice Intake
**Route:** `/[slug]/intake`
1. **Voice Capture:** The receptionist taps "Tap to Speak" and speaks the patient's details (in Kannada, Hindi, or English).
2. **Live Feedback:** Audio is chunked and sent to `/api/transcribe-chunk` for a live preview ("Listening...").
3. **AI Extraction:** Upon stopping, the full 30-second bounded audio is sent to `/api/intake-voice`. Sarvam AI transcribes the audio and extracts structured data (Name, Age, Phone, Complaint, Visit Type).
4. **Verification & Edit:** The UI displays the extracted fields in standard form inputs. Missing fields are highlighted in a warning banner.
5. **Patient Lookup:** A background check runs on the phone number. If the patient exists, their history is displayed, and the receptionist can tap "Use this patient".
6. **Token Generation:** Submitting the form creates an appointment and generates a sequential token number for the day. A success card displays the large Token Number.

#### C2. Patient Registry & Search
**Route:** `/[slug]/patients`
1. Displays a list of all registered patients.
2. A client-side search input instantly filters patients by name or 10-digit phone number.
3. Tapping a patient navigates to their detailed history (`/[slug]/patients/[id]`).

---

### Flow D: Doctor Operations

#### D1. Live Queue Management
**Route:** `/[slug]/queue`
1. **Dashboard:** Displays today's patients sorted by token number.
2. **Auto-Refresh:** The page silently refreshes every 30 seconds using `router.refresh()`.
3. **Cards:** Each row shows the patient's name, token number, wait time (e.g., "12m", "1h 5m"), complaint, and a colored status pill.
4. **Action:** The doctor can tap "Call Next Patient" at the top to move the first waiting patient to `In Progress`. Or, they can tap a specific patient's card to enter the consultation view.

#### D2. AI Scribe & Consultation (The Core Medical Flow)
**Route:** `/[slug]/queue/[appointmentId]/consult`
1. **Header:** Displays the patient name, token number, and "Today's Visit" badge.
2. **Voice Panel:** The doctor taps "Start Recording" and dictates the consultation (symptoms, vitals, diagnosis, plan).
3. **AI Processing:** Clicking "Stop & Process" sends the audio to Sarvam AI. A custom prompt structures the raw transcript into a **SOAP Note** (Subjective, Objective, Assessment, Plan) and extracts the **Diagnosis** and **Prescription** arrays.
4. **Manual Edits:** The doctor reviews the pre-filled SOAP textareas, the diagnosis string, and the dynamic prescription rows (Drug, Dose, Frequency). Rows can be added or removed.
5. **Completion:** Submitting the form saves a comprehensive `visit_history` record (JSON stringified or formatted text) and flips the appointment status to `completed`.
6. **Discharge Card:** The UI replaces the form with a success state and a "Print Discharge Card" button. Pressing it triggers `window.print()` using a clean, `@media print` CSS layout that hides all navigation and UI chrome, rendering only the clinic header, patient details, diagnosis, prescription table, and a signature line.

---

### Flow E: Clinic Administration (KPIs)
**Route:** `/[slug]/admin`
**Actor:** Clinic Owner / Admin
1. **Date Navigator:** A client component allows shifting the view date backward or forward.
2. **Top KPIs:** 
   - **Patients Seen:** Completed appointments vs. total.
   - **Currently Waiting:** Number of waiting patients and the actual **Average Wait Time** in minutes (calculated by diffing `created_at` against audit log `in_progress` timestamps).
   - **No-Shows:** Count and percentage.
   - **Utilization:** Percentage of doctor's total slot capacity filled today.
3. **Weekly Trend:** A pure CSS bar chart showing appointment volumes over the last 7 days.
4. **Flagged Queue:** A red warning section that only appears if patients have been in the `waiting` or `booked` state for > 30 minutes.
5. **Activity Feed:** A list of the last 10 status changes (e.g., "Ravi Kumar: Waiting → In Progress · 12m ago").

---

### Flow F: Public Patient Experience

#### F1. Self Booking
**Route:** `/[slug]/book` (No Auth Required)
1. The patient sees the clinic and doctor details.
2. A clean, mobile-first card layout asks for Name, Phone (validated 10 digits), Preferred Date (minimum `today`), Visit Type dropdown, and Chief Complaint textarea.
3. Submission creates an appointment.
4. **Success:** The form flips to a confirmation card displaying a massive Token Number and the estimated date. A button allows booking another appointment, which resets the client state without a full page reload.

#### F2. Patient Portal
**Route:** `/[slug]/patient/[token]` (Token-Gated)
1. **Authentication:** The URL acts as the secure entry point. The server resolves the token number against today's appointments. If invalid, it shows a "Token not found" error.
2. **Mobile Shell:** Uses the `PatientBottomNav.tsx` for URL-driven tab switching.
3. **Tab: Appointments (`?tab=appointments`):**
   - Shows the next upcoming appointment date, status pill, and token number.
   - If the appointment is *today*, a dynamic banner states: "You are #X in line".
4. **Tab: History (`?tab=history`):**
   - Renders a list of past `visit_history` records as expandable `HistoryCard` components.
   - **TTS Integration:** Each card features a "🔊 Listen" button. Tapping it sends the diagnosis and prescription text to `/api/tts`, where Sarvam AI generates spoken Kannada/English audio, which plays natively in the browser.
5. **Tab: Raise Issue (`?tab=raise`):**
   - A form where patients can submit a concern (e.g., "Fever hasn't gone down").
   - This integrates into the clinic's issue tracking system (or creates a high-priority follow-up appointment/token).

---

## 4. Technical Constraints & Server Actions
- **Next.js 16 Paradigms:** `params` and `searchParams` in pages are strictly treated as `Promises` and are `await`ed before destructuring.
- **Client vs. Server Components:** Form handling, recording, and TTS playback are restricted to `'use client'` files (e.g., `ConsultForm.tsx`, `PatientIntakeForm.tsx`). Data fetching and layouts are strictly Server Components.
- **Server Actions:** Located in `src/app/actions.ts`. Every mutation (e.g., `saveVisitRecord`, `callNextPatient`, `createProject`) uses `revalidatePath` to ensure cache freshness without heavy client-side state management.
- **Security:** Row Level Security (RLS) is enforced in Supabase. The `getDb()` helper utilizes the `x-clinic-id` header to apply tenant isolation automatically to most queries.

---
**End of Document**