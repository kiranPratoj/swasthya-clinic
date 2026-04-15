create table if not exists patient_access_tokens (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_by_role text check (created_by_role in ('admin', 'doctor', 'receptionist', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_access_tokens_patient
  on patient_access_tokens (patient_id, clinic_id, created_at desc);

alter table patient_access_tokens enable row level security;

