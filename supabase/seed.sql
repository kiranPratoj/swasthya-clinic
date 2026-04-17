-- Medilite AI — Demo Seed
-- Creates one demo clinic with a doctor and 10 appointments across all statuses

do $$
declare
  v_clinic_id   uuid;
  v_doctor_id   uuid;
  v_patient_ids uuid[] := '{}';
  v_pid         uuid;
  v_today       date := current_date;

  -- Patient data: name, age, phone, complaint, visit_type, status
  type patient_row is record (
    name        text,
    age         int,
    phone       text,
    complaint   text,
    visit_type  text,
    status      text,
    token       int
  );

begin
  -- ── Clinic ──────────────────────────────────────────────────────────────────
  insert into clinics (name, slug, phone, speciality)
  values ('Dr. Priya Sharma Clinic', 'drpriya', '+91 98456 12345', 'General Medicine')
  on conflict (slug) do update set name = excluded.name
  returning id into v_clinic_id;

  -- ── Doctor ──────────────────────────────────────────────────────────────────
  insert into doctors (clinic_id, name, speciality, phone, working_hours, slot_duration_mins)
  values (
    v_clinic_id,
    'Dr. Priya Sharma',
    'General Medicine',
    '+91 98456 12345',
    '{"mon":{"open":true,"start":"09:00","end":"13:00"},"tue":{"open":true,"start":"09:00","end":"13:00"},"wed":{"open":true,"start":"09:00","end":"13:00"},"thu":{"open":true,"start":"09:00","end":"13:00"},"fri":{"open":true,"start":"09:00","end":"13:00"},"sat":{"open":true,"start":"09:00","end":"12:00"},"sun":{"open":false,"start":"09:00","end":"12:00"}}',
    15
  )
  on conflict do nothing
  returning id into v_doctor_id;

  if v_doctor_id is null then
    select id into v_doctor_id from doctors where clinic_id = v_clinic_id limit 1;
  end if;

  -- ── Patients + Appointments ──────────────────────────────────────────────────
  -- Token 1 — done
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Ravi Kumar',      45, '9845001001') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001001'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 1, 'follow-up',  'Follow-up for hypertension, BP review', 'done', v_today) on conflict do nothing;

  -- Token 2 — done
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Meera Nair',       32, '9845001002') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001002'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 2, 'walk-in',    'Fever and body pain since 2 days', 'done', v_today) on conflict do nothing;

  -- Token 3 — done
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Suresh Babu',      58, '9845001003') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001003'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 3, 'booked',     'Diabetes quarterly checkup', 'done', v_today) on conflict do nothing;

  -- Token 4 — consulting (currently with doctor)
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Kavitha Reddy',    29, '9845001004') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001004'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 4, 'walk-in',    'Severe headache and nausea since morning', 'consulting', v_today) on conflict do nothing;

  -- Token 5 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Anand Krishnan',   41, '9845001005') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001005'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 5, 'follow-up',  'Post-surgery wound check', 'waiting', v_today) on conflict do nothing;

  -- Token 6 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Lakshmi Devi',     67, '9845001006') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001006'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 6, 'walk-in',    'Joint pain in knees, difficulty walking', 'waiting', v_today) on conflict do nothing;

  -- Token 7 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Mohammed Irfan',   35, '9845001007') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001007'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 7, 'emergency',  'Chest tightness and shortness of breath', 'waiting', v_today) on conflict do nothing;

  -- Token 8 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Preethi Shetty',   24, '9845001008') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001008'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 8, 'booked',     'Routine prenatal checkup, 20 weeks', 'waiting', v_today) on conflict do nothing;

  -- Token 9 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Venkatesh Rao',    52, '9845001009') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001009'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 9, 'walk-in',    'Persistent cough and mild fever for a week', 'waiting', v_today) on conflict do nothing;

  -- Token 10 — waiting
  insert into patients (clinic_id, name, age, phone) values (v_clinic_id, 'Geetha Murthy',    38, '9845001010') on conflict do nothing returning id into v_pid;
  if v_pid is null then select id into v_pid from patients where clinic_id = v_clinic_id and phone = '9845001010'; end if;
  insert into appointments (clinic_id, patient_id, doctor_id, token_number, visit_type, complaint, status, booked_for)
  values (v_clinic_id, v_pid, v_doctor_id, 10, 'follow-up', 'Thyroid test results review', 'waiting', v_today) on conflict do nothing;

end $$;
