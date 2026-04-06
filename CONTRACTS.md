# Swasthya Clinic — Agent Contracts

> This file is the single source of truth for all three agents (Claude, Codex, Antigravity).
> Do not deviate from interfaces defined here without updating this file first.

---

## 1. Domain Model

### Clinic (tenant root)
```ts
type Clinic = {
  id: string;           // uuid
  name: string;         // "Dr. Sharma Clinic"
  slug: string;         // "drsharma" → drsharma.swasthya.app
  custom_domain: string | null;
  phone: string;
  speciality: string;   // "General", "Pediatrics", etc.
  created_at: string;
}
```

### Doctor
```ts
type Doctor = {
  id: string;
  clinic_id: string;
  name: string;
  speciality: string;
  phone: string;
  working_hours: WorkingHours;  // { mon: {open:"09:00", close:"17:00"}, ... }
  slot_duration_mins: number;   // 10 | 15 | 20 | 30
}
```

### Patient
```ts
type Patient = {
  id: string;
  clinic_id: string;
  name: string;
  age: number | null;
  phone: string;
  created_at: string;
}
```

### Appointment
```ts
type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  token_number: number;        // auto-incremented per clinic per day
  visit_type: 'walk-in' | 'booked' | 'follow-up' | 'emergency';
  complaint: string;
  status: 'waiting' | 'consulting' | 'done' | 'cancelled' | 'no-show';
  notes: string | null;        // doctor's visit notes
  booked_for: string;          // ISO date "2026-04-06"
  created_at: string;
  // joined
  patient?: Patient;
}
```

### VoiceDraft (intake form state — client only)
```ts
type VoiceDraft = {
  id: string;
  transcript: string;
  structuredData: PatientIntakeDraft;
  status: 'processing' | 'ready' | 'failed';
  isFallback: boolean;
  modelUsed?: string;
  errorMsg?: string;
}

type PatientIntakeDraft = {
  patientName: string | null;
  age: string | null;
  phone: string | null;
  complaint: string | null;
  visitType: 'walk-in' | 'booked' | 'follow-up' | 'emergency' | null;
  summary: string;
  missingFields: string[];
}
```

---

## 2. Database Tables

All tables include `clinic_id uuid NOT NULL` for tenant isolation.
RLS policy on every table: `clinic_id = current_setting('app.clinic_id')::uuid`

```
clinics          (id, name, slug, custom_domain, phone, speciality, created_at)
doctors          (id, clinic_id, name, speciality, phone, working_hours, slot_duration_mins)
staff            (id, clinic_id, name, role, phone)
patients         (id, clinic_id, name, age, phone, created_at)
appointments     (id, clinic_id, patient_id, doctor_id, token_number, visit_type,
                  complaint, status, notes, booked_for, created_at)
visit_history    (id, clinic_id, patient_id, appointment_id, summary, created_at)
audit_log        (id, clinic_id, actor, action, target_id, meta, created_at)
```

---

## 3. Server Actions (src/app/actions.ts)

All actions require `clinic_id` resolved from middleware. Never accept clinic_id from client.

```ts
createAppointment(data: {
  patientName: string;
  age: string;
  phone: string;
  complaint: string;
  visitType: string;
  doctorId: string;
  bookedFor: string;
}): Promise<{ appointmentId: string; tokenNumber: number }>

updateAppointmentStatus(
  appointmentId: string,
  status: Appointment['status'],
  notes?: string
): Promise<void>

getClinicQueue(date: string): Promise<Appointment[]>

getPatientHistory(phone: string): Promise<Appointment[]>

createClinic(data: {
  name: string;
  slug: string;
  phone: string;
  speciality: string;
  doctorName: string;
}): Promise<{ clinicId: string; slug: string }>
```

---

## 4. Sarvam Extraction Prompt Spec

**System prompt for patient intake extraction:**

```
You extract structured patient intake fields from receptionist voice transcripts
at Indian clinics. Use the provided function tool to return extracted fields.

Rules:
- Never guess missing details. Use null when a field is missing.
- patientName: full name as spoken, or null.
- age: numeric string only ("45"), or null.
- phone: digits only, no spaces/dashes, or null.
- complaint: 5-10 word summary of the chief complaint, or null.
- visitType: one of "walk-in", "booked", "follow-up", "emergency", or null.
- summary: clean one-sentence summary of the intake in official language.
Only call the function. Do not answer in plain text.
```

**Tool parameters schema:**
```json
{
  "type": "object",
  "properties": {
    "patientName": { "type": "string", "nullable": true },
    "age":         { "type": "string", "nullable": true },
    "phone":       { "type": "string", "nullable": true },
    "complaint":   { "type": "string", "nullable": true },
    "visitType":   { "type": "string", "nullable": true },
    "summary":     { "type": "string" }
  },
  "required": ["summary"]
}
```

---

## 5. Routing Structure

```
/                          → landing / clinic search
/onboard                   → new clinic registration
/[slug]/                   → clinic home (receptionist intake)
/[slug]/queue              → doctor's live queue view
/[slug]/admin              → admin dashboard
/[slug]/settings           → clinic settings
/[slug]/patient/[token]    → patient token card
```

Middleware resolves `slug` or `custom_domain` → `clinic_id` and injects as header `x-clinic-id`.

---

## 6. Style Conventions

- **No Tailwind.** Inline styles only, matching pattern in `src/app/globals.css`.
- **No new npm dependencies** unless absolutely necessary.
- **Server components** by default. Add `'use client'` only for interactive components.
- **Server actions** for all mutations (`src/app/actions.ts`).
- TypeScript strict mode. No `any`.
- All text visible to patients/receptionists must support Kannada font rendering.

---

## 7. Agent Assignments

| Issue | Agent | Epic |
|---|---|---|
| #1 CONTRACTS.md | Claude | schema-data |
| #2 Supabase migration | Claude | schema-data |
| #3 Middleware | Claude | multi-tenant |
| #4 Server actions | Claude | schema-data |
| #5 Sarvam extraction adapter | Claude | voice-intake |
| #6 PatientIntakeForm | Codex | voice-intake |
| #7 QueueDisplay | Codex | queue-ui |
| #8 TokenCard | Codex | queue-ui |
| #9 Clinic onboarding | Antigravity | multi-tenant |
| #10 Admin dashboard | Antigravity | admin-pages |
| #11 Settings page | Antigravity | admin-pages |
| #12 VoiceIntakeForm (voice-specific) | Codex | voice-intake |
| #13 Medical theme | Antigravity | theme-branding |
| #14 Integration wiring | Claude | integration |
| #15 E2E test | Claude | integration |
| #16 Vercel deploy | Claude | integration |
