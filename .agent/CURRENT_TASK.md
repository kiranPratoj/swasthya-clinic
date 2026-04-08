# CURRENT TASK FOR ANTIGRAVITY
# Auto-managed by Claude monitor. Do not edit manually.
# Updated: 2026-04-09

## → WORK ON THIS NOW: Task 2 — Mobile page hardening

Task 1 (StaffBottomNav + layout shell) is already DONE.

### Queue page hardening
**Files:** `src/app/[slug]/queue/page.tsx`, `src/app/[slug]/queue/QueueDisplay.tsx`

CRITICAL: `params` is a Promise — `const { slug } = await params;`
No Tailwind. No new packages. Inline styles + globals.css classes only.

1. Each queue row must show: token number badge, patient name, complaint (truncated 40 chars), wait time, status pill
2. Add "Call Next" button at top → server action updating first `waiting` appointment to `consulting`
3. Wrap QueueDisplay in a client component that calls `router.refresh()` every 30 seconds
4. Empty state: "Queue is clear for today." centered

### Intake page hardening
**File:** `src/app/[slug]/intake/page.tsx` (and child components)

1. After successful submit: show confirmation card with token number + "Add Another" button
2. If `process.env.SARVAM_API_KEY` is falsy: show `<div style={{background:'#fef9c3',padding:'0.4rem 0.75rem',borderRadius:6,fontSize:'0.75rem',fontWeight:700,color:'#a16207'}}>[MOCK MODE — voice disabled]</div>` near voice button
3. Wrap form in `<div className="input-safe-area">` (already in globals.css)

### Patients page hardening
**File:** `src/app/[slug]/patients/page.tsx`

1. Make it a client component OR extract a client search wrapper
2. Search input filters by name or phone client-side (no network)
3. Patient cards: name, phone, age, last visit date, visit count
4. No-results state when search has no matches

### After completing this task:
Run `npm run build` — must be green.
Commit: `git add src/app/[slug]/queue src/app/[slug]/intake src/app/[slug]/patients && git commit -m "feat: mobile page hardening — queue auto-refresh, intake confirmation, patient search"`
Then read QUEUE.md Task 3 for next work.

## Completed tasks
- [x] Task 1 — StaffBottomNav + layout mobile shell

## Next task after this
Task 3 — Admin Dashboard with real DB queries
See QUEUE.md for full spec.
