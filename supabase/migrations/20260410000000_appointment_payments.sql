-- Add payment fields to appointments
alter table appointments
  add column payment_utr text,
  add column payment_amount numeric,
  add column payment_status text default 'pending'
    check (payment_status in ('pending', 'verified', 'failed'));
