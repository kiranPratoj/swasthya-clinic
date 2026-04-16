// Swasthya Clinic — Domain Types
// Single source of truth. Match CONTRACTS.md exactly.

export type WorkingHourSlot = {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

export type WorkingHourDay = {
  open: boolean;
  slots: WorkingHourSlot[];
};

export type WorkingHours = {
  mon?: WorkingHourDay;
  tue?: WorkingHourDay;
  wed?: WorkingHourDay;
  thu?: WorkingHourDay;
  fri?: WorkingHourDay;
  sat?: WorkingHourDay;
  sun?: WorkingHourDay;
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

export type AppointmentStatus =
  | 'booked'        // created, not yet at clinic
  | 'confirmed'     // patient arrived, in queue
  | 'in_progress'   // doctor is seeing them
  | 'completed'     // visit done
  | 'cancelled'     // explicitly cancelled
  | 'no_show'       // did not arrive
  | 'rescheduled';  // moved to different slot
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
  payment_mode?: 'cash' | 'upi' | null;
  payment_utr: string | null;
  payment_amount: number | null;
  payment_status: 'pending' | 'verified' | 'failed';
  bill_summary?: BillSummary | null;
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

// ─── Billing ──────────────────────────────────────────────────────────────────

export type BillStatus = 'draft' | 'open' | 'partially_paid' | 'paid' | 'void';

export type BillLineItemType =
  | 'consultation'
  | 'procedure'
  | 'consumable'
  | 'service'
  | 'adjustment';

export type PaymentEventStatus = 'recorded' | 'failed' | 'reversed';

export type Bill = {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_id: string;
  status: BillStatus;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  created_by_role: UserRole | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type BillLineItem = {
  id: string;
  clinic_id: string;
  bill_id: string;
  appointment_id: string;
  item_type: BillLineItemType;
  label: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
  metadata: Record<string, unknown> | null;
  created_by_role: UserRole | null;
  created_at: string;
};

export type PaymentEvent = {
  id: string;
  clinic_id: string;
  bill_id: string;
  appointment_id: string;
  patient_id: string;
  amount: number;
  payment_mode: 'cash' | 'upi';
  payment_status: PaymentEventStatus;
  utr_number: string | null;
  collected_by_role: UserRole | null;
  collected_at: string;
  notes: string | null;
  created_at: string;
};

export type BillSummary = {
  bill_id: string;
  status: BillStatus;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_display_mode: 'cash' | 'upi' | 'mixed' | null;
  payment_count: number;
};

// ─── Communication ───────────────────────────────────────────────────────────

export type CommunicationEvent = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  channel: 'whatsapp';
  direction: 'outbound' | 'inbound';
  template_name: string;
  to_phone: string;
  status: 'queued' | 'sent' | 'failed';
  provider_message_id: string | null;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'receptionist' | 'doctor';

export type ClinicUser = {
  id: string;
  auth_user_id: string;
  clinic_id: string;
  role: UserRole;
  created_at: string;
};

export type SessionPayload = {
  userId: string;
  clinicId: string;
  role: UserRole;
  slug: string;
  exp: number;
};

export type PatientSessionPayload = {
  kind: 'patient';
  clinicId: string;
  slug: string;
  phone: string;
  selectedPatientId: string | null;
  exp: number;
};

export type PatientPortalProfile = {
  id: string;
  name: string;
  age: number | null;
  phone: string | null;
  lastVisit: string | null;
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
  doctor?: Doctor | null;
};

// ─── Patient lookup (phone search result) ────────────────────────────────────

export type PatientWithHistory = {
  patient: Patient;
  appointments: Appointment[];
};

// ─── Patient Reports ──────────────────────────────────────────────────────────

export type ReportType = 'blood_test' | 'xray' | 'scan' | 'prescription' | 'other';

export type ParsedTest = {
  name: string;
  value: string;
  unit: string;
  ref_range: string;
  flag: 'high' | 'low' | 'normal' | null;
};

export type ParsedReportData = {
  lab_name?: string;
  report_date?: string;
  tests?: ParsedTest[];
};

export type PatientReport = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  report_type: ReportType;
  raw_summary: string | null;
  parsed_data: ParsedReportData | null;
  uploaded_by_role: string | null;
  created_at: string;
  signedUrl: string; // populated at read time — not stored in DB
};
