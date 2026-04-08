# CURRENT TASK FOR ANTIGRAVITY
# Auto-managed by Claude monitor. Do not edit manually.
# Updated: 2026-04-09

## → WORK ON THIS NOW: Task 5 — Patient Portal tabbed shell + PatientBottomNav + TTS

CRITICAL:
- Both `params` AND `searchParams` are Promises — `const { slug, token } = await params; const { tab } = await searchParams;`
- No Tailwind. No new npm packages. Inline styles only.
- Check CONTRACTS.md for Patient, Appointment, VisitHistory types.
- Use existing `src/lib/ttsAdapter.ts` for TTS.

### New component: `src/components/PatientBottomNav.tsx` (`'use client'`)
Props: `basePath: string`, `activeTab: 'appointments' | 'history' | 'raise'`

3 tabs with Links:
- Appointments: `${basePath}?tab=appointments` — icon: calendar svg
- History: `${basePath}?tab=history` — icon: clock svg  
- Raise Issue: `${basePath}?tab=raise` — icon: plus-circle svg

Same fixed-bottom shell pattern as StaffBottomNav (64px height, border-top, safe-area):
```tsx
<nav style={{
  position: 'fixed', bottom: 0, left: 0, right: 0,
  height: 'calc(64px + env(safe-area-inset-bottom))',
  paddingBottom: 'env(safe-area-inset-bottom)',
  background: '#ffffff',
  borderTop: '1px solid var(--color-border)',
  display: 'flex', alignItems: 'stretch', zIndex: 80,
}}>
```
Active tab color: `var(--color-primary)`, inactive: `#94a3b8`

### Rework: `src/app/[slug]/patient/[token]/page.tsx` (server component)
```ts
const { slug, token } = await params;
const { tab = 'appointments' } = await searchParams;
```

Fetch patient data using token (check how current page resolves patient from token).
Wrap content in `<main className="mobile-content-shell">`.
Place `<PatientBottomNav basePath={`/${slug}/patient/${token}`} activeTab={tab} />` at bottom.

**Tab: 'appointments'**
- Next upcoming appointment: booked_for >= today, status != 'done'/'cancelled', order by booked_for asc, limit 1
- Show card: date, time (if available), doctor name, token number, status pill
- If today: show queue position ("You are #N in line") — count appointments with status='waiting' and token_number < this patient's token
- If no upcoming: "No upcoming appointments. Book one below." with link to `/${slug}/book`

**Tab: 'history'**
- Query visit_history where patient_id = patient.id, order by created_at desc
- Each card: date (formatted "Apr 9, 2026"), diagnosis from `JSON.parse(summary).soap.assessment` (handle parse errors gracefully with fallback "See notes")
- "Listen" button (client component `HistoryCard` with `'use client'`):
  - On click: POST to `/api/tts` with `{ text: diagnosis, language: 'kn-IN' }`
  - Check how ttsAdapter exports — import correctly
  - Play audio via `new Audio(blobUrl).play()` or response URL
  - Show "Playing..." while loading, "Listen" when idle

**Tab: 'raise'**
- Simple form: complaint textarea (required, minLength 5), submit button
- On submit: server action `raisePatientIssue(patientId, clinicId, complaint)` →
  INSERT into appointments: `{ clinic_id, patient_id, doctor_id (fetch from clinic's doctor), status: 'waiting', visit_type: 'walk-in', complaint, booked_for: today, token_number: (max token for today + 1) }`
- Success state: "Your concern has been raised. Token #N" 

### Server action in `src/app/actions.ts`
```ts
export async function raisePatientIssue(patientId: string, clinicId: string, complaint: string) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  // Get doctor for this clinic
  const { data: doctor } = await db.from('doctors').select('id').eq('clinic_id', clinicId).single();
  // Get max token for today
  const { data: tokens } = await db.from('appointments').select('token_number').eq('clinic_id', clinicId).eq('booked_for', today).order('token_number', { ascending: false }).limit(1);
  const nextToken = (tokens?.[0]?.token_number ?? 0) + 1;
  const { data } = await db.from('appointments').insert({
    clinic_id: clinicId, patient_id: patientId, doctor_id: doctor?.id,
    status: 'waiting', visit_type: 'walk-in', complaint,
    booked_for: today, token_number: nextToken,
  }).select('token_number').single();
  return { tokenNumber: data?.token_number };
}
```

### After completing:
1. `npm run build` — fix all TypeScript errors
2. Commit:
```bash
git add src/components/PatientBottomNav.tsx src/app/[slug]/patient src/app/actions.ts
git commit -m "feat: patient portal — tabbed shell, PatientBottomNav, TTS history, raise issue"
git push origin main
```

This is the FINAL task. After pushing, the swasthya-clinic feature set is complete.

## Completed tasks
- [x] Task 1 — StaffBottomNav + layout mobile shell
- [x] Task 2 — Mobile page hardening (02e48da)
- [x] Task 3 — Admin dashboard (a0e5681)
- [x] Task 4 — AI Scribe (1a4ffa1)
