# 05_DATA_MODEL_AND_SCHEMA_TRUTH

## 1. Major Entities and Relationships
The entire database is heavily normalized and strongly multi-tenant. **Every operational table is scoped by a mandatory `clinic_id` foreign key.**

- `clinics`: The root tenant entity. Identified by a `slug` (or `custom_domain`).
- `doctors`: Linked to `clinics`. Contains JSONB `working_hours` and `slot_duration_mins`.
- `staff`: Linked to `clinics`. Represents receptionists or admins.
- `patients`: Linked to `clinics`. Unique index on `(clinic_id, phone)` to prevent duplicate phone numbers per clinic.
- `appointments`: The core transactional entity. Links `clinic_id`, `patient_id`, and `doctor_id`.
- `visit_history`: Immutable log of completed consultations.
- `audit_log`: Generic tracking of actions (who did what to what).
- `clinic_users`: Links a Supabase Auth `user.id` to a `clinic_id` and a `role` (`admin`, `receptionist`, `doctor`).
- `communication_events`: Logs outbound messages (e.g., WhatsApp).

## 2. The Appointment Status State Machine
Verified via `20260407000003_status_enum_fix.sql`.
Appointments move through a strict database-level `CHECK` constraint:
`('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')`

## 3. Concurrency and Token Generation
Verified in `20260406000000_clinic_init.sql`.
Token numbers are generated via a PostgreSQL function `next_token_number(p_clinic_id, p_date)`.
The `appointments` table has a `UNIQUE (clinic_id, booked_for, token_number)` constraint to prevent race conditions from generating duplicate tokens.

## 4. Row Level Security (RLS) Reality
All tables have `ENABLE ROW LEVEL SECURITY`.
However, the actual security model relies on **Middleware + Service Role Bypass**.
- **Server:** `src/lib/db.ts` uses `SUPABASE_SERVICE_ROLE_KEY`. This entirely bypasses RLS rules. Isolation is enforced strictly by appending `.eq('clinic_id', headers.get('x-clinic-id'))` to queries.
- **Client (Anon):** RLS policies explicitly allow `anon` reads to `clinics` (for slug resolution), `doctors`, and `appointments` (for real-time queue subscriptions). All anon writes are blocked.

## 5. Mismatches & Risks
- **`updated_at` column:** Does NOT exist. Queries relying on recent changes must use `created_at` or look up transitions in the `audit_log`.
- **Soft Deletes:** There are no soft deletes. Relationships use `ON DELETE CASCADE` linked to the `clinics` table, meaning deleting a clinic immediately wipes all its data.
- **Roles:** The database `clinic_users` table tracks `role` (admin/doctor/receptionist), but the database does not enforce table-level permissions based on this role. Role logic must be enforced at the UI or Server Component level.
