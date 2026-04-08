'use client';

import { useState, useRef } from 'react';
import { saveVisitRecord } from '@/app/actions';

type Soap = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type PrescriptionRow = {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
};

type Step = 'record' | 'generating' | 'edit' | 'done';

type Props = {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  slug: string;
};

export default function ConsultForm({
  appointmentId,
  patientName,
  doctorName,
  clinicName,
  slug,
}: Props) {
  const [step, setStep] = useState<Step>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordError, setRecordError] = useState<string | null>(null);
  const [soapError, setSoapError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [soap, setSoap] = useState<Soap>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([
    { drug: '', dose: '', frequency: '', duration: '' },
  ]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  async function startRecording() {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(2500); // collect chunk every 2.5s
      setIsRecording(true);
    } catch {
      setRecordError('Could not access microphone. Please allow microphone permission and try again.');
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const fd = new FormData();
      fd.append('audio', blob, 'consult.webm');

      try {
        const res = await fetch('/api/transcribe-chunk', { method: 'POST', body: fd });
        const json = await res.json() as { transcript?: string };
        setTranscript(json.transcript ?? '');
      } catch {
        setRecordError('Transcription failed. Please type the transcript manually below.');
      }
    };

    recorder.stop();
    setIsRecording(false);
  }

  async function generateSoap() {
    setStep('generating');
    setSoapError(null);
    try {
      const res = await fetch('/api/soap-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Partial<Soap>;
      setSoap({
        subjective: data.subjective ?? '',
        objective: data.objective ?? '',
        assessment: data.assessment ?? '',
        plan: data.plan ?? '',
      });
      setStep('edit');
    } catch (err) {
      setSoapError(
        err instanceof Error ? err.message : 'Failed to generate SOAP note. Please fill in manually.'
      );
      setStep('edit');
    }
  }

  function updatePrescription(index: number, field: keyof PrescriptionRow, value: string) {
    setPrescriptions((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addPrescriptionRow() {
    setPrescriptions((rows) => [...rows, { drug: '', dose: '', frequency: '', duration: '' }]);
  }

  function removePrescriptionRow(index: number) {
    setPrescriptions((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveVisitRecord(appointmentId, soap, prescriptions, followUpDate);
      setStep('done');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save visit record.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Step: Record ────────────────────────────────────────────────────────────
  if (step === 'record') {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Step 1 — Record Consultation
          </h2>

          {!isRecording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                fontSize: '1.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
              }}
              title="Start Recording"
            >
              🎙
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopRecording()}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                fontSize: '1.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
              title="Stop Recording"
            >
              ⏹
            </button>
          )}

          <p style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {isRecording ? 'Recording… tap to stop' : 'Tap mic to start recording'}
          </p>

          {recordError && (
            <p
              style={{
                marginTop: '1rem',
                color: 'var(--color-error)',
                background: 'var(--color-error-bg)',
                border: '1px solid #fca5a5',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 0.8rem',
                fontSize: '0.875rem',
              }}
            >
              {recordError}
            </p>
          )}
        </div>

        {!isRecording && (
          <div
            style={{
              background: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
          >
            <label htmlFor="transcript-input">Transcript</label>
            <textarea
              id="transcript-input"
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript will appear here after recording stops. You can also type or edit it manually."
              style={{ marginTop: '0.5rem' }}
            />

            <button
              type="button"
              disabled={!transcript.trim()}
              onClick={() => void generateSoap()}
              style={{
                marginTop: '1rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.5rem',
                background: transcript.trim() ? 'var(--color-primary)' : '#94a3b8',
                color: 'white',
                fontWeight: 700,
                cursor: transcript.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Generate SOAP Note
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Step: Generating ────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: 48,
            height: 48,
            border: '4px solid var(--color-primary-soft)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        <p style={{ marginTop: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
          Generating SOAP note…
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
          Analysing consultation transcript with AI
        </p>
      </div>
    );
  }

  // ── Step: Edit ──────────────────────────────────────────────────────────────
  if (step === 'edit') {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {soapError && (
          <div
            style={{
              background: 'var(--color-warning-bg)',
              border: '1px solid #fbbf24',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--color-warning)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {soapError} — Please fill in the SOAP fields manually.
          </div>
        )}

        {/* SOAP Fields */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            display: 'grid',
            gap: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Step 2 — Review &amp; Edit SOAP Note</h2>

          {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
            <div key={field}>
              <label htmlFor={`soap-${field}`} style={{ textTransform: 'capitalize' }}>
                {field}
              </label>
              <textarea
                id={`soap-${field}`}
                rows={3}
                value={soap[field]}
                onChange={(e) => setSoap((prev) => ({ ...prev, [field]: e.target.value }))}
                placeholder={`Enter ${field}…`}
                style={{ marginTop: '0.4rem' }}
              />
            </div>
          ))}
        </div>

        {/* Prescriptions */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Prescription
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Drug', 'Dose', 'Frequency', 'Duration', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.5rem',
                        borderBottom: '2px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((row, i) => (
                  <tr key={i}>
                    {(['drug', 'dose', 'frequency', 'duration'] as const).map((field) => (
                      <td key={field} style={{ padding: '0.4rem 0.35rem' }}>
                        <input
                          type="text"
                          value={row[field]}
                          onChange={(e) => updatePrescription(i, field, e.target.value)}
                          placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.5rem' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '0.4rem 0.35rem', whiteSpace: 'nowrap' }}>
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrescriptionRow(i)}
                          style={{
                            background: 'none',
                            border: '1px solid #fca5a5',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.8rem',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addPrescriptionRow}
            style={{
              marginTop: '0.75rem',
              border: '1px dashed var(--color-primary)',
              background: 'transparent',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 1rem',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            + Add Row
          </button>
        </div>

        {/* Follow-up */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
          }}
        >
          <label htmlFor="follow-up-date">Follow-up Date (optional)</label>
          <input
            id="follow-up-date"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            style={{ marginTop: '0.4rem', maxWidth: '18rem' }}
          />
        </div>

        {saveError && (
          <div
            style={{
              background: 'var(--color-error-bg)',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--color-error)',
              fontWeight: 600,
            }}
          >
            {saveError}
          </div>
        )}

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 2rem',
            background: isSaving ? '#94a3b8' : 'var(--color-accent)',
            color: 'white',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {isSaving ? 'Saving…' : 'Save & Complete Consultation'}
        </button>
      </div>
    );
  }

  // ── Step: Done — Discharge card ─────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div
        style={{
          background: 'var(--color-accent-soft)',
          border: '2px solid var(--color-accent)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-accent)' }}>
          Consultation Complete ✓
        </p>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
          Visit record saved. Appointment marked as done.
        </p>
        <a
          href={`/${slug}/queue`}
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.65rem 1.25rem',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
          }}
        >
          Back to Queue
        </a>
      </div>

      {/* Screen discharge card */}
      <div
        className="print-hidden"
        style={{
          border: '2px solid var(--color-primary)',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Discharge Summary
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Patient: {patientName} | Date: {today} | Dr. {doctorName}
        </p>

        <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Diagnosis</h3>
        <p style={{ marginBottom: '1rem' }}>{soap.assessment || '—'}</p>

        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Prescription</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              {['Drug', 'Dose', 'Frequency', 'Duration'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '0.35rem 0.5rem',
                    borderBottom: '2px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prescriptions.filter((r) => r.drug || r.dose).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.35rem 0.5rem' }}>{row.drug}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{row.dose}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{row.frequency}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {followUpDate && (
          <p>
            <strong>Follow-up:</strong> {followUpDate}
          </p>
        )}
      </div>

      {/* Print-only discharge card */}
      <div className="print-only">
        <h2>{clinicName}</h2>
        <p>Patient: {patientName} | Date: {today} | Dr. {doctorName}</p>
        <h3>Diagnosis</h3>
        <p>{soap.assessment || '—'}</p>
        <h3>Prescription</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Drug', 'Dose', 'Frequency', 'Duration'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.25rem 0.5rem', borderBottom: '1px solid #000' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prescriptions.filter((r) => r.drug || r.dose).map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '0.25rem 0.5rem' }}>{row.drug}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{row.dose}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{row.frequency}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {followUpDate && <p>Follow-up: {followUpDate}</p>}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        style={{
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.5rem',
          background: 'var(--color-primary)',
          color: 'white',
          fontWeight: 700,
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        Print Discharge Card
      </button>
    </div>
  );
}
