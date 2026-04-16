import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createPatientToken } from '@/lib/patientToken';
import { COOKIE_NAME, verifySession } from '@/lib/session';
import {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendCancellationNotice,
} from '@/lib/whatsappAdapter';

type RequestBody = {
  type: 'confirmation' | 'reminder' | 'cancellation';
  appointmentId: string;
};

type AppointmentRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  token_number: number;
  booked_for: string;
};

type PatientRecord = {
  id: string;
  name: string;
  phone: string | null;
};

type DoctorRecord = {
  id: string;
  name: string;
};

type ClinicRecord = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
};

type CommunicationPayload = {
  clinic_id: string;
  patient_id: string;
  appointment_id: string;
  channel: 'whatsapp';
  direction: 'outbound';
  template_name: string;
  to_phone: string;
  status: 'queued' | 'sent' | 'failed';
  provider_message_id: string | null;
  payload: Record<string, unknown>;
  error_message: string | null;
};

const TEMPLATE_NAMES: Record<RequestBody['type'], string> = {
  confirmation: 'appointment_confirmation',
  reminder: 'appointment_reminder',
  cancellation: 'cancellation_notice',
};

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function formatLongDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildPortalUrl(clinic: Pick<ClinicRecord, 'slug' | 'custom_domain'>, token: string): string {
  const encodedToken = encodeURIComponent(token);
  if (clinic.custom_domain?.trim()) {
    const customBase = clinic.custom_domain.startsWith('http')
      ? normalizeBaseUrl(clinic.custom_domain)
      : `https://${normalizeBaseUrl(clinic.custom_domain)}`;
    return `${customBase}/portal/${encodedToken}`;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    return '';
  }

  return `${normalizeBaseUrl(appUrl)}/${clinic.slug}/portal/${encodedToken}`;
}

function isValidRequestBody(value: unknown): value is RequestBody {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeBody = value as Record<string, unknown>;
  return (
    typeof maybeBody.appointmentId === 'string' &&
    (maybeBody.type === 'confirmation' ||
      maybeBody.type === 'reminder' ||
      maybeBody.type === 'cancellation')
  );
}

async function logEvent(payload: CommunicationPayload): Promise<void> {
  try {
    const actionsModule = await import('@/app/actions');
    const maybeLogger = (actionsModule as Record<string, unknown>).logCommunicationEvent;

    if (typeof maybeLogger === 'function') {
      await maybeLogger(payload);
    }
  } catch {
    // Logging must never break the route.
  }
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? verifySession(sessionToken) : null;

  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const clinicIdFromSession = session.clinicId;
  let appointmentId = '';
  let messageType: RequestBody['type'] = 'confirmation';
  let clinicId: string | null = null;
  let patientId: string | null = null;

  try {
    const body = (await request.json()) as unknown;

    if (!isValidRequestBody(body)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    appointmentId = body.appointmentId;
    messageType = body.type;

    const db = getServiceClient();

    const { data: appointment, error: appointmentError } = await db
      .from('appointments')
      .select('id, clinic_id, patient_id, doctor_id, token_number, booked_for')
      .eq('id', appointmentId)
      .single<AppointmentRecord>();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: appointmentError?.message ?? 'Appointment not found.' },
        { status: 404 }
      );
    }

    if (appointment.clinic_id !== clinicIdFromSession) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    clinicId = appointment.clinic_id;
    patientId = appointment.patient_id;

    const [{ data: patient, error: patientError }, { data: doctor, error: doctorError }, { data: clinic, error: clinicError }] =
      await Promise.all([
        db.from('patients').select('id, name, phone').eq('id', appointment.patient_id).single<PatientRecord>(),
        db.from('doctors').select('id, name').eq('id', appointment.doctor_id).single<DoctorRecord>(),
        db.from('clinics').select('id, name, slug, custom_domain').eq('id', appointment.clinic_id).single<ClinicRecord>(),
      ]);

    if (patientError || !patient) {
      return NextResponse.json(
        { success: false, error: patientError?.message ?? 'Patient not found.' },
        { status: 404 }
      );
    }

    if (doctorError || !doctor) {
      return NextResponse.json(
        { success: false, error: doctorError?.message ?? 'Doctor not found.' },
        { status: 404 }
      );
    }

    if (clinicError || !clinic) {
      return NextResponse.json(
        { success: false, error: clinicError?.message ?? 'Clinic not found.' },
        { status: 404 }
      );
    }

    if (!patient.phone) {
      const error = 'Patient phone number is missing.';
      await logEvent({
        clinic_id: appointment.clinic_id,
        patient_id: patient.id,
        appointment_id: appointment.id,
        channel: 'whatsapp',
        direction: 'outbound',
        template_name: TEMPLATE_NAMES[messageType],
        to_phone: '',
        status: 'failed',
        provider_message_id: null,
        payload: { type: messageType },
        error_message: error,
      });

      return NextResponse.json({ success: false, error });
    }

    const baseMessageParams = {
      toPhone: patient.phone,
      patientName: patient.name,
      doctorName: doctor.name,
      clinicName: clinic.name,
      date: formatLongDate(appointment.booked_for),
      tokenNumber: appointment.token_number,
    };

    let portalUrl = '';
    if (messageType === 'confirmation') {
      try {
        const token = await createPatientToken(patient.id, appointment.clinic_id, 'system');
        portalUrl = buildPortalUrl(clinic, token);
      } catch {
        portalUrl = '';
      }
    }

    const result =
      messageType === 'confirmation'
        ? await sendAppointmentConfirmation({
            ...baseMessageParams,
            portalUrl: portalUrl || undefined,
          })
        : messageType === 'reminder'
          ? await sendAppointmentReminder(baseMessageParams)
          : await sendCancellationNotice({
              toPhone: patient.phone,
              patientName: patient.name,
              clinicName: clinic.name,
            });

    await logEvent({
      clinic_id: appointment.clinic_id,
      patient_id: patient.id,
      appointment_id: appointment.id,
      channel: 'whatsapp',
      direction: 'outbound',
      template_name: TEMPLATE_NAMES[messageType],
      to_phone: patient.phone,
      status: result.success ? 'sent' : 'failed',
      provider_message_id: result.messageId ?? null,
      payload: {
        type: messageType,
        tokenNumber: appointment.token_number,
        bookedFor: appointment.booked_for,
        portalUrl: portalUrl || null,
      },
      error_message: result.error ?? null,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'WhatsApp send failed.';

    if (appointmentId && clinicId && patientId) {
      await logEvent({
        clinic_id: clinicId,
        patient_id: patientId,
        appointment_id: appointmentId,
        channel: 'whatsapp',
        direction: 'outbound',
        template_name: TEMPLATE_NAMES[messageType],
        to_phone: '',
        status: 'failed',
        provider_message_id: null,
        payload: { type: messageType },
        error_message: message,
      });
    }

    return NextResponse.json({ success: false, error: message });
  }
}
