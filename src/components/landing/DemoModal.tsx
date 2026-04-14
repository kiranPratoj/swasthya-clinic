'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Mic, Activity, CheckCircle2, X } from 'lucide-react';
import { submitDemoRequest } from '@/app/actions';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { Icon: ShieldCheck, label: 'Live queue demonstration' },
  { Icon: Mic,         label: 'AI voice scribe test' },
  { Icon: Activity,    label: 'Zero technical setup required' },
];

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setName(''); setPhone(''); setClinicName('');
        setIsSuccess(false); setFieldError(''); setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError('');

    if (!name.trim()) { setFieldError('Please enter your name.'); return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFieldError('Please enter a valid 10-digit mobile number.'); return;
    }

    setIsSubmitting(true);
    const result = await submitDemoRequest({ name, phone, clinicName });
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
    } else {
      setFieldError(result.error ?? 'Something went wrong. Please try again.');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 1.5rem)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Request a Demo"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '56rem',
          background: '#fff',
          borderRadius: '2rem',
          boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'lp-modal-in 400ms cubic-bezier(0.16,1,0.3,1) both',
        }}
        className="lp-modal-container"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            transition: 'color 150ms',
            lineHeight: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <X size={22} />
        </button>

        {/* ── LEFT PANEL ── */}
        <div
          className="lp-modal-left"
          style={{
            background: 'radial-gradient(ellipse at 10% 10%, rgba(219,234,254,0.6) 0%, #f8fafc 60%)',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            borderRight: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              background: '#2563EB',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 32 32" width={28} height={28} fill="none">
              <rect x="6" y="4" width="20" height="24" rx="3" stroke="white" strokeWidth="2" fill="none" />
              <rect x="10" y="9" width="12" height="2" rx="1" fill="white" />
              <rect x="10" y="13" width="12" height="2" rx="1" fill="white" />
              <rect x="10" y="17" width="8" height="2" rx="1" fill="white" />
            </svg>
          </div>

          {/* Headline */}
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                marginBottom: '0.85rem',
              }}
            >
              See how your<br />clinic should feel.
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 500, lineHeight: 1.6, maxWidth: '20rem' }}>
              Book a 15-minute personalized walkthrough. No aggressive sales, just a clear look at the workflow.
            </p>
          </div>

          {/* Benefits */}
          <ul style={{ display: 'grid', gap: '1rem' }}>
            {BENEFITS.map(({ Icon, label }) => (
              <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(37,99,235,0.08)',
                    border: '1px solid rgba(37,99,235,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#2563EB',
                  }}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="lp-modal-right"
          style={{
            padding: 'clamp(2rem, 5vw, 4rem)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {isSuccess ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(52,182,138,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}
              >
                <CheckCircle2 size={32} style={{ color: '#34b68a' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                Request Received
              </h3>
              <p style={{ color: '#64748B', fontSize: '1rem', fontWeight: 500, lineHeight: 1.6, maxWidth: '22rem', margin: '0 auto' }}>
                Our team will reach out shortly to schedule your walkthrough.
              </p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} noValidate>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1.75rem' }}>
                Request a Demo
              </h3>

              {/* Full Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  Full Name
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  placeholder="Dr. Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '0.875rem',
                    padding: '0.9rem 1.1rem',
                    fontSize: '1rem',
                    color: '#0F172A',
                    outline: 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Mobile Number */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  Mobile Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.875rem',
                      padding: '0.9rem 1rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#475569',
                      flexShrink: 0,
                      userSelect: 'none',
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="tel"
                    placeholder="90000 00000"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                    maxLength={11}
                    required
                    style={{
                      flex: 1,
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.875rem',
                      padding: '0.9rem 1.1rem',
                      fontSize: '1rem',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'border-color 150ms, box-shadow 150ms',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Clinic Name (optional) */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  Clinic Name <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="City Health Clinic"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '0.875rem',
                    padding: '0.9rem 1.1rem',
                    fontSize: '1rem',
                    color: '#0F172A',
                    outline: 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Field error */}
              {fieldError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', marginTop: '-0.75rem' }}>
                  {fieldError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: isSubmitting ? '#93c5fd' : '#2563EB',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '0.875rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
                  transition: 'background 200ms, transform 150ms',
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; }}
                onMouseLeave={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
              >
                {isSubmitting ? 'Sending…' : 'Schedule Walkthrough'}
              </button>

              {/* Trust line */}
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={13} />
                Your information is secure.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
