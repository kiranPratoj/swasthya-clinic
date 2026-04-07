'use client';

import { useState, useEffect } from 'react';
import { createClinic, checkSlugAvailable } from '@/app/actions';
import type { OnboardingInput, WorkingHours } from '@/lib/types';
import { useRouter } from 'next/navigation';

const slugRegex = /^[a-z0-9-]{3,30}$/;

type Step = 1 | 2 | 3 | 'success';

const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { open: true, start: '09:00', end: '13:00' },
  tue: { open: true, start: '09:00', end: '13:00' },
  wed: { open: true, start: '09:00', end: '13:00' },
  thu: { open: true, start: '09:00', end: '13:00' },
  fri: { open: true, start: '09:00', end: '13:00' },
  sat: { open: true, start: '09:00', end: '13:00' },
  sun: { open: false, start: '09:00', end: '13:00' },
};

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

export default function OnboardForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clinicName, setClinicName] = useState('');
  const [speciality, setSpeciality] = useState('General Medicine');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [manualSlug, setManualSlug] = useState(false);

  const [doctorName, setDoctorName] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [slotDuration, setSlotDuration] = useState<10 | 15 | 20 | 30>(15);

  // Slug Availability State
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatusMsg, setSlugStatusMsg] = useState<string | null>(null);

  // Auto-derive slug from clinic name
  useEffect(() => {
    if (!manualSlug && clinicName) {
      const derived = clinicName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
      setSlug(derived);
    }
  }, [clinicName, manualSlug]);

  // Debounced slug check
  useEffect(() => {
    if (!slug) {
      setIsSlugAvailable(null);
      setSlugStatusMsg(null);
      return;
    }

    if (!slugRegex.test(slug)) {
      setIsSlugAvailable(false);
      setSlugStatusMsg('Invalid slug format');
      return;
    }

    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkSlugAvailable(slug);
        setIsSlugAvailable(available);
        setSlugStatusMsg(available ? null : 'This slug is already taken');
      } catch (e) {
        console.error('Slug check failed', e);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleNext = () => setStep((s) => (typeof s === 'number' ? s + 1 : s) as Step);
  const handleBack = () => setStep((s) => (typeof s === 'number' ? s - 1 : s) as Step);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const input: OnboardingInput = {
      clinicName,
      slug,
      phone,
      speciality,
      doctorName,
    };

    try {
      await createClinic(input);
      setStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      if (msg.toLowerCase().includes('slug') || msg.toLowerCase().includes('duplicate')) {
        setStep(1);
        setIsSlugAvailable(false);
        setSlugStatusMsg('This slug is already taken');
      }
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = 
    clinicName.length >= 3 && 
    speciality.length > 0 && 
    /^\d{10}$/.test(phone) && 
    isSlugAvailable === true && 
    !checkingSlug;

  const isStep2Valid = doctorName.trim().length > 0;

  if (step === 'success') {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: 'var(--color-text)', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: '800' }}>
          Your clinic is ready!
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Your clinic is live at:<br />
          <strong style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{slug}.swasthya.app</strong>
        </p>
        
        <div style={{ 
          background: 'var(--color-bg)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '2rem',
          textAlign: 'left',
          fontSize: '0.9rem',
          border: '1px solid var(--color-border)'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Demo Login Credentials:</p>
          <p><strong>Email:</strong> admin@{slug}.clinic</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            * An admin will set up your initial password.
          </p>
        </div>

        <button 
          onClick={() => router.push(`/${slug}/admin`)}
          style={{
            width: '100%', padding: '1rem', background: 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '700',
            cursor: 'pointer', fontSize: '1rem'
          }}
        >
          Go to Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Step Indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>
            STEP {step} OF 3
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>
            {step === 1 ? 'Clinic Basics' : step === 2 ? 'Doctor Profile' : 'Review'}
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--color-bg)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            background: 'var(--color-primary)', 
            width: `${(step / 3) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label>Clinic Name</label>
            <input 
              type="text" 
              value={clinicName} 
              onChange={(e) => setClinicName(e.target.value)} 
              placeholder="e.g. City Wellness Clinic"
            />
            {clinicName && clinicName.length < 3 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>Min 3 characters</p>
            )}
          </div>

          <div>
            <label>Speciality</label>
            <input 
              type="text" 
              value={speciality} 
              onChange={(e) => setSpeciality(e.target.value)} 
              placeholder="e.g. General Medicine"
            />
          </div>

          <div>
            <label>Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
              placeholder="10-digit mobile number"
            />
          </div>

          <div>
            <label>Subdomain Slug</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().trim());
                  setManualSlug(true);
                }} 
                style={{ 
                  borderColor: slugStatusMsg ? 'var(--color-error)' : (isSlugAvailable ? 'var(--color-accent)' : undefined),
                  paddingRight: '2.5rem'
                }}
              />
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                {checkingSlug && <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-soft)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />}
                {!checkingSlug && isSlugAvailable === true && <span style={{ color: 'var(--color-accent)' }}>✓</span>}
                {!checkingSlug && isSlugAvailable === false && <span style={{ color: 'var(--color-error)' }}>✗</span>}
              </div>
            </div>
            {slugStatusMsg && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>{slugStatusMsg}</p>}
            <p style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--color-text-muted)' }}>
              URL: <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{slug || 'your-clinic'}.swasthya.app</span>
            </p>
          </div>

          <button 
            onClick={handleNext} 
            disabled={!isStep1Valid}
            style={{
              marginTop: '1rem', padding: '0.875rem', background: isStep1Valid ? 'var(--color-primary)' : '#94a3b8',
              color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '700',
              cursor: isStep1Valid ? 'pointer' : 'not-allowed'
            }}
          >
            Continue to Doctor Profile
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label>Doctor Full Name</label>
            <input 
              type="text" 
              value={doctorName} 
              onChange={(e) => setDoctorName(e.target.value)} 
              placeholder="Dr. Sharma"
            />
          </div>

          <div>
            <label>Working Hours</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {DAYS.map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '60px 50px 1fr 1fr', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{label}</span>
                  <input 
                    type="checkbox" 
                    checked={workingHours[key as keyof WorkingHours]?.open} 
                    onChange={(e) => setWorkingHours(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof WorkingHours], open: e.target.checked }
                    }))}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <input 
                    type="time" 
                    disabled={!workingHours[key as keyof WorkingHours]?.open}
                    value={workingHours[key as keyof WorkingHours]?.start}
                    onChange={(e) => setWorkingHours(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof WorkingHours], start: e.target.value }
                    }))}
                  />
                  <input 
                    type="time" 
                    disabled={!workingHours[key as keyof WorkingHours]?.open}
                    value={workingHours[key as keyof WorkingHours]?.end}
                    onChange={(e) => setWorkingHours(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof WorkingHours], end: e.target.value }
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label>Slot Duration</label>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              {[10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSlotDuration(mins as 10 | 15 | 20 | 30)}
                  style={{
                    flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: slotDuration === mins ? 'white' : 'transparent',
                    color: slotDuration === mins ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: slotDuration === mins ? '700' : '500',
                    boxShadow: slotDuration === mins ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer', fontSize: '0.8125rem'
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={handleBack}
              style={{ flex: 1, padding: '0.875rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}
            >
              Back
            </button>
            <button 
              onClick={handleNext}
              disabled={!isStep2Valid}
              style={{ flex: 2, padding: '0.875rem', background: isStep2Valid ? 'var(--color-primary)' : '#94a3b8', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '700', cursor: isStep2Valid ? 'pointer' : 'not-allowed' }}
            >
              Review Registration
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)-soft' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>Review Details</h3>
              <button onClick={() => setStep(1)} style={{ color: 'var(--color-primary)', border: 'none', background: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.8125rem' }}>Edit</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>CLINIC</span>
                <strong>{clinicName}</strong> ({speciality})<br />
                {slug}.swasthya.app
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>DOCTOR</span>
                <strong>{doctorName}</strong><br />
                {phone}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>SETTINGS</span>
                {slotDuration} min slots
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={handleBack}
              disabled={loading}
              style={{ flex: 1, padding: '0.875rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              style={{ flex: 2, padding: '0.875rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
