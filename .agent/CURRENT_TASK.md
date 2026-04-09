# CURRENT TASK FOR ANTIGRAVITY
# Phase: Demo Stabilization
# Updated: 2026-04-09

## → WORK ON THIS NOW: S1 — Verify and fix core actions + queue flow

**Read these files first:**
- `src/app/actions.ts` (search for: callNextPatient, getAppointmentByToken, getAllPatients)
- `src/app/[slug]/queue/page.tsx`
- `src/app/[slug]/queue/QueueDisplay.tsx`

**Check 1: Does `callNextPatient` exist?**
Search actions.ts for `callNextPatient`. If missing, add it:
```ts
export async function callNextPatient(clinicId: string) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const { data: next } = await db
    .from('appointments')
    .select('id, token_number')
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

**Check 2: Does `getAppointmentByToken` exist?**
Search actions.ts. If missing, add it:
```ts
export async function getAppointmentByToken(tokenNumber: number) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('token_number', tokenNumber)
    .eq('booked_for', today)
    .single();
  return data;
}
```

**Check 3: Queue "Call Next" button**
In `queue/page.tsx` or `QueueDisplay.tsx`, find the "Call Next" form/button. Verify:
- It calls `callNextPatient` with the correct `clinicId`
- clinicId comes from `(await headers()).get('x-clinic-id')`
- After calling, the queue refreshes (router.refresh() or form revalidation)

**Check 4: AI Scribe fallback**
In `src/app/[slug]/queue/[appointmentId]/consult/ConsultForm.tsx`, wrap the `/api/soap-note` call in try/catch. On failure, set a fallback SOAP note so demo works without Sarvam:
```ts
} catch {
  setSoap({
    subjective: transcript || 'Patient presented with complaint.',
    objective: 'Vital signs stable. Physical examination conducted.',
    assessment: 'Diagnosis based on clinical presentation.',
    plan: 'Prescribe medication as appropriate. Review in 1 week.',
  });
  setStep('edit');
}
```

**After all checks, run:** `npm run build` — must be green.

**Commit:**
```bash
git add src/app/actions.ts src/app/[slug]/queue src/app/[slug]/queue/[appointmentId]
git commit -m "fix: callNextPatient + getAppointmentByToken + SOAP fallback for demo"
git push origin main
```

Then read QUEUE.md S2, S3, S4, S5 for remaining tasks.

## Completed stabilization tasks
- (none yet)
