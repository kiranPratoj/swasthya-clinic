'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

type ScribeState = 'idle' | 'listening' | 'processing' | 'structured';

const CASES = [
  {
    quote: '"Ravi Kumar, chest congestion, dry cough, three days, no fever…"',
    notes: [
      { label: 'Chief Complaint', value: 'Chest congestion, dry cough · 3 days' },
      { label: 'Assessment', value: 'Acute bronchitis (suspected)' },
      { label: 'Plan', value: 'Amoxicillin 500 mg × 5 days · review in 3 days if not improving' },
    ],
  },
  {
    quote: '"Priya Sharma, high fever since yesterday, severe headache, body ache, no rash…"',
    notes: [
      { label: 'Chief Complaint', value: 'High fever 102°F, headache, body ache · 1 day' },
      { label: 'Assessment', value: 'Viral fever (suspected dengue — CBC advised)' },
      { label: 'Plan', value: 'Paracetamol 500 mg SOS · CBC, NS1 antigen · ORS · review in 2 days' },
    ],
  },
  {
    quote: '"Mohan Rao, right knee pain, worsens on climbing stairs, morning stiffness, no swelling…"',
    notes: [
      { label: 'Chief Complaint', value: 'Right knee pain, morning stiffness · 3 weeks' },
      { label: 'Assessment', value: 'Osteoarthritis knee (early stage)' },
      { label: 'Plan', value: 'Diclofenac gel local application · knee X-ray · physiotherapy referral' },
    ],
  },
  {
    quote: '"Anita Devi, epigastric pain, nausea, vomiting twice since morning, no blood, no fever…"',
    notes: [
      { label: 'Chief Complaint', value: 'Epigastric pain, nausea, vomiting × 2 · since morning' },
      { label: 'Assessment', value: 'Acute gastritis' },
      { label: 'Plan', value: 'Pantoprazole 40 mg OD before food · Ondansetron 4 mg SOS · bland diet · review in 3 days' },
    ],
  },
  {
    quote: '"Suresh Patel, diabetes follow-up, fasting sugar 210, feels tired, no hypoglycemic episodes…"',
    notes: [
      { label: 'Chief Complaint', value: 'Diabetes follow-up · fatigue · FBS 210 mg/dL' },
      { label: 'Assessment', value: 'Type 2 DM — suboptimal control' },
      { label: 'Plan', value: 'Metformin 1g OD increased to BD · HbA1c + lipid profile · dietary counselling · review in 4 weeks' },
    ],
  },
  {
    quote: '"Kavitha Nair, itchy red rash on left forearm, spreading, no fever, new soap used recently…"',
    notes: [
      { label: 'Chief Complaint', value: 'Itchy erythematous rash, left forearm · 2 days · spreading' },
      { label: 'Assessment', value: 'Contact dermatitis (likely soap allergy)' },
      { label: 'Plan', value: 'Hydrocortisone 1% cream BD · Cetirizine 10 mg OD · stop new soap · patch test if persists' },
    ],
  },
];

function pick<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter(x => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ScribeDemo() {
  const [state, setState] = useState<ScribeState>('idle');
  const [caseData, setCaseData] = useState(CASES[0]);

  function startRecording() {
    if (state === 'listening' || state === 'processing') return;
    setState('listening');
    setTimeout(() => setState('processing'), 3200);
    setTimeout(() => setState('structured'), 4800);
  }

  function reset() {
    setState('idle');
    setCaseData(prev => pick(CASES, prev));
  }

  return (
    <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1.75rem', overflow: 'hidden', maxWidth: '24rem', margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>AI Voice Scribe</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', background: 'rgba(30,58,138,0.5)', padding: '3px 10px', borderRadius: '999px' }}>
          Sarvam AI
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem', minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {state === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5 }}>Press the mic and speak naturally.</div>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>Hindi · English · Kannada</div>
          </div>
        )}

        {state === 'listening' && (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <span style={{ animation: 'lp-pulse 0.9s ease-in-out infinite' }}>●</span>
              Recording…
            </div>
            <div className="lp-waveform">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="lp-waveform-bar" style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />
              ))}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.78rem', textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>
              {caseData.quote}
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#93c5fd', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.75rem' }}>Processing with AI…</div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#93c5fd', animation: `lp-pulse 0.9s ${d}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}

        {state === 'structured' && (
          <div style={{ width: '100%', display: 'grid', gap: '0.55rem' }}>
            {caseData.notes.map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '0.75rem', padding: '0.6rem 0.85rem' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: '0.83rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
              </div>
            ))}
            <div style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'right', marginTop: '0.1rem' }}>
              Draft ready · review before saving
            </div>
          </div>
        )}
      </div>

      {/* Mic button */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <button
          onClick={state === 'structured' ? reset : startRecording}
          disabled={state === 'listening' || state === 'processing'}
          aria-label={state === 'structured' ? 'Start new recording' : 'Start recording'}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: state === 'listening' ? '#ef4444' : state === 'processing' ? '#1e293b' : '#2563EB',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: state === 'listening' || state === 'processing' ? 'not-allowed' : 'pointer',
            boxShadow: state === 'listening' ? '0 0 0 8px rgba(239,68,68,0.2)' : '0 4px 16px rgba(37,99,235,0.4)',
            transition: 'background 300ms, box-shadow 300ms', fontFamily: 'inherit',
          }}
        >
          {state === 'listening' ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
        </button>
        {state === 'structured' && (
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>Tap mic for next case</span>
        )}
        {state === 'idle' && (
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>Tap to record</span>
        )}
      </div>
    </div>
  );
}
