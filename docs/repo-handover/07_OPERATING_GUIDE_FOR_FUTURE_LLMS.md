# 07_OPERATING_GUIDE_FOR_FUTURE_LLMS

**To: Future AI Agent / LLM**
**From: Current LLM Auditor**

Welcome to the Swasthya Clinic codebase. This is a Next.js 16 App Router application. To successfully write code here without breaking the system, you must internalize the following rules.

## 1. The Multi-Tenant Invariant
This is a multi-tenant system. The URL dictates the tenant.
- **Read the Clinic ID:** In Server Components and Actions, ALWAYS start by reading the header:
  `const clinicId = (await headers()).get('x-clinic-id');`
- **Enforce the Clinic ID:** ALWAYS append `.eq('clinic_id', clinicId)` to every Supabase query. Do not assume the database will filter it for you. We use the Service Role key on the backend, which bypasses RLS.

## 2. Server Actions Only
- Do not write API routes (`/api/...`) for simple database mutations.
- Put all database writes inside `src/app/actions.ts`.
- Always call `revalidatePath()` at the end of an action to ensure the UI updates.

## 3. Await Next.js Promises
In Next.js 16+, `params` and `searchParams` are Promises.
**Wrong:** `export default function Page({ params }: { params: { slug: string } }) { const slug = params.slug; }`
**Right:** `export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; }`

## 4. No Tailwind CSS
The user explicitly forbids Tailwind. Do not use classes like `flex`, `p-4`, `text-center`.
Use inline styles `style={{ display: 'flex', padding: '1rem' }}` and reference variables from `src/app/globals.css` (e.g., `var(--color-primary)`).

## 5. UI Illusions vs. Real Flow
If you see something "working" on the screen, check if it actually mutated the database.
- **Example:** In the patient intake flow, the STT live transcription is best-effort. The actual source of truth for the appointment is the FormData submission to `createAppointment`.

## 6. How to Safely Edit
1. **Identify the Route:** Start at `src/app/[slug]/...`
2. **Check the Action:** Trace the form submission to `src/app/actions.ts`.
3. **Verify Types:** Open `src/lib/types.ts`. Do not invent new fields. If you need a new field, you must add it to the Supabase migration, then to `types.ts`.
4. **Compile:** Run `npm run build` to verify TypeScript strictness. There are no `any` types allowed.

## 7. Common Traps
- **Date Queries:** Dates in the DB are `timestamptz` or `date`. When querying by today, use `new Date().toISOString().split('T')[0]` or `toLocaleDateString('en-CA')` to get `YYYY-MM-DD` and match the DB format exactly.
- **Missing `updated_at`:** The database tables do not have an `updated_at` column. Do not try to query or sort by it. Use `created_at` or query the `audit_log` table.
- **Middleware Lockout:** If you create a new public route, you must add it to the `PUBLIC_PREFIXES` array in `src/proxy.ts`, otherwise the middleware will throw a 404.
