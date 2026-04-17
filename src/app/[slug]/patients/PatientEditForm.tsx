'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/app/actions';
import { getIndianMobileValidationError, normalizeIndianMobile } from '@/lib/phone';

type Props = {
  patientId: string;
  initialName: string;
  initialPhone: string;
  initialNoPhone: boolean;
};

export default function PatientEditForm({
  patientId,
  initialName,
  initialPhone,
  initialNoPhone,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [noPhone, setNoPhone] = useState(initialNoPhone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const nextName = name.trim();
    const nextPhone = normalizeIndianMobile(phone);

    if (nextName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    const phoneError = noPhone ? null : getIndianMobileValidationError(nextPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updatePatient(patientId, { name: nextName, phone: nextPhone, noPhone });
      setIsEditing(false);
      router.refresh();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error && saveError.message.trim()
          ? saveError.message
          : 'Could not update the patient.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {!isEditing ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          style={{
            width: 'fit-content',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.7rem 1rem',
            background: 'white',
            fontWeight: 700,
          }}
        >
          Edit
        </button>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <input value={name} disabled={isSaving} onChange={(event) => setName(event.target.value)} aria-label="Patient name" />
            <input
              value={noPhone ? '' : phone}
              disabled={isSaving}
              onChange={(event) => {
                setPhone(normalizeIndianMobile(event.target.value).slice(0, 10));
                setNoPhone(false);
              }}
              inputMode="numeric"
              aria-label="Patient phone"
              placeholder={noPhone ? 'No mobile available' : '10-digit mobile number'}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={noPhone}
                disabled={isSaving}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setNoPhone(checked);
                  if (checked) {
                    setPhone('');
                  }
                }}
              />
              Patient has no mobile
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false);
                setName(initialName);
                setPhone(initialPhone);
                setNoPhone(initialNoPhone);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {error && <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}
