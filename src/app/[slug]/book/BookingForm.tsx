'use client';

import { useState, FormEvent, useRef } from 'react';
import type { VisitType, VoiceDraft } from '@/lib/types';

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

type VoiceState = 'idle' | 'recording' | 'processing';

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

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    setVoiceError(null);
    setTranscript(null);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Microphone not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setVoiceError('No audio captured. Please try again.');
          setVoiceState('idle');
          return;
        }
        void processVoice(blob);
      };

      recorder.start();
      setVoiceState('recording');
    } catch {
      setVoiceError('Could not access microphone. Please allow microphone access.');
      setVoiceState('idle');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      setVoiceState('processing');
      mediaRecorderRef.current.stop();
    }
  }

  async function processVoice(blob: Blob) {
    try {
      const fd = new FormData();
      fd.set('audio', new File([blob], `booking-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }));

      const res = await fetch('/api/intake-voice', { method: 'POST', body: fd });
      const draft = await res.json() as VoiceDraft & { error?: string };

      if (draft.error) throw new Error(draft.error);

      const s = draft.structuredData;
      if (s.patientName) setName(s.patientName);
      if (s.phone) setPhone(s.phone.replace(/\D/g, '').slice(0, 10));
      if (s.complaint) setComplaint(s.complaint);
      if (s.visitType && ['booked', 'follow-up', 'walk-in'].includes(s.visitType)) {
        setVisitType(s.visitType as VisitType);
      }
      if (draft.transcript) setTranscript(draft.transcript);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Voice processing failed.');
    } finally {
      setVoiceState('idle');
    }
  }

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

        {/* Voice shortcut */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-outline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <p style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                🎤 Say your details instead
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Speak in Kannada or English — we'll fill the form for you
              </p>
            </div>
            <button
              type="button"
              onClick={voiceState === 'recording' ? stopRecording : () => void startRecording()}
              disabled={voiceState === 'processing'}
              style={{
                flexShrink: 0,
                padding: '0.6rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.875rem',
                cursor: voiceState === 'processing' ? 'not-allowed' : 'pointer',
                background: voiceState === 'recording' ? '#dc2626' : 'var(--color-primary)',
                color: 'white',
                transition: 'background 0.15s',
              }}
            >
              {voiceState === 'idle' && '🎙 Speak'}
              {voiceState === 'recording' && '⏹ Stop'}
              {voiceState === 'processing' && 'Processing...'}
            </button>
          </div>

          {voiceState === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: '700' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              Recording... tap Stop when done
            </div>
          )}

          {voiceState === 'processing' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600' }}>
              Transcribing and extracting details...
            </p>
          )}

          {transcript && voiceState === 'idle' && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', background: 'white', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', borderLeft: '3px solid var(--color-primary)' }}>
              <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>Heard: </span>{transcript}
            </div>
          )}

          {voiceError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: '600' }}>{voiceError}</p>
          )}
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
