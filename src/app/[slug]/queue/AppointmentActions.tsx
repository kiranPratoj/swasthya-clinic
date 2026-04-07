'use client';

import { useEffect, useState } from 'react';

type AppointmentActionType = 'confirmation' | 'reminder' | 'cancellation';

type AppointmentActionsProps = {
  appointmentId: string;
};

type SendResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};

const ACTION_OPTIONS: Array<{ value: AppointmentActionType; label: string }> = [
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'cancellation', label: 'Cancellation notice' },
];

export default function AppointmentActions({
  appointmentId,
}: AppointmentActionsProps) {
  const [selectedType, setSelectedType] = useState<AppointmentActionType>('confirmation');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (!isSent) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSent(false);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSent]);

  async function handleSend() {
    setIsSending(true);
    setSendError(null);
    setIsSent(false);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          appointmentId,
        }),
      });

      const payload = (await response.json()) as SendResponse;

      if (!payload.success) {
        setSendError(payload.error ?? 'Could not send WhatsApp message.');
        return;
      }

      setIsSent(true);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Could not send WhatsApp message.'
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
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
          gap: '0.6rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value as AppointmentActionType)}
          disabled={isSending}
          aria-label="Send WhatsApp"
          style={{
            minWidth: '12rem',
          }}
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Send WhatsApp: {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending}
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            background: isSent ? 'var(--color-accent)' : 'var(--color-primary)',
            color: 'white',
            fontWeight: 800,
            boxShadow: 'var(--shadow-sm)',
            opacity: isSending ? 0.75 : 1,
          }}
        >
          {isSending ? 'Sending...' : isSent ? 'Sent ✓' : 'Send'}
        </button>
      </div>

      {sendError && (
        <p
          style={{
            color: 'var(--color-error)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {sendError}
        </p>
      )}
    </div>
  );
}
