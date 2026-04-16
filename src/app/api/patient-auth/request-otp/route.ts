import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/db';
import { getClinicBySlug, getPatientsByPhone, normalizePhone } from '@/lib/patientPortal';
import { requestPatientOtp } from '@/lib/patientOtp';
import { sendPatientOtp } from '@/lib/whatsappAdapter';

export async function POST(request: NextRequest) {
  try {
    const { slug, phone } = (await request.json()) as { slug?: string; phone?: string };
    const normalizedSlug = slug?.trim();
    const normalizedPhone = normalizePhone(phone ?? '');

    if (!normalizedSlug || normalizedPhone.length !== 10) {
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const clinic = await getClinicBySlug(normalizedSlug);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found.' }, { status: 404 });
    }

    const profiles = await getPatientsByPhone(clinic.id, normalizedPhone);
    if (profiles.length === 0) {
      return NextResponse.json({ error: 'No patient found for this number.' }, { status: 404 });
    }

    const { otp } = await requestPatientOtp({
      clinicId: clinic.id,
      phone: normalizedPhone,
      channel: 'whatsapp',
    });

    const result = await sendPatientOtp({
      toPhone: normalizedPhone,
      clinicName: clinic.name,
      otp,
    });

    await auditLog(clinic.id, 'patient', 'patient_otp_requested', undefined, {
      phone: normalizedPhone,
      send_success: result.success,
      send_error: result.error ?? null,
      patient_count: profiles.length,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Could not send code right now.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send code.' },
      { status: 500 }
    );
  }
}
