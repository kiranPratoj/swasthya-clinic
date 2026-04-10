'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelAppointment, markNoShow, rescheduleAppointment } from '@/app/actions';
import type { AppointmentStatus } from '@/lib/types';

type Props = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  patientName: string;
};

type Mode = 'idle' | 'cancel' | 'reschedule';

export default function AppointmentActionsMenu({
  appointmentId,
  currentStatus,
  patientName,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setMode('idle');
        setError(null);
      }
    }

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  async function runAction(action: () => Promise<void>) {
    setIsLoading(true);
    setError(null);

    try {
      await action();
      setIsOpen(false);
      setMode('idle');
      setReason('');
      setNewDate('');
      router.refresh();
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error && actionError.message.trim()
          ? actionError.message
          : `Could not update ${patientName}'s appointment.`
      );
    } finally {
      setIsLoading(false);
    }
  }

  const actionBtn: React.CSSProperties = {
    flex: 1, padding: '0.6rem 0.875rem', border: 'none',
    borderRadius: 'var(--radius-md)', color: 'white',
    fontWeight: 700, fontSize: '0.875rem', opacity: isLoading ? 0.6 : 1,
  };
  const ghostBtn: React.CSSProperties = {
    flex: 1, padding: '0.6rem 0.875rem',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'white', color: 'var(--color-text)',
    fontWeight: 700, fontSize: '0.875rem',
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', justifySelf: 'end' }}>
      <button
        type="button"
        disabled={isLoading || currentStatus === 'completed'}
        onClick={() => {
          setIsOpen((open) => !open);
          setMode('idle');
          setError(null);
        }}
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'white',
          color: 'var(--color-text)',
          padding: '0.55rem 0.8rem',
          fontSize: '1rem',
          fontWeight: 800,
          minWidth: '3rem',
        }}
        aria-label={`More actions for ${patientName}`}
      >
        ⋯
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.45rem)',
            width: '17rem',
            padding: '0.9rem',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            display: 'grid',
            gap: '0.75rem',
            zIndex: 20,
          }}
        >
          {mode === 'idle' && (
            <>
              {[
                { label: 'Cancel appointment', color: 'var(--color-error)', bg: 'var(--color-error-bg)', onClick: () => setMode('cancel') },
                { label: 'Mark as no-show',    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', onClick: () => void runAction(() => markNoShow(appointmentId)) },
                { label: 'Reschedule',         color: 'var(--color-primary)', bg: 'var(--color-primary-soft)', onClick: () => setMode('reschedule') },
              ].map(({ label, color, bg, onClick }) => (
                <button
                  key={label}
                  type="button"
                  disabled={isLoading}
                  onClick={onClick}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.65rem 0.875rem',
                    borderRadius: 'var(--radius-md)', border: 'none',
                    background: bg, color, fontWeight: 700, fontSize: '0.875rem',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          )}

          {mode === 'cancel' && (
            <>
              <p style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Cancel for {patientName}?
              </p>
              <input
                type="text"
                value={reason}
                disabled={isLoading}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason (optional)"
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" disabled={isLoading} onClick={() => setMode('idle')} style={ghostBtn}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void runAction(() => cancelAppointment(appointmentId, reason))}
                  style={{ ...actionBtn, background: '#dc2626' }}
                >
                  {isLoading ? 'Saving...' : 'Confirm cancel'}
                </button>
              </div>
            </>
          )}

          {mode === 'reschedule' && (
            <>
              <p style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Reschedule for {patientName}
              </p>
              <input type="date" value={newDate} disabled={isLoading} onChange={(event) => setNewDate(event.target.value)} />
              <input
                type="text"
                value={reason}
                disabled={isLoading}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason (optional)"
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" disabled={isLoading} onClick={() => setMode('idle')} style={ghostBtn}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (!newDate) { setError('Choose a new date.'); return; }
                    void runAction(() => rescheduleAppointment(appointmentId, newDate, reason).then(() => undefined));
                  }}
                  style={{ ...actionBtn, background: 'var(--color-primary)' }}
                >
                  {isLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </>
          )}

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.88rem', fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
