ALTER TABLE patients
ADD COLUMN IF NOT EXISTS no_phone boolean NOT NULL DEFAULT false;

UPDATE patients
SET phone = CASE
  WHEN phone IS NULL THEN NULL
  ELSE right(regexp_replace(phone, '\D', '', 'g'), 10)
END;

UPDATE patients
SET no_phone = true,
    phone = NULL
WHERE phone IS NULL
   OR phone !~ '^[6-9][0-9]{9}$'
   OR phone IN ('1234567890')
   OR phone ~ '^(\d)\1{9}$';

ALTER TABLE patients
DROP CONSTRAINT IF EXISTS patients_phone_format_check;

ALTER TABLE patients
ADD CONSTRAINT patients_phone_format_check
CHECK (phone IS NULL OR phone ~ '^[6-9][0-9]{9}$');

ALTER TABLE patients
DROP CONSTRAINT IF EXISTS patients_no_phone_consistency_check;

ALTER TABLE patients
ADD CONSTRAINT patients_no_phone_consistency_check
CHECK (NOT (no_phone = true AND phone IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone
ON patients (clinic_id, phone);
