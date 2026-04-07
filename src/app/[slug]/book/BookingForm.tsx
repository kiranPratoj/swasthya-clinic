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

    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

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

  const resetForm = () => {
    setResult(null);
    setName('');
    setPhone('');
    setComplaint('');
    setVisitType('booked');
    setBookedFor(getTodayIsoDate());
    setError(null);
  };

  if (result) {
    return (
      <div style={{
        maxWidth: '480px', margin: '0 auto', background: 'white',
        borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)',
        padding: '2.5rem 1.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
      }}>
        <div style={{ color: 'var(--color-success)', fontWeight: '800', fontSize: '1.25rem' }}>
          ✓ Booking Confirmed
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>TOKEN</div>
          <div style={{ fontSize: '5rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: 1 }}>
            {result.tokenNumber}
          </div>
        </div>

        <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
          <p style={{ fontWeight: '700' }}>Dr. {doctorId === 'mock' ? 'Doctor' : 'Doctor'}</p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{formatDate(result.bookedFor)}</p>
        </div>

        <div style={{ 
          background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)', 
          fontSize: '0.875rem', color: 'var(--color-text-muted)', width: '100%'
        }}>
          Please show this token at the reception when you arrive at <strong>{clinicName}</strong>.
        </div>

        <button
          onClick={resetForm}
          style={{
            width: '100%', padding: '1rem', background: 'white', border: '1px solid var(--color-primary)',
            color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: '700',
            cursor: 'pointer', fontSize: '1rem', marginTop: '0.5rem'
          }}
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'white', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)', padding: '2rem 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text)' }}>Book an appointment</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Quickly book your slot at {clinicName}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Your name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              required 
              placeholder="Full name"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Phone (10 digits)</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required 
              placeholder="Mobile number" 
              inputMode="numeric"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Preferred date</label>
            <input 
              type="date" 
              value={bookedFor}
              min={getTodayIsoDate()}
              onChange={e => setBookedFor(e.target.value)} 
              required 
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Visit type</label>
            <select 
              value={visitType} 
              onChange={e => setVisitType(e.target.value as VisitType)}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'white' }}
            >
              <option value="booked">Booked</option>
              <option value="follow-up">Follow-up</option>
              <option value="walk-in">Walk-in</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Chief complaint</label>
            <textarea 
              rows={3} 
              value={complaint}
              onChange={e => setComplaint(e.target.value)}
              required 
              placeholder="Briefly describe why you are visiting"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'none' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', textAlign: 'center', fontWeight: '600' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '1rem', background: 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '800',
            cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '1rem', marginTop: '0.5rem'
          }}
        >
          {submitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
}
