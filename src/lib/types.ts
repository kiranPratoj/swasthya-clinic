// Swasthya Clinic — Domain Types
// Single source of truth. Match CONTRACTS.md exactly.

export type WorkingHours = {
  mon?: { open: string; close: string };
  tue?: { open: string; close: string };
  wed?: { open: string; close: string };
  thu?: { open: string; close: string };
  fri?: { open: string; close: string };
  sat?: { open: string; close: string };
  sun?: { open: string; close: string };
};

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  phone: string;
  speciality: string;
  created_at: string;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  name: string;
  speciality: string;
  phone: string;
  working_hours: WorkingHours;
  slot_duration_mins: 10 | 15 | 20 | 30;
};

export type Staff = {
  id: string;
  clinic_id: string;
  name: string;
  role: string;
  phone: string | null;
};

export type Patient = {
  id: string;
  clinic_id: string;
  name: string;
  age: number | null;
  phone: string | null;
  created_at: string;
};

export type AppointmentStatus = 'waiting' | 'consulting' | 'done' | 'cancelled' | 'no-show';
export type VisitType = 'walk-in' | 'booked' | 'follow-up' | 'emergency';

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  token_number: number;
  visit_type: VisitType;
  complaint: string;
  status: AppointmentStatus;
  notes: string | null;
  booked_for: string;
  created_at: string;
  patient?: Patient;
};

export type VisitHistory = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  summary: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  clinic_id: string;
  actor: string;
  action: string;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// ─── Voice / AI intake types ──────────────────────────────────────────────────

export type PatientIntakeDraft = {
  patientName: string | null;
  age: string | null;
  phone: string | null;
  complaint: string | null;
  visitType: VisitType | null;
  summary: string;
  missingFields: string[];
};

export type VoiceDraft = {
  id: string;
  transcript: string;
  structuredData: PatientIntakeDraft;
  status: 'processing' | 'ready' | 'failed';
  isFallback: boolean;
  modelUsed?: string;
  errorMsg?: string;
};

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type OnboardingInput = {
  clinicName: string;
  slug: string;
  phone: string;
  speciality: string;
  doctorName: string;
};

// ─── Queue view (appointment + patient joined) ────────────────────────────────

export type QueueItem = Appointment & {
  patient: Patient;
};
