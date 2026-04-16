---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Component Rules

## Server vs Client
- Default to server components (no `'use client'`)
- Add `'use client'` ONLY for: useState, useEffect, event handlers, router.push
- Server components fetch data directly — never use useEffect for data fetching

## Styling
- Inline styles only — no Tailwind, no CSS modules, no styled-components
- Use CSS variables from global stylesheet:
  - `var(--color-primary)`, `var(--color-text)`, `var(--color-text-muted)`
  - `var(--color-border)`, `var(--color-bg)`
  - `var(--color-success)`, `var(--color-success-bg)`
  - `var(--color-error)`, `var(--color-error-bg)`
  - `var(--color-warning)`, `var(--color-warning-bg)`
  - `var(--radius-md)`, `var(--radius-lg)`, `var(--radius-xl)`
  - `var(--shadow-sm)`
- Mobile-first: patient-facing pages use `className="mobile-content-shell"`

## Reusable components (use these, don't recreate)
- Report display: `src/components/reports/ReportCard.tsx`
- Report upload: `src/components/reports/ReportUploadForm.tsx`
- Visit history card: `src/app/[slug]/patient/[token]/HistoryCard.tsx`
- Patient bottom nav: `src/app/[slug]/patient/[token]/PatientBottomNav.tsx`
- Appointment actions: `src/app/[slug]/queue/AppointmentActionsMenu.tsx`

## Forms and loading states
- Use `useTransition` for server action calls (not useState + fetch)
- Show loading state during transitions: `isPending ? 'Saving...' : 'Save'`
- Never disable submit buttons without visual feedback
- Errors: red text below the relevant field, not alerts

## No-ops to avoid
- Do not add docstrings or JSDoc to components
- Do not add prop validation beyond TypeScript types
- Do not add error boundaries unless a specific crash has occurred
