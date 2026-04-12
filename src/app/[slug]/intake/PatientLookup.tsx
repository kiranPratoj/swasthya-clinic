'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPatientHistoryById, searchPatientsByPhone } from '@/app/actions';
import type { Appointment, AppointmentStatus } from '@/lib/types';

type PatientLookupProps = {
  onPatientFound: (data: { id: string; name: string; phone: string; age: string } | null) => void;
  onCreateNewPatient: (phone: string, options?: { allowSharedMobile?: boolean }) => void;
};

type PatientSearchResult = {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  visitCount: number;
  lastVisit: string | null;
  activeToken: number | null;
};

type LookupState = {
  patientId: string;
  phone: string;
  history: Appointment[];
  patientName: string;
  patientAge: string;
};

const INITIAL_STATE: LookupState = {
  patientId: '',
  phone: '',
  history: [],
  patientName: '',
  patientAge: '',
};

function formatDate(value: string): string {
  const date = new Date(value);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()] ?? '';
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
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

function getPulseStyle(isLoading: boolean, pulsePhase: boolean): {
  borderColor: string;
  boxShadow: string;
} {
  if (!isLoading) {
    return {
      borderColor: 'var(--color-border)',
      boxShadow: 'none',
    };
  }

  return {
    borderColor: pulsePhase ? 'var(--color-primary)' : 'var(--color-primary-outline)',
    boxShadow: pulsePhase
      ? '0 0 0 2px rgba(3, 78, 162, 0.15)'
      : '0 0 0 1px rgba(3, 78, 162, 0.08)',
  };
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PatientLookup({
  onPatientFound,
  onCreateNewPatient,
}: PatientLookupProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [result, setResult] = useState<LookupState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(false);
  const [searchedPhone, setSearchedPhone] = useState('');
  const latestRequestRef = useRef(0);
  const autoAdvancePhoneRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

    if (normalizedPhone.length < 3) {
      latestRequestRef.current += 1;
      setIsLoading(false);
      setSearchedPhone('');
      setSearchResults([]);
      setResult(INITIAL_STATE);
      autoAdvancePhoneRef.current = null;
      onPatientFound(null);
      return;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      void searchPatientsByPhone(normalizedPhone)
        .then((patients) => {
          if (latestRequestRef.current !== requestId) {
            return;
          }

          setSearchedPhone(normalizedPhone);
          setSearchResults(patients);

          if (patients.length === 0) {
            setResult(INITIAL_STATE);
            onPatientFound(null);

            if (normalizedPhone.length === 10 && autoAdvancePhoneRef.current !== normalizedPhone) {
              autoAdvancePhoneRef.current = normalizedPhone;
              onCreateNewPatient(normalizedPhone);
            }
            return;
          }

          autoAdvancePhoneRef.current = null;
        })
        .catch(() => {
          if (latestRequestRef.current === requestId) {
            setSearchResults([]);
            setResult(INITIAL_STATE);
            autoAdvancePhoneRef.current = null;
            onPatientFound(null);
          }
        })
        .finally(() => {
          if (latestRequestRef.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lookupPhone, onCreateNewPatient, onPatientFound]);

  const pulseStyle = useMemo(
    () => getPulseStyle(isLoading, pulsePhase),
    [isLoading, pulsePhase]
  );

  const hasHistory = isMounted && result.history.length > 0;
  const exactPhoneMatches =
    isMounted && searchedPhone.length === 10
      ? searchResults.filter((match) => match.phone === searchedPhone)
      : [];
  const hasExactPhoneMatch = exactPhoneMatches.length > 0;

  async function handleSelectPatient(match: PatientSearchResult) {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setIsLoading(true);
    setSearchResults((current) => current);

    try {
      const history = await getPatientHistoryById(match.id);
      if (latestRequestRef.current !== requestId) {
        return;
      }

      const selectedPatient =
        history.find((entry) => entry.patient?.id === match.id)?.patient ??
        history.find((entry) => entry.patient)?.patient;

      const ageValue =
        typeof selectedPatient?.age === 'number'
          ? String(selectedPatient.age)
          : match.age !== null
            ? String(match.age)
            : '';

      setResult({
        patientId: match.id,
        phone: match.phone,
        history: history.slice(0, 3),
        patientName: selectedPatient?.name ?? match.name,
        patientAge: ageValue,
      });

      onPatientFound({
        id: match.id,
        name: selectedPatient?.name ?? match.name,
        phone: match.phone,
        age: ageValue,
      });
    } catch {
      if (latestRequestRef.current !== requestId) {
        return;
      }

      const ageValue = match.age !== null ? String(match.age) : '';
      setResult({
        patientId: match.id,
        phone: match.phone,
        history: [],
        patientName: match.name,
        patientAge: ageValue,
      });

      onPatientFound({
        id: match.id,
        name: match.name,
        phone: match.phone,
        age: ageValue,
      });
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }

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

            if (nextPhone.length < 3) {
              latestRequestRef.current += 1;
              setIsLoading(false);
              setSearchedPhone('');
              setSearchResults([]);
              setResult(INITIAL_STATE);
              autoAdvancePhoneRef.current = null;
              onPatientFound(null);
            }
          }}
          placeholder="Type mobile number"
          style={{
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${pulseStyle.borderColor}`,
            boxShadow: pulseStyle.boxShadow,
            transition: 'border-color 180ms ease, box-shadow 180ms ease',
          }}
        />

        {hasExactPhoneMatch && (
          <button
            type="button"
            onClick={() => onCreateNewPatient(searchedPhone, { allowSharedMobile: true })}
            style={{
              border: '1px solid var(--color-primary-outline)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              padding: '0.8rem 1rem',
              fontWeight: 800,
              justifySelf: 'start',
            }}
          >
            Create another patient with same mobile
          </button>
        )}
      </div>

      {isMounted && !hasHistory && searchResults.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '0.75rem',
            display: 'grid',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {searchResults.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => void handleSelectPatient(match)}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background:
                  result.patientId === match.id ? 'var(--color-primary-soft)' : 'white',
                padding: '0.9rem 1rem',
                textAlign: 'left',
                display: 'grid',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'grid', gap: '0.35rem', minWidth: 0 }}>
                  <strong style={{ fontSize: '1rem' }}>{match.name}</strong>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {match.age !== null && <span>Age {match.age}</span>}
                    <span>{match.visitCount} visits</span>
                    {match.lastVisit && <span>Last {formatDate(match.lastVisit)}</span>}
                    {match.activeToken !== null && (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>
                        Token #{match.activeToken} active
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {match.phone}
                  </span>
                  <span
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '999px',
                      border: '1px solid var(--color-primary-outline)',
                      background: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowRightIcon />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isMounted && hasHistory && (
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
                Existing Patient
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
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
                  id: result.patientId,
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

          {result.phone && (
            <button
              type="button"
              onClick={() => onCreateNewPatient(result.phone, { allowSharedMobile: true })}
              style={{
                border: '1px solid var(--color-primary-outline)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                padding: '0.8rem 1rem',
                fontWeight: 800,
                justifySelf: 'start',
              }}
            >
              Create another patient with same mobile
            </button>
          )}

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

      {!isLoading &&
        !hasHistory &&
        searchedPhone.length >= 3 &&
        searchedPhone === lookupPhone &&
        searchResults.length === 0 && (
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
            <div style={{ display: 'grid', gap: '0.3rem' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                No Match Found
              </p>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                No patient found for {searchedPhone}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onCreateNewPatient(searchedPhone)}
              style={{
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)',
                color: 'white',
                padding: '0.8rem 1rem',
                fontWeight: 800,
                boxShadow: 'var(--shadow-sm)',
                justifySelf: 'start',
              }}
            >
              Create New Patient
            </button>
          </div>
        )}
    </section>
  );
}
