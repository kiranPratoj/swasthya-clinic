'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getDb, auditLog } from '@/lib/db';
import type {
  Appointment,
  AppointmentStatus,
  CommunicationEvent,
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

async function getClinicSlug(clinicId: string): Promise<string> {
  const { data: clinic } = await getDb().from('clinics').select('slug').eq('id', clinicId).single();
  return clinic?.slug ?? '';
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
      status: 'confirmed',  // receptionist intake = patient is present
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

  // Auto-populate visit_history when appointment is completed
  if (status === 'completed' && appt) {
    await db.from('visit_history').insert({
      clinic_id: clinicId,
      patient_id: appt.patient_id,
      appointment_id: appointmentId,
      summary: notes?.trim() || appt.complaint,
    });
  }

  await auditLog(clinicId, 'doctor', 'status_updated', appointmentId, { status, notes });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { error } = await db
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await auditLog(clinicId, 'receptionist', 'appointment_cancelled', appointmentId, {
    reason: reason?.trim() || null,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function markNoShow(appointmentId: string): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { error } = await db
    .from('appointments')
    .update({ status: 'no_show' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await auditLog(clinicId, 'receptionist', 'appointment_no_show', appointmentId);

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  reason?: string
): Promise<{ newAppointmentId: string; newToken: number }> {
  const clinicId = await getClinicId();
  const db = getDb();
  const normalizedDate = newDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error('Reschedule date must be in YYYY-MM-DD format.');
  }

  const { data: currentAppointment, error: appointmentError } = await db
    .from('appointments')
    .select('id, clinic_id, patient_id, doctor_id, visit_type, complaint, booked_for, token_number')
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .single();

  if (appointmentError || !currentAppointment) {
    throw new Error(appointmentError?.message ?? 'Appointment not found.');
  }

  const { data: tokenData, error: tokenError } = await db.rpc('next_token_number', {
    p_clinic_id: clinicId,
    p_date: normalizedDate,
  });

  if (tokenError) throw new Error(tokenError.message);
  const newToken = tokenData ?? 1;

  const { data: newAppointment, error: insertError } = await db
    .from('appointments')
    .insert({
      clinic_id: clinicId,
      patient_id: currentAppointment.patient_id,
      doctor_id: currentAppointment.doctor_id,
      token_number: newToken,
      visit_type: currentAppointment.visit_type,
      complaint: currentAppointment.complaint,
      booked_for: normalizedDate,
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (insertError || !newAppointment) {
    throw new Error(insertError?.message ?? 'Could not create the rescheduled appointment.');
  }

  const { error: updateError } = await db
    .from('appointments')
    .update({ status: 'rescheduled' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  if (updateError) throw new Error(updateError.message);

  await auditLog(clinicId, 'receptionist', 'appointment_rescheduled_old', appointmentId, {
    newAppointmentId: newAppointment.id,
    oldDate: currentAppointment.booked_for,
    newDate: normalizedDate,
    reason: reason?.trim() || null,
  });
  await auditLog(clinicId, 'receptionist', 'appointment_rescheduled_new', newAppointment.id, {
    previousAppointmentId: appointmentId,
    newToken,
    oldDate: currentAppointment.booked_for,
    newDate: normalizedDate,
    reason: reason?.trim() || null,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/patients`);
  revalidatePath(`/${slug}/patients/${currentAppointment.patient_id}`);

  return {
    newAppointmentId: newAppointment.id,
    newToken,
  };
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
    .in('status', ['booked', 'confirmed', 'in_progress'])
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

export async function getAllPatients(): Promise<
  Array<{ id: string; name: string; phone: string; age: number | null; visitCount: number; lastVisit: string | null }>
> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: patients, error: patientsError } = await db
    .from('patients')
    .select('id, name, phone, age')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true })
    .limit(200);

  if (patientsError) throw new Error(patientsError.message);
  if (!patients || patients.length === 0) return [];

  const patientIds = patients.map((p) => p.id);
  const { data: appointments, error: appointmentsError } = await db
    .from('appointments')
    .select('patient_id, booked_for')
    .eq('clinic_id', clinicId)
    .in('patient_id', patientIds)
    .order('booked_for', { ascending: false });

  if (appointmentsError) throw new Error(appointmentsError.message);

  const metrics = new Map<string, { visitCount: number; lastVisit: string | null }>();
  for (const appt of appointments ?? []) {
    const current = metrics.get(appt.patient_id) ?? { visitCount: 0, lastVisit: null };
    metrics.set(appt.patient_id, {
      visitCount: current.visitCount + 1,
      lastVisit: current.lastVisit ?? appt.booked_for,
    });
  }

  return patients.map((p) => {
    const m = metrics.get(p.id);
    return {
      id: p.id,
      name: p.name,
      phone: p.phone ?? '',
      age: p.age ?? null,
      visitCount: m?.visitCount ?? 0,
      lastVisit: m?.lastVisit ?? null,
    };
  });
}

export async function searchPatients(
  query: string
): Promise<Array<{ id: string; name: string; phone: string; visitCount: number; lastVisit: string | null }>> {
  const clinicId = await getClinicId();
  const db = getDb();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return [];

  const digitsOnly = trimmedQuery.replace(/\D/g, '');
  const queries = [
    db
      .from('patients')
      .select('id, name, phone')
      .eq('clinic_id', clinicId)
      .ilike('name', `%${trimmedQuery}%`)
      .limit(20),
  ];

  if (digitsOnly) {
    queries.unshift(
      db
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', clinicId)
        .or(`phone.eq.${digitsOnly},phone.like.${digitsOnly}%`)
        .limit(20)
    );
  }

  const results = await Promise.all(queries);
  const patients = results.flatMap((result) => {
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data ?? [];
  });

  const uniquePatients = Array.from(
    new Map(
      patients.map((patient) => [
        patient.id,
        {
          id: patient.id,
          name: patient.name,
          phone: patient.phone ?? '',
        },
      ])
    ).values()
  ).slice(0, 20);

  if (uniquePatients.length === 0) return [];

  const patientIds = uniquePatients.map((patient) => patient.id);
  const { data: appointments, error: appointmentsError } = await db
    .from('appointments')
    .select('patient_id, booked_for')
    .eq('clinic_id', clinicId)
    .in('patient_id', patientIds)
    .order('booked_for', { ascending: false });

  if (appointmentsError) throw new Error(appointmentsError.message);

  const metrics = new Map<string, { visitCount: number; lastVisit: string | null }>();

  for (const appointment of appointments ?? []) {
    const current = metrics.get(appointment.patient_id) ?? {
      visitCount: 0,
      lastVisit: null,
    };

    metrics.set(appointment.patient_id, {
      visitCount: current.visitCount + 1,
      lastVisit: current.lastVisit ?? appointment.booked_for,
    });
  }

  return uniquePatients.map((patient) => {
    const patientMetrics = metrics.get(patient.id);
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      visitCount: patientMetrics?.visitCount ?? 0,
      lastVisit: patientMetrics?.lastVisit ?? null,
    };
  });
}

export async function getPatientProfile(
  patientId: string
): Promise<{ patient: Patient; appointments: Appointment[] } | null> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (patientError) throw new Error(patientError.message);
  if (!patient) return null;

  const { data: appointments, error: appointmentsError } = await db
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .order('booked_for', { ascending: false })
    .order('created_at', { ascending: false });

  if (appointmentsError) throw new Error(appointmentsError.message);

  return {
    patient: patient as Patient,
    appointments: (appointments ?? []) as Appointment[],
  };
}

export async function updatePatient(
  patientId: string,
  updates: { name: string; phone: string }
): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();

  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('id, clinic_id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientError) throw new Error(patientError.message);
  if (!patient || patient.clinic_id !== clinicId) {
    throw new Error('Patient not found for this clinic.');
  }

  const { error } = await db
    .from('patients')
    .update({
      name: updates.name.trim(),
      phone: updates.phone.trim(),
    })
    .eq('id', patientId)
    .eq('clinic_id', clinicId);

  if (error) throw new Error(error.message);

  await auditLog(clinicId, 'receptionist', 'patient_updated', patientId, {
    name: updates.name.trim(),
    phone: updates.phone.trim(),
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/patients`);
  revalidatePath(`/${slug}/patients/${patientId}`);
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
  const waiting = all.filter(a => a.status === 'booked' || a.status === 'confirmed').length;
  const consulting = all.filter(a => a.status === 'in_progress').length;
  const done = all.filter(a => a.status === 'completed').length;

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

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/settings`);
  revalidatePath(`/${slug}/admin`);
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

// ─── Communication events ─────────────────────────────────────────────────────

export async function logCommunicationEvent(
  data: Omit<CommunicationEvent, 'id' | 'created_at'>
): Promise<void> {
  const clinicId = data.clinic_id;
  await getDb().from('communication_events').insert(data);
  await auditLog(clinicId, 'system', 'communication_sent', data.appointment_id ?? undefined, {
    channel: data.channel,
    template: data.template_name,
    status: data.status,
  });
}

// ─── Voice API helper (called from API route, not server action) ──────────────

export async function processVoiceIntake(fd: FormData) {
  const { processPatientVoiceInput } = await import('@/lib/patientExtractionAdapter');
  return processPatientVoiceInput(fd);
}

export async function saveVisitRecord(
  appointmentId: string,
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  prescriptions: Array<{ drug: string; dose: string; frequency: string; duration: string }>,
  followUpDate: string
): Promise<void> {
  const db = getDb();
  const { data: appt, error: apptError } = await db
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();
  if (apptError || !appt) throw new Error('Appointment not found');

  const { error: insertError } = await db.from('visit_history').insert({
    clinic_id: appt.clinic_id,
    patient_id: appt.patient_id,
    appointment_id: appointmentId,
    summary: JSON.stringify({ soap, prescriptions, followUpDate }),
    created_at: new Date().toISOString(),
  });
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await db
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/${appt.clinic_id}/queue`);
}

export async function raisePatientIssue(
  patientId: string,
  clinicId: string,
  complaint: string
): Promise<{ tokenNumber: number | null }> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Get doctor for this clinic
  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId)
    .single();

  // Get max token for today
  const { data: tokens } = await db
    .from('appointments')
    .select('token_number')
    .eq('clinic_id', clinicId)
    .eq('booked_for', today)
    .order('token_number', { ascending: false })
    .limit(1);

  const nextToken = (tokens?.[0]?.token_number ?? 0) + 1;

  const { data, error } = await db
    .from('appointments')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctor?.id,
      status: 'confirmed',
      visit_type: 'walk-in',
      complaint,
      booked_for: today,
      token_number: nextToken,
    })
    .select('token_number')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/`);
  return { tokenNumber: data?.token_number ?? null };
}

export async function callNextPatient(): Promise<void> {
  const clinicId = await getClinicId();
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Find the first waiting appointment (booked or confirmed) for today
  const { data: nextAppt, error: findError } = await db
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('booked_for', today)
    .in('status', ['booked', 'confirmed'])
    .order('token_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!nextAppt) return;

  // Update status to in_progress
  const { error: updateError } = await db
    .from('appointments')
    .update({ status: 'in_progress' })
    .eq('id', nextAppt.id)
    .eq('clinic_id', clinicId);

  if (updateError) throw new Error(updateError.message);

  await auditLog(clinicId, 'doctor', 'called_next', nextAppt.id);

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

