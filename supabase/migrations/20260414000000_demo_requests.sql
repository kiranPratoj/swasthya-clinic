create table if not exists demo_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  clinic_name text,
  created_at  timestamptz not null default now()
);

-- Allow anonymous inserts (public lead form)
alter table demo_requests enable row level security;

create policy "Anyone can insert demo requests"
  on demo_requests for insert
  to anon, authenticated
  with check (true);

-- Only service role can read
create policy "Service role reads demo requests"
  on demo_requests for select
  to service_role
  using (true);
