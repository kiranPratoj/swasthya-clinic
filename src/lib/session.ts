// Stateless session using HMAC-signed cookies (no new packages)
// Uses built-in Node.js crypto — compatible with Next.js 16 proxy (Node runtime)

import { createHmac } from 'crypto';
import type { PatientSessionPayload, SessionPayload } from './types';

const SECRET = process.env.SESSION_SECRET ?? 'swasthya-dev-secret-change-in-prod';
const COOKIE_NAME = 'swasthya_session';
const PATIENT_COOKIE_NAME = 'medilite_patient_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const PATIENT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function createSession(data: Omit<SessionPayload, 'exp'>): string {
  const payload: SessionPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    if (sign(encoded) !== sig) return null;

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createPatientSession(data: Omit<PatientSessionPayload, 'exp' | 'kind'>): string {
  const payload: PatientSessionPayload = {
    ...data,
    kind: 'patient',
    exp: Math.floor(Date.now() / 1000) + PATIENT_SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifyPatientSession(token: string): PatientSessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    if (sign(encoded) !== sig) return null;

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as PatientSessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.kind !== 'patient') return null;
    if (!payload.clinicId || !payload.slug || !payload.phone) return null;

    return payload;
  } catch {
    return null;
  }
}

export {
  COOKIE_NAME,
  PATIENT_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  PATIENT_SESSION_TTL_SECONDS,
};
