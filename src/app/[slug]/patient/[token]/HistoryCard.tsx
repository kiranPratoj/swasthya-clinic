'use client';
import { useState } from 'react';

interface Props {
  date: string;
  summary: string;
}

export default function HistoryCard({ date, summary }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');

  // Simple parsing logic for summary
  // Summary might be JSON or structured string
  let diagnosis = 'Click to view';
  let prescription = '';
  let fullTextForTts = summary;

  try {
    const parsed = JSON.parse(summary);
    if (parsed.diagnosis) {
      diagnosis = parsed.diagnosis;
      prescription = parsed.prescription?.map((p: any) => `${p.drug}: ${p.dose} (${p.frequency})`).join('\n') || '';
      fullTextForTts = `Diagnosis is ${diagnosis}. Prescription is ${prescription || 'none'}`;
    }
  } catch {
    // Fallback: search for "Diagnosis:" and "Prescription:" labels
    const diagMatch = summary.match(/Diagnosis:\s*(.*)/i);
    const presMatch = summary.match(/Prescription:\s*([\s\S]*)/i);
    
    if (diagMatch) diagnosis = diagMatch[1].split('\n')[0].trim();
    if (presMatch) prescription = presMatch[1].trim();
  }

  async function handleListen(e: React.MouseEvent) {
    e.stopPropagation();
    if (ttsStatus === 'loading' || ttsStatus === 'playing') return;
    setTtsStatus('loading');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullTextForTts }),
      });

      if (!res.ok) {
        setTtsStatus('error');
        return;
      }

      const { audioBase64 } = await res.json() as { audioBase64: string };
      if (!audioBase64) {
        setTtsStatus('error');
        return;
      }

      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
      setTtsStatus('playing');
      audio.onended = () => setTtsStatus('idle');
      audio.onerror = () => setTtsStatus('error');
      await audio.play();
    } catch {
      setTtsStatus('error');
    }
  }

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
    >
      <div style={{
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
          <p style={{ 
            fontSize: '0.95rem', 
            fontWeight: 800, 
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: isExpanded ? 'initial' : 'ellipsis',
            whiteSpace: isExpanded ? 'normal' : 'nowrap'
          }}>
            {diagnosis}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {ttsStatus === 'error' ? (
            <span style={{
              padding: '0.4rem 0.7rem',
              color: 'var(--color-error)',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              Audio unavailable
            </span>
          ) : (
            <button
              type="button"
              onClick={handleListen}
              disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
              style={{
                padding: '0.4rem 0.7rem',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 800,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap'
              }}
            >
              {ttsStatus === 'loading' ? '...' : ttsStatus === 'playing' ? '🔊' : '🔊 Listen'}
            </button>
          )}
          <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div style={{ 
          padding: '0 1rem 1.25rem', 
          fontSize: '0.9rem', 
          borderTop: '1px solid var(--color-bg)',
          marginTop: '-0.25rem',
          paddingTop: '1rem'
        }}>
          {prescription ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Prescription</strong>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{prescription}</p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Full Notes</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{summary}</p>
              </div>
            </div>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{summary}</p>
          )}
        </div>
      )}
    </div>
  );
}
