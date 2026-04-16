import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/db';
import { getClinicBySlug, getPatientsByPhone, normalizePhone } from '@/lib/patientPortal';
import { verifyPatientOtp } from '@/lib/patientOtp';
import {
  createPatientSession,
  PATIENT_COOKIE_NAME,
  PATIENT_SESSION_TTL_SECONDS,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { slug, phone, otp } = (await request.json()) as {
      slug?: string;
      phone?: string;
      otp?: string;
    };
    const normalizedSlug = slug?.trim();
    const normalizedPhone = normalizePhone(phone ?? '');
    const normalizedOtp = (otp ?? '').replace(/\D/g, '').slice(0, 6);

    if (!normalizedSlug || normalizedPhone.length !== 10 || normalizedOtp.length !== 6) {
      return NextResponse.json({ error: 'Enter a valid code.' }, { status: 400 });
    }

    const clinic = await getClinicBySlug(normalizedSlug);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found.' }, { status: 404 });
    }

    const verification = await verifyPatientOtp({
      clinicId: clinic.id,
      phone: normalizedPhone,
      otp: normalizedOtp,
    });

    if (!verification.ok) {
      await auditLog(clinic.id, 'patient', 'patient_otp_failed', undefined, {
        phone: normalizedPhone,
      });
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const profiles = await getPatientsByPhone(clinic.id, normalizedPhone);
    if (profiles.length === 0) {
      return NextResponse.json({ error: 'No patient found for this number.' }, { status: 404 });
    }

    const selectedPatientId = profiles.length === 1 ? profiles[0].id : null;
    const sessionToken = createPatientSession({
      clinicId: clinic.id,
      slug: clinic.slug,
      phone: normalizedPhone,
      selectedPatientId,
    });

    await auditLog(clinic.id, 'patient', 'patient_otp_verified', selectedPatientId ?? undefined, {
      phone: normalizedPhone,
      patient_count: profiles.length,
    });

    const response = NextResponse.json({
      success: true,
      needsSelection: profiles.length > 1,
      profiles,
      redirectTo: `/${clinic.slug}/portal`,
    });
    response.cookies.set(PATIENT_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: PATIENT_SESSION_TTL_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify code.' },
      { status: 500 }
    );
  }
}
