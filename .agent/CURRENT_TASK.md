# CURRENT TASK FOR ANTIGRAVITY
# Auto-managed by Claude monitor. Do not edit manually.
# Updated: 2026-04-09

## → WORK ON THIS NOW: Task 4 — AI Scribe (voice → SOAP → discharge)

CRITICAL:
- `params` is a Promise — `const { slug, appointmentId } = await params;`
- No Tailwind. No new npm packages. Inline styles only.
- Check `CONTRACTS.md` for Appointment and VisitHistory types before writing DB inserts.
- Use existing adapters: `src/lib/voiceAdapter.ts` (STT), `src/lib/sarvamChatAdapter.ts` (SOAP), `src/lib/ttsAdapter.ts` (TTS)

### New files to create

**`src/app/[slug]/queue/[appointmentId]/consult/page.tsx`** (server component)
- `await params` → slug + appointmentId
- Fetch appointment + patient from DB
- Render: patient name + complaint at top, then `<ConsultForm>`

**`src/app/[slug]/queue/[appointmentId]/consult/ConsultForm.tsx`** (`'use client'`)

3-step UI:

**Step 1 — Record**
- Large mic button (60px circle, var(--color-primary) background)
- On click: `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder`
- Record in chunks (ondataavailable), accumulate blobs
- On stop: POST blob to `/api/transcribe-chunk` (already exists) as FormData with field `audio`
- Show live transcript text as it comes back
- "Stop Recording" button switches to Step 2

**Step 2 — Generate SOAP note**
- POST transcript to new endpoint `/api/soap-note` (create this)
- `/api/soap-note/route.ts`: calls `sarvamChatAdapter` with system prompt:
  ```
  You are a medical scribe. Convert this consultation transcript into a structured SOAP note.
  Return only valid JSON: { "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." }
  ```
- Show loading spinner while generating

**Step 3 — Edit & Save**
- 4 textareas: Subjective / Objective / Assessment / Plan (pre-filled from SOAP)
- Prescription rows: each row has drug name, dose, frequency, duration inputs. "Add row" button.
- Follow-up date input (type="date")
- Submit button → calls `saveVisitRecord()` server action

**`src/app/api/soap-note/route.ts`** (new API route)
```ts
import { sarvamChatAdapter } from '@/lib/sarvamChatAdapter'; // check exact export
export async function POST(req: Request) {
  const { transcript } = await req.json();
  const result = await sarvamChatAdapter(/* system prompt */, transcript);
  return Response.json(result);
}
```

### Server action to add in `src/app/actions.ts`
```ts
export async function saveVisitRecord(
  appointmentId: string,
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  prescriptions: Array<{ drug: string; dose: string; frequency: string; duration: string }>,
  followUpDate: string
) {
  const db = getDb();
  // 1. Get appointment to find clinic_id, patient_id, doctor_id
  const { data: appt } = await db.from('appointments').select('*').eq('id', appointmentId).single();
  // 2. Insert visit_history
  await db.from('visit_history').insert({
    clinic_id: appt.clinic_id,
    patient_id: appt.patient_id,
    doctor_id: appt.doctor_id,
    appointment_id: appointmentId,
    notes: JSON.stringify({ soap, prescriptions, followUpDate }),
    created_at: new Date().toISOString(),
  });
  // 3. Update appointment status to 'done'
  await db.from('appointments').update({ status: 'done' }).eq('id', appointmentId);
}
```

### Printable discharge card
After save success, show a print-ready section:
```tsx
<div className="print-only">  {/* globals.css: display:none, shown on print */}
  <h2>{clinicName}</h2>
  <p>Patient: {patient.name} | Date: {today} | Dr. {doctorName}</p>
  <h3>Diagnosis</h3><p>{soap.assessment}</p>
  <h3>Prescription</h3>
  <table>... prescriptions rows ...</table>
  <p>Follow-up: {followUpDate}</p>
</div>
<button onClick={() => window.print()}>Print Discharge Card</button>
```

### After completing
```bash
git add src/app/[slug]/queue/[appointmentId] src/app/api/soap-note src/app/actions.ts
git commit -m "feat: AI scribe — voice recording → SOAP note → discharge card"
git push origin main
```

Then read QUEUE.md Task 5 for next work.

## Completed tasks
- [x] Task 1 — StaffBottomNav + layout mobile shell
- [x] Task 2 — Mobile page hardening (02e48da)
- [x] Task 3 — Admin dashboard (a0e5681)

## Next task after this
Task 5 — Patient Portal: PatientBottomNav + tabbed shell + TTS
See QUEUE.md for full spec.
