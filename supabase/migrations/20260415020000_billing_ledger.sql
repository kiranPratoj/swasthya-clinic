create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'partially_paid', 'paid', 'void')),
  subtotal_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  amount_due numeric not null default 0,
  notes text,
  created_by_role text check (created_by_role in ('admin', 'doctor', 'receptionist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists idx_bills_appointment_unique on bills(appointment_id);
create index if not exists idx_bills_clinic on bills(clinic_id, created_at desc);
create index if not exists idx_bills_patient on bills(clinic_id, patient_id, created_at desc);

create table if not exists bill_line_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  item_type text not null default 'service'
    check (item_type in ('consultation', 'procedure', 'consumable', 'service', 'adjustment')),
  label text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_amount numeric not null default 0 check (unit_amount >= 0),
  line_total numeric not null default 0 check (line_total >= 0),
  metadata jsonb,
  created_by_role text check (created_by_role in ('admin', 'doctor', 'receptionist')),
  created_at timestamptz not null default now()
);

create index if not exists idx_bill_line_items_bill on bill_line_items(bill_id, created_at asc);
create index if not exists idx_bill_line_items_appointment on bill_line_items(appointment_id, created_at asc);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_mode text not null check (payment_mode in ('cash', 'upi')),
  payment_status text not null default 'recorded'
    check (payment_status in ('recorded', 'failed', 'reversed')),
  utr_number text,
  collected_by_role text check (collected_by_role in ('admin', 'doctor', 'receptionist')),
  collected_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_events_bill on payment_events(bill_id, created_at asc);
create index if not exists idx_payment_events_appointment on payment_events(appointment_id, created_at asc);

alter table bills enable row level security;
alter table bill_line_items enable row level security;
alter table payment_events enable row level security;

