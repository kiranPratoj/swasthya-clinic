'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getDb, getClinicDb, auditLog } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import type {
  Appointment,
  AppointmentStatus,
  CommunicationEvent,
  Doctor,
  OnboardingInput,
  Patient,
  PatientWithHistory,
  QueueItem,
  VisitHistory,
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

async function getTenantDb(): Promise<{ clinicId: string; db: ReturnType<typeof getClinicDb> }> {
  const clinicId = await getClinicId();
  return { clinicId, db: getClinicDb(clinicId) };
}

async function getActorRole(): Promise<'admin' | 'doctor' | 'receptionist'> {
  const session = await requireSession();
  return session.role;
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
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  const existingPatientId = (formData.get('patientId') as string | null)?.trim() || null;
  const allowSharedMobileNewPatient = formData.get('allowSharedMobileNewPatient') === 'true';
  const patientName = formData.get('patientName') as string;
  const age = formData.get('age') ? parseInt(formData.get('age') as string) : null;
  const phone = formData.get('phone') as string;
  const complaint = formData.get('complaint') as string;
  const visitType = (formData.get('visitType') as string) || 'walk-in';
  const bookedFor = (formData.get('bookedFor') as string) || new Date().toISOString().split('T')[0];
  const requestedDoctorId = formData.get('doctorId') as string | null;
  const payment_mode = (formData.get('payment_mode') as 'cash' | 'upi' | null) ?? 'cash';
  const payment_state = (formData.get('payment_state') as 'pending' | 'paid' | null) ?? 'pending';
  const payment_status = payment_state === 'paid' ? 'verified' : 'pending';
  const baseAppointmentInsert = {
    clinic_id: clinicId,
    patient_id: '',
    doctor_id: '',
    token_number: 0,
    visit_type: visitType,
    complaint,
    status: 'confirmed' as const,  // receptionist intake = patient is present
    booked_for: bookedFor,
  };

  // Reuse the explicitly selected patient when present. If a phone number already exists and no
  // patient was selected, require an explicit shared-mobile override instead of silently reusing.
  let patientId: string;
  if (existingPatientId) {
    const { data: selectedPatient, error: selectedPatientError } = await db
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('id', existingPatientId)
      .maybeSingle();

    if (selectedPatientError) throw new Error(selectedPatientError.message);
    if (!selectedPatient) {
      throw new Error('Selected patient not found for this clinic.');
    }

    patientId = selectedPatient.id;
  } else {
    const { data: existingPatients, error: existingPatientsError } = await db
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('phone', phone);

    if (existingPatientsError) throw new Error(existingPatientsError.message);

    if ((existingPatients?.length ?? 0) > 0) {
      if (!allowSharedMobileNewPatient) {
        throw new Error(
          'This mobile number already exists. Select the existing patient or choose "Create another patient with same mobile".'
        );
      }

      const { data: newPatient, error: patErr } = await db
        .from('patients')
        .insert({ clinic_id: clinicId, name: patientName, age, phone })
        .select('id')
        .single();
      if (patErr) throw new Error(patErr.message);
      patientId = newPatient.id;
    } else {
      const { data: newPatient, error: patErr } = await db
        .from('patients')
        .insert({ clinic_id: clinicId, name: patientName, age, phone })
        .select('id')
        .single();
      if (patErr) throw new Error(patErr.message);
      patientId = newPatient.id;
    }
  }

  // Resolve doctor for the appointment.
  let doctorQuery = db
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId);

  if (requestedDoctorId) {
    doctorQuery = doctorQuery.eq('id', requestedDoctorId);
  }

  const { data: doctor } = await doctorQuery.limit(1).single();
  if (!doctor) throw new Error('No doctor found for clinic');

  // Get next token number
  const { data: tokenData } = await db
    .rpc('next_token_number', { p_clinic_id: clinicId, p_date: bookedFor });
  const tokenNumber: number = tokenData ?? 1;

  const appointmentInsert = {
    ...baseAppointmentInsert,
    patient_id: patientId,
    doctor_id: doctor.id,
    token_number: tokenNumber,
  };

  let apptId: string | null = null;
  const { data: apptWithPayment, error: apptErr } = await db
    .from('appointments')
    .insert({
      ...appointmentInsert,
      payment_mode,
      payment_status,
    })
    .select('id')
    .single();

  if (apptErr) {
    const missingPaymentColumn =
      apptErr.message.includes('payment_amount') ||
      apptErr.message.includes('payment_utr') ||
      apptErr.message.includes('payment_status') ||
      apptErr.message.includes('payment_mode');

    if (!missingPaymentColumn) {
      throw new Error(apptErr.message);
    }

    const { data: fallbackAppt, error: fallbackErr } = await db
      .from('appointments')
      .insert(appointmentInsert)
      .select('id')
      .single();

    if (fallbackErr) throw new Error(fallbackErr.message);
    apptId = fallbackAppt.id;
  } else {
    apptId = apptWithPayment.id;
  }

  if (!apptId) {
    throw new Error('Failed to create appointment.');
  }

  await auditLog(clinicId, actorRole, 'appointment_created', apptId, { tokenNumber, visitType });

  // Get slug for redirect
  const { data: clinic } = await db.from('clinics').select('slug').eq('id', clinicId).single();

  revalidatePath(`/${clinic?.slug}/queue`);
  revalidatePath(`/${clinic?.slug}/admin`);

  return { appointmentId: apptId, tokenNumber, slug: clinic?.slug ?? '' };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  notes?: string
): Promise<void> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

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

  await auditLog(clinicId, actorRole, 'status_updated', appointmentId, { status, notes });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<void> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  const { error } = await db
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await auditLog(clinicId, actorRole, 'appointment_cancelled', appointmentId, {
    reason: reason?.trim() || null,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function markNoShow(appointmentId: string): Promise<void> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  const { error } = await db
    .from('appointments')
    .update({ status: 'no_show' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await auditLog(clinicId, actorRole, 'appointment_no_show', appointmentId);

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  reason?: string
): Promise<{ newAppointmentId: string; newToken: number }> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();
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

  await auditLog(clinicId, actorRole, 'appointment_rescheduled_old', appointmentId, {
    newAppointmentId: newAppointment.id,
    oldDate: currentAppointment.booked_for,
    newDate: normalizedDate,
    reason: reason?.trim() || null,
  });
  await auditLog(clinicId, actorRole, 'appointment_rescheduled_new', newAppointment.id, {
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

type PaymentAuditState = {
  payment_mode: 'cash' | 'upi' | null;
  payment_status: 'pending' | 'verified' | 'failed';
};

function extractPaymentAuditState(meta: Record<string, unknown> | null): PaymentAuditState | null {
  if (!meta) {
    return null;
  }

  const paymentMode = meta.payment_mode;
  const paymentStatus = meta.payment_status;

  const normalizedMode =
    paymentMode === 'cash' || paymentMode === 'upi' ? paymentMode : null;
  const normalizedStatus =
    paymentStatus === 'pending' || paymentStatus === 'verified' || paymentStatus === 'failed'
      ? paymentStatus
      : null;

  if (!normalizedStatus) {
    return null;
  }

  return {
    payment_mode: normalizedMode,
    payment_status: normalizedStatus,
  };
}

async function getPaymentAuditStateMap(
  db: Awaited<ReturnType<typeof getTenantDb>>['db'],
  clinicId: string,
  appointmentIds: string[]
): Promise<Map<string, PaymentAuditState>> {
  const uniqueIds = [...new Set(appointmentIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await db
    .from('audit_log')
    .select('target_id, meta, created_at')
    .eq('clinic_id', clinicId)
    .eq('action', 'payment_updated')
    .in('target_id', uniqueIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const paymentMap = new Map<string, PaymentAuditState>();

  for (const entry of data ?? []) {
    const appointmentId = typeof entry.target_id === 'string' ? entry.target_id : null;
    if (!appointmentId || paymentMap.has(appointmentId)) {
      continue;
    }

    const paymentState = extractPaymentAuditState(
      entry.meta && typeof entry.meta === 'object' ? (entry.meta as Record<string, unknown>) : null
    );

    if (paymentState) {
      paymentMap.set(appointmentId, paymentState);
    }
  }

  return paymentMap;
}

async function applyPaymentAuditFallback<T extends { id: string; payment_mode?: 'cash' | 'upi' | null; payment_status?: 'pending' | 'verified' | 'failed' }>(
  db: Awaited<ReturnType<typeof getTenantDb>>['db'],
  clinicId: string,
  rows: T[]
): Promise<T[]> {
  const paymentMap = await getPaymentAuditStateMap(
    db,
    clinicId,
    rows.map((row) => row.id)
  );

  return rows.map((row) => {
    const paymentState = paymentMap.get(row.id);
    if (!paymentState) {
      return row;
    }

    return {
      ...row,
      payment_mode: paymentState.payment_mode,
      payment_status: paymentState.payment_status,
    };
  });
}

export async function getClinicQueue(date?: string): Promise<QueueItem[]> {
  const { clinicId, db } = await getTenantDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data, error } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('booked_for', targetDate)
    .in('status', ['booked', 'confirmed', 'in_progress', 'completed'])
    .order('token_number', { ascending: true });

  if (error) throw new Error(error.message);

  return applyPaymentAuditFallback(db, clinicId, (data ?? []) as QueueItem[]);
}

export async function getPatientHistory(phone: string): Promise<Appointment[]> {
  const { clinicId, db } = await getTenantDb();

  const { data: patient } = await db
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle();

  if (!patient) return [];

  const { data, error } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPatientHistoryById(patientId: string): Promise<Appointment[]> {
  const { clinicId, db } = await getTenantDb();

  const { data, error } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchPatientsByPhone(
  query: string
): Promise<
  Array<{
    id: string;
    name: string;
    phone: string;
    age: number | null;
    visitCount: number;
    lastVisit: string | null;
    activeToken: number | null;
  }>
> {
  const { clinicId, db } = await getTenantDb();
  const digitsOnly = query.replace(/\D/g, '').slice(0, 10);

  if (digitsOnly.length < 3) {
    return [];
  }

  const { data: patients, error: patientsError } = await db
    .from('patients')
    .select('id, name, phone, age')
    .eq('clinic_id', clinicId)
    .like('phone', `${digitsOnly}%`)
    .order('phone', { ascending: true })
    .limit(8);

  if (patientsError) throw new Error(patientsError.message);
  if (!patients || patients.length === 0) return [];

  const patientIds = patients.map((patient) => patient.id);
  const { data: appointments, error: appointmentsError } = await db
    .from('appointments')
    .select('patient_id, booked_for, token_number, status, created_at')
    .eq('clinic_id', clinicId)
    .in('patient_id', patientIds)
    .order('booked_for', { ascending: false })
    .order('created_at', { ascending: false });

  if (appointmentsError) throw new Error(appointmentsError.message);

  const metrics = new Map<
    string,
    { visitCount: number; lastVisit: string | null; activeToken: number | null }
  >();

  for (const appointment of appointments ?? []) {
    const current = metrics.get(appointment.patient_id) ?? {
      visitCount: 0,
      lastVisit: null,
      activeToken: null,
    };

    metrics.set(appointment.patient_id, {
      visitCount: current.visitCount + 1,
      lastVisit: current.lastVisit ?? appointment.booked_for,
      activeToken:
        current.activeToken ??
        (appointment.status === 'confirmed' || appointment.status === 'in_progress'
          ? appointment.token_number
          : null),
    });
  }

  return patients.map((patient) => {
    const patientMetrics = metrics.get(patient.id);
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone ?? '',
      age: patient.age ?? null,
      visitCount: patientMetrics?.visitCount ?? 0,
      lastVisit: patientMetrics?.lastVisit ?? null,
      activeToken: patientMetrics?.activeToken ?? null,
    };
  });
}

export async function getPatientByPhone(phone: string): Promise<PatientWithHistory | null> {
  const { clinicId, db } = await getTenantDb();

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
  const { clinicId, db } = await getTenantDb();

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
  const { clinicId, db } = await getTenantDb();
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
): Promise<{ patient: Patient; appointments: Appointment[]; visitHistory: VisitHistory[] } | null> {
  const { clinicId, db } = await getTenantDb();

  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (patientError) throw new Error(patientError.message);
  if (!patient) return null;

  const [appointmentsResult, historyResult] = await Promise.all([
    db
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('booked_for', { ascending: false })
      .order('created_at', { ascending: false }),
    db
      .from('visit_history')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
  ]);

  if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);

  return {
    patient: patient as Patient,
    appointments: (appointmentsResult.data ?? []) as Appointment[],
    visitHistory: (historyResult.data ?? []) as VisitHistory[],
  };
}

export async function updatePatient(
  patientId: string,
  updates: { name: string; phone: string }
): Promise<void> {
  const { clinicId, db } = await getTenantDb();

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
  const { clinicId, db } = await getTenantDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data } = await db
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('clinic_id', clinicId)
    .eq('token_number', token)
    .eq('booked_for', targetDate)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const [appointment] = await applyPaymentAuditFallback(db, clinicId, [data as QueueItem]);
  return appointment ?? null;
}

export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
  const { clinicId, db } = await getTenantDb();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .gte('booked_for', today)
    .order('booked_for', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPatientVisitHistory(patientId: string): Promise<VisitHistory[]> {
  const { clinicId, db } = await getTenantDb();
  const { data, error } = await db
    .from('visit_history')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

export async function getAdminStats(date?: string) {
  const { clinicId, db } = await getTenantDb();
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  type AdminAppointmentRow = {
    complaint: string;
    created_at: string;
    id: string;
    patient: Array<{ name: string | null }> | null;
    status: AppointmentStatus;
    token_number: number;
    visit_type: string;
  };
  type AdminAuditLogRow = {
    created_at: string;
    meta: { status?: string } | null;
    target_id: string | null;
  };

  // 1. Fetch all appointments for the target date
  const { data: appts } = await db
    .from('appointments')
    .select('id, status, created_at, token_number, complaint, visit_type, patient:patients(name)')
    .eq('clinic_id', clinicId)
    .eq('booked_for', targetDate)
    .order('token_number', { ascending: true });

  const all = (appts ?? []) as unknown as AdminAppointmentRow[];
  const total = all.length;
  const waiting = all.filter(a => a.status === 'booked' || a.status === 'confirmed').length;
  const consulting = all.filter(a => a.status === 'in_progress').length;
  const done = all.filter(a => a.status === 'completed').length;
  const noShows = all.filter(a => a.status === 'no_show').length;

  // 2. Calculate Average Wait Time from audit logs
  // We look for transitions from 'confirmed' or 'booked' to 'in_progress'
  const { data: logs } = await db
    .from('audit_log')
    .select('target_id, created_at, meta')
    .eq('clinic_id', clinicId)
    .eq('action', 'status_updated')
    .gte('created_at', targetDate + 'T00:00:00')
    .lte('created_at', targetDate + 'T23:59:59');

  let totalWaitMs = 0;
  let waitCount = 0;

  for (const log of (logs ?? []) as AdminAuditLogRow[]) {
    const meta = log.meta;
    if (meta?.status === 'in_progress') {
      const appt = all.find(a => a.id === log.target_id);
      if (appt) {
        const waitMs = new Date(log.created_at).getTime() - new Date(appt.created_at).getTime();
        if (waitMs > 0) {
          totalWaitMs += waitMs;
          waitCount++;
        }
      }
    }
  }
  const avgWaitMins = waitCount > 0 ? Math.round(totalWaitMs / (waitCount * 60000)) : 0;

  // 3. Weekly Trend (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toISOString().split('T')[0];

  const { data: trendData } = await db
    .from('appointments')
    .select('booked_for')
    .eq('clinic_id', clinicId)
    .gte('booked_for', startDate)
    .lte('booked_for', targetDate);

  const trend: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend[d.toISOString().split('T')[0]] = 0;
  }
  for (const a of trendData ?? []) {
    if (trend[a.booked_for] !== undefined) trend[a.booked_for]++;
  }
  const sortedTrend = Object.entries(trend).sort().map(([date, count]) => ({ date, count }));

  // 4. Doctor Utilization
  const doctor = await getDoctorForClinic();
  let utilization = 0;
  if (doctor) {
    const dayOfWeek = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() as keyof typeof doctor.working_hours;
    const hours = doctor.working_hours[dayOfWeek];
    if (hours && hours.slots && hours.slots.length > 0) {
      const totalMins = hours.slots.reduce((sum, slot) => {
        const [startH, startM] = slot.start.split(':').map(Number);
        const [endH, endM] = slot.end.split(':').map(Number);
        return sum + ((endH * 60 + endM) - (startH * 60 + startM));
      }, 0);
      const totalSlots = totalMins / doctor.slot_duration_mins;
      utilization = totalSlots > 0 ? Math.round((total / totalSlots) * 100) : 0;
    }
  }

  // 5. Flagged Queue (> 30 min wait)
  const now = Date.now();
  const flagged = all
    .filter(a => (a.status === 'booked' || a.status === 'confirmed') && (now - new Date(a.created_at).getTime()) > 30 * 60000)
    .map(a => ({
      name: a.patient?.[0]?.name ?? 'Unknown',
      waitTime: Math.floor((now - new Date(a.created_at).getTime()) / 60000)
    }));

  return { 
    total, waiting, consulting, done, noShows, 
    avgWaitMins, trend: sortedTrend, utilization, flagged,
    recent: all.slice(0, 10) 
  };
}

export async function getRecentActivity(limit: number = 10) {
  const { clinicId, db } = await getTenantDb();
  type RecentActivityRow = {
    appointment: Array<{ patient: Array<{ name: string | null }> | null }> | null;
    created_at: string;
    id: string;
    meta: { oldStatus?: string; status?: string } | null;
  };

  const { data } = await db
    .from('audit_log')
    .select('*, appointment:appointments(patient:patients(name))')
    .eq('clinic_id', clinicId)
    .eq('action', 'status_updated')
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as RecentActivityRow[]).map(log => ({
    id: log.id,
    patientName: log.appointment?.[0]?.patient?.[0]?.name ?? 'Unknown',
    oldStatus: log.meta?.oldStatus ?? 'unknown',
    newStatus: log.meta?.status ?? 'unknown',
    timestamp: log.created_at
  }));
}

// ─── Doctor settings ──────────────────────────────────────────────────────────

export async function updateDoctorSettings(formData: FormData): Promise<void> {
  const { clinicId, db } = await getTenantDb();

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
  const { clinicId, db } = await getTenantDb();
  const { data } = await db
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
  await getClinicDb(clinicId).from('communication_events').insert(data);
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

export async function raisePatientIssue(
  patientId: string,
  clinicId: string,
  complaint: string
): Promise<{ tokenNumber: number | null }> {
  const db = getClinicDb(clinicId);
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
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();
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

  await auditLog(clinicId, actorRole, 'called_next', nextAppt.id);

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/admin`);
}

export async function getAppointmentDetails(
  appointmentId: string
): Promise<(QueueItem & { recentHistory: VisitHistory[] }) | null> {
  const { clinicId, db } = await getTenantDb();
  const { data } = await db
    .from('appointments')
    .select('*, patient:patients(*), doctor:doctors(*)')
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .single();

  if (!data) {
    return null;
  }

  const [appointment] = await applyPaymentAuditFallback(db, clinicId, [data as QueueItem]);
  if (!appointment) {
    return null;
  }

  const { data: recentHistory } = await db
    .from('visit_history')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', appointment.patient_id)
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    ...appointment,
    recentHistory: (recentHistory ?? []) as VisitHistory[],
  };
}

export async function generateSoapNote(transcript: string) {
  const { requestSarvamToolObject } = await import('@/lib/sarvamChatAdapter');
  
  const systemPrompt = `You are an AI medical scribe. Convert the following doctor-patient consultation transcript into a structured SOAP note and extract diagnosis and prescription.
  Return the result using the provided function tool.
  Subjective: Patient's reported symptoms and history.
  Objective: Physical findings and vitals mentioned.
  Assessment: Professional evaluation and differential diagnosis.
  Plan: Next steps, tests, and follow-up.
  Diagnosis: Primary suspected condition.
  Prescription: List of medications with dose and frequency.`;

  const { parsed } = await requestSarvamToolObject<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    diagnosis: string;
    prescription: Array<{ drug: string; dose: string; frequency: string }>;
  }>({
    systemPrompt,
    userPrompt: transcript,
    toolName: 'saveSoapNote',
    toolDescription: 'Saves a structured SOAP note and prescription extracted from transcript',
    maxTokens: 1500,
    parameters: {
      type: 'object',
      properties: {
        subjective: { type: 'string' },
        objective: { type: 'string' },
        assessment: { type: 'string' },
        plan: { type: 'string' },
        diagnosis: { type: 'string' },
        prescription: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              drug: { type: 'string' },
              dose: { type: 'string' },
              frequency: { type: 'string' }
            },
            required: ['drug', 'dose', 'frequency']
          }
        }
      },
      required: ['subjective', 'objective', 'assessment', 'plan', 'diagnosis', 'prescription']
    }
  });

  return parsed;
}

export async function saveVisitRecord(
  appointmentId: string,
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  diagnosis: string,
  prescription: Array<{ drug: string; dose: string; frequency: string }>,
  followUpDate?: string
): Promise<void> {
  const cleanedPrescription = prescription.filter(
    (entry) => entry.drug.trim() || entry.dose.trim() || entry.frequency.trim()
  );

  // Construct a comprehensive summary for visit_history
  const summaryParts = [
    `Diagnosis: ${diagnosis.trim() || 'Not recorded'}`,
    `\nSOAP Note:`,
    `Subjective: ${soap.subjective.trim() || 'Not recorded'}`,
    `Objective: ${soap.objective.trim() || 'Not recorded'}`,
    `Assessment: ${soap.assessment.trim() || 'Not recorded'}`,
    `Plan: ${soap.plan.trim() || 'Not recorded'}`,
    `\nPrescription:`,
    ...(cleanedPrescription.length > 0
      ? cleanedPrescription.map((p) => `- ${p.drug.trim()}: ${p.dose.trim()} (${p.frequency.trim()})`)
      : ['- No medicines recorded']),
  ];
  
  if (followUpDate) {
    summaryParts.push(`\nFollow-up Reminder: ${followUpDate}`);
  }
  
  const summary = summaryParts.join('\n');

  // updateAppointmentStatus handles visit_history insertion when status is 'completed'
  await updateAppointmentStatus(appointmentId, 'completed', summary);
}

export async function updateAppointmentPayment(
  appointmentId: string,
  paymentMode: 'cash' | 'upi',
  paymentState: 'pending' | 'paid'
): Promise<{ persisted: boolean; storage: 'appointment' | 'audit' }> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();
  const paymentStatus = paymentState === 'paid' ? 'verified' : 'pending';

  const { error } = await db
    .from('appointments')
    .update({
      payment_mode: paymentMode,
      payment_status: paymentStatus,
    })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .select('id')
    .single();

  let storage: 'appointment' | 'audit' = 'appointment';

  if (error) {
    const missingPaymentColumn =
      error.message.includes('payment_mode') ||
      error.message.includes('payment_status');

    if (!missingPaymentColumn) {
      throw new Error(error.message);
    }

    storage = 'audit';
  }

  await auditLog(clinicId, actorRole, 'payment_updated', appointmentId, {
    payment_mode: paymentMode,
    payment_state: paymentState,
    payment_status: paymentStatus,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/patients`);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/queue/${appointmentId}/consult`);

  return { persisted: true, storage };
}

// ─── Demo Request ─────────────────────────────────────────────────────────────

export async function submitDemoRequest(input: {
  name: string;
  phone: string;
  clinicName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { name, phone, clinicName } = input;

  if (!name.trim() || !phone.trim()) {
    return { success: false, error: 'Name and phone are required.' };
  }

  const db = getDb();
  const { error } = await db.from('demo_requests').insert({
    name: name.trim(),
    phone: phone.trim(),
    clinic_name: clinicName?.trim() || null,
  });

  if (error) {
    console.error('[submitDemoRequest]', error.message);
    return { success: false, error: 'Could not save request. Please try again.' };
  }

  return { success: true };
}
