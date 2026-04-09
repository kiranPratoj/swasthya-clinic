'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAppointment } from '@/app/actions';
import { synthesizeKannadaSpeech } from '@/lib/ttsAdapter';
import type { PatientIntakeDraft, VisitType, VoiceDraft } from '@/lib/types';
import PatientLookup from './PatientLookup';

const PROCESSING_STEPS = [
  {
    english: 'Sending audio...',
    kannada: 'ಆಡಿಯೋ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ',
    delayMs: 1200,
  },
  {
    english: 'Transcribing patient details...',
    kannada: 'ರೋಗಿಯ ವಿವರ ಪಠ್ಯಕ್ಕೆ ಪರಿವರ್ತಿಸಲಾಗುತ್ತಿದೆ',
    delayMs: 2000,
  },
  {
    english: 'Extracting with AI...',
    kannada: 'AI ಮೂಲಕ ಮಾಹಿತಿ ತೆಗೆಯಲಾಗುತ್ತಿದೆ',
    delayMs: 2000,
  },
  {
    english: 'Preparing form...',
    kannada: 'ಫಾರ್ಮ್ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ',
    delayMs: null,
  },
] as const;

const VISIT_TYPE_OPTIONS: Array<{ value: VisitType; label: string }> = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'booked', label: 'Booked' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
];

const MISSING_FIELD_TRANSLATIONS: Record<string, string> = {
  'Patient Name': 'ರೋಗಿಯ ಹೆಸರು',
  Age: 'ವಯಸ್ಸು',
  Phone: 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
  Complaint: 'ಅಸೌಖ್ಯ ವಿವರ',
  'Visit Type': 'ಭೇಟಿ ವಿಧ',
};

const EMPTY_DRAFT: PatientIntakeDraft = {
  patientName: null,
  age: null,
  phone: null,
  complaint: null,
  visitType: null,
  summary: '',
  missingFields: [],
};

type PatientIntakeFormProps = {
  doctorId: string;
  slug: string;
  mockMode?: boolean;
};

function getTodayIsoDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().split('T')[0];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function dedupeTranscript(current: string, nextChunk: string): string {
  const trimmedChunk = nextChunk.trim();
  if (!trimmedChunk) {
    return current;
  }

  if (!current.trim()) {
    return trimmedChunk;
  }

  if (current.trim().endsWith(trimmedChunk)) {
    return current;
  }

  return `${current.trim()} ${trimmedChunk}`.trim();
}

export default function PatientIntakeForm({
  doctorId,
  slug,
  mockMode = false,
}: PatientIntakeFormProps) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const stageTimersRef = useRef<number[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('walk-in');

  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedToken, setConfirmedToken] = useState<number | null>(null);

  const bookedFor = getTodayIsoDate();
  const missingFields = voiceDraft?.structuredData.missingFields ?? [];

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;
  }

  function clearStageTimers() {
    stageTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    stageTimersRef.current = [];
  }

  function startProcessingStageTimers() {
    clearStageTimers();
    setProcessingStep(0);

    let accumulatedDelay = 0;

    PROCESSING_STEPS.forEach((step, index) => {
      if (index === 0 || step.delayMs === null) {
        return;
      }

      accumulatedDelay += PROCESSING_STEPS[index - 1].delayMs ?? 0;
      stageTimersRef.current.push(
        window.setTimeout(() => {
          setProcessingStep(index);
        }, accumulatedDelay)
      );
    });
  }

  function applyStructuredData(structuredData: PatientIntakeDraft) {
    setPatientName((current) => structuredData.patientName ?? current);
    setAge((current) => structuredData.age ?? current);
    setPhone((current) => structuredData.phone ?? current);
    setComplaint((current) => structuredData.complaint ?? current);
    setVisitType((current) => structuredData.visitType ?? current);
  }

  async function playReadySpeech() {
    try {
      const result = await synthesizeKannadaSpeech('ರೋಗಿಯ ಮಾಹಿತಿ ದಾಖಲಾಗಿದೆ');
      if (!result.audioBase64) {
        return;
      }

      const audio = new Audio(`data:audio/wav;base64,${result.audioBase64}`);
      await audio.play();
    } catch {
      // Autoplay or network failures should not block intake.
    }
  }

  async function uploadChunkForPreview(blob: Blob) {
    const formData = new FormData();
    const chunkFile = new File([blob], `chunk-${Date.now()}.webm`, {
      type: blob.type || 'audio/webm',
    });
    formData.set('audio', chunkFile);

    try {
      const response = await fetch('/api/transcribe-chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return;
      }

      const rawBody = await response.text();
      let nextTranscript = rawBody.trim();

      try {
        const parsed = JSON.parse(rawBody) as
          | string
          | { transcript?: string; text?: string; chunkTranscript?: string };

        if (typeof parsed === 'string') {
          nextTranscript = parsed.trim();
        } else {
          nextTranscript = (
            parsed.transcript ??
            parsed.text ??
            parsed.chunkTranscript ??
            ''
          ).trim();
        }
      } catch {
        // Plain-text responses are acceptable here.
      }

      if (nextTranscript) {
        setLiveTranscript((current) => dedupeTranscript(current, nextTranscript));
      }
    } catch {
      // Live preview is best-effort only.
    }
  }

  async function processFullRecording(audioBlob: Blob, durationMs: number) {
    startProcessingStageTimers();
    setIsProcessingVoice(true);
    setVoiceError(null);
    setVoiceDraft(null);

    const formData = new FormData();
    const audioFile = new File([audioBlob], `patient-intake-${Date.now()}.webm`, {
      type: audioBlob.type || 'audio/webm',
    });
    formData.set('audio', audioFile);
    formData.set('durationMs', String(durationMs));

    try {
      const response = await fetch('/api/intake-voice', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as VoiceDraft | { error?: string };

      if (!response.ok || !('status' in payload)) {
        throw new Error(
          'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Voice intake failed.'
        );
      }

      setProcessingStep(3);
      setVoiceDraft(payload);

      if (payload.status === 'ready') {
        applyStructuredData(payload.structuredData);
        void playReadySpeech();
      } else {
        setVoiceError(payload.errorMsg ?? 'Could not process the recording. Please try again.');
      }
    } catch (error: unknown) {
      setVoiceDraft({
        id: 'voice-draft-error',
        transcript: '',
        structuredData: EMPTY_DRAFT,
        status: 'failed',
        isFallback: true,
        errorMsg: getErrorMessage(error),
      });
      setVoiceError(getErrorMessage(error));
    } finally {
      clearStageTimers();
      setIsProcessingVoice(false);
    }
  }

  async function startRecording() {
    if (isRecording || isProcessingVoice) {
      return;
    }

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setVoiceError('Voice recording is only available in a browser.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('This browser does not support microphone recording.');
      return;
    }

    try {
      setVoiceError(null);
      setSubmitError(null);
      setLiveTranscript('');
      setVoiceDraft(null);
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) {
          return;
        }

        recordedChunksRef.current.push(event.data);
        void uploadChunkForPreview(event.data);
      };

      recorder.onstop = () => {
        stopMediaTracks();
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (finalBlob.size === 0) {
          setVoiceError('No audio was captured. Please try again.');
          return;
        }

        void processFullRecording(finalBlob, durationMs);
      };

      recorder.start(3000);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error: unknown) {
      stopMediaTracks();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setVoiceError(getErrorMessage(error));
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set('patientName', patientName.trim());
    formData.set('age', age.trim());
    formData.set('phone', phone.trim());
    formData.set('complaint', complaint.trim());
    formData.set('visitType', visitType);
    formData.set('doctorId', doctorId);
    formData.set('bookedFor', bookedFor);

    try {
      const result = await createAppointment(formData);
      setConfirmedToken(result.tokenNumber);
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    return () => {
      clearStageTimers();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopMediaTracks();
    };
  }, []);

  const activeProcessingStep = PROCESSING_STEPS[processingStep];

  function resetForm() {
    setPatientName('');
    setAge('');
    setPhone('');
    setComplaint('');
    setVisitType('walk-in');
    setLiveTranscript('');
    setVoiceDraft(null);
    setVoiceError(null);
    setSubmitError(null);
    setConfirmedToken(null);
  }

  if (confirmedToken !== null) {
    return (
      <div
        style={{
          background: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2.5rem',
          textAlign: 'center',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: '5rem',
            height: '5rem',
            borderRadius: '999px',
            background: 'var(--color-accent)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '2rem',
            fontWeight: 800,
            margin: '0 auto',
          }}
        >
          #{confirmedToken}
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>
          Token #{confirmedToken} — Patient registered
        </h2>
        <p style={{ color: '#15803d' }}>
          The appointment has been created and added to today&apos;s queue.
        </p>
        <button
          type="button"
          onClick={resetForm}
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.95rem 1.5rem',
            background: 'var(--color-primary)',
            color: 'white',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            alignSelf: 'center',
            justifySelf: 'center',
          }}
        >
          Register Another
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '1.5rem',
      }}
    >
      <section
        style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Voice Intake</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Record the patient details, then confirm the extracted fields before creating the appointment token.
          </p>
        </div>

        {mockMode && (
          <div
            style={{
              background: 'var(--color-warning-bg)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--color-warning)',
              border: '1px solid var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠️</span>
            <span>MOCK MODE ACTIVE — Voice extraction is disabled because SARVAM_API_KEY is missing.</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={isRecording ? stopRecording : () => void startRecording()}
            disabled={mockMode || isProcessingVoice || isSubmitting}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '0.95rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: isRecording ? 'var(--color-error)' : 'var(--color-primary)',
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '11rem',
            }}
          >
            {isRecording ? 'Stop Recording' : 'Tap to Speak'}
          </button>

          <span
            style={{
              color: isRecording ? 'var(--color-error)' : 'var(--color-text-muted)',
              fontWeight: 600,
            }}
          >
            {isRecording
              ? 'Recording live preview...'
              : 'Kannada or English speech supported.'}
          </span>
        </div>

        {isRecording && (
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#c2410c',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Live Transcript
            </span>
            <p style={{ color: '#9a3412', minHeight: '3.5rem' }}>
              {liveTranscript || 'Listening... / ಕೇಳಲಾಗುತ್ತಿದೆ...'}
            </p>
          </div>
        )}

        {isProcessingVoice && (
          <div
            style={{
              background: 'var(--color-primary-soft)',
              border: '1px solid var(--color-primary-outline)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'grid',
              gap: '0.85rem',
            }}
          >
            <div>
              <p style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                {activeProcessingStep.english}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                {activeProcessingStep.kannada}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {PROCESSING_STEPS.map((step, index) => {
                const isActive = index === processingStep;
                const isComplete = index < processingStep;

                return (
                  <div
                    key={step.english}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4rem 1fr',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: '1.1rem',
                        height: '1.1rem',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isComplete
                          ? 'var(--color-accent)'
                          : isActive
                            ? 'var(--color-gold)'
                            : 'white',
                        color: isComplete || isActive ? 'white' : 'var(--color-text-muted)',
                        border: isComplete || isActive ? 'none' : '1px solid var(--color-border)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {isComplete ? '✓' : index + 1}
                    </span>
                    <div>
                      <p style={{ fontWeight: 700 }}>{step.english}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                        {step.kannada}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {voiceDraft?.status === 'ready' && voiceDraft.transcript && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--color-success)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Extracted Transcript
            </span>
            <p style={{ color: '#166534' }}>{voiceDraft.transcript}</p>
          </div>
        )}

        {voiceDraft?.status === 'ready' && voiceDraft.structuredData.summary && (
          <div
            style={{
              background: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
            }}
          >
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              Intake Summary
            </p>
            <p>{voiceDraft.structuredData.summary}</p>
          </div>
        )}

        {missingFields.length > 0 && (
          <div
            style={{
              background: 'var(--color-warning-bg)',
              border: '1px solid #fcd34d',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'grid',
              gap: '0.55rem',
            }}
          >
            <p style={{ fontWeight: 800, color: 'var(--color-warning)' }}>
              Missing fields need confirmation
            </p>
            <p style={{ color: '#92400e' }}>
              ದಯವಿಟ್ಟು ಕೆಳಗಿನ ವಿವರಗಳನ್ನು ಕೈಯಾರೆ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪೂರ್ಣಗೊಳಿಸಿ.
            </p>
            <p style={{ color: '#92400e', fontWeight: 600 }}>
              {missingFields
                .map((field) => `${field} / ${MISSING_FIELD_TRANSLATIONS[field] ?? field}`)
                .join(', ')}
            </p>
          </div>
        )}

        {voiceError && (
          <div
            style={{
              background: 'var(--color-error-bg)',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-lg)',
              padding: '0.9rem 1rem',
              color: 'var(--color-error)',
              fontWeight: 600,
            }}
          >
            {voiceError}
          </div>
        )}
      </section>

      <div className="input-safe-area">
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '1.5rem',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Patient Details</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Review the voice draft and update anything the receptionist wants to correct.
          </p>
        </div>

        <PatientLookup
          onPatientFound={({ name, phone: nextPhone, age: nextAge }) => {
            if (name) {
              setPatientName(name);
            }

            if (nextAge) {
              setAge(nextAge);
            }

            setPhone(nextPhone);
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="patientName">Patient Name</label>
            <input
              id="patientName"
              name="patientName"
              type="text"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              required
              placeholder="Enter patient name"
            />
          </div>

          <div>
            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              min="0"
              inputMode="numeric"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="10-digit phone number"
            />
          </div>

          <div>
            <label htmlFor="visitType">Visit Type</label>
            <select
              id="visitType"
              name="visitType"
              value={visitType}
              onChange={(event) => setVisitType(event.target.value as VisitType)}
            >
              {VISIT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="complaint">Complaint</label>
          <textarea
            id="complaint"
            name="complaint"
            rows={5}
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            required
            placeholder="Describe the chief complaint"
            style={{ resize: 'vertical' }}
          />
        </div>

        <input type="hidden" name="doctorId" value={doctorId} />
        <input type="hidden" name="bookedFor" value={bookedFor} />

        {submitError && (
          <div
            style={{
              background: 'var(--color-error-bg)',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-lg)',
              padding: '0.9rem 1rem',
              color: 'var(--color-error)',
              fontWeight: 600,
            }}
          >
            {submitError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
            Appointment date: <strong style={{ color: 'var(--color-text)' }}>{bookedFor}</strong>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isProcessingVoice}
            style={{
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.95rem 1.4rem',
              background: 'var(--color-accent)',
              color: 'white',
              fontWeight: 800,
              minWidth: '12rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isSubmitting ? 'Creating Token...' : 'Create Appointment'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
