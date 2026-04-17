'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getDb, getClinicDb, auditLog } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { computeBillSnapshot, toMoneyNumber } from '@/lib/billing';
import {
  getIndianMobileValidationError,
  normalizeIndianMobile,
  parsePatientPhone,
} from '@/lib/phone';
import { createPatientToken } from '@/lib/patientToken';
import { attachPatientReportSignedUrls } from '@/lib/reportUrls';
import type {
  Appointment,
  AppointmentStatus,
  Bill,
  BillLineItem,
  BillSummary,
  CommunicationEvent,
  Doctor,
  OnboardingInput,
  Patient,
  PatientReport,
  PaymentEvent,
  PatientWithHistory,
  QueueItem,
  UserRole,
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

async function getClinicIdentity(clinicId: string): Promise<{ slug: string; custom_domain: string | null; name: string }> {
  const { data, error } = await getDb()
    .from('clinics')
    .select('slug, custom_domain, name')
    .eq('id', clinicId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Clinic not found.');
  }

  return {
    slug: data.slug as string,
    custom_domain: (data.custom_domain as string | null) ?? null,
    name: data.name as string,
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildPatientPortalUrl(input: {
  slug: string;
  token: string;
  customDomain?: string | null;
}): string {
  const encodedToken = encodeURIComponent(input.token);
  if (input.customDomain?.trim()) {
    const customBase = input.customDomain.startsWith('http')
      ? normalizeBaseUrl(input.customDomain)
      : `https://${normalizeBaseUrl(input.customDomain)}`;
    return `${customBase}/portal/${encodedToken}`;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    return '';
  }

  return `${normalizeBaseUrl(appUrl)}/${input.slug}/portal/${encodedToken}`;
}

async function getTenantDb(): Promise<{ clinicId: string; db: ReturnType<typeof getClinicDb> }> {
  const clinicId = await getClinicId();
  return { clinicId, db: getClinicDb(clinicId) };
}

async function getActorRole(): Promise<'admin' | 'doctor' | 'receptionist'> {
  const session = await requireSession();
  return session.role;
}

type TenantScopedDb = Awaited<ReturnType<typeof getTenantDb>>['db'];

function toPersistedBillSummary(
  billId: string,
  snapshot: ReturnType<typeof computeBillSnapshot>
): BillSummary {
  return {
    bill_id: billId,
    status: snapshot.status,
    total_amount: snapshot.total_amount,
    amount_paid: snapshot.amount_paid,
    amount_due: snapshot.amount_due,
    payment_display_mode: snapshot.payment_display_mode,
    payment_count: snapshot.payment_count,
  };
}

function isMissingBillingSchemaError(message: string): boolean {
  return (
    message.includes("Could not find the table 'public.bills'") ||
    message.includes("Could not find the table 'public.bill_line_items'") ||
    message.includes("Could not find the table 'public.payment_events'") ||
    message.includes('relation "bills" does not exist') ||
    message.includes('relation "bill_line_items" does not exist') ||
    message.includes('relation "payment_events" does not exist')
  );
}

async function getLatestUpiUtr(
  db: TenantScopedDb,
  clinicId: string,
  billId: string
): Promise<string | null> {
  const { data, error } = await db
    .from('payment_events')
    .select('utr_number')
    .eq('clinic_id', clinicId)
    .eq('bill_id', billId)
    .eq('payment_mode', 'upi')
    .eq('payment_status', 'recorded')
    .not('utr_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return typeof data?.utr_number === 'string' ? data.utr_number : null;
}

async function syncAppointmentPaymentSnapshot(
  db: TenantScopedDb,
  clinicId: string,
  appointmentId: string,
  billSummary: BillSummary | null
): Promise<void> {
  const paymentMode =
    billSummary?.payment_display_mode && billSummary.payment_display_mode !== 'mixed'
      ? billSummary.payment_display_mode
      : null;
  const paymentStatus = billSummary?.status === 'paid' ? 'verified' : 'pending';
  const paymentAmount = billSummary?.total_amount ?? null;
  const paymentUtr =
    billSummary?.payment_display_mode === 'upi'
      ? await getLatestUpiUtr(db, clinicId, billSummary.bill_id)
      : null;

  const { error } = await db
    .from('appointments')
    .update({
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      payment_amount: paymentAmount,
      payment_utr: paymentUtr,
    })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId);

  if (
    error &&
    !(
      error.message.includes('payment_mode') ||
      error.message.includes('payment_status') ||
      error.message.includes('payment_amount') ||
      error.message.includes('payment_utr')
    )
  ) {
    throw new Error(error.message);
  }
}

async function getOrCreateAppointmentBill(
  db: TenantScopedDb,
  clinicId: string,
  appointmentId: string,
  actorRole: UserRole
): Promise<Bill> {
  const { data: existingBill, error: billError } = await db
    .from('bills')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (billError) {
    throw new Error(billError.message);
  }

  if (existingBill) {
    return existingBill as Bill;
  }

  const { data: appointment, error: appointmentError } = await db
    .from('appointments')
    .select('id, patient_id')
    .eq('clinic_id', clinicId)
    .eq('id', appointmentId)
    .single();

  if (appointmentError) {
    throw new Error(appointmentError.message);
  }

  const { data: newBill, error: createError } = await db
    .from('bills')
    .insert({
      clinic_id: clinicId,
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      status: 'draft',
      created_by_role: actorRole,
    })
    .select('*')
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return newBill as Bill;
}

async function refreshBillSummary(
  db: TenantScopedDb,
  clinicId: string,
  bill: Pick<Bill, 'id' | 'appointment_id' | 'discount_amount'>
): Promise<BillSummary> {
  const [{ data: lineItems, error: lineItemError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      db
        .from('bill_line_items')
        .select('line_total')
        .eq('clinic_id', clinicId)
        .eq('bill_id', bill.id),
      db
        .from('payment_events')
        .select('amount, payment_mode, payment_status')
        .eq('clinic_id', clinicId)
        .eq('bill_id', bill.id),
    ]);

  if (lineItemError) {
    throw new Error(lineItemError.message);
  }
  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const snapshot = computeBillSnapshot(
    (lineItems ?? []) as Array<Pick<BillLineItem, 'line_total'>>,
    (payments ?? []) as Array<Pick<PaymentEvent, 'amount' | 'payment_mode' | 'payment_status'>>,
    bill.discount_amount ?? 0
  );

  const closedAt = snapshot.status === 'paid' ? new Date().toISOString() : null;
  const { error: updateError } = await db
    .from('bills')
    .update({
      status: snapshot.status,
      subtotal_amount: snapshot.subtotal_amount,
      discount_amount: snapshot.discount_amount,
      total_amount: snapshot.total_amount,
      amount_paid: snapshot.amount_paid,
      amount_due: snapshot.amount_due,
      updated_at: new Date().toISOString(),
      closed_at: closedAt,
    })
    .eq('id', bill.id)
    .eq('clinic_id', clinicId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const summary = toPersistedBillSummary(bill.id, snapshot);
  await syncAppointmentPaymentSnapshot(db, clinicId, bill.appointment_id, summary);
  return summary;
}

async function getBillSummaryMap(
  db: TenantScopedDb,
  clinicId: string,
  appointmentIds: string[]
): Promise<Map<string, BillSummary>> {
  const uniqueIds = [...new Set(appointmentIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data: bills, error: billsError } = await db
    .from('bills')
    .select('id, appointment_id, status, total_amount, amount_paid, amount_due')
    .eq('clinic_id', clinicId)
    .in('appointment_id', uniqueIds);

  if (billsError && isMissingBillingSchemaError(billsError.message)) {
    return new Map();
  }
  if (billsError) {
    throw new Error(billsError.message);
  }

  if (!bills || bills.length === 0) {
    return new Map();
  }

  const billIds = bills.map((bill) => bill.id);
  const { data: payments, error: paymentsError } = await db
    .from('payment_events')
    .select('bill_id, payment_mode, payment_status')
    .eq('clinic_id', clinicId)
    .in('bill_id', billIds)
    .eq('payment_status', 'recorded');

  if (paymentsError && isMissingBillingSchemaError(paymentsError.message)) {
    return new Map();
  }
  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const paymentModeMap = new Map<
    string,
    {
      modes: Set<'cash' | 'upi'>;
      count: number;
    }
  >();

  for (const payment of payments ?? []) {
    const entry =
      paymentModeMap.get(payment.bill_id) ??
      { modes: new Set<'cash' | 'upi'>(), count: 0 };
    if (payment.payment_mode === 'cash' || payment.payment_mode === 'upi') {
      entry.modes.add(payment.payment_mode);
    }
    entry.count += 1;
    paymentModeMap.set(payment.bill_id, entry);
  }

  const summaryMap = new Map<string, BillSummary>();
  for (const bill of bills) {
    const paymentMeta = paymentModeMap.get(bill.id);
    const modes = paymentMeta?.modes ? [...paymentMeta.modes] : [];
    summaryMap.set(bill.appointment_id, {
      bill_id: bill.id,
      status: bill.status,
      total_amount: Number(bill.total_amount ?? 0),
      amount_paid: Number(bill.amount_paid ?? 0),
      amount_due: Number(bill.amount_due ?? 0),
      payment_display_mode:
        modes.length === 0 ? null : modes.length === 1 ? modes[0] : 'mixed',
      payment_count: paymentMeta?.count ?? 0,
    });
  }

  return summaryMap;
}

async function attachBillSummaries<T extends { id: string; bill_summary?: BillSummary | null }>(
  db: TenantScopedDb,
  clinicId: string,
  rows: T[]
): Promise<T[]> {
  const summaryMap = await getBillSummaryMap(
    db,
    clinicId,
    rows.map((row) => row.id)
  );

  return rows.map((row) => ({
    ...row,
    bill_summary: summaryMap.get(row.id) ?? null,
  }));
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
      mon: { open: true, slots: [{ start: '09:00', end: '17:00' }] },
      tue: { open: true, slots: [{ start: '09:00', end: '17:00' }] },
      wed: { open: true, slots: [{ start: '09:00', end: '17:00' }] },
      thu: { open: true, slots: [{ start: '09:00', end: '17:00' }] },
      fri: { open: true, slots: [{ start: '09:00', end: '17:00' }] },
      sat: { open: true, slots: [{ start: '09:00', end: '13:00' }] },
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

export async function getClinicName(slug: string): Promise<string> {
  const { data } = await getDb()
    .from('clinics')
    .select('name')
    .eq('slug', slug)
    .maybeSingle();
  return data?.name ?? 'Clinic';
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function createAppointment(formData: FormData): Promise<{ appointmentId: string; tokenNumber: number; slug: string }> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  const existingPatientId = (formData.get('patientId') as string | null)?.trim() || null;
  const allowSharedMobileNewPatient = formData.get('allowSharedMobileNewPatient') === 'true';
  const noPhone = formData.get('no_phone') === 'true';
  const patientName = formData.get('patientName') as string;
  const age = formData.get('age') ? parseInt(formData.get('age') as string) : null;
  const rawPhone = String(formData.get('phone') ?? '');
  const complaint = formData.get('complaint') as string;
  const visitType = (formData.get('visitType') as string) || 'walk-in';
  const bookedFor = (formData.get('bookedFor') as string) || new Date().toISOString().split('T')[0];
  const requestedDoctorId = formData.get('doctorId') as string | null;
  const payment_mode = (formData.get('payment_mode') as 'cash' | 'upi' | null) ?? 'cash';
  const payment_state =
    (formData.get('payment_state') as 'pending' | 'paid' | null) ??
    ((formData.get('payment_status') as 'pending' | 'paid' | null) ?? 'pending');
  const payment_status = payment_state === 'paid' ? 'verified' : 'pending';
  const rawBillingAmount = formData.get('billing_amount');
  const billingAmount = toMoneyNumber(rawBillingAmount);
  const rawPaymentUtr = String(formData.get('payment_utr') ?? '').trim();

  if (rawBillingAmount != null && String(rawBillingAmount).trim() && billingAmount === null) {
    throw new Error('Enter a valid bill amount.');
  }

  if (payment_state === 'paid' && billingAmount === null) {
    throw new Error('Collected payment requires a bill amount.');
  }

  if (payment_state === 'paid' && payment_mode === 'upi' && !rawPaymentUtr) {
    throw new Error('UPI payments require a UTR number.');
  }

  if (patientName.trim().length < 2) {
    throw new Error('Patient name must be at least 2 characters.');
  }

  if (!complaint.trim()) {
    throw new Error('Complaint is required.');
  }

  const normalizedAge = Number.isFinite(age) ? age : null;
  const { phone, error: phoneError } = parsePatientPhone(rawPhone, noPhone);

  if (!existingPatientId && phoneError) {
    await auditLog(clinicId, actorRole, 'invalid_phone_rejected', undefined, {
      rawPhone: rawPhone.trim(),
      normalizedPhone: normalizeIndianMobile(rawPhone),
      noPhone,
    });
    throw new Error(phoneError);
  }

  if (existingPatientId && noPhone) {
    throw new Error('Existing patient selection cannot be combined with no-phone fallback.');
  }

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
    let existingPatients: Array<{ id: string }> = [];
    if (!noPhone) {
      const { data, error: existingPatientsError } = await db
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', phone);
      if (existingPatientsError) throw new Error(existingPatientsError.message);
      existingPatients = (data ?? []) as Array<{ id: string }>;
    }

    if (existingPatients.length > 0) {
      if (!allowSharedMobileNewPatient) {
        await auditLog(clinicId, actorRole, 'patient_phone_matches_found', undefined, {
          phone,
          matchCount: existingPatients.length,
        });
        throw new Error(
          'This mobile number already exists. Select the existing patient or choose "Create another patient with same mobile".'
        );
      }

      const { data: newPatient, error: patErr } = await db
        .from('patients')
        .insert({
          clinic_id: clinicId,
          name: patientName.trim(),
          age: normalizedAge,
          phone,
          no_phone: false,
        })
        .select('id')
        .single();
      if (patErr) throw new Error(patErr.message);
      patientId = newPatient.id;
      await auditLog(clinicId, actorRole, 'patient_created_with_shared_mobile', patientId, {
        phone,
      });
    } else if (noPhone) {
      const { data: newPatient, error: patErr } = await db
        .from('patients')
        .insert({
          clinic_id: clinicId,
          name: patientName.trim(),
          age: normalizedAge,
          phone: null,
          no_phone: true,
        })
        .select('id')
        .single();
      if (patErr) throw new Error(patErr.message);
      patientId = newPatient.id;
      await auditLog(clinicId, actorRole, 'patient_created_without_phone', patientId, {
        no_phone: true,
      });
    } else {
      const { data: newPatient, error: patErr } = await db
        .from('patients')
        .insert({
          clinic_id: clinicId,
          name: patientName.trim(),
          age: normalizedAge,
          phone,
          no_phone: false,
        })
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

  if (billingAmount !== null) {
    const bill = await getOrCreateAppointmentBill(db, clinicId, apptId, actorRole);
    const consultationLabel = visitType === 'follow-up' ? 'Follow-up consultation' : 'Consultation';

    const { error: lineItemError } = await db.from('bill_line_items').insert({
      clinic_id: clinicId,
      bill_id: bill.id,
      appointment_id: apptId,
      item_type: 'consultation',
      label: consultationLabel,
      quantity: 1,
      unit_amount: billingAmount,
      line_total: billingAmount,
      created_by_role: actorRole,
    });

    if (lineItemError) {
      throw new Error(lineItemError.message);
    }

    let summary = await refreshBillSummary(db, clinicId, bill);

    if (payment_state === 'paid') {
      const { error: paymentError } = await db.from('payment_events').insert({
        clinic_id: clinicId,
        bill_id: bill.id,
        appointment_id: apptId,
        patient_id: patientId,
        amount: billingAmount,
        payment_mode,
        payment_status: 'recorded',
        utr_number: payment_mode === 'upi' ? rawPaymentUtr : null,
        collected_by_role: actorRole,
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      summary = await refreshBillSummary(db, clinicId, bill);
    }

    await auditLog(clinicId, actorRole, 'bill_seeded', apptId, {
      bill_id: summary.bill_id,
      total_amount: summary.total_amount,
      amount_paid: summary.amount_paid,
      amount_due: summary.amount_due,
      payment_mode: payment_state === 'paid' ? payment_mode : null,
    });
  }

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

  const withPaymentFallback = await applyPaymentAuditFallback(db, clinicId, (data ?? []) as QueueItem[]);
  return attachBillSummaries(db, clinicId, withPaymentFallback);
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

  const withPaymentFallback = await applyPaymentAuditFallback(db, clinicId, (data ?? []) as Appointment[]);
  return attachBillSummaries(db, clinicId, withPaymentFallback);
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

  const withPaymentFallback = await applyPaymentAuditFallback(db, clinicId, (data ?? []) as Appointment[]);
  return attachBillSummaries(db, clinicId, withPaymentFallback);
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
  const digitsOnly = normalizeIndianMobile(query).slice(0, 10);

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
  const normalizedPhone = normalizeIndianMobile(phone);
  if (!normalizedPhone) {
    return null;
  }

  const { data: patient } = await db
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', normalizedPhone)
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

export async function createPatientPortalLink(
  patientId: string
): Promise<{ url?: string; success: boolean; error?: string }> {
  const session = await requireSession();
  const clinicId = session.clinicId;
  const actorRole = session.role;
  const db = getClinicDb(clinicId);

  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('id, name, phone')
    .eq('clinic_id', clinicId)
    .eq('id', patientId)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message);
  }
  if (!patient) {
    throw new Error('Patient not found for this clinic.');
  }
  if (!patient.phone) {
    return { success: false, error: 'Patient phone number is missing.' };
  }

  const clinic = await getClinicIdentity(clinicId);
  const token = await createPatientToken(patient.id, clinicId, actorRole);
  const url = buildPatientPortalUrl({
    slug: clinic.slug,
    token,
    customDomain: clinic.custom_domain,
  });

  if (!url) {
    return { success: false, error: 'APP_URL is not configured for portal links.' };
  }

  const { sendPortalLink } = await import('@/lib/whatsappAdapter');
  const result = await sendPortalLink({
    toPhone: patient.phone,
    patientName: patient.name,
    clinicName: clinic.name,
    portalUrl: url,
  });

  await auditLog(clinicId, actorRole, 'sent_portal_link', patientId, {
    success: result.success,
    to_phone: patient.phone,
    portal_url: url,
    error: result.error ?? null,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? 'Could not send WhatsApp message.',
      url,
    };
  }

  return { success: true, url };
}

export async function updatePatient(
  patientId: string,
  updates: { name: string; phone: string; noPhone?: boolean }
): Promise<void> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('id, clinic_id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientError) throw new Error(patientError.message);
  if (!patient || patient.clinic_id !== clinicId) {
    throw new Error('Patient not found for this clinic.');
  }

  const nextName = updates.name.trim();
  if (nextName.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }

  const noPhone = updates.noPhone === true;
  const { phone, error: phoneError } = parsePatientPhone(updates.phone, noPhone);
  if (phoneError) {
    throw new Error(phoneError);
  }

  const { error } = await db
    .from('patients')
    .update({
      name: nextName,
      phone,
      no_phone: noPhone,
    })
    .eq('id', patientId)
    .eq('clinic_id', clinicId);

  if (error) throw new Error(error.message);

  await auditLog(clinicId, actorRole, 'patient_updated', patientId, {
    name: nextName,
    phone,
    no_phone: noPhone,
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
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const { data: logs } = await db
    .from('audit_log')
    .select('target_id, created_at, meta')
    .eq('clinic_id', clinicId)
    .eq('action', 'status_updated')
    .gte('created_at', targetDate + 'T00:00:00')
    .lt('created_at', nextDayStr + 'T00:00:00');

  // Cap wait measurement at midnight of targetDate so pre-booked appointments
  // don't inflate wait time with days of advance booking.
  const todayStart = new Date(targetDate + 'T00:00:00').getTime();
  let totalWaitMs = 0;
  let waitCount = 0;

  for (const log of (logs ?? []) as AdminAuditLogRow[]) {
    const meta = log.meta;
    if (meta?.status === 'in_progress') {
      const appt = all.find(a => a.id === log.target_id);
      if (appt) {
        const arrivedAt = Math.max(new Date(appt.created_at).getTime(), todayStart);
        const waitMs = new Date(log.created_at).getTime() - arrivedAt;
        if (waitMs > 0 && waitMs < 8 * 60 * 60 * 1000) {
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
    // Cast to unknown to handle both the typed format { open: boolean, slots: [...] }
    // and the legacy DB format { open: '09:00', close: '17:00' } seeded before the type was defined.
    const hoursRaw = doctor.working_hours[dayOfWeek] as unknown;
    if (hoursRaw && typeof hoursRaw === 'object') {
      const h = hoursRaw as Record<string, unknown>;
      let totalMins = 0;
      if (Array.isArray(h.slots) && h.slots.length > 0) {
        // Typed format: { open: boolean, slots: [{ start, end }] }
        totalMins = (h.slots as Array<{ start: string; end: string }>).reduce((sum, slot) => {
          const [startH, startM] = slot.start.split(':').map(Number);
          const [endH, endM] = slot.end.split(':').map(Number);
          return sum + ((endH * 60 + endM) - (startH * 60 + startM));
        }, 0);
      } else if (typeof h.open === 'string' && typeof h.close === 'string') {
        // Legacy format stored in DB: { open: '09:00', close: '17:00' }
        const [startH, startM] = h.open.split(':').map(Number);
        const [endH, endM] = h.close.split(':').map(Number);
        totalMins = (endH * 60 + endM) - (startH * 60 + startM);
      }
      const totalSlots = doctor.slot_duration_mins > 0 ? totalMins / doctor.slot_duration_mins : 0;
      utilization = totalSlots > 0 ? Math.round((total / totalSlots) * 100) : 0;
    }
  }

  // 5. Flagged Queue (> 30 min wait)
  // Use todayStart so pre-booked appointments don't appear flagged from their booking date.
  const now = Date.now();
  const flagged = all
    .filter(a =>
      (a.status === 'booked' || a.status === 'confirmed') &&
      (now - Math.max(new Date(a.created_at).getTime(), todayStart)) > 30 * 60000
    )
    .map(a => ({
      name: a.patient?.[0]?.name ?? 'Unknown',
      waitTime: Math.floor(
        (now - Math.max(new Date(a.created_at).getTime(), todayStart)) / 60000
      ),
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
  const actorRole = await getActorRole();
  if (!['admin', 'doctor'].includes(actorRole)) {
    throw new Error('Only admin or doctor can update settings.');
  }

  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId)
    .single();
  if (!doctor) throw new Error('Doctor not found');

  let workingHours: unknown = undefined;
  try {
    const rawWorkingHours = formData.get('working_hours');
    if (typeof rawWorkingHours === 'string' && rawWorkingHours.trim()) {
      workingHours = JSON.parse(rawWorkingHours);
    }
  } catch {
    throw new Error('Invalid working hours format.');
  }

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
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();
  if (clinicId !== data.clinic_id) {
    throw new Error('Communication event clinic mismatch.');
  }
  await db.from('communication_events').insert({
    ...data,
    clinic_id: clinicId,
  });
  await auditLog(clinicId, actorRole, 'communication_sent', data.appointment_id ?? undefined, {
    channel: data.channel,
    template: data.template_name,
    status: data.status,
  });
}

// ─── Voice API helper (called from API route, not server action) ──────────────

export async function processVoiceIntake(fd: FormData) {
  await getActorRole();
  const { processPatientVoiceInput } = await import('@/lib/patientExtractionAdapter');
  return processPatientVoiceInput(fd);
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
  const [appointmentWithBilling] = await attachBillSummaries(db, clinicId, [appointment]);
  if (!appointmentWithBilling) {
    return null;
  }

  const { data: recentHistory } = await db
    .from('visit_history')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', appointmentWithBilling.patient_id)
    .order('created_at', { ascending: false })
    .limit(3);

  const historyRows = ((recentHistory ?? []) as VisitHistory[]).filter(
    (visit) => visit.appointment_id !== appointmentId
  );

  const representedAppointmentIds = new Set(
    historyRows.map((visit) => visit.appointment_id).filter(Boolean)
  );

  const { data: fallbackAppointments } = await db
    .from('appointments')
    .select('id, clinic_id, patient_id, complaint, booked_for, visit_type, status')
    .eq('clinic_id', clinicId)
    .eq('patient_id', appointmentWithBilling.patient_id)
    .neq('id', appointmentId)
    .eq('status', 'completed')
    .order('booked_for', { ascending: false })
    .limit(5);

  const synthesizedHistory = ((fallbackAppointments ?? []) as Array<{
    id: string;
    clinic_id: string;
    patient_id: string;
    complaint: string;
    booked_for: string;
    visit_type: string;
    status: string;
  }>)
    .filter((item) => !representedAppointmentIds.has(item.id))
    .map((item) => ({
      id: `appointment-${item.id}`,
      clinic_id: item.clinic_id,
      patient_id: item.patient_id,
      appointment_id: item.id,
      created_at: `${item.booked_for}T00:00:00.000Z`,
      summary: [
        item.complaint?.trim() || 'Previous visit',
        `Visit Type: ${item.visit_type}`,
        `Status: ${item.status}`,
      ].join('\n'),
    }));

  const combinedRecentHistory = [...historyRows, ...synthesizedHistory]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
    .slice(0, 3);

  return {
    ...appointmentWithBilling,
    recentHistory: combinedRecentHistory,
  };
}

export async function generateSoapNote(transcript: string) {
  await getActorRole();
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
  await getActorRole();
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

export async function addAppointmentCharge(
  appointmentId: string,
  label: string,
  amountInput: string,
  itemType: BillLineItem['item_type'] = 'service'
): Promise<BillSummary> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  if (actorRole === 'doctor') {
    throw new Error('Doctors cannot edit billing in V1.');
  }

  const normalizedLabel = label.trim();
  if (!normalizedLabel) {
    throw new Error('Charge label is required.');
  }

  const amount = toMoneyNumber(amountInput);
  if (amount === null || amount <= 0) {
    throw new Error('Enter a valid charge amount.');
  }

  const bill = await getOrCreateAppointmentBill(db, clinicId, appointmentId, actorRole);
  const { error: lineItemError } = await db.from('bill_line_items').insert({
    clinic_id: clinicId,
    bill_id: bill.id,
    appointment_id: appointmentId,
    item_type: itemType,
    label: normalizedLabel,
    quantity: 1,
    unit_amount: amount,
    line_total: amount,
    created_by_role: actorRole,
  });

  if (lineItemError) {
    throw new Error(lineItemError.message);
  }

  const summary = await refreshBillSummary(db, clinicId, bill);
  await auditLog(clinicId, actorRole, 'bill_charge_added', appointmentId, {
    bill_id: summary.bill_id,
    label: normalizedLabel,
    amount,
    item_type: itemType,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/patients`);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/queue/${appointmentId}/consult`);

  return summary;
}

export async function recordAppointmentPayment(
  appointmentId: string,
  amountInput: string,
  paymentMode: 'cash' | 'upi',
  utrNumber?: string
): Promise<BillSummary> {
  const { clinicId, db } = await getTenantDb();
  const actorRole = await getActorRole();

  if (actorRole === 'doctor') {
    throw new Error('Doctors cannot collect billing in V1.');
  }

  const amount = toMoneyNumber(amountInput);
  if (amount === null || amount <= 0) {
    throw new Error('Enter a valid payment amount.');
  }

  const normalizedUtr = utrNumber?.trim() ?? '';
  if (paymentMode === 'upi' && !normalizedUtr) {
    throw new Error('UPI payments require a UTR number.');
  }

  const bill = await getOrCreateAppointmentBill(db, clinicId, appointmentId, actorRole);
  const summaryBeforePayment = await refreshBillSummary(db, clinicId, bill);

  if (summaryBeforePayment.total_amount <= 0) {
    throw new Error('Add a bill amount before recording payment.');
  }
  if (amount > summaryBeforePayment.amount_due) {
    throw new Error(`Payment exceeds due amount of ₹${summaryBeforePayment.amount_due.toFixed(2)}.`);
  }

  const { data: appointment, error: appointmentError } = await db
    .from('appointments')
    .select('patient_id')
    .eq('clinic_id', clinicId)
    .eq('id', appointmentId)
    .single();

  if (appointmentError) {
    throw new Error(appointmentError.message);
  }

  const { error: paymentError } = await db.from('payment_events').insert({
    clinic_id: clinicId,
    bill_id: bill.id,
    appointment_id: appointmentId,
    patient_id: appointment.patient_id,
    amount,
    payment_mode: paymentMode,
    payment_status: 'recorded',
    utr_number: paymentMode === 'upi' ? normalizedUtr : null,
    collected_by_role: actorRole,
  });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const summary = await refreshBillSummary(db, clinicId, bill);
  await auditLog(clinicId, actorRole, 'payment_recorded', appointmentId, {
    bill_id: summary.bill_id,
    amount,
    payment_mode: paymentMode,
    utr_number: paymentMode === 'upi' ? normalizedUtr : null,
    amount_due: summary.amount_due,
  });

  const slug = await getClinicSlug(clinicId);
  revalidatePath(`/${slug}/queue`);
  revalidatePath(`/${slug}/patients`);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/queue/${appointmentId}/consult`);

  return summary;
}

export async function updateAppointmentPayment(
  appointmentId: string,
  paymentMode: 'cash' | 'upi',
  paymentState: 'pending' | 'paid'
): Promise<{ persisted: boolean; storage: 'appointment' | 'audit' }> {
  void appointmentId;
  void paymentMode;
  if (paymentState === 'pending') {
    return { persisted: true, storage: 'audit' };
  }

  throw new Error('This payment action is no longer supported. Please refresh the page.');
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

// ─── Patient Reports ──────────────────────────────────────────────────────────

export async function getPatientReports(patientId: string): Promise<PatientReport[]> {
  const { db } = await getTenantDb();

  const { data, error } = await db
    .from('patient_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return attachPatientReportSignedUrls(data as Array<Omit<PatientReport, 'signedUrl'>>);
}
