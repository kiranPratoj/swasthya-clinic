'use client';

import { useState, FormEvent } from 'react';
import type { VisitType } from '@/lib/types';

type Props = {
  doctorId: string;
  slug: string;
  clinicName: string;
};

type BookingResult = {
  tokenNumber: number;
  appointmentId: string;
  bookedFor: string;
};

function getTodayIsoDate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function getMinDate(): string {
  return getTodayIsoDate();
}

function getMaxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function BookingForm({ doctorId, slug, clinicName }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('booked');
  const [bookedFor, setBookedFor] = useState(getTodayIsoDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.set('patientName', name.trim());
      fd.set('phone', phone.trim());
      fd.set('complaint', complaint.trim());
      fd.set('visitType', visitType);
      fd.set('doctorId', doctorId);
      fd.set('bookedFor', bookedFor);
      fd.set('selfBooked', 'true');

      const res = await fetch(`/${slug}/book/api`, { method: 'POST', body: fd });
      const json = await res.json() as { tokenNumber?: number; appointmentId?: string; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Booking failed. Please try again.');

      setResult({ tokenNumber: json.tokenNumber!, appointmentId: json.appointmentId!, bookedFor });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div style={{
        background: 'white', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)', padding: '2rem',
        textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '999px',
          background: 'var(--color-primary)', color: 'white',
          display: 'grid', placeItems: 'center', margin: '0 auto',
          fontSize: '2.5rem', fontWeight: 900,
        }}>
          {result.tokenNumber}
        </div>
        <div>
          <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>Appointment Confirmed</p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {formatDate(result.bookedFor)}
          </p>
        </div>
        <div style={{
          background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-lg)',
          padding: '1rem',
        }}>
          <p style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Your token number is #{result.tokenNumber}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Please arrive on time and show this number at reception.
          </p>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
          You will receive a WhatsApp confirmation shortly.
        </p>
        <button
          type="button"
          onClick={() => { setResult(null); setName(''); setPhone(''); setComplaint(''); }}
          style={{
            background: 'white', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'white', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>Your Details</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Fill in the form below. Reception will confirm your slot.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="name">Full Name *</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
            required placeholder="e.g. Ravi Kumar" />
        </div>

        <div>
          <label htmlFor="phone">Mobile Number *</label>
          <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            required placeholder="10-digit number" pattern="[0-9]{10}" inputMode="numeric" />
        </div>

        <div>
          <label htmlFor="bookedFor">Preferred Date *</label>
          <input id="bookedFor" type="date" value={bookedFor}
            min={getMinDate()} max={getMaxDate()}
            onChange={e => setBookedFor(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="visitType">Visit Type *</label>
          <select id="visitType" value={visitType} onChange={e => setVisitType(e.target.value as VisitType)}>
            <option value="booked">Scheduled Appointment</option>
            <option value="follow-up">Follow-up Visit</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </div>

        <div>
          <label htmlFor="complaint">Reason for Visit *</label>
          <textarea id="complaint" rows={3} value={complaint}
            onChange={e => setComplaint(e.target.value)}
            required placeholder="Briefly describe your symptoms or reason"
            style={{ resize: 'vertical' }} />
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-error-bg)', border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem',
          color: 'var(--color-error)', fontWeight: 600,
        }}>{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: 'var(--color-primary)', color: 'white', border: 'none',
          borderRadius: 'var(--radius-md)', padding: '1rem',
          fontWeight: 800, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Confirming...' : 'Confirm Appointment'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
        By booking you agree to receive a WhatsApp confirmation from {clinicName}.
      </p>
    </form>
  );
}
