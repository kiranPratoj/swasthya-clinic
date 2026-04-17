# Antigravity Prompt — Phase 1 + Phase 2

Paste this entire prompt into Antigravity. All files referenced are in the repo.

---

## Context

You are building a voice-first clinic appointment system called Medilite AI.
The codebase is forked from a government appointment system (BDA CPIMS).
Read CONTRACTS.md first — it is the source of truth.

Do NOT use Tailwind. Use inline styles matching the pattern in `src/app/globals.css`.
No new npm dependencies. Use Next.js App Router with server components where possible.
TypeScript strict. No `any`. Server actions for all mutations.

---

## Task 1 — Clinic Onboarding /onboard (issue #9)

Create `src/app/onboard/page.tsx` (server component wrapping a client form).
Create `src/app/onboard/OnboardForm.tsx` (`'use client'`).

**Form fields:**
- Clinic Name (text, required)
- Your Name / Doctor Name (text, required)
- Speciality (select: General | Pediatrics | Gynecology | Orthopedics | Dermatology | ENT | Ophthalmology | Dentistry | Other)
- Phone (tel, required)
- Subdomain slug (text, required) — the part before `.swasthya.app`
  - Show live preview: `[slug].swasthya.app`
  - Validate: lowercase letters + numbers + hyphens only, 3-30 chars
  - Check availability via server action (debounced 500ms)

**On submit:** calls `createClinic` server action from `src/app/actions.ts`
Returns `{ clinicId, slug }` → show success screen with clinic URL + "Go to Dashboard" button

**Style:** Clean white card, centered, max-width 480px.
Header: teal `#0891b2` background, white text, stethoscope icon (inline SVG).

---

## Task 2 — Admin Dashboard /[slug]/admin (issue #10)

Create `src/app/[slug]/admin/page.tsx` (server component).

**Get clinic_id from:** `headers().get('x-clinic-id')`

**Data to show (all server-side queries via Supabase):**
- Today's stats row:
  - Total patients today
  - Currently waiting
  - Currently consulting  
  - Done today
- Patients by hour: simple bar chart using only CSS/divs (no chart library)
  - X axis: 9am to 6pm in 1-hour buckets
  - Y axis: patient count (normalize to max height 80px)
- Recent 10 appointments table:
  - Token | Patient | Complaint | Status | Time
- Quick links: "Reception Intake" | "Doctor Queue" | "Settings"

**Header:** "Good morning/afternoon, Dr. [name]" based on time of day.

---

## Task 3 — Clinic Settings /[slug]/settings (issue #11)

Create `src/app/[slug]/settings/page.tsx` (server component wrapping client form).
Create `src/app/[slug]/settings/SettingsForm.tsx` (`'use client'`).

**Sections:**

### Doctor Profile
- Doctor name
- Speciality
- Phone

### Working Hours
- Toggle per day (Mon–Sat)
- Open time / Close time (time inputs)
- Default: Mon–Fri 09:00–17:00, Sat 09:00–13:00, Sun closed

### Appointment Settings
- Slot duration: 10 / 15 / 20 / 30 minutes (radio buttons)

**On save:** server action updates `doctors` table.
Show "Saved" toast (inline, no library) for 2 seconds.

---

## Task 4 — Medical Visual Theme (issue #13)

Update ONLY `src/app/globals.css` CSS variables and `.bda-header` / `.bda-footer` rules.
Do NOT change any component files or layout structure.

**Replace color variables:**
```css
--color-primary: #0891b2;        /* clinical teal */
--color-primary-hover: #0e7490;
--color-primary-soft: #e0f2fe;
--color-primary-outline: #bae6fd;
--color-accent: #059669;         /* medical green */
--color-accent-soft: #d1fae5;
--color-gold: #f59e0b;           /* amber for accents */
--color-gold-light: #fef3c7;
--color-bg: #f0f9ff;
--color-text: #0c4a6e;
--color-text-muted: #0369a1;
--color-border: #bae6fd;
```

**Header:** white background, teal bottom border 3px solid `#0891b2`, white body.
Replace BDA seal in `src/app/layout.tsx` with this inline stethoscope SVG:
```html
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="20" fill="#0891b2"/>
  <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
        stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="27" cy="13" r="2" stroke="white" stroke-width="1.8"/>
</svg>
```

Update `.bda-brand-text` title to "Medilite AI" (in layout.tsx).
Update `.bda-nav-link` colors to match teal theme.

---

## File structure to create:
```
src/app/onboard/
  page.tsx          ← server wrapper
  OnboardForm.tsx   ← client form

src/app/[slug]/admin/
  page.tsx          ← server component (full dashboard)

src/app/[slug]/settings/
  page.tsx          ← server wrapper
  SettingsForm.tsx  ← client form
```

---

## Key imports available:
```ts
import { createClinic, updateDoctorSettings, getAdminStats } from '@/app/actions';
import type { Clinic, Doctor, OnboardingInput } from '@/lib/types';
// clinic_id from headers:
import { headers } from 'next/headers';
const clinicId = (await headers()).get('x-clinic-id');
```
