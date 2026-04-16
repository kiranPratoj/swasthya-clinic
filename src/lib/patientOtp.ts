import { createHash, randomInt } from 'node:crypto';
import { getDb } from './db';

const OTP_TABLE = 'patient_login_otps';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function formatOtp(value: number): string {
  return value.toString().padStart(6, '0');
}

function getNowIso(): string {
  return new Date().toISOString();
}

function getFutureIso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function isOtpTableUnavailable(message: string): boolean {
  return (
    message.includes("Could not find the table 'public.patient_login_otps'") ||
    message.includes('relation "patient_login_otps" does not exist')
  );
}

async function getLatestOtpRow(clinicId: string, phone: string) {
  const { data, error } = await getDb()
    .from(OTP_TABLE)
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isOtpTableUnavailable(error.message)) {
      throw new Error(
        'Patient OTPs are not configured yet. Apply the patient_login_otps migration and refresh the database schema cache.'
      );
    }
    throw new Error(error.message);
  }

  return data;
}

export function createRawOtp(): string {
  return formatOtp(randomInt(0, 1000000));
}

export async function requestPatientOtp(input: {
  clinicId: string;
  phone: string;
  channel?: 'whatsapp';
}): Promise<{ otp: string }> {
  const clinicId = input.clinicId.trim();
  const phone = input.phone.trim();
  const latest = await getLatestOtpRow(clinicId, phone);
  const now = Date.now();

  if (latest?.last_sent_at) {
    const lastSentAt = new Date(latest.last_sent_at as string).getTime();
    if (Number.isFinite(lastSentAt) && now - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000)
      );
      throw new Error(`Please wait ${retryAfterSeconds}s before requesting another code.`);
    }
  }

  const nowIso = getNowIso();
  await getDb()
    .from(OTP_TABLE)
    .update({ consumed_at: nowIso })
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .is('consumed_at', null);

  const otp = createRawOtp();
  const { error } = await getDb().from(OTP_TABLE).insert({
    clinic_id: clinicId,
    phone,
    otp_hash: hashOtp(otp),
    channel: input.channel ?? 'whatsapp',
    expires_at: getFutureIso(OTP_TTL_MS),
    last_sent_at: nowIso,
  });

  if (error) {
    if (isOtpTableUnavailable(error.message)) {
      throw new Error(
        'Patient OTPs are not configured yet. Apply the patient_login_otps migration and refresh the database schema cache.'
      );
    }
    throw new Error(error.message);
  }

  return { otp };
}

export async function verifyPatientOtp(input: {
  clinicId: string;
  phone: string;
  otp: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const clinicId = input.clinicId.trim();
  const phone = input.phone.trim();
  const otp = input.otp.trim();
  const latest = await getLatestOtpRow(clinicId, phone);

  if (!latest || latest.consumed_at) {
    return { ok: false, error: 'Code expired. Request a new one.' };
  }

  const expiresAt = new Date(latest.expires_at as string).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await getDb()
      .from(OTP_TABLE)
      .update({ consumed_at: getNowIso() })
      .eq('id', latest.id as string);
    return { ok: false, error: 'Code expired. Request a new one.' };
  }

  const attemptCount = Number(latest.attempt_count ?? 0);
  if (attemptCount >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Request a new code.' };
  }

  if (latest.otp_hash !== hashOtp(otp)) {
    await getDb()
      .from(OTP_TABLE)
      .update({ attempt_count: attemptCount + 1 })
      .eq('id', latest.id as string);
    return { ok: false, error: 'Incorrect code.' };
  }

  const { error } = await getDb()
    .from(OTP_TABLE)
    .update({
      consumed_at: getNowIso(),
      attempt_count: attemptCount + 1,
    })
    .eq('id', latest.id as string);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}
