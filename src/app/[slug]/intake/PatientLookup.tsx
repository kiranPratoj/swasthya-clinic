'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPatientHistory } from '@/app/actions';
import type { Appointment, AppointmentStatus } from '@/lib/types';

type PatientLookupProps = {
  onPatientFound: (data: { name: string; phone: string; age: string }) => void;
};

type LookupState = {
  phone: string;
  history: Appointment[];
  patientName: string;
  patientAge: string;
};

const INITIAL_STATE: LookupState = {
  phone: '',
  history: [],
  patientName: '',
  patientAge: '',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatVisitType(value: Appointment['visit_type']): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getStatusColors(status: AppointmentStatus): { background: string; color: string } {
  if (status === 'in_progress') {
    return {
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
    };
  }

  if (status === 'completed') {
    return {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
    };
  }

  if (status === 'cancelled' || status === 'no_show') {
    return {
      background: 'var(--color-error-bg)',
      color: 'var(--color-error)',
    };
  }

  return {
    background: 'var(--color-primary-soft)',
    color: 'var(--color-primary)',
  };
}

function getPulseStyle(isLoading: boolean, pulsePhase: boolean): { borderColor: string; boxShadow: string } {
  if (!isLoading) {
    return {
      borderColor: 'var(--color-border)',
      boxShadow: 'none',
    };
  }

  return {
    borderColor: pulsePhase ? 'var(--color-primary)' : 'var(--color-primary-outline)',
    boxShadow: pulsePhase ? '0 0 0 2px rgba(3, 78, 162, 0.15)' : '0 0 0 1px rgba(3, 78, 162, 0.08)',
  };
}

export default function PatientLookup({ onPatientFound }: PatientLookupProps) {
  const [lookupPhone, setLookupPhone] = useState('');
  const [result, setResult] = useState<LookupState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(false);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPulsePhase((current) => !current);
    }, 450);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading]);

  useEffect(() => {
    const normalizedPhone = lookupPhone.replace(/\D/g, '').slice(0, 10);

    if (normalizedPhone.length !== 10) {
      return;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      void getPatientHistory(normalizedPhone)
        .then((history) => {
          if (latestRequestRef.current !== requestId) {
            return;
          }

          if (history.length === 0) {
            setResult(INITIAL_STATE);
            return;
          }

          const firstPatient = history.find((entry) => entry.patient)?.patient;
          setResult({
            phone: normalizedPhone,
            history: history.slice(0, 3),
            patientName: firstPatient?.name ?? '',
            patientAge:
              typeof firstPatient?.age === 'number' ? String(firstPatient.age) : '',
          });
        })
        .catch(() => {
          if (latestRequestRef.current === requestId) {
            setResult(INITIAL_STATE);
          }
        })
        .finally(() => {
          if (latestRequestRef.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lookupPhone]);

  const pulseStyle = useMemo(
    () => getPulseStyle(isLoading, pulsePhase),
    [isLoading, pulsePhase]
  );

  const hasHistory = result.history.length > 0;

  return (
    <section
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1rem',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
          Patient Lookup
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
          Enter a 10-digit phone number to check if this patient has visited before.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '0.45rem' }}>
        <label htmlFor="patientLookupPhone" style={{ fontWeight: 700 }}>
          Phone Number
        </label>
        <input
          id="patientLookupPhone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={lookupPhone}
          onChange={(event) => {
            const nextPhone = event.target.value.replace(/\D/g, '').slice(0, 10);
            setLookupPhone(nextPhone);

            if (nextPhone.length !== 10) {
              latestRequestRef.current += 1;
              setIsLoading(false);
              setResult(INITIAL_STATE);
            }
          }}
          placeholder="Type 10-digit number"
          style={{
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${pulseStyle.borderColor}`,
            boxShadow: pulseStyle.boxShadow,
            transition: 'border-color 180ms ease, box-shadow 180ms ease',
          }}
        />
      </div>

      {hasHistory && (
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '1rem',
            display: 'grid',
            gap: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.3rem' }}>
              <p
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                }}
              >
                Returning Patient
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {result.patientName || 'Known patient record'}
                </h4>
                {result.patientAge && (
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    Age {result.patientAge}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {result.phone}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onPatientFound({
                  name: result.patientName,
                  phone: result.phone,
                  age: result.patientAge,
                })
              }
              style={{
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)',
                color: 'white',
                padding: '0.8rem 1rem',
                fontWeight: 800,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Use this patient
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {result.history.map((visit) => {
              const statusColors = getStatusColors(visit.status);
              return (
                <div
                  key={visit.id}
                  style={{
                    display: 'grid',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-bg)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {formatDate(visit.booked_for || visit.created_at)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '999px',
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                        }}
                      >
                        {formatVisitType(visit.visit_type)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '999px',
                          background: statusColors.background,
                          color: statusColors.color,
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          textTransform: 'capitalize',
                        }}
                      >
                        {visit.status}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
                    {visit.complaint}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
