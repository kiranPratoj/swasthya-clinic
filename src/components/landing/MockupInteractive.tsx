'use client';

import { useState } from 'react';
import { Search, BrainCircuit } from 'lucide-react';

const PATIENTS: Record<number, { id: number; name: string; init: string; status: string; color: string; border: string; notes: string[] }> = {
  42: { id: 42, name: 'Ramesh K.', init: 'R', status: 'In Consult', color: '#dbeafe', border: '#93c5fd', notes: ['Fever for 2 days', 'Prescribed Paracetamol 500mg', 'Follow-up if temp > 101°F'] },
  43: { id: 43, name: 'Sunita M.', init: 'S', status: 'Waiting', color: '#d1fae5', border: '#6ee7b7', notes: ['BP Follow-up', 'Last reading: 140/90', 'Current med: Telmisartan 40mg'] },
  44: { id: 44, name: 'Vikram P.', init: 'V', status: 'Waiting', color: '#fef3c7', border: '#fcd34d', notes: ['Severe headache since morning', 'No prior history of migraines', 'Requires evaluation'] },
};

const TRANSLATIONS: Record<string, { search: string; queue: string; history: string }> = {
  EN: { search: 'Search patient…', queue: 'Live Queue', history: 'Patient History' },
  HI: { search: 'मरीज खोजें…', queue: 'लाइव कतार', history: 'रोगी का इतिहास' },
  KN: { search: 'ರೋಗಿಯನ್ನು ಹುಡುಕಿ…', queue: 'ಲೈವ್ ಕ್ಯೂ', history: 'ರೋಗಿಯ ಇತಿಹಾಸ' },
};

export default function MockupInteractive() {
  const [activeToken, setActiveToken] = useState<number>(42);
  const [lang, setLang] = useState<string>('EN');

  const patient = PATIENTS[activeToken]!;
  const t = TRANSLATIONS[lang]!;
  const dotColor = activeToken === 42 ? '#60a5fa' : activeToken === 43 ? '#34d399' : '#fbbf24';

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: '1.75rem',
        boxShadow: '0 32px 80px rgba(0,0,0,0.12)',
        padding: 'clamp(0.75rem, 2vw, 1.5rem)',
        overflow: 'hidden',
      }}
    >
      {/* Fake top bar */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '0.75rem',
          border: '1px solid #f1f5f9',
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['#f87171', '#fbbf24', '#4ade80'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '999px',
              padding: '3px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            {['EN', 'HI', 'KN'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: 'none',
                  background: lang === l ? '#dbeafe' : 'transparent',
                  color: lang === l ? '#1d4ed8' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '999px',
            padding: '0.4rem 1rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            minWidth: 'min(100%, 16rem)',
          }}
        >
          <Search size={13} color="#94a3b8" />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{t.search}</span>
        </div>
      </div>

      {/* App grid */}
      <div
        className="lp-mockup-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)',
          gap: '0.75rem',
        }}
      >
        {/* Queue */}
        <div
          style={{
            background: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9',
            padding: '1.25rem',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          }}
        >
          <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '1rem' }}>
            {t.queue}
          </p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {Object.values(PATIENTS).map(p => {
              const active = p.id === activeToken;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveToken(p.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '0.625rem',
                    border: active ? '1px solid #bfdbfe' : '1px solid #f8fafc',
                    background: active ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    opacity: active ? 1 : 0.55,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: active ? '#1e3a8a' : '#64748B' }}>#{p.id}</span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '0.4rem',
                      background: active ? 'rgba(219,234,254,0.6)' : '#f1f5f9',
                      color: active ? '#2563EB' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {active && p.status === 'In Consult' && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', display: 'inline-block', animation: 'lp-pulse 1.5s ease-in-out infinite' }} />
                    )}
                    {p.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div
          style={{
            background: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9',
            padding: '1.25rem',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '12rem',
          }}
        >
          <BrainCircuit size={128} strokeWidth={1} style={{ position: 'absolute', right: '-1.5rem', bottom: '-1.5rem', color: '#f1f5f9', pointerEvents: 'none' }} />
          <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
            {t.history} — {patient.name}
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }} key={patient.id}>
            <div
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: patient.color, border: `2px solid ${patient.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.1rem', flexShrink: 0, color: '#1e293b',
              }}
            >
              {patient.init}
            </div>
            <div style={{ display: 'grid', gap: '0.6rem', flex: 1 }}>
              {patient.notes.map((note, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#334155' }}>{note}</span>
                </div>
              ))}
              {[0.75, 0.5].map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: 0.4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                  <div style={{ height: 8, width: `${w * 100}%`, background: '#f1f5f9', borderRadius: '999px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
