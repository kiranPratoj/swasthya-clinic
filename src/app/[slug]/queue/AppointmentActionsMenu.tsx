'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelAppointment, markNoShow, rescheduleAppointment, updateAppointmentPayment } from '@/app/actions';
import type { AppointmentStatus, UserRole } from '@/lib/types';

type Props = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  paymentMode: 'cash' | 'upi' | null | undefined;
  paymentStatus: 'pending' | 'verified' | 'failed';
  patientName: string;
  role: UserRole;
};

type Mode = 'idle' | 'cancel' | 'reschedule' | 'payment';

export default function AppointmentActionsMenu({
  appointmentId,
  currentStatus,
  paymentMode,
  paymentStatus,
  patientName,
  role,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [nextPaymentMode, setNextPaymentMode] = useState<'cash' | 'upi'>(paymentMode ?? 'cash');
  const [nextPaymentState, setNextPaymentState] = useState<'pending' | 'paid'>(
    paymentStatus === 'verified' ? 'paid' : 'pending'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManagePayment = role === 'receptionist' || role === 'admin';

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
      setNextPaymentMode(paymentMode ?? 'cash');
      setNextPaymentState(paymentStatus === 'verified' ? 'paid' : 'pending');
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
        disabled={isLoading || (currentStatus === 'completed' && !canManagePayment)}
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
              {canManagePayment && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setNextPaymentMode(paymentMode ?? 'cash');
                    setNextPaymentState(paymentStatus === 'verified' ? 'paid' : 'pending');
                    setMode('payment');
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.65rem 0.875rem',
                    borderRadius: 'var(--radius-md)', border: 'none',
                    background: 'var(--color-success-bg)', color: 'var(--color-success)',
                    fontWeight: 700, fontSize: '0.875rem',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  Update payment
                </button>
              )}
              {currentStatus !== 'completed' && [
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

          {mode === 'payment' && (
            <>
              <p style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Update payment for {patientName}
              </p>
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Mode</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['cash', 'upi'] as const).map((modeOption) => (
                    <button
                      key={modeOption}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setNextPaymentMode(modeOption)}
                      style={{
                        ...ghostBtn,
                        flex: 1,
                        border: nextPaymentMode === modeOption ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        color: nextPaymentMode === modeOption ? 'var(--color-primary)' : 'var(--color-text)',
                        background: nextPaymentMode === modeOption ? 'var(--color-primary-soft)' : 'white',
                      }}
                    >
                      {modeOption === 'cash' ? 'Cash' : 'UPI'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Status</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['pending', 'paid'] as const).map((stateOption) => (
                    <button
                      key={stateOption}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setNextPaymentState(stateOption)}
                      style={{
                        ...ghostBtn,
                        flex: 1,
                        border: nextPaymentState === stateOption ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        color: nextPaymentState === stateOption ? 'var(--color-primary)' : 'var(--color-text)',
                        background: nextPaymentState === stateOption ? 'var(--color-primary-soft)' : 'white',
                      }}
                    >
                      {stateOption === 'paid' ? 'Paid' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" disabled={isLoading} onClick={() => setMode('idle')} style={ghostBtn}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void runAction(async () => {
                      await updateAppointmentPayment(appointmentId, nextPaymentMode, nextPaymentState);
                    })
                  }
                  style={{ ...actionBtn, background: 'var(--color-primary)' }}
                >
                  {isLoading ? 'Saving...' : 'Save payment'}
                </button>
              </div>
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
