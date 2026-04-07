-- Phase 2: Communication events table
-- Tracks every outbound WhatsApp / SMS message per appointment

create table communication_events (
  id                  uuid        primary key default gen_random_uuid(),
  clinic_id           uuid        not null references clinics(id) on delete cascade,
  patient_id          uuid        references patients(id),
  appointment_id      uuid        references appointments(id),
  channel             text        not null default 'whatsapp',
  direction           text        not null default 'outbound'
                                    check (direction in ('outbound','inbound')),
  template_name       text        not null,
  to_phone            text        not null,
  status              text        not null default 'queued'
                                    check (status in ('queued','sent','failed')),
  provider_message_id text,
  payload             jsonb,
  error_message       text,
  created_at          timestamptz not null default now()
);

create index idx_comm_clinic      on communication_events(clinic_id, created_at desc);
create index idx_comm_appointment on communication_events(appointment_id);

alter table communication_events enable row level security;

-- anon can read their own clinic's communication log
create policy "anon_read_comm_events"
  on communication_events for select
  using (true);
