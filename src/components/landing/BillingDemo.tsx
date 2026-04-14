'use client';

import { useState } from 'react';
import { CheckCircle2, MessageCircle, IndianRupee } from 'lucide-react';

type BillingState = 'idle' | 'generated' | 'paid';

const ITEMS = [
  { name: 'Consultation', amount: 300 },
  { name: 'Amoxicillin 500mg × 10', amount: 180 },
  { name: 'Nebulisation', amount: 150 },
];
const TOTAL = ITEMS.reduce((s, i) => s + i.amount, 0);

export default function BillingDemo() {
  const [state, setState] = useState<BillingState>('idle');
  const [paying, setPaying] = useState(false);

  function generate() {
    setState('generated');
  }

  function pay() {
    if (paying) return;
    setPaying(true);
    setTimeout(() => {
      setState('paid');
      setPaying(false);
    }, 900);
  }

  function reset() {
    setState('idle');
  }

  const statusLabel =
    state === 'idle' ? 'Pending' : state === 'generated' ? 'Bill Ready' : '✓ Paid';
  const statusColors =
    state === 'paid'
      ? { color: '#16a34a', background: '#dcfce7' }
      : { color: '#64748B', background: '#f1f5f9' };

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
      {/* Header */}
      <div
        style={{
          padding: '0.9rem 1.1rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IndianRupee size={18} style={{ color: '#2563EB' }} />
          <span style={{ color: '#0F172A', fontWeight: 700, fontSize: '0.9rem' }}>
            Discharge &amp; Billing
          </span>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '999px',
            transition: 'all 300ms',
            ...statusColors,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Patient strip */}
      <div style={{ padding: '0.9rem 1.1rem 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.85rem',
            background: '#f8fafc',
            borderRadius: '0.875rem',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>Ravi Kumar</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Token #7 · Dr. Sharma</div>
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
            {ITEMS.map(({ name, amount }, i) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.83rem',
                  padding: '0.45rem 0',
                  borderBottom: i < ITEMS.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <span style={{ color: '#475569' }}>{name}</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>₹{amount}</span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 800,
                fontSize: '0.95rem',
                paddingTop: '0.55rem',
                borderTop: '2px solid #f1f5f9',
                marginTop: '0.25rem',
                color: '#0F172A',
              }}
            >
              <span>Total</span>
              <span>₹{TOTAL}</span>
            </div>
          </div>
        )}

        {state === 'paid' && (
          <>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.875rem',
                padding: '0.65rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '0.6rem',
              }}
            >
              <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>
                  Payment Received · UPI
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>₹{TOTAL} · 10:47 AM</div>
              </div>
            </div>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px dashed #86efac',
                borderRadius: '0.875rem',
                padding: '0.6rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <MessageCircle size={15} style={{ color: '#25D366', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                WhatsApp receipt sent to +91 98765 00000
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action row */}
      <div style={{ padding: '0.75rem 1.1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
        {state === 'idle' && (
          <button
            onClick={generate}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '0.875rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Generate Bill
          </button>
        )}

        {state === 'generated' && (
          <>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1rem',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '0.875rem',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Edit
            </button>
            <button
              onClick={pay}
              disabled={paying}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: paying ? '#4ade80' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.875rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: paying ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 200ms',
              }}
            >
              {paying ? 'Processing…' : 'Mark Paid · UPI'}
            </button>
          </>
        )}

        {state === 'paid' && (
          <button
            onClick={reset}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '0.875rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ↺ New Patient
          </button>
        )}
      </div>
    </div>
  );
}
