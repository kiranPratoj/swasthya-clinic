# Antigravity Task Queue — swasthya-clinic
# Last updated by: Claude monitor
# Baseline commit: cc4cd44

## Legend
- [ ] = pending
- [~] = in progress (most recent task)
- [x] = completed (commit SHA noted)

---

## Task 1 — StaffBottomNav + layout mobile shell
**Status:** [x] DONE — committed in session (src/components/StaffBottomNav.tsx, src/app/[slug]/layout.tsx, globals.css)

---

## Task 2 — Mobile page hardening: Queue + Intake + Patients
**Status:** [x] DONE — 02e48da
**Files:**
- `src/app/[slug]/queue/page.tsx` + `QueueDisplay.tsx`
- `src/app/[slug]/intake/page.tsx` (and child components)
- `src/app/[slug]/patients/page.tsx`

**CRITICAL:** `params` is a Promise in this Next.js version — always `await params` before destructuring. No Tailwind. No new npm packages. Inline styles + globals.css classes only.

**Queue page:**
- Each row: token number badge, patient name, complaint (truncated 40 chars), wait time ("12 min"), status pill (waiting=blue, consulting=green, done=gray)
- "Call Next" button → server action that updates first `waiting` appointment to `consulting`
- Auto-refresh: client wrapper with `useRouter` + `router.refresh()` on `setInterval(30000)`
- Empty state: "Queue is clear for today." centered with a checkmark

**Intake page:**
- After successful submit: show confirmation card with token number ("Token #7 — Patient registered") and "Add Another" button that resets form
- If `SARVAM_API_KEY` absent or mock mode: show yellow badge "[MOCK MODE — voice disabled]" near voice button
- Voice button must stay above mobile keyboard: wrap form in `<div className="input-safe-area">` 

**Patients page:**
- Search input at top (client component): filters by name or phone, no network call
- Each card: patient name, phone, age if present, "Last visit: X days ago" (compute from created_at as fallback), "X visits" count
- Tap → `href={\`/${slug}/patients/${patient.id}\`}`
- No-results state: "No patients match your search."

**Acceptance:** All three pages render without horizontal scroll at 390px. Queue auto-refreshes. Intake shows confirmation. Patient search filters without reload.

---

## Task 3 — Admin Dashboard with real DB queries
**Status:** [x] DONE — a0e5681
**Files:** `src/app/[slug]/admin/page.tsx`

**CRITICAL:** Server component only. No `'use client'` at top level. Get clinicId from `headers()`. All data from real Supabase queries.

**Stats to show (all for today's date):**
```ts
const today = new Date().toISOString().split('T')[0]; // "2026-04-09"
// patients_seen: appointments where status='done' AND booked_for=today
// waiting: status='waiting' AND booked_for=today  
// consulting: status='consulting' AND booked_for=today
// no_shows: status='no-show' AND booked_for=today
```

**Weekly bar chart (pure CSS, no library):**
- Last 7 days of appointment counts
- Each bar: `<div style={{ height: \`${(count/maxCount)*80}px\`, background: 'var(--color-primary)', width: 28, borderRadius: 4 }}>`
- Label below each bar: "Mon", "Tue" etc.
- Wrap in flexbox row, align-items: flex-end

**Flagged queue** (waiting > 30 min):
- Query appointments where status='waiting', booked_for=today, created_at < (now - 30min)
- Show red card: patient name, "Waiting Xm" in bold red
- Hide section entirely if no flagged patients

**Recent activity** (last 10 status changes):
- Query audit_log table OR appointments ordered by updated_at desc, limit 10
- Format: "Priya Kumar · waiting → consulting · 8 min ago"
- Relative time: compute `Math.floor((Date.now() - new Date(ts).getTime()) / 60000)` + "min ago"

**Acceptance:** Page renders server-side with real data. Bar chart visible. Flagged section only shows when applicable. No hardcoded mock data.

---

## Task 4 — AI Scribe: Consult page
**Status:** [ ]
**Files:**
- `src/app/[slug]/queue/[appointmentId]/consult/page.tsx` (new — server component shell)
- `src/app/[slug]/queue/[appointmentId]/consult/ConsultForm.tsx` (new — client component)
- `src/app/actions.ts` — add `saveVisitRecord()`

**CRITICAL:** `params` is a Promise. The route is `/[slug]/queue/[appointmentId]/consult/`.

**Server page:**
- `await params` → get `slug` and `appointmentId`
- Fetch appointment + patient from DB
- Pass to `<ConsultForm appointment={...} patient={...} slug={slug} />`

**ConsultForm (client):**
- Step 1 — Record: big mic button, uses `MediaRecorder` API, records in chunks, uploads to existing `/api/transcribe-chunk` endpoint, shows live transcript
- Step 2 — SOAP note: after recording stops, POST transcript to `/api/soap-note` (create this API route) which calls `sarvamChatAdapter.ts` with system prompt:
  ```
  You are a medical scribe. Convert this consultation transcript into a structured SOAP note.
  Return JSON: { subjective, objective, assessment, plan }
  ```
- Step 3 — Edit & save: 4 editable textareas (one per SOAP field) + prescription rows (drug, dose, frequency, duration) + follow-up date input
- Submit → calls `saveVisitRecord(appointmentId, soap, prescriptions, followUpDate)` → updates appointment status to 'done'

**saveVisitRecord action:**
```ts
export async function saveVisitRecord(appointmentId: string, soap: object, prescriptions: object[], followUpDate: string) {
  // INSERT into visit_history: { clinic_id, patient_id, doctor_id, appointment_id, notes: JSON.stringify(soap), created_at }
  // UPDATE appointments SET status='done' WHERE id=appointmentId
}
```

**Print discharge card:**
- After save: show a print-ready div (`.print-only` class) with: clinic name, patient name, date, doctor name, diagnosis (assessment field), prescriptions table, follow-up date
- "Print" button: `window.print()`

**Acceptance:** Full flow works: record → transcript → SOAP → edit → save → print. Appointment moves to 'done' in queue.

---

## Task 5 — Patient Portal: PatientBottomNav + tabbed shell
**Status:** [ ]
**Files:**
- `src/components/PatientBottomNav.tsx` (new)
- `src/app/[slug]/patient/[token]/page.tsx` (rework)

**CRITICAL:** `params` AND `searchParams` are Promises. Await both.

**PatientBottomNav:**
- Same pattern as StaffBottomNav but 3 tabs: Appointments / History / Raise Issue
- hrefs use `?tab=appointments`, `?tab=history`, `?tab=raise`
- Props: `basePath: string`, `activeTab: string`
- Color scheme: same teal (`var(--color-primary)`)

**Patient page tabs:**
- `appointments` tab: next upcoming appointment card (date, time, doctor name, token number), queue position if today ("You are #3 in line")
- `history` tab: list of past visits from `visit_history` table where patient_id matches; each card shows date, diagnosis, "Listen" button
- `raise` tab: simple form (complaint textarea + submit) that inserts into `appointments` with status='waiting', visit_type='walk-in', booked_for=today

**Listen button (TTS):**
- On click: POST to `/api/tts` with `{ text: visit.notes, language: 'kn-IN' }` using existing `ttsAdapter.ts`
- Play returned audio: `new Audio(url).play()` or use blob URL from response
- Show "Playing..." state while audio loads

**Acceptance:** `/[slug]/patient/[token]?tab=history` deep-links to history. Listen plays audio. Raise form submits. Bottom nav active state correct.
