# Codex Prompt — Phase 1 + Phase 2

Paste this entire prompt into Codex. All files referenced are in the repo.

---

## Context

You are building a voice-first clinic appointment system called Medilite AI.
The codebase is forked from a government appointment system (BDA CPIMS).
Read CONTRACTS.md first — it is the source of truth.

The existing voice pipeline is in `src/lib/voiceAdapter.ts` and
`src/app/citizen/request/RequestClientForm.tsx`. Adapt these for the clinic domain.
Do NOT use Tailwind. Use inline styles matching the pattern in `src/app/globals.css`.
No new npm dependencies. TypeScript strict. No `any`.

---

## Task 1 — PatientIntakeForm (issues #6, #12)

Create `src/app/[slug]/intake/PatientIntakeForm.tsx`.

This is a `'use client'` component that handles voice + manual patient intake.

**Fields to collect:**
- patientName (text)
- age (number, optional)
- phone (tel)
- complaint (text)
- visitType (select: walk-in / booked / follow-up / emergency)

**Voice flow:**
- Tap to Speak button → starts recording
- Live transcript preview while recording (reuse chunk transcription from BDA)
- Stop Recording → sends to `/api/intake-voice` (POST, FormData with audio blob)
- Staged processing loader (4 steps matching BDA's pattern):
  1. "Sending audio to Sarvam..."  / "ಆಡಿಯೋ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ"
  2. "Transcribing patient details..." / "ರೋಗಿಯ ವಿವರ ಪಠ್ಯಕ್ಕೆ ಪರಿವರ್ತಿಸಲಾಗುತ್ತಿದೆ"
  3. "Extracting with AI..." / "AI ಮೂಲಕ ಮಾಹಿತಿ ತೆಗೆಯಲಾಗುತ್ತಿದೆ"
  4. "Preparing form..." / "ಫಾರ್ಮ್ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ"
- On ready: pre-fills form fields, Kannada TTS says "ರೋಗಿಯ ಮಾಹಿತಿ ದಾಖಲಾಗಿದೆ"
- Missing fields shown in yellow warning box (English + Kannada)

**On submit:** calls server action `createAppointment` from `src/app/actions.ts`
Returns `{ appointmentId, tokenNumber }` → redirect to `/[slug]/patient/[token]`

**Types:** import from `src/lib/types.ts` — use `VoiceDraft`, `PatientIntakeDraft`, `VisitType`

---

## Task 2 — QueueDisplay (issue #7)

Create `src/app/[slug]/queue/QueueDisplay.tsx`.

`'use client'` component. Doctor's live view of today's patient queue.

**Props:**
```ts
{ initialQueue: QueueItem[]; clinicId: string; doctorId: string }
```

**Layout:**
- Header: "Today's Queue — [date]" + total count
- Each card shows:
  - Token number (large, bold, colored by status)
  - Patient name + age
  - Complaint
  - Visit type badge (walk-in=blue, emergency=red, follow-up=green, booked=gray)
  - Status buttons: "Start Consulting" → "Mark Done" (one-tap)
- Currently consulting patient: highlighted card with amber border
- Empty state: "No patients in queue today"

**Realtime:** use Supabase realtime subscription on `appointments` table filtered by `clinic_id` + today's date. Auto-updates without refresh.

**Status update:** calls server action `updateAppointmentStatus`

**Types:** `QueueItem` from `src/lib/types.ts`

---

## Task 3 — TokenCard (issue #8)

Create `src/app/[slug]/patient/[token]/TokenCard.tsx`.

Server component. Shown to patient after check-in.

**Props:** `{ appointment: Appointment & { patient: Patient }; clinic: Clinic }`

**Layout:**
- Large token number (centered, very prominent, 4rem font)
- "Patients ahead of you: X"
- Clinic name + doctor name
- Complaint summary
- "Please wait to be called"  / "ಕರೆಯುವವರೆಗೆ ದಯವಿಟ್ಟು ಕಾಯಿರಿ"
- Print button (print-only CSS)

Printable. No realtime needed.

---

## File structure to create:
```
src/app/[slug]/intake/
  PatientIntakeForm.tsx    ← Task 1 (client)
  page.tsx                 ← server component wrapping PatientIntakeForm

src/app/[slug]/queue/
  QueueDisplay.tsx         ← Task 2 (client)
  page.tsx                 ← server component, fetches initial queue

src/app/[slug]/patient/[token]/
  TokenCard.tsx            ← Task 3 (server)
  page.tsx                 ← fetches appointment by token

src/app/api/intake-voice/
  route.ts                 ← POST handler: receives FormData audio,
                              calls processPatientVoiceInput from
                              src/lib/patientExtractionAdapter.ts,
                              returns VoiceDraft JSON
```

---

## Key imports available:
```ts
import { processPatientVoiceInput } from '@/lib/patientExtractionAdapter';
import { synthesizeKannadaSpeech } from '@/lib/ttsAdapter';
import { createAppointment, updateAppointmentStatus, getClinicQueue } from '@/app/actions';
import type { VoiceDraft, PatientIntakeDraft, QueueItem, Appointment, Patient, Clinic } from '@/lib/types';
```

---

## Style reference:
- Primary color: `#0891b2` (teal)
- Header height matches `.bda-header` pattern
- Cards: white bg, `border: 1px solid #e0f2fe`, `border-radius: 8px`
- Token number color by status: waiting=#0891b2, consulting=#f59e0b, done=#16a34a
