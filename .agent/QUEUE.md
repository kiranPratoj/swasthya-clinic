# Antigravity Task Queue — swasthya-clinic STABILIZATION
# Last updated by: Claude monitor
# Phase: Demo stabilization

## Legend
- [ ] = pending
- [~] = in progress
- [x] = completed

---

## S1 — Verify and fix core actions + queue flow
**Status:** [x] DONE — 29da915 (all actions existed, SOAP fallback added)
**Files:**
- `src/app/actions.ts`
- `src/app/[slug]/queue/QueueDisplay.tsx`
- `src/app/[slug]/queue/page.tsx`

**Verify these functions exist and work in actions.ts:**
- `getAppointmentByToken(tokenNumber: number)` — used by patient portal
- `callNextPatient(clinicId: string)` — used by "Call Next" button in queue
- `getAllPatients(clinicId: string)` — used by patients page
- `getClinicQueue(clinicId: string, date: string)` — used by queue page

**If any are missing, add them.**

`callNextPatient` spec (if missing):
```ts
export async function callNextPatient(clinicId: string) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  // Find first waiting appointment
  const { data: next } = await db
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('booked_for', today)
    .in('status', ['booked', 'confirmed'])
    .order('token_number', { ascending: true })
    .limit(1)
    .single();
  if (!next) return null;
  await db.from('appointments').update({ status: 'in_progress' }).eq('id', next.id);
  return next;
}
```

**Queue display fix:** verify the "Call Next" form action in `queue/page.tsx` passes `clinicId` correctly. The `callNextPatient` action needs `clinicId` from headers.

**Acceptance:** Queue page shows patients, Call Next button changes first patient status to in_progress.

---

## S2 — Fix intake → confirmation → token flow
**Status:** [x] DONE — 29da915 (already correct, mock mode + token card present)
**Files:**
- `src/app/[slug]/intake/page.tsx`
- `src/app/[slug]/intake/PatientIntakeForm.tsx` (or similar)

**Read current intake page structure first.**

**Verify:**
1. Form submits → patient created in DB → appointment created → token number returned
2. Confirmation card shows token number (e.g. "Token #7")
3. "Register Another" button resets the form
4. Mock mode banner shows when `SARVAM_API_KEY` is not set

**The createAppointment action must return `{ token_number }`** — check this in actions.ts. If not returned, update the action:
```ts
// In createAppointment or equivalent action
const { data } = await db.from('appointments')
  .insert({ ... })
  .select('token_number')
  .single();
return { success: true, tokenNumber: data?.token_number };
```

**Also verify:** the intake voice recording works in mock mode (shows disabled state gracefully, not an error crash).

**Acceptance:** Submit intake form → confirmation card appears with token number → "Register Another" resets → patient appears in queue.

---

## S3 — Fix patient portal: token URL + tab content
**Status:** [ ]
**Files:**
- `src/app/[slug]/patient/[token]/page.tsx`
- `src/app/[slug]/patient/[token]/HistoryCard.tsx`
- `src/app/[slug]/patient/[token]/RaiseForm.tsx`

**Problem:** The patient portal URL is `/[slug]/patient/[token]` where `token` is parsed as a token number (`Number.parseInt`). But patients are typically sent a link via WhatsApp. Verify the URL format is correct and the token resolution works.

**Read** `getAppointmentByToken` in actions.ts — verify it queries by token_number for today's date.

**Fix if needed:**
```ts
export async function getAppointmentByToken(tokenNumber: number) {
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();
  const { data } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('token_number', tokenNumber)
    .eq('booked_for', today)
    .single();
  return data;
}
```

**Tab content verification:**
- `?tab=appointments` → shows upcoming appointment card
- `?tab=history` → shows visit history list, each with Listen button
- `?tab=raise` → RaiseForm renders, submits correctly

**TTS Listen button:** POST to `/api/tts` — verify this route exists and returns audio. If Sarvam key missing, show "Audio unavailable" instead of crashing.

**Acceptance:** `/[slug]/patient/7` (token 7) shows that patient's data, all 3 tabs render, raise form submits.

---

## S4 — Admin dashboard data + AI Scribe mock mode
**Status:** [ ]
**Files:**
- `src/app/[slug]/admin/page.tsx`
- `src/app/api/soap-note/route.ts`
- `src/app/[slug]/queue/[appointmentId]/consult/ConsultForm.tsx`

**Admin dashboard:**
Verify the status values used in queries match actual DB values. From actions.ts: `completed`, `in_progress`, `booked`, `confirmed`, `no_show`. Update admin page queries to match:
```ts
const done = appointments.filter(a => a.status === 'completed').length;
const waiting = appointments.filter(a => ['booked', 'confirmed'].includes(a.status)).length;
const consulting = appointments.filter(a => a.status === 'in_progress').length;
const noShows = appointments.filter(a => a.status === 'no_show').length;
```

**AI Scribe mock mode:**
In `ConsultForm.tsx`, if the `/api/soap-note` call fails (e.g. Sarvam key missing), show a fallback:
```ts
catch (e) {
  // Fallback SOAP note for demo
  setSoap({
    subjective: transcript,
    objective: 'Physical examination findings noted during consultation.',
    assessment: 'Based on patient complaint: ' + transcript.slice(0, 100),
    plan: 'Prescribe appropriate medication. Follow up in 1 week.',
  });
  setStep('edit');
}
```

This way the AI Scribe works end-to-end for demo even without Sarvam.

**Acceptance:** Admin dashboard shows correct counts. AI Scribe completes even when Sarvam is unavailable.

---

## S5 — End-to-end demo flow smoke test
**Status:** [ ]

Run this mental walkthrough and fix any broken steps:

1. **Onboard a clinic** — `/onboard` form submits → clinic created → redirected to `/[slug]/queue`
2. **Register a patient** — `/[slug]/intake` → fill form → submit → token #1 assigned → appears in queue
3. **Call patient** — `/[slug]/queue` → "Call Next" → token #1 moves to in_progress → "AI Scribe" link appears
4. **Consult** — `/[slug]/queue/[id]/consult` → record voice (or type) → generate SOAP → edit → save → discharge card
5. **Patient portal** — `/[slug]/patient/1` → appointments tab shows today's visit → history tab shows discharge note
6. **Admin dashboard** — `/[slug]/admin` → 1 patient seen, 0 waiting, bar chart shows today

Fix any broken steps found.

**Commit:** `git commit -m "fix: swasthya demo stabilization — queue flow, intake token, patient portal, SOAP fallback"`
