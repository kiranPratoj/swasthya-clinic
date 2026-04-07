'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, auditLog } from '@/lib/db';
import type {
  Appointment,
  AppointmentStatus,
  Doctor,
  OnboardingInput,
  Patient,
  PatientWithHistory,
  QueueItem,
} from '@/lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getClinicId(): Promise<string> {
  const h = await headers();
  const id = h.get('x-clinic-id');
  if (!id) throw new Error('clinic_id not resolved — middleware may not have run');
  return id;
}

// ─── Clinic onboarding ────────────────────────────────────────────────────────

export async function createClinic(data: OnboardingInput): Promise<{ clinicId: string; slug: string }> {
  const db = getDb();

  const { data: clinic, error: clinicErr } = await db
    .from('clinics')
    .insert({
      name: data.clinicName,
      slug: data.slug,
      phone: data.phone,
      speciality: data.speciality,
    })
    .select('id, slug')
    .single();

  if (clinicErr) throw new Error(clinicErr.message);

  await db.from('doctors').insert({
    clinic_id: clinic.id,
    name: data.doctorName,
    speciality: data.speciality,
    phone: data.phone,
    working_hours: {
      mon: { open: '09:00', close: '17:00' },
      tue: { open: '09:00', close: '17:00' },
      wed: { open: '09:00', close: '17:00' },
      thu: { open: '09:00', close: '17:00' },
      fri: { open: '09:00', close: '17:00' },
      sat: { open: '09:00', close: '13:00' },
    },
    slot_duration_mins: 15,
  });

  return { clinicId: clinic.id, slug: clinic.slug };
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data } = await getDb()
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !data;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function createAppointment(formData: FormData): Promise<{ appointmentId: string; tokenNumber: number; slug: string }> {
  const clinicId = await getClinicId();
  const db = getDb();

  const patientName = formData.get('patientName') as string;
  const age = formData.get('age') ? parseInt(formData.get('age') as string) : null;
  const phone = formData.get('phone') as string;
  const complaint = formData.get('complaint') as string;
  const visitType = (formData.get('visitType') as string) || 'walk-in';
  const bookedFor = (formData.get('bookedFor') as string) || new Date().toISOString().split('T')[0];

  // Upsert patient by phone
  let patientId: string;
  const { data: existingPatient } = await db
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle();

  if (existingPatient) {
    patientId = existingPatient.id;
  } else {
    const { data: newPatient, error: patErr } = await db
      .from('patients')
      .insert({ clinic_id: clinicId, name: patientName, age, phone })
      .select('id')
      .single();
    if (patErr) throw new Error(patErr.message);
    patientId = newPatient.id;
  }

  // Get first doctor for clinic
  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId)
    .limit(1)
    .single();
  if (!doctor) throw new Error('No doctor found for clinic');

  // Get next token number
  const { data: tokenData } = await db
    .rpc('next_token_number', { p_clinic_id: clinicId, p_date: bookedFor });
  const tokenNumber: number = tokenData ?? 1;

  const { data: appt, error: apptErr } = await db
    .from('appointments')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctor.id,
      token_number: tokenNumber,
      visit_type: visitType,
      complaint,
      status: 'waiting',
      booked_for: bookedFor,
    })
    .select('id')
    .single();

  if (apptErr) throw new Error(apptErr.message);

  await auditLog(clinicId, 'receptionist', 'appointment_created', appt.id, { tokenNumber, visitType });

  // Get slug for redirect
  const { data: clinic } = await db.from('clinics').select('slug').eq('id', clinicId).single();

  revalidatePath(`/${clinic?.slug}/queue`);
  revalidatePath(`/${clinic?.slug}/admin`);

  return { appointmentId: appt.id, tokenNumber, slug: clinic?.slug ?? '' };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  notes?: string
): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();

  const update: Partial<Appointment> = { status };
  if (notes !== undefined) update.notes = notes;

  const { data: appt, error } = await db
    .from('appointments')
    .update(update)
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('patient_id, complaint')
    .single();

  if (error) throw new Error(error.message);

  // Auto-populate visit_history when appointment is marked done
  if (status === 'done' && appt) {
    await db.from('visit_history').insert({
      clinic_id: clinicId,
      patient_id: appt.patient_id,
      appointment_id: appointmentId,
      summary: notes?.trim() || appt.complaint,
    });
  }

  await auditLog(clinicId, 'doctor', 'status_updated', appointmentId, { status, notes });

  const { data: clinic } = await db.from('clinics').select('slug').eq('id', clinicId).single();
  revalidatePath(`/${clinic?.slug}/queue`);
  revalidatePath(`/${clinic?.slug}/admin`);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getClinicQueue(date?: string): Promise<QueueItem[]> {
  const clinicId = await getClinicId();
  const db = getDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data, error } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('booked_for', targetDate)
    .in('status', ['waiting', 'consulting'])
    .order('token_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as QueueItem[];
}

export async function getPatientHistory(phone: string): Promise<Appointment[]> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: patient } = await db
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle();

  if (!patient) return [];

  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPatientByPhone(phone: string): Promise<PatientWithHistory | null> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: patient } = await db
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle();

  if (!patient) return null;

  const { data: appointments } = await db
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patient.id)
    .order('booked_for', { ascending: false })
    .limit(5);

  return { patient: patient as Patient, appointments: (appointments ?? []) as Appointment[] };
}

export async function getAppointmentByToken(token: number, date?: string): Promise<QueueItem | null> {
  const clinicId = await getClinicId();
  const db = getDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('token_number', token)
    .eq('booked_for', targetDate)
    .maybeSingle();

  return (data as QueueItem | null);
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

export async function getAdminStats(date?: string) {
  const clinicId = await getClinicId();
  const db = getDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data: appts } = await db
    .from('appointments')
    .select('status, created_at, token_number, complaint, visit_type, patient:patients(name)')
    .eq('clinic_id', clinicId)
    .eq('booked_for', targetDate)
    .order('token_number', { ascending: true });

  const all = appts ?? [];
  const total = all.length;
  const waiting = all.filter(a => a.status === 'waiting').length;
  const consulting = all.filter(a => a.status === 'consulting').length;
  const done = all.filter(a => a.status === 'done').length;

  // Patients by hour (9–18)
  const byHour: Record<number, number> = {};
  for (let h = 9; h <= 18; h++) byHour[h] = 0;
  for (const a of all) {
    const h = new Date(a.created_at).getHours();
    if (h >= 9 && h <= 18) byHour[h] = (byHour[h] ?? 0) + 1;
  }

  return { total, waiting, consulting, done, byHour, recent: all.slice(0, 10) };
}

// ─── Doctor settings ──────────────────────────────────────────────────────────

export async function updateDoctorSettings(formData: FormData): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId)
    .single();
  if (!doctor) throw new Error('Doctor not found');

  const workingHours = formData.get('working_hours')
    ? JSON.parse(formData.get('working_hours') as string)
    : undefined;

  await db.from('doctors').update({
    name: formData.get('name') as string,
    speciality: formData.get('speciality') as string,
    phone: formData.get('phone') as string,
    slot_duration_mins: parseInt(formData.get('slot_duration_mins') as string) || 15,
    ...(workingHours ? { working_hours: workingHours } : {}),
  }).eq('id', doctor.id);

  const { data: clinic } = await db.from('clinics').select('slug').eq('id', clinicId).single();
  revalidatePath(`/${clinic?.slug}/settings`);
  revalidatePath(`/${clinic?.slug}/admin`);
}

export async function getDoctorForClinic(): Promise<Doctor | null> {
  const clinicId = await getClinicId();
  const { data } = await getDb()
    .from('doctors')
    .select('*')
    .eq('clinic_id', clinicId)
    .single();
  return data as Doctor | null;
}

// ─── Voice API helper (called from API route, not server action) ──────────────

export async function processVoiceIntake(fd: FormData) {
  const { processPatientVoiceInput } = await import('@/lib/patientExtractionAdapter');
  return processPatientVoiceInput(fd);
}
