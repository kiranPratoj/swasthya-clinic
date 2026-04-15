-- ─── Patient Reports ──────────────────────────────────────────────────────────
-- Storage bucket for lab reports, X-rays, prescriptions, etc.
-- Bucket is private — files are accessed via signed URLs generated server-side.

INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-reports', 'clinic-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Only service role can read/write storage objects in this bucket.
-- Application always uses service role key, so this is effectively unrestricted
-- for server-side code while blocking any direct client-side access.
CREATE POLICY "service_role_storage_clinic_reports"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'clinic-reports');

-- ─── patient_reports table ────────────────────────────────────────────────────

CREATE TABLE patient_reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id       uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id   uuid        REFERENCES appointments(id) ON DELETE SET NULL,
  file_name        text        NOT NULL,      -- original filename shown to user
  file_path        text        NOT NULL,      -- Supabase storage object path
  mime_type        text        NOT NULL,      -- 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  report_type      text        NOT NULL DEFAULT 'other',
                               -- CHECK: 'blood_test' | 'xray' | 'scan' | 'prescription' | 'other'
  raw_summary      text,                      -- AI-generated human-readable summary
  parsed_data      jsonb,                     -- { lab_name, report_date, tests: [{name, value, unit, ref_range, flag}] }
  uploaded_by_role text,                      -- 'admin' | 'doctor' | 'receptionist'
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE patient_reports ADD CONSTRAINT patient_reports_report_type_check
  CHECK (report_type IN ('blood_test', 'xray', 'scan', 'prescription', 'other'));

CREATE INDEX idx_reports_clinic_patient
  ON patient_reports (clinic_id, patient_id, created_at DESC);

-- Enable RLS. Server-side always uses service role (bypasses RLS).
-- Anon SELECT policy mirrors the pattern used for other tables.
ALTER TABLE patient_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_patient_reports"
  ON patient_reports
  FOR SELECT
  USING (true);
