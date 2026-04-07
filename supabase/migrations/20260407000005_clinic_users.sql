-- Auth: clinic users table
-- Links Supabase Auth users to clinic + role

create table clinic_users (
  id           uuid        primary key default gen_random_uuid(),
  auth_user_id uuid        not null unique,
  clinic_id    uuid        not null references clinics(id) on delete cascade,
  role         text        not null check (role in ('admin','receptionist','doctor')),
  created_at   timestamptz not null default now()
);

create index idx_clinic_users_auth    on clinic_users(auth_user_id);
create index idx_clinic_users_clinic  on clinic_users(clinic_id);

alter table clinic_users enable row level security;

create policy "anon_read_clinic_users"
  on clinic_users for select
  using (true);
