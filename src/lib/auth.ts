import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  COOKIE_NAME,
  PATIENT_COOKIE_NAME,
  verifyPatientSession,
  verifySession,
} from './session';
import type { PatientSessionPayload, SessionPayload, UserRole } from './types';

export async function getSessionOrNull(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSessionOrNull();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function getPatientSessionOrNull(): Promise<PatientSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PATIENT_COOKIE_NAME)?.value;
  return token ? verifyPatientSession(token) : null;
}

export async function requirePatientSession(expectedSlug?: string): Promise<PatientSessionPayload> {
  const session = await getPatientSessionOrNull();
  if (!session) {
    redirect(expectedSlug ? `/${expectedSlug}/portal/login` : '/');
  }

  const requestHeaders = await headers();
  const clinicId = requestHeaders.get('x-clinic-id');
  if (clinicId && session.clinicId !== clinicId) {
    redirect(expectedSlug ? `/${expectedSlug}/portal/login` : '/');
  }

  if (expectedSlug && session.slug !== expectedSlug) {
    redirect(`/${expectedSlug}/portal/login`);
  }

  return session;
}

export async function verifyRole(
  allowedRoles: UserRole[],
  expectedSlug?: string
): Promise<SessionPayload> {
  const session = await requireSession();
  const requestHeaders = await headers();
  const clinicId = requestHeaders.get('x-clinic-id');

  if (clinicId && session.clinicId !== clinicId) {
    redirect('/login');
  }

  if (expectedSlug && session.slug !== expectedSlug) {
    redirect('/login');
  }

  if (!allowedRoles.includes(session.role)) {
    redirect(`/${expectedSlug ?? session.slug}/queue?forbidden=1`);
  }

  return session;
}
