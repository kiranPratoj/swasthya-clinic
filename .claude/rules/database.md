---
paths:
  - "src/lib/db.ts"
  - "supabase/migrations/**"
  - "src/app/actions.ts"
---

# Database Rules

## Clinic scoping
- Use `getClinicDb(clinicId)` for all clinic-scoped queries — never raw `getDb()`
- `patient_access_tokens` is the ONLY table that uses `getDb()` directly — do not add it to CLINIC_SCOPED_TABLES
- Never manually include `clinic_id` in `insert()` payloads for scoped tables — the proxy injects it automatically

## New tables
1. Write migration in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add table name to `CLINIC_SCOPED_TABLES` in `src/lib/db.ts` (unless it's a bearer-token table like `patient_access_tokens`)
3. Add type to `src/lib/types.ts`
4. Run `supabase db push` to apply

## Migrations
- Always use timestamped filenames: `20260415000000_description.sql`
- Enable RLS on every new table
- Include index on `(clinic_id, created_at DESC)` for any time-series table
- Foreign keys: always `ON DELETE CASCADE` for clinic-owned data

## Querying patterns
```ts
// ✅ Correct — clinic-scoped
const db = getClinicDb(clinicId);
const { data } = await db.from('patients').select('*').eq('id', patientId);

// ✅ Correct — service client for cross-clinic or token tables
const { data } = await getDb().from('patient_access_tokens').select('*').eq('token', token);

// ❌ Wrong — raw client for clinic data
const { data } = await getDb().from('patients').select('*');
```
