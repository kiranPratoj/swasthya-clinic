import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './db';
import type { UserRole } from './types';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/;
const TOKEN_TABLE = 'patient_access_tokens';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown patient token error.';
}

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return null;
}

function isTokenTableUnavailable(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes(`Could not find the table 'public.${TOKEN_TABLE}'`) ||
    message.includes(`relation "${TOKEN_TABLE}" does not exist`)
  );
}

function missingTokenTableError(): Error {
  return new Error(
    'Patient portal tokens are not configured yet. Apply the patient_access_tokens migration and refresh the database schema cache.'
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createRawPatientToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function revokePatientTokens(patientId: string, clinicId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getDb()
    .from(TOKEN_TABLE)
    .update({ revoked_at: now })
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .is('revoked_at', null);

  if (error) {
    if (isTokenTableUnavailable(error)) {
      throw missingTokenTableError();
    }
    throw new Error(getErrorMessage(error));
  }
}

export async function createPatientToken(
  patientId: string,
  clinicId: string,
  createdByRole: UserRole | 'system' = 'system'
): Promise<string> {
  await revokePatientTokens(patientId, clinicId);

  const rawToken = createRawPatientToken();
  const tokenHash = hashToken(rawToken);

  const { error } = await getDb().from(TOKEN_TABLE).insert({
    clinic_id: clinicId,
    patient_id: patientId,
    token_hash: tokenHash,
    created_by_role: createdByRole,
  });

  if (error) {
    if (isTokenTableUnavailable(error)) {
      throw missingTokenTableError();
    }
    throw new Error(getErrorMessage(error));
  }

  return rawToken;
}

export async function validatePatientToken(
  token: string,
  clinicId: string
): Promise<{ patientId: string; clinicId: string } | null> {
  const trimmedToken = token.trim();
  if (!TOKEN_PATTERN.test(trimmedToken)) {
    return null;
  }

  const tokenHash = hashToken(trimmedToken);
  const now = new Date().toISOString();
  const { data, error } = await getDb()
    .from(TOKEN_TABLE)
    .select('patient_id, clinic_id')
    .eq('token_hash', tokenHash)
    .eq('clinic_id', clinicId)
    .gt('expires_at', now)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    if (isTokenTableUnavailable(error)) {
      return null;
    }
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    return null;
  }

  await getDb()
    .from(TOKEN_TABLE)
    .update({ last_accessed_at: now })
    .eq('token_hash', tokenHash)
    .eq('clinic_id', clinicId);

  return {
    patientId: data.patient_id as string,
    clinicId: data.clinic_id as string,
  };
}
