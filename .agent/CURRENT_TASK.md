# CURRENT TASK FOR ANTIGRAVITY
# Phase: Demo Stabilization
# Updated: 2026-04-09

## → WORK ON THIS NOW: S3+S4+S5 — Patient portal, Admin dashboard, End-to-end smoke test

---

## S3 — Fix patient portal: token URL + tab content

**Files:**
- `src/app/[slug]/patient/[token]/page.tsx`
- `src/app/api/tts/route.ts` (may not exist — create if missing)

**Read** `src/app/[slug]/patient/[token]/page.tsx` first.

**Verify `getAppointmentByToken`** is called with `Number.parseInt(token, 10)` and returns patient data.

**Tab content verification** — all 3 tabs must render:
- `?tab=appointments` → upcoming appointment card with token number
- `?tab=history` → visit history list, each with Listen button (or "Audio unavailable" if no Sarvam key)
- `?tab=raise` → RaiseForm renders and submits

**TTS Listen button:** POST to `/api/tts` — check if this route exists. If missing, create:
```ts
// src/app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  
  if (!process.env.SARVAM_API_KEY) {
    return NextResponse.json({ error: 'Audio unavailable' }, { status: 503 });
  }
  
  try {
    // Use sarvam TTS if available
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({ inputs: [text], target_language_code: 'kn-IN', speaker: 'meera' }),
    });
    const data = await response.json();
    return NextResponse.json({ audio: data.audios?.[0] });
  } catch {
    return NextResponse.json({ error: 'Audio unavailable' }, { status: 503 });
  }
}
```

**History tab Listen button:** If `/api/tts` returns 503, show "Audio unavailable" text instead of crashing.

**Acceptance:** `/[slug]/patient/7` (any token) shows patient data, all 3 tabs render, raise form submits.

---

## S4 — Admin dashboard data + status enum

**Files:**
- `src/app/[slug]/admin/page.tsx`

**Read** the current admin page. Verify the status enum values match: `completed`, `in_progress`, `booked`, `confirmed`, `no_show`.

**Fix any mismatches:**
```ts
const done = appointments.filter(a => a.status === 'completed').length;
const waiting = appointments.filter(a => ['booked', 'confirmed'].includes(a.status)).length;
const consulting = appointments.filter(a => a.status === 'in_progress').length;
const noShows = appointments.filter(a => a.status === 'no_show').length;
```

**Also verify:** The admin page uses `created_at` (not `updated_at` — that column does NOT exist) for any date-based queries or activity feeds.

**Acceptance:** Admin dashboard shows correct stat counts without runtime errors.

---

## S5 — End-to-end smoke test + final commit

Run this mental walkthrough — check the code paths for each step, fix any broken steps:

1. **Onboard** — `/onboard` → clinic created → redirect to `/[slug]/queue` ✓
2. **Register** — `/[slug]/intake` → form submit → token assigned → appears in queue
3. **Call patient** — `/[slug]/queue` → "Call Next" → token moves to in_progress → consult link appears
4. **Consult** — `/[slug]/queue/[id]/consult` → voice (or type) → generate SOAP (with fallback) → edit → save → discharge card
5. **Patient portal** — `/[slug]/patient/1` → appointments tab → history tab → raise tab
6. **Admin** — `/[slug]/admin` → correct counts

**Run:** `npm run build` — must be green, zero TypeScript errors.

**Commit:**
```bash
git add -A
git commit -m "fix: patient portal TTS, admin dashboard status enum, demo smoke test"
git push origin main
```

Then update `.agent/CURRENT_TASK.md`:
```
# STABILIZATION COMPLETE
All S1-S5 tasks done. Build green. Demo ready.
```

## Completed stabilization tasks
- S1: callNextPatient + getAppointmentByToken verified, SOAP fallback added — 29da915
- S2: Intake → token confirmation verified (already correct) — 29da915
