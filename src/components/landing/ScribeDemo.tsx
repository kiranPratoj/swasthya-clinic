'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

type ScribeState = 'idle' | 'listening' | 'processing' | 'structured';

const NOTES = [
  { label: 'Chief Complaint', value: 'Chest congestion, dry cough · 3 days' },
  { label: 'Assessment', value: 'Acute bronchitis (suspected)' },
  { label: 'Plan', value: 'Amoxicillin 500 mg × 5 days · review in 3 days if not improving' },
];

export default function ScribeDemo() {
  const [state, setState] = useState<ScribeState>('idle');

  function startRecording() {
    if (state === 'listening' || state === 'processing') return;
    setState('listening');
    setTimeout(() => setState('processing'), 3200);
    setTimeout(() => setState('structured'), 4800);
  }

  function reset() {
    setState('idle');
  }

  return (
    <div
      style={{
        background: '#0F172A',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1.75rem',
        overflow: 'hidden',
        maxWidth: '24rem',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.9rem 1.1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>AI Voice Scribe</span>
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#93c5fd',
            background: 'rgba(30,58,138,0.5)',
            padding: '3px 10px',
            borderRadius: '999px',
          }}
        >
          Sarvam AI
        </span>
      </div>

      {/* Main content area */}
      <div
        style={{
          padding: '1.5rem',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Press the mic and speak naturally.
            </div>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>
              Hindi · English · Kannada
            </div>
          </div>
        )}

        {state === 'listening' && (
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#f87171',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <span style={{ animation: 'lp-pulse 0.9s ease-in-out infinite' }}>●</span>
              Recording…
            </div>
            <div className="lp-waveform">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="lp-waveform-bar"
                  style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
                />
              ))}
            </div>
            <div
              style={{
                color: '#64748B',
                fontSize: '0.78rem',
                textAlign: 'center',
                marginTop: '1rem',
                fontStyle: 'italic',
              }}
            >
              &ldquo;Ravi Kumar, chest congestion, three days, no fever…&rdquo;
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#93c5fd', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Processing with AI…
            </div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#93c5fd',
                    animation: `lp-pulse 0.9s ${d}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {state === 'structured' && (
          <div style={{ width: '100%', display: 'grid', gap: '0.55rem' }}>
            {NOTES.map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '0.75rem',
                  padding: '0.6rem 0.85rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#64748B',
                    marginBottom: '0.2rem',
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: '0.83rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>
                  {value}
                </div>
              </div>
            ))}
            <div style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'right', marginTop: '0.1rem' }}>
              Draft ready · review before saving
            </div>
          </div>
        )}
      </div>

      {/* Mic button row */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <button
          onClick={state === 'structured' ? reset : startRecording}
          disabled={state === 'listening' || state === 'processing'}
          aria-label={state === 'structured' ? 'Start new recording' : 'Start recording'}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background:
              state === 'listening' ? '#ef4444' : state === 'processing' ? '#1e293b' : '#2563EB',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: state === 'listening' || state === 'processing' ? 'not-allowed' : 'pointer',
            boxShadow:
              state === 'listening'
                ? '0 0 0 8px rgba(239,68,68,0.2)'
                : '0 4px 16px rgba(37,99,235,0.4)',
            transition: 'background 300ms, box-shadow 300ms',
            fontFamily: 'inherit',
          }}
        >
          {state === 'listening' ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
        </button>
        {state === 'structured' && (
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
            Tap mic to start over
          </span>
        )}
        {state === 'idle' && (
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
            Tap to record
          </span>
        )}
      </div>
    </div>
  );
}
