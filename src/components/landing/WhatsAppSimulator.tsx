'use client';

import { useState } from 'react';
import { MessageCircle, Check, CheckCheck } from 'lucide-react';

type WaState = 'idle' | 'sent' | 'processing' | 'queued';

const PATIENTS = [
  {
    name: 'Ravi Kumar',
    message: 'Hi, I am Ravi Kumar. I have a cough for 3 days. Can I come today?',
    lastVisit: 'Dec 2024',
    token: 7,
    wait: 15,
    counter: 1,
  },
  {
    name: 'Priya Sharma',
    message: 'Hello, my name is Priya Sharma. I have fever and headache since yesterday. Is doctor available?',
    lastVisit: 'Nov 2024',
    token: 12,
    wait: 25,
    counter: 2,
  },
  {
    name: 'Mohan Rao',
    message: 'Namaste, I am Mohan Rao. My knee pain has increased. Can I get an appointment today?',
    lastVisit: 'Jan 2025',
    token: 3,
    wait: 8,
    counter: 1,
  },
  {
    name: 'Anita Devi',
    message: 'Hi doctor, I am Anita Devi. Stomach pain and vomiting from morning. Please help.',
    lastVisit: 'Oct 2024',
    token: 19,
    wait: 40,
    counter: 2,
  },
  {
    name: 'Suresh Patel',
    message: 'Hello, Suresh Patel here. My sugar levels have been high. Need to see doctor urgently.',
    lastVisit: 'Mar 2025',
    token: 5,
    wait: 12,
    counter: 1,
  },
  {
    name: 'Kavitha Nair',
    message: 'Good morning. I am Kavitha Nair. I have a skin rash on my arm since 2 days. Can I come?',
    lastVisit: 'Feb 2025',
    token: 9,
    wait: 20,
    counter: 1,
  },
];

function pick<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter(x => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function WhatsAppSimulator() {
  const [state, setState] = useState<WaState>('idle');
  const [running, setRunning] = useState(false);
  const [patient, setPatient] = useState(PATIENTS[0]);

  function run() {
    if (running) return;
    setRunning(true);
    setState('sent');
    setTimeout(() => setState('processing'), 1200);
    setTimeout(() => setState('queued'), 2800);
    setTimeout(() => setRunning(false), 3200);
  }

  function reset() {
    setState('idle');
    setRunning(false);
    setPatient(prev => pick(PATIENTS, prev));
  }

  const replyText =
    state === 'sent'
      ? 'Looking up your record…'
      : state === 'processing'
      ? `Found! ${patient.name} · last visit ${patient.lastVisit} ✓`
      : `Token #${patient.token} assigned. Approx wait: ${patient.wait} min.`;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.75rem',
        overflow: 'hidden',
        maxWidth: '24rem',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        fontFamily: 'inherit',
      }}
    >
      {/* WhatsApp header */}
      <div style={{ background: '#075E54', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={20} color="white" />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Medilite Clinic</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>
            {state === 'processing' ? 'typing…' : 'online'}
          </div>
        </div>
      </div>

      {/* Chat bubbles */}
      <div style={{ padding: '1rem', background: '#ece5dd', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {/* Patient message */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '88%' }}>
          <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '0.55rem 0.85rem', fontSize: '0.85rem', color: '#0F172A', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', lineHeight: 1.45 }}>
            {patient.message}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#777', marginTop: '0.2rem', paddingLeft: '0.2rem' }}>9:02 AM</div>
        </div>

        {/* Clinic reply */}
        {state !== 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ background: '#d9fdd3', borderRadius: '12px 0 12px 12px', padding: '0.55rem 0.85rem', fontSize: '0.85rem', color: '#0F172A', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', maxWidth: '88%', lineHeight: 1.45 }}>
              {replyText}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#777', marginTop: '0.2rem', paddingRight: '0.2rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
              9:02 AM
              {state === 'queued' ? <CheckCheck size={12} color="#4fc3f7" /> : <Check size={12} color="#999" />}
            </div>
          </div>
        )}

        {/* Token card */}
        {state === 'queued' && (
          <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '0.75rem 1rem', maxWidth: '88%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Queue Update</div>
            <div style={{ color: '#64748B', fontSize: '0.78rem', lineHeight: 1.5 }}>
              🏥 Token #{patient.token} · Dr. Sharma&apos;s Clinic<br />
              ⏰ ~{patient.wait} min · Please come to counter {patient.counter}
            </div>
          </div>
        )}
      </div>

      {/* Action row */}
      <div style={{ padding: '0.9rem 1rem', borderTop: '1px solid #f1f5f9' }}>
        {state === 'queued' ? (
          <button onClick={reset} style={{ width: '100%', padding: '0.65rem', background: '#f1f5f9', border: 'none', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>
            ↺ Try Another Patient
          </button>
        ) : (
          <button onClick={run} disabled={running} style={{ width: '100%', padding: '0.65rem', background: running ? '#a7f3d0' : '#25D366', border: 'none', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'inherit', transition: 'background 200ms' }}>
            {running ? 'Connecting…' : 'Send Message →'}
          </button>
        )}
      </div>
    </div>
  );
}
