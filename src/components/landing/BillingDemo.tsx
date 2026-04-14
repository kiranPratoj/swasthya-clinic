'use client';

import { useState } from 'react';
import { CheckCircle2, MessageCircle, IndianRupee } from 'lucide-react';

type BillingState = 'idle' | 'generated' | 'paid';

interface BillItem { name: string; amount: number; }
interface BillCase {
  patient: string;
  token: number;
  doctor: string;
  items: BillItem[];
  phone: string;
}

const CASES: BillCase[] = [
  {
    patient: 'Ravi Kumar', token: 7, doctor: 'Dr. Sharma',
    items: [
      { name: 'Consultation', amount: 300 },
      { name: 'Amoxicillin 500mg × 10', amount: 180 },
      { name: 'Nebulisation', amount: 150 },
    ],
    phone: '+91 98765 00000',
  },
  {
    patient: 'Priya Sharma', token: 12, doctor: 'Dr. Sharma',
    items: [
      { name: 'Consultation', amount: 400 },
      { name: 'Paracetamol 500mg × 10', amount: 60 },
      { name: 'CBC + NS1 Antigen', amount: 850 },
    ],
    phone: '+91 91234 56789',
  },
  {
    patient: 'Mohan Rao', token: 3, doctor: 'Dr. Verma',
    items: [
      { name: 'Consultation', amount: 350 },
      { name: 'Diclofenac Gel 30g', amount: 120 },
      { name: 'Knee X-ray (bilateral)', amount: 600 },
    ],
    phone: '+91 87654 32100',
  },
  {
    patient: 'Anita Devi', token: 19, doctor: 'Dr. Sharma',
    items: [
      { name: 'Consultation', amount: 300 },
      { name: 'Pantoprazole 40mg × 10', amount: 95 },
      { name: 'Ondansetron 4mg × 6', amount: 75 },
      { name: 'ORS × 5 sachets', amount: 40 },
    ],
    phone: '+91 99887 76655',
  },
  {
    patient: 'Suresh Patel', token: 5, doctor: 'Dr. Verma',
    items: [
      { name: 'Consultation', amount: 400 },
      { name: 'Metformin 1g × 30', amount: 110 },
      { name: 'HbA1c + Lipid Profile', amount: 750 },
    ],
    phone: '+91 93456 78901',
  },
  {
    patient: 'Kavitha Nair', token: 9, doctor: 'Dr. Sharma',
    items: [
      { name: 'Consultation', amount: 300 },
      { name: 'Hydrocortisone 1% Cream', amount: 85 },
      { name: 'Cetirizine 10mg × 7', amount: 45 },
    ],
    phone: '+91 96543 21098',
  },
];

function pick<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter(x => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function BillingDemo() {
  const [state, setState] = useState<BillingState>('idle');
  const [paying, setPaying] = useState(false);
  const [bill, setBill] = useState<BillCase>(CASES[0]);

  const total = bill.items.reduce((s, i) => s + i.amount, 0);

  const statusLabel = state === 'idle' ? 'Pending' : state === 'generated' ? 'Bill Ready' : '✓ Paid';
  const statusColors = state === 'paid'
    ? { color: '#16a34a', background: '#dcfce7' }
    : { color: '#64748B', background: '#f1f5f9' };

  function generate() { setState('generated'); }

  function pay() {
    if (paying) return;
    setPaying(true);
    setTimeout(() => { setState('paid'); setPaying(false); }, 900);
  }

  function reset() {
    setState('idle');
    setBill(prev => pick(CASES, prev));
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1.75rem', overflow: 'hidden', maxWidth: '24rem', margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IndianRupee size={18} style={{ color: '#2563EB' }} />
          <span style={{ color: '#0F172A', fontWeight: 700, fontSize: '0.9rem' }}>Discharge &amp; Billing</span>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', transition: 'all 300ms', ...statusColors }}>
          {statusLabel}
        </span>
      </div>

      {/* Patient strip */}
      <div style={{ padding: '0.9rem 1.1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '0.875rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>👤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{bill.patient}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Token #{bill.token} · {bill.doctor}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0.9rem 1.1rem' }}>
        {state === 'idle' && (
          <div style={{ textAlign: 'center', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.83rem' }}>
            Consultation complete. Tap below to generate the bill.
          </div>
        )}

        {(state === 'generated' || state === 'paid') && (
          <div style={{ marginBottom: '0.75rem' }}>
            {bill.items.map(({ name, amount }, i) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', padding: '0.45rem 0', borderBottom: i < bill.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ color: '#475569' }}>{name}</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>₹{amount}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.95rem', paddingTop: '0.55rem', borderTop: '2px solid #f1f5f9', marginTop: '0.25rem', color: '#0F172A' }}>
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
        )}

        {state === 'paid' && (
          <>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
              <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>Payment Received · UPI</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>₹{total} · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '0.875rem', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageCircle size={15} style={{ color: '#25D366', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>WhatsApp receipt sent to {bill.phone}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '0.75rem 1.1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
        {state === 'idle' && (
          <button onClick={generate} style={{ flex: 1, padding: '0.75rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '0.875rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Generate Bill
          </button>
        )}
        {state === 'generated' && (
          <>
            <button onClick={reset} style={{ padding: '0.75rem 1rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.875rem', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Edit
            </button>
            <button onClick={pay} disabled={paying} style={{ flex: 1, padding: '0.75rem', background: paying ? '#4ade80' : '#16a34a', color: '#fff', border: 'none', borderRadius: '0.875rem', fontWeight: 700, fontSize: '0.88rem', cursor: paying ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 200ms' }}>
              {paying ? 'Processing…' : 'Mark Paid · UPI'}
            </button>
          </>
        )}
        {state === 'paid' && (
          <button onClick={reset} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.875rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ↺ Next Patient
          </button>
        )}
      </div>
    </div>
  );
}
