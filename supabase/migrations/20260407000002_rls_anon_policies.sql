-- Harden RLS: drop the catch-all service_bypass policies and replace with
-- proper role-scoped policies.
--
-- server-side code always uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- entirely, so these policies only apply to anon/authenticated requests from
-- the browser (e.g. QueueDisplay Realtime subscription).

-- ─── Drop old permissive policies ─────────────────────────────────────────────
drop policy if exists "service_bypass" on clinics;
drop policy if exists "service_bypass" on doctors;
drop policy if exists "service_bypass" on staff;
drop policy if exists "service_bypass" on patients;
drop policy if exists "service_bypass" on appointments;
drop policy if exists "service_bypass" on visit_history;
drop policy if exists "service_bypass" on audit_log;

-- ─── clinics: public read of name/slug (needed for onboard slug check) ────────
create policy "anon_read_clinics"
  on clinics for select
  using (true);

-- ─── doctors: public read (queue display shows doctor name) ───────────────────
create policy "anon_read_doctors"
  on doctors for select
  using (true);

-- ─── appointments: anon can read (Realtime subscription in QueueDisplay) ──────
create policy "anon_read_appointments"
  on appointments for select
  using (true);

-- ─── patients: no anon read — server-side only via service role ───────────────
-- (no policy = deny by default under RLS)

-- ─── staff, visit_history, audit_log: no anon access ─────────────────────────
-- (no policy = deny by default under RLS)

-- ─── All writes go through service role key only (no anon write policies) ─────
