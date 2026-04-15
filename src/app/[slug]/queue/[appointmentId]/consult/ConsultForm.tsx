'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { generateSoapNote, saveVisitRecord } from '@/app/actions';
import type { QueueItem, VisitHistory, PatientReport } from '@/lib/types';
import ReportCard from '@/components/reports/ReportCard';

type PrescriptionRow = {
  drug: string;
  dose: string;
  frequency: string;
};

type SOAPNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type ConsultStep = 'consult' | 'print';

type Props = {
  appointment: QueueItem & { recentHistory?: VisitHistory[] };
  slug: string;
  clinicName: string;
  reports: PatientReport[];
};

function getTodayIsoDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().split('T')[0];
}

function formatDoctorName(name?: string | null): string {
  if (!name) return 'Doctor';
  return name.replace(/^\s*dr\.?\s*/i, '').trim();
}

function extractHeadline(summary: string): string {
  const diagnosisMatch = summary.match(/Diagnosis:\s*(.*)/i);
  if (diagnosisMatch?.[1]) {
    return diagnosisMatch[1].trim();
  }

  return summary.split('\n')[0]?.trim() || 'Previous visit';
}

function buildSoapFallback(transcript: string): SOAPNote {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    };
  }

  return {
    subjective: cleaned,
    objective: 'Doctor review required.',
    assessment: 'AI draft unavailable. Please confirm the diagnosis manually.',
    plan: 'Review the transcript, complete the prescription, and set a follow-up reminder if needed.',
  };
}

export default function ConsultForm({ appointment, slug, clinicName, reports }: Props) {
  const router = useRouter();
  const doctorName = formatDoctorName(appointment.doctor?.name);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  const [soap, setSoap] = useState<SOAPNote>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState<PrescriptionRow[]>([
    { drug: '', dose: '', frequency: '' }
  ]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<ConsultStep>('consult');

  const printablePrescription = prescription.filter(
    (entry) => entry.drug.trim() || entry.dose.trim() || entry.frequency.trim()
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleFinalTranscription(audioBlob, durationMs);
      };

      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or not supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFinalTranscription = async (blob: Blob, durationMs: number) => {
    setIsProcessing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'consult.webm');
      fd.append('durationMs', String(durationMs));
      
      const res = await fetch('/api/consult-voice', {
        method: 'POST',
        body: fd
      });
      const payload = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? 'Could not transcribe consultation audio.');
      }

      const text = payload.transcript ?? '';
      setTranscript(text);

      if (text) {
        try {
          const soapData = await generateSoapNote(text);
          setSoap({
            subjective: soapData.subjective ?? '',
            objective: soapData.objective ?? '',
            assessment: soapData.assessment ?? '',
            plan: soapData.plan ?? '',
          });
          setDiagnosis(soapData.diagnosis ?? '');
          setPrescription(
            Array.isArray(soapData.prescription) && soapData.prescription.length > 0
              ? soapData.prescription
              : [{ drug: '', dose: '', frequency: '' }]
          );
        } catch {
          setSoap(buildSoapFallback(text));
          setDiagnosis('');
          setPrescription([{ drug: '', dose: '', frequency: '' }]);
        }
      }
    } catch (err) {
      console.error('Transcription/AI error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addPrescriptionRow = () => {
    setPrescription([...prescription, { drug: '', dose: '', frequency: '' }]);
  };

  const updatePrescriptionRow = (index: number, field: keyof PrescriptionRow, value: string) => {
    const updated = [...prescription];
    updated[index][field] = value;
    setPrescription(updated);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveVisitRecord(appointment.id, soap, diagnosis, prescription, followUpDate);
      setStep('print');
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to save visit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'print') {
    return (
      <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="print-only">
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1rem' }}>
            <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>{clinicName}</h1>
            <p style={{ margin: '0.25rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Visit Summary · Medilite AI</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <p><strong>Patient:</strong> {appointment.patient.name}</p>
              <p><strong>Age:</strong> {appointment.patient.age ?? 'N/A'}</p>
              <p><strong>Complaint:</strong> {appointment.complaint}</p>
              <p><strong>Date:</strong> {getTodayIsoDate()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p><strong>Doctor:</strong> Dr. {doctorName}</p>
              <p><strong>Token:</strong> #{appointment.token_number}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.25rem' }}>Diagnosis</h3>
            <p>{diagnosis.trim() || 'Not recorded'}</p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.25rem' }}>Prescription</h3>
            {printablePrescription.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f9f9f9' }}>
                    <th style={{ padding: '0.5rem' }}>Drug Name</th>
                    <th style={{ padding: '0.5rem' }}>Dosage</th>
                    <th style={{ padding: '0.5rem' }}>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {printablePrescription.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>{p.drug}</td>
                      <td style={{ padding: '0.5rem' }}>{p.dose}</td>
                      <td style={{ padding: '0.5rem' }}>{p.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No medicines recorded.</p>
            )}
          </div>

          {followUpDate && (
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Follow-up Reminder:</strong> {followUpDate}</p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <p>
              <strong>Payment:</strong>{' '}
              {appointment.payment_status === 'verified'
                ? `Paid${appointment.payment_mode ? ` · ${appointment.payment_mode.toUpperCase()}` : ''}`
                : 'Pending'}
            </p>
          </div>

          <div style={{ marginTop: '4rem', textAlign: 'right' }}>
            <div style={{ display: 'inline-block', borderTop: '1px solid #333', paddingTop: '0.5rem', minWidth: '150px', textAlign: 'center' }}>
              Doctor&apos;s Signature
            </div>
          </div>
        </div>

        <div className="print-hidden" style={{ textAlign: 'center', display: 'grid', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h2>Consultation Completed</h2>
          <p>The visit has been saved and is ready to print.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => window.print()}
              style={{
                padding: '0.8rem 1.5rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700
              }}
            >
              Print Visit Summary
            </button>
            <button 
              onClick={() => router.push(`/${slug}/queue`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.5rem',
                background: 'white',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>

      {/* ── 0. Patient reports (read-only) ──────────────────────────────────── */}
      {reports.length > 0 && (
        <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
            Patient Reports
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>({reports.length})</span>
          </h2>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {reports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}

      {/* ── 1. Voice recording — primary CTA, always at top ─────────────────── */}
      <section
        style={{
          background: isRecording
            ? 'var(--color-error-bg)'
            : isTranscribing
              ? 'var(--color-warning-bg)'
              : 'var(--color-primary-soft)',
          border: `2px solid ${isRecording ? '#fca5a5' : isTranscribing ? 'var(--color-warning)' : 'var(--color-primary-outline)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          display: 'grid',
          gap: '1.25rem',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: isRecording ? 'var(--color-error)' : 'var(--color-primary)' }}>
            {isRecording ? '● Recording…' : isTranscribing ? 'Processing with AI…' : transcript ? 'Recording done — review below' : null}
            {!isRecording && !isTranscribing && !transcript && (
              <span className="mobile-copy-optional">Record the consultation</span>
            )}
          </h2>

          <p className="mobile-copy-optional" style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            {isRecording
              ? 'Speak naturally. Tap Stop when finished.'
              : isTranscribing
                ? 'Sarvam AI is transcribing and extracting notes…'
                : transcript
                  ? 'The form below has been pre-filled. Edit anything before submitting.'
                  : 'Speak through the consultation. AI will fill the form for you.'}
          </p>

          {!isRecording && !isTranscribing && (
            <button
              type="button"
              onClick={startRecording}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.9rem 1.6rem',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🎤 {transcript ? 'Record Again' : 'Start Recording'}
            </button>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--color-error)',
                color: 'white',
                border: 'none',
                padding: '0.9rem 1.6rem',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🛑 Stop &amp; Process
            </button>
          )}

          {isTranscribing && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-warning)',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>⏳</span> Processing…
            </span>
          )}
        </div>

        {transcript && (
          <div style={{ background: 'white', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-outline)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transcript</span>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.92rem', color: 'var(--color-text)', lineHeight: 1.6 }}>{transcript}</p>
          </div>
        )}
      </section>

      {/* ── 2. Recent continuity — secondary context ─────────────────────────── */}
      {appointment.recentHistory && appointment.recentHistory.length > 0 && (
        <section className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Previous Visits</h2>
            <p className="mobile-copy-optional" style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.88rem' }}>
              Context from the last {appointment.recentHistory.length} visit{appointment.recentHistory.length > 1 ? 's' : ''}.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {appointment.recentHistory.map((visit) => (
              <article
                key={visit.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-bg)',
                  display: 'grid',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{extractHeadline(visit.summary)}</strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {new Date(visit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {visit.summary}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Verification form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
        <section className="card" style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gap: '0.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              {transcript ? 'Verify & Edit' : 'Diagnosis & Prescription'}
            </h2>
            <p className="mobile-copy-optional" style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.88rem' }}>
              {transcript ? 'AI has pre-filled the fields. Correct anything before saving.' : 'Fill in manually, or use the recording button above.'}
            </p>
          </div>

          <div>
            <label>Final Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Pharyngitis"
              required
            />
          </div>

          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Prescription
              <button type="button" onClick={addPrescriptionRow} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.8rem' }}>
                + Add Medicine
              </button>
            </label>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {prescription.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <input
                      placeholder="Drug Name"
                      value={row.drug}
                      onChange={e => updatePrescriptionRow(i, 'drug', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      placeholder="Dose"
                      value={row.dose}
                      onChange={e => updatePrescriptionRow(i, 'dose', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      placeholder="Freq (e.g. 1-0-1)"
                      value={row.frequency}
                      onChange={e => updatePrescriptionRow(i, 'frequency', e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={() => removePrescriptionRow(i)} style={{ color: 'var(--color-error)', border: 'none', background: 'none', paddingBottom: '0.5rem' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label>Follow-up Reminder</label>
            <input
              type="date"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              min={getTodayIsoDate()}
            />
          </div>
        </section>

        <section className="card" style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gap: '0.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Clinical Note (SOAP)</h2>
            <p className="mobile-copy-optional" style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.88rem' }}>
              {transcript ? 'Auto-filled from recording. Edit as needed.' : 'Filled automatically after recording.'}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Subjective</label>
              <textarea value={soap.subjective} onChange={e => setSoap({...soap, subjective: e.target.value})} rows={4} placeholder="Symptoms & history" />
            </div>
            <div>
              <label>Objective</label>
              <textarea value={soap.objective} onChange={e => setSoap({...soap, objective: e.target.value})} rows={4} placeholder="Findings & vitals" />
            </div>
            <div>
              <label>Assessment</label>
              <textarea value={soap.assessment} onChange={e => setSoap({...soap, assessment: e.target.value})} rows={4} placeholder="Evaluation" />
            </div>
            <div>
              <label>Plan</label>
              <textarea value={soap.plan} onChange={e => setSoap({...soap, plan: e.target.value})} rows={4} placeholder="Next steps" />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontSize: '1.1rem',
            boxShadow: 'var(--shadow-md)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Saving Record…' : 'Complete Consultation'}
        </button>
      </form>
    </div>
  );
}
