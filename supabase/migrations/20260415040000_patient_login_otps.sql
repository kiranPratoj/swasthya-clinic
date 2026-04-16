create table if not exists patient_login_otps (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  phone text not null,
  otp_hash text not null,
  channel text not null default 'whatsapp',
  attempt_count integer not null default 0,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_login_otps_phone
  on patient_login_otps (clinic_id, phone, created_at desc);

alter table patient_login_otps enable row level security;
