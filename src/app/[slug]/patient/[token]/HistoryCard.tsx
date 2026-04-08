'use client';
import { useState } from 'react';

interface Props {
  date: string;
  diagnosis: string;
}

export default function HistoryCard({ date, diagnosis }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');

  async function handleListen() {
    if (status === 'loading' || status === 'playing') return;
    setStatus('loading');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: diagnosis, language: 'kn-IN' }),
      });

      if (!res.ok) {
        setStatus('error');
        return;
      }

      const { audioBase64 } = await res.json() as { audioBase64: string };
      if (!audioBase64) {
        setStatus('error');
        return;
      }

      // Convert base64 WAV to blob URL
      const byteChars = atob(audioBase64);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      setStatus('playing');
      audio.onended = () => {
        setStatus('idle');
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setStatus('error');
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setStatus('error');
    }
  }

  const buttonLabel = status === 'loading' ? 'Loading…' : status === 'playing' ? 'Playing…' : status === 'error' ? 'Retry' : 'Listen';
  const buttonColor = status === 'error' ? '#ef4444' : 'var(--color-primary)';

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
          {date}
        </p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {diagnosis}
        </p>
      </div>
      <button
        type="button"
        onClick={handleListen}
        disabled={status === 'loading' || status === 'playing'}
        style={{
          flexShrink: 0,
          padding: '0.5rem 0.875rem',
          background: buttonColor,
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: '0.8125rem',
          cursor: status === 'loading' || status === 'playing' ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' || status === 'playing' ? 0.7 : 1,
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
