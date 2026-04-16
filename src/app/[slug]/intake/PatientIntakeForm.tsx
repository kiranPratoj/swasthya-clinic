'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
  mockMode?: boolean;
};

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" fill="currentColor" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" />
    </svg>
  );
}

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
  mockMode = false,
}: PatientIntakeFormProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const stageTimersRef = useRef<number[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const autofillFlashTimerRef = useRef<number | null>(null);

  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [allowSharedMobileNewPatient, setAllowSharedMobileNewPatient] = useState(false);
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
  const [autoFilledFlash, setAutoFilledFlash] = useState(false);
  const [detailsStepVisible, setDetailsStepVisible] = useState(false);
  const [detailsStepLabel, setDetailsStepLabel] = useState<'new' | 'existing' | 'shared-mobile'>('new');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [billAmount, setBillAmount] = useState('');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [patientNameDirty, setPatientNameDirty] = useState(false);
  const [ageDirty, setAgeDirty] = useState(false);
  const [phoneDirty, setPhoneDirty] = useState(false);
  const [visitTypeDirty, setVisitTypeDirty] = useState(false);
  const [complaintDirty, setComplaintDirty] = useState(false);

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
    setPatientName((current) =>
      selectedPatientId || patientNameDirty || current.trim()
        ? current
        : structuredData.patientName ?? current
    );
    setAge((current) =>
      selectedPatientId || ageDirty || current.trim()
        ? current
        : structuredData.age ?? current
    );
    setPhone((current) =>
      selectedPatientId || phoneDirty || current.trim()
        ? current
        : structuredData.phone ?? current
    );
    setComplaint((current) =>
      complaintDirty || current.trim() ? current : structuredData.complaint ?? current
    );
    setVisitType((current) =>
      visitTypeDirty || current !== 'walk-in'
        ? current
        : structuredData.visitType ?? current
    );

    if (autofillFlashTimerRef.current !== null) {
      window.clearTimeout(autofillFlashTimerRef.current);
    }

    setAutoFilledFlash(true);
    autofillFlashTimerRef.current = window.setTimeout(() => {
      setAutoFilledFlash(false);
      autofillFlashTimerRef.current = null;
    }, 1400);
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

    const normalizedBillAmount = billAmount.trim();
    if (normalizedBillAmount && Number.isNaN(Number(normalizedBillAmount.replace(/,/g, '')))) {
      setSubmitError('Enter a valid bill amount.');
      setIsSubmitting(false);
      return;
    }

    if (paymentStatus === 'paid' && !normalizedBillAmount) {
      setSubmitError('Collected payment requires a bill amount.');
      setIsSubmitting(false);
      return;
    }

    if (paymentStatus === 'paid' && paymentMode === 'upi' && !paymentUtr.trim()) {
      setSubmitError('UPI payment requires a UTR number.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('patientName', patientName.trim());
    formData.set('age', age.trim());
    formData.set('phone', phone.trim());
    formData.set('complaint', complaint.trim());
    formData.set('visitType', visitType);
    formData.set('doctorId', doctorId);
    formData.set('bookedFor', bookedFor);
    formData.set('allowSharedMobileNewPatient', allowSharedMobileNewPatient ? 'true' : 'false');
    formData.set('billing_amount', normalizedBillAmount);
    formData.set('payment_utr', paymentUtr.trim());

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
      if (autofillFlashTimerRef.current !== null) {
        window.clearTimeout(autofillFlashTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopMediaTracks();
    };
  }, []);

  const activeProcessingStep = PROCESSING_STEPS[processingStep];
  const transcriptWords = liveTranscript.trim() ? liveTranscript.trim().split(/\s+/) : [];
  const pendingChunk = isRecording
    ? transcriptWords.slice(-2).join(' ')
    : '';
  const confirmedTranscript = pendingChunk
    ? transcriptWords.slice(0, -2).join(' ')
    : liveTranscript.trim();

  function resetForm() {
    setPatientName('');
    setSelectedPatientId('');
    setAllowSharedMobileNewPatient(false);
    setAge('');
    setPhone('');
    setComplaint('');
    setVisitType('walk-in');
    setLiveTranscript('');
    setVoiceDraft(null);
    setVoiceError(null);
    setSubmitError(null);
    setConfirmedToken(null);
    setDetailsStepVisible(false);
    setDetailsStepLabel('new');
    setPaymentMode('cash');
    setPaymentStatus('pending');
    setBillAmount('');
    setPaymentUtr('');
    setPatientNameDirty(false);
    setAgeDirty(false);
    setPhoneDirty(false);
    setVisitTypeDirty(false);
    setComplaintDirty(false);
  }

  const handleExistingPatientFound = useCallback(
    (data: { id: string; name: string; phone: string; age: string } | null) => {
      if (data === null) {
        setPatientName('');
        setSelectedPatientId('');
        setAllowSharedMobileNewPatient(false);
        setAge('');
        setPhone('');
        setComplaint('');
        setVisitType('walk-in');
        setDetailsStepVisible(false);
        setDetailsStepLabel('new');
        setPatientNameDirty(false);
        setAgeDirty(false);
        setPhoneDirty(false);
        setVisitTypeDirty(false);
        setComplaintDirty(false);
        return;
      }

      setPatientName(data.name);
      setSelectedPatientId(data.id);
      setAllowSharedMobileNewPatient(false);
      setAge(data.age);
      setPhone(data.phone);
      setComplaint('');
      setVisitType('walk-in');
      setSubmitError(null);
      setDetailsStepVisible(true);
      setDetailsStepLabel('existing');
      setPatientNameDirty(false);
      setAgeDirty(false);
      setPhoneDirty(false);
      setVisitTypeDirty(false);
      setComplaintDirty(false);
    },
    []
  );

  const handleCreateNewPatient = useCallback((
    lookupPhone: string,
    options?: { allowSharedMobile?: boolean }
  ) => {
    setPatientName('');
    setSelectedPatientId('');
    setAllowSharedMobileNewPatient(Boolean(options?.allowSharedMobile));
    setAge('');
    setPhone(lookupPhone);
    setComplaint('');
    setVisitType('walk-in');
    setSubmitError(null);
    setDetailsStepVisible(true);
    setDetailsStepLabel(options?.allowSharedMobile ? 'shared-mobile' : 'new');
    setPatientNameDirty(false);
    setAgeDirty(false);
    setPhoneDirty(false);
    setVisitTypeDirty(false);
    setComplaintDirty(false);
  }, []);

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
          The token has been created and added to today&apos;s queue.
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
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
            }}
          >
            Step 1
          </p>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Find Patient</h2>
          <p
            className="mobile-copy-optional"
            style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}
          >
            Search by mobile number first.
          </p>
        </div>

        <PatientLookup
          onPatientFound={handleExistingPatientFound}
          onCreateNewPatient={handleCreateNewPatient}
        />
      </section>

      {detailsStepVisible && (
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
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  alignItems: 'end',
                }}
              >
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Step 2
                  </p>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    {detailsStepLabel === 'existing'
                      ? 'Confirm Visit Details'
                      : detailsStepLabel === 'shared-mobile'
                        ? 'Create New Family Patient'
                        : 'Create New Patient'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsStepVisible(false);
                    setSelectedPatientId('');
                    setAllowSharedMobileNewPatient(false);
                    setDetailsStepLabel('new');
                  }}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'white',
                    color: 'var(--color-text)',
                    padding: '0.7rem 1rem',
                    fontWeight: 700,
                  }}
                >
                  Change Number
                </button>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1rem',
                display: 'grid',
                gap: '1rem',
              }}
            >
              {detailsStepLabel === 'shared-mobile' && (
                <div
                  style={{
                    background: 'white',
                    border: '1px solid var(--color-primary-outline)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                  }}
                >
                  Creating a new patient with an existing family mobile number.
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'grid', gap: '0.2rem' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Voice First
                  </p>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Voice Assist</h3>
                </div>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : () => void startRecording()}
                  disabled={mockMode || isProcessingVoice || isSubmitting}
                  className={isRecording ? 'intake-record-button intake-record-button-recording' : 'intake-record-button'}
                  style={{
                    borderRadius: '999px',
                    padding: '0.95rem 1.4rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    minWidth: '11rem',
                  }}
                >
                  <span className="intake-record-button-inner">
                    {isRecording ? <StopIcon /> : <MicIcon />}
                    <span>{isRecording ? 'Stop Recording' : 'Tap to Speak'}</span>
                  </span>
                </button>
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
                  }}
                >
                  Mock mode active. Voice extraction is unavailable.
                </div>
              )}

              <span
                className="intake-voice-helper mobile-copy-optional"
                style={{
                  color: isRecording ? 'var(--color-error)' : 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                {isRecording ? 'Recording live preview...' : 'V1 voice intake supports Kannada or English only.'}
              </span>

              {!isRecording && !isProcessingVoice && !voiceDraft && (
                <p className="intake-hint-text">
                  Say: patient name, age, phone number, and symptoms. For short names or initials, speak slowly and confirm the spelling before saving.
                </p>
              )}

              {isRecording && (
                <div
                  className="intake-transcript-panel"
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
                    {liveTranscript ? (
                      <>
                        {confirmedTranscript && <span>{confirmedTranscript} </span>}
                        {pendingChunk && <span className="intake-pending-chunk">{pendingChunk}</span>}
                      </>
                    ) : (
                      'Listening... / ಕೇಳಲಾಗುತ್ತಿದೆ...'
                    )}
                  </p>
                </div>
              )}

              {isProcessingVoice && (
                <div
                  className="intake-extracting-panel"
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
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <label htmlFor="patientName">Patient Name</label>
                {isProcessingVoice ? (
                  <div className="intake-extracting-skeleton" />
                ) : (
                  <input
                    className={autoFilledFlash ? 'intake-autofilled' : undefined}
                    id="patientName"
                    name="patientName"
                    type="text"
                    value={patientName}
                    onChange={(event) => {
                      setPatientName(event.target.value);
                      setPatientNameDirty(true);
                    }}
                    required
                    placeholder="Enter patient name"
                  />
                )}
              </div>

              <div>
                <label htmlFor="age">Age</label>
                {isProcessingVoice ? (
                  <div className="intake-extracting-skeleton" />
                ) : (
                  <input
                    className={autoFilledFlash ? 'intake-autofilled' : undefined}
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={age}
                    onChange={(event) => {
                      setAge(event.target.value);
                      setAgeDirty(true);
                    }}
                    placeholder="Optional"
                  />
                )}
              </div>

              <div>
                <label htmlFor="phone">Phone</label>
                {isProcessingVoice ? (
                  <div className="intake-extracting-skeleton" />
                ) : (
                  <input
                    className={autoFilledFlash ? 'intake-autofilled' : undefined}
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setPhoneDirty(true);
                      setSelectedPatientId('');
                      setAllowSharedMobileNewPatient(false);
                      if (detailsStepLabel === 'shared-mobile') {
                        setDetailsStepLabel('new');
                      }
                    }}
                    required
                    placeholder="10-digit phone number"
                  />
                )}
              </div>

              <div>
                <label htmlFor="visitType">Visit Type</label>
                {isProcessingVoice ? (
                  <div className="intake-extracting-skeleton" />
                ) : (
                  <select
                    className={autoFilledFlash ? 'intake-autofilled' : undefined}
                    id="visitType"
                    name="visitType"
                    value={visitType}
                    onChange={(event) => {
                      setVisitType(event.target.value as VisitType);
                      setVisitTypeDirty(true);
                    }}
                  >
                    {VISIT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="complaint">Complaint</label>
              {isProcessingVoice ? (
                <div className="intake-extracting-skeleton intake-extracting-skeleton-large" />
              ) : (
                <textarea
                  className={autoFilledFlash ? 'intake-autofilled' : undefined}
                  id="complaint"
                  name="complaint"
                  rows={5}
                  value={complaint}
                  onChange={(event) => {
                    setComplaint(event.target.value);
                    setComplaintDirty(true);
                  }}
                  required
                  placeholder="Describe the chief complaint"
                  style={{ resize: 'vertical' }}
                />
              )}
            </div>

            <input type="hidden" name="doctorId" value={doctorId} />
            <input type="hidden" name="bookedFor" value={bookedFor} />
            <input type="hidden" name="patientId" value={selectedPatientId} />
            <input
              type="hidden"
              name="allowSharedMobileNewPatient"
              value={allowSharedMobileNewPatient ? 'true' : 'false'}
            />
            {/* Payment collection */}
            <div style={{ display: 'grid', gap: '0.75rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>Payment</p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mode</span>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  {(['cash', 'upi'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: paymentMode === mode ? 'none' : '1px solid var(--color-border)',
                        background: paymentMode === mode ? 'var(--color-primary)' : 'white',
                        color: paymentMode === mode ? 'white' : 'var(--color-text)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      {mode === 'cash' ? 'Cash' : 'UPI'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</span>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  {(['pending', 'paid'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setPaymentStatus(status)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: paymentStatus === status ? 'none' : '1px solid var(--color-border)',
                        background: paymentStatus === status
                          ? status === 'paid' ? 'var(--color-success)' : 'var(--color-primary)'
                          : 'white',
                        color: paymentStatus === status ? 'white' : 'var(--color-text)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      {status === 'paid' ? 'Collected' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                <label
                  htmlFor="billingAmount"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  Bill Amount (₹)
                </label>
                <input
                  id="billingAmount"
                  name="billing_amount"
                  inputMode="decimal"
                  value={billAmount}
                  onChange={(event) => setBillAmount(event.target.value)}
                  placeholder="e.g. 300"
                />
              </div>
              {paymentStatus === 'paid' && paymentMode === 'upi' && (
                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  <label
                    htmlFor="paymentUtr"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                    }}
                  >
                    UTR Number
                  </label>
                  <input
                    id="paymentUtr"
                    name="payment_utr"
                    value={paymentUtr}
                    onChange={(event) => setPaymentUtr(event.target.value)}
                    placeholder="Enter UTR"
                  />
                </div>
              )}
              <input type="hidden" name="payment_mode" value={paymentMode} />
              <input type="hidden" name="payment_state" value={paymentStatus} />
            </div>

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
                {isSubmitting ? 'Creating Token...' : 'Create Token'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
