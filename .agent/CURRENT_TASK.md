# CURRENT TASK FOR ANTIGRAVITY
# Auto-managed by Claude monitor. Do not edit manually.
# Updated: 2026-04-09

## → WORK ON THIS NOW: Task 3 — Admin Dashboard with real DB queries

### File to rework: `src/app/[slug]/admin/page.tsx`

CRITICAL:
- Server component — no `'use client'` at top level
- `params` is a Promise — `const { slug } = await params;`
- Get clinicId from `const clinicId = (await headers()).get('x-clinic-id');`
- No Tailwind, no new packages, inline styles only

### Stats (all for today's date)
```ts
const today = new Date().toISOString().split('T')[0]; // e.g. "2026-04-09"
// Query appointments table filtering: clinic_id=clinicId AND booked_for=today
// patients_seen: count where status='done'
// waiting: count where status='waiting'
// consulting: count where status='consulting'
// no_shows: count where status='no-show'
```

### Weekly bar chart (pure CSS, no library)
- Query last 7 days: for each day, count appointments where booked_for = that day
- Render as flex row, align-items: flex-end
- Each bar: `<div style={{ height: \`${(count/maxCount)*80}px\`, minHeight: 4, background: 'var(--color-primary)', width: 28, borderRadius: '4px 4px 0 0' }}>`
- Day label below: Mon/Tue/Wed etc.

### Flagged queue (waiting > 30 minutes)
```ts
const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
// Query: status='waiting' AND booked_for=today AND created_at < thirtyMinAgo
// Join with patients table to get name
```
- If any results: show red card per patient — name + "Waiting Xm" in bold red
- Hide entire section if no flagged patients

### Recent activity feed (last 10)
- Query appointments ordered by updated_at desc, limit 10, join patients
- Format each: `"Priya Kumar · waiting → consulting · 8 min ago"`
- Relative time: `Math.floor((Date.now() - new Date(updated_at).getTime()) / 60000) + ' min ago'`
- If < 1 min: "Just now"

### Commit after completing
```bash
git add src/app/[slug]/admin
git commit -m "feat: admin dashboard — real DB stats, CSS bar chart, flagged queue, activity feed"
git push origin main
```

Then read QUEUE.md Task 4 (AI Scribe) for next work.

## Completed tasks
- [x] Task 1 — StaffBottomNav + layout mobile shell
- [x] Task 2 — Mobile page hardening (02e48da)

## Next task after this
Task 4 — AI Scribe: `/[slug]/queue/[appointmentId]/consult/` route
See QUEUE.md for full spec.
