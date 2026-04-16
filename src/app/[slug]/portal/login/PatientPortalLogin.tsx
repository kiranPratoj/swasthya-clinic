'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPatientPortalBasePath } from '@/lib/patientPortalPath';

type Props = {
  slug: string;
  clinicName: string;
};

function normalizePhone(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

function normalizeOtp(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

export default function PatientPortalLogin({ slug, clinicName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const portalBasePath = getPatientPortalBasePath(pathname, slug);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    if (normalizePhone(phone).length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/patient-auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          phone: normalizePhone(phone),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Could not send code.');
        return;
      }

      setStep('otp');
      setMessage('Code sent on WhatsApp.');
    } catch {
      setError('Could not send code.');
    } finally {
      setPending(false);
    }
  }

  async function verifyOtp() {
    if (normalizeOtp(otp).length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/patient-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          phone: normalizePhone(phone),
          otp: normalizeOtp(otp),
        }),
      });
      const payload = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Could not verify code.');
        return;
      }

      router.replace(portalBasePath);
      router.refresh();
    } catch {
      setError('Could not verify code.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.4rem',
        display: 'grid',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Patient login</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
          Open your records from {clinicName} using your mobile number.
        </p>
      </div>

      <label style={{ display: 'grid', gap: '0.45rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Mobile number</span>
        <input
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          disabled={step === 'otp'}
          onChange={(event) => setPhone(normalizePhone(event.target.value))}
          placeholder="10-digit mobile number"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '0.9rem 1rem',
            fontSize: '1rem',
          }}
        />
      </label>

      {step === 'otp' && (
        <label style={{ display: 'grid', gap: '0.45rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>OTP</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(normalizeOtp(event.target.value))}
            placeholder="6-digit code"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '0.9rem 1rem',
              fontSize: '1rem',
              letterSpacing: '0.2em',
            }}
          />
        </label>
      )}

      {error && (
        <p style={{ margin: 0, color: 'var(--color-error)', fontWeight: 700, fontSize: '0.88rem' }}>
          {error}
        </p>
      )}
      {message && (
        <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 700, fontSize: '0.88rem' }}>
          {message}
        </p>
      )}

      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {step === 'phone' ? (
          <button
            type="button"
            onClick={requestOtp}
            disabled={pending}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '999px',
              background: 'var(--color-primary)',
              color: 'white',
              padding: '0.95rem 1rem',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: pending ? 'wait' : 'pointer',
            }}
          >
            {pending ? 'Sending code…' : 'Send code on WhatsApp'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={verifyOtp}
              disabled={pending}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: '999px',
                background: 'var(--color-primary)',
                color: 'white',
                padding: '0.95rem 1rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? 'Verifying…' : 'Continue to portal'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError(null);
                setMessage(null);
              }}
              style={{
                width: '100%',
                borderRadius: '999px',
                border: '1px solid var(--color-border)',
                background: 'white',
                color: 'var(--color-text)',
                padding: '0.9rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Change number
            </button>
          </>
        )}
      </div>
    </div>
  );
}
