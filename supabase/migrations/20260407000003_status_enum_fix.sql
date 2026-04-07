-- Fix appointment status values to match product roadmap
-- Old: waiting | consulting | done | no-show | cancelled
-- New: booked | confirmed | in_progress | completed | no_show | rescheduled | cancelled

-- Drop old check constraint
alter table appointments drop constraint if exists appointments_status_check;

-- Migrate existing data
update appointments set status = 'confirmed'   where status = 'waiting';
update appointments set status = 'in_progress' where status = 'consulting';
update appointments set status = 'completed'   where status = 'done';
update appointments set status = 'no_show'     where status = 'no-show';

-- Add new check constraint with full status set
alter table appointments add constraint appointments_status_check
  check (status in ('booked','confirmed','in_progress','completed','cancelled','no_show','rescheduled'));
