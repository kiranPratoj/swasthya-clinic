import { NextRequest, NextResponse } from 'next/server';
import { auditLog, getClinicDb } from '@/lib/db';
import { getClinicBySlug } from '@/lib/patientPortal';
import { validatePatientToken } from '@/lib/patientToken';
import {
  createPatientSession,
  PATIENT_COOKIE_NAME,
  PATIENT_SESSION_TTL_SECONDS,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { slug, token } = (await request.json()) as { slug?: string; token?: string };
    const normalizedSlug = slug?.trim();
    const normalizedToken = token?.trim();

    if (!normalizedSlug || !normalizedToken) {
      return NextResponse.json({ error: 'Portal link is invalid.' }, { status: 400 });
    }

    const clinic = await getClinicBySlug(normalizedSlug);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found.' }, { status: 404 });
    }

    const access = await validatePatientToken(normalizedToken, clinic.id);
    if (!access) {
      return NextResponse.json({ error: 'Portal link expired or invalid.' }, { status: 401 });
    }

    const { data: patient, error: patientError } = await getClinicDb(clinic.id)
      .from('patients')
      .select('id, phone')
      .eq('id', access.patientId)
      .maybeSingle();

    if (patientError) {
      throw new Error(patientError.message);
    }
    if (!patient?.phone) {
      return NextResponse.json({ error: 'Patient phone is missing.' }, { status: 400 });
    }

    const sessionToken = createPatientSession({
      clinicId: clinic.id,
      slug: clinic.slug,
      phone: patient.phone as string,
      selectedPatientId: patient.id as string,
    });

    await auditLog(clinic.id, 'patient', 'patient_portal_magic_link_login', patient.id as string, {
      phone: patient.phone,
    });

    const response = NextResponse.json({
      success: true,
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
      { error: error instanceof Error ? error.message : 'Could not open portal link.' },
      { status: 500 }
    );
  }
}
