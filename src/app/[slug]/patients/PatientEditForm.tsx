'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/app/actions';

type Props = {
  patientId: string;
  initialName: string;
  initialPhone: string;
};

export default function PatientEditForm({ patientId, initialName, initialPhone }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const nextName = name.trim();
    const nextPhone = phone.replace(/\D/g, '');

    if (nextName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    if (!/^\d{10}$/.test(nextPhone)) {
      setError('Phone must be exactly 10 digits.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updatePatient(patientId, { name: nextName, phone: nextPhone });
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
              value={phone}
              disabled={isSaving}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              aria-label="Patient phone"
            />
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
