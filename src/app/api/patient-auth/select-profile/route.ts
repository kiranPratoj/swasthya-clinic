import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/db';
import { getPatientsByPhone } from '@/lib/patientPortal';
import {
  createPatientSession,
  PATIENT_COOKIE_NAME,
  PATIENT_SESSION_TTL_SECONDS,
  verifyPatientSession,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(PATIENT_COOKIE_NAME)?.value;
    const session = sessionToken ? verifyPatientSession(sessionToken) : null;
    if (!session) {
      return NextResponse.json({ error: 'Session expired. Log in again.' }, { status: 401 });
    }

    const { patientId } = (await request.json()) as { patientId?: string };
    const normalizedPatientId = patientId?.trim();
    if (!normalizedPatientId) {
      return NextResponse.json({ error: 'Patient selection is required.' }, { status: 400 });
    }

    const profiles = await getPatientsByPhone(session.clinicId, session.phone);
    const selectedProfile = profiles.find((profile) => profile.id === normalizedPatientId);
    if (!selectedProfile) {
      return NextResponse.json({ error: 'Selected patient does not match this login.' }, { status: 403 });
    }

    const nextToken = createPatientSession({
      clinicId: session.clinicId,
      slug: session.slug,
      phone: session.phone,
      selectedPatientId: normalizedPatientId,
    });

    await auditLog(session.clinicId, 'patient', 'patient_profile_selected', normalizedPatientId, {
      phone: session.phone,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: `/${session.slug}/portal`,
    });
    response.cookies.set(PATIENT_COOKIE_NAME, nextToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: PATIENT_SESSION_TTL_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not select patient.' },
      { status: 500 }
    );
  }
}
