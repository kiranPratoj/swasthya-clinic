import { getClinicDb, getDb } from './db';
import type {
  Appointment,
  Patient,
  PatientPortalProfile,
  PatientReport,
  VisitHistory,
} from './types';

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '').slice(-10);
}

export async function getClinicBySlug(slug: string): Promise<{
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
} | null> {
  const { data, error } = await getDb()
    .from('clinics')
    .select('id, slug, name, custom_domain')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data
    ? {
        id: data.id as string,
        slug: data.slug as string,
        name: data.name as string,
        custom_domain: (data.custom_domain as string | null) ?? null,
      }
    : null;
}

export async function getPatientsByPhone(
  clinicId: string,
  phone: string
): Promise<PatientPortalProfile[]> {
  const db = getClinicDb(clinicId);
  const normalizedPhone = normalizePhone(phone);
  const { data: patients, error } = await db
    .from('patients')
    .select('id, name, age, phone, created_at')
    .eq('phone', normalizedPhone)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!patients || patients.length === 0) {
    return [];
  }

  const profiles = await Promise.all(
    patients.map(async (patient) => {
      const { data: lastVisit } = await db
        .from('visit_history')
        .select('created_at')
        .eq('patient_id', patient.id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: patient.id as string,
        name: patient.name as string,
        age: (patient.age as number | null) ?? null,
        phone: (patient.phone as string | null) ?? null,
        lastVisit: (lastVisit?.created_at as string | null) ?? null,
      } satisfies PatientPortalProfile;
    })
  );

  return profiles;
}

export async function getPortalProfileData(
  clinicId: string,
  patientId: string
): Promise<{
  patient: Patient;
  appointments: Appointment[];
  visitHistory: VisitHistory[];
} | null> {
  const db = getClinicDb(clinicId);
  const { data: patient, error: patientError } = await db
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message);
  }
  if (!patient) {
    return null;
  }

  const [appointmentsResult, historyResult] = await Promise.all([
    db
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('booked_for', { ascending: false }),
    db
      .from('visit_history')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
  ]);

  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }
  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message);
  }

  return {
    patient: patient as Patient,
    appointments: (appointmentsResult.data ?? []) as Appointment[],
    visitHistory: (historyResult.data ?? []) as VisitHistory[],
  };
}

export async function getPortalReports(
  clinicId: string,
  patientId: string
): Promise<PatientReport[]> {
  const db = getClinicDb(clinicId);
  const { data, error } = await db
    .from('patient_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  const storageDb = getDb();
  const reports: PatientReport[] = await Promise.all(
    data.map(async (row) => {
      const { data: urlData } = await storageDb.storage
        .from('clinic-reports')
        .createSignedUrl(row.file_path as string, 86400); // 24h — covers a full clinic day

      return {
        ...(row as Omit<PatientReport, 'signedUrl'>),
        signedUrl: urlData?.signedUrl ?? '',
      };
    })
  );

  return reports;
}
