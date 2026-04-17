-- Medilite AI — Initial Schema
-- Multi-tenant: every table scoped by clinic_id
-- RLS enforced at DB level

-- ─── Extensions ──────────────────────────────────────────────────────────────
-- uuid-ossp not needed; using gen_random_uuid() (built-in pgcrypto)

-- ─── Clinics (tenant root) ────────────────────────────────────────────────────
create table clinics (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  custom_domain  text unique,
  phone          text not null,
  speciality     text not null default 'General',
  created_at     timestamptz not null default now()
);

-- ─── Doctors ─────────────────────────────────────────────────────────────────
create table doctors (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references clinics(id) on delete cascade,
  name                text not null,
  speciality          text not null,
  phone               text not null,
  working_hours       jsonb not null default '{}',
  slot_duration_mins  int  not null default 15 check (slot_duration_mins in (10,15,20,30)),
  created_at          timestamptz not null default now()
);
create index idx_doctors_clinic on doctors(clinic_id);

-- ─── Staff ───────────────────────────────────────────────────────────────────
create table staff (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  name       text not null,
  role       text not null default 'receptionist',
  phone      text,
  created_at timestamptz not null default now()
);
create index idx_staff_clinic on staff(clinic_id);

-- ─── Patients ────────────────────────────────────────────────────────────────
create table patients (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  name       text not null,
  age        int,
  phone      text,
  created_at timestamptz not null default now()
);
create index idx_patients_clinic       on patients(clinic_id);
create index idx_patients_clinic_phone on patients(clinic_id, phone);

-- ─── Appointments ─────────────────────────────────────────────────────────────
create table appointments (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  patient_id    uuid not null references patients(id),
  doctor_id     uuid not null references doctors(id),
  token_number  int  not null,
  visit_type    text not null default 'walk-in'
                  check (visit_type in ('walk-in','booked','follow-up','emergency')),
  complaint     text not null,
  status        text not null default 'waiting'
                  check (status in ('waiting','consulting','done','cancelled','no-show')),
  notes         text,
  booked_for    date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (clinic_id, booked_for, token_number)
);
create index idx_appt_clinic_date   on appointments(clinic_id, booked_for);
create index idx_appt_clinic_status on appointments(clinic_id, status);
create index idx_appt_patient       on appointments(patient_id);

-- ─── Visit History ────────────────────────────────────────────────────────────
create table visit_history (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references clinics(id) on delete cascade,
  patient_id     uuid not null references patients(id),
  appointment_id uuid references appointments(id),
  summary        text not null,
  created_at     timestamptz not null default now()
);
create index idx_visit_clinic_patient on visit_history(clinic_id, patient_id);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  actor      text not null,
  action     text not null,
  target_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_clinic on audit_log(clinic_id, created_at desc);

-- ─── Token counter helper ─────────────────────────────────────────────────────
-- Returns next token number for a clinic on a given date
create or replace function next_token_number(p_clinic_id uuid, p_date date)
returns int language sql as $$
  select coalesce(max(token_number), 0) + 1
  from appointments
  where clinic_id = p_clinic_id and booked_for = p_date;
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table clinics       enable row level security;
alter table doctors       enable row level security;
alter table staff         enable row level security;
alter table patients      enable row level security;
alter table appointments  enable row level security;
alter table visit_history enable row level security;
alter table audit_log     enable row level security;

-- Service role bypass (server-side always uses service key)
create policy "service_bypass" on clinics       for all using (true);
create policy "service_bypass" on doctors       for all using (true);
create policy "service_bypass" on staff         for all using (true);
create policy "service_bypass" on patients      for all using (true);
create policy "service_bypass" on appointments  for all using (true);
create policy "service_bypass" on visit_history for all using (true);
create policy "service_bypass" on audit_log     for all using (true);
