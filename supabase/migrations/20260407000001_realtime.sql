-- Enable Supabase Realtime on appointments table
-- Required for QueueDisplay live updates

alter table appointments replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table appointments;
  end if;
end $$;
