'use server';

import { VoiceDraft } from './types';
import { SarvamAIClient } from 'sarvamai';
import { parseBuffer } from 'music-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractStructuredVoiceDraft } from './aiExtractionAdapter';

const MAX_VOICE_DURATION_TOLERANCE_SECONDS = 30.5;
// Conservative ceiling for a 30s browser speech capture. This blocks oversized uploads even
// when some webm blobs do not expose container duration metadata server-side.
const MAX_VOICE_FILE_BYTES = 512 * 1024;

const emptyStructuredData = {
  applicantName: null,
  mobile: null,
  preferredDay: null,
  mode: null,
  purpose: null,
  summary: '',
  missingFields: ['applicantName', 'mobile', 'preferredDay', 'mode', 'purpose']
};

function truncateErrorMessage(value: string, maxLength = 240): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function extractNestedErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return extractNestedErrorMessage(parsed);
    } catch {
      return trimmed;
    }
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      extractNestedErrorMessage(record.message) ||
      extractNestedErrorMessage(record.error) ||
      extractNestedErrorMessage(record.detail) ||
      extractNestedErrorMessage(record.errors) ||
      null
    );
  }

  return null;
}

function getReadableVoiceProcessingError(error: any): string {
  const statusCode = error?.statusCode ?? error?.status ?? error?.response?.status;
  const detail =
    extractNestedErrorMessage(error?.body) ||
    extractNestedErrorMessage(error?.response?.data) ||
    extractNestedErrorMessage(error?.response?.body) ||
    extractNestedErrorMessage(error?.message) ||
    extractNestedErrorMessage(error);

  if (detail) {
    const prefix = statusCode ? `Backend error ${statusCode}: ` : 'Backend error: ';
    return truncateErrorMessage(`${prefix}${detail}`);
  }

  return 'We could not process your voice input. Please try again or switch to manual entry.';
}

async function readAndValidateAudio(file: File): Promise<
  | { ok: true; buffer: Buffer }
  | { ok: false; error: string }
> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    return { ok: false, error: 'No audio received. Please try again.' };
  }

  if (buffer.length > MAX_VOICE_FILE_BYTES) {
    return { ok: false, error: 'Voice recording must be 30 seconds or less.' };
  }

  return { ok: true, buffer };
}

function getAudioExtension(file: File): string {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.ogg')) return '.ogg';
  if (lowerName.endsWith('.mp4') || lowerName.endsWith('.m4a')) return '.m4a';
  if (lowerName.endsWith('.wav')) return '.wav';
  if ((file.type || '').includes('ogg')) return '.ogg';
  if ((file.type || '').includes('mp4') || (file.type || '').includes('m4a')) return '.m4a';
  if ((file.type || '').includes('wav')) return '.wav';
  return '.webm';
}

async function getAudioDurationSeconds(file: File, buffer: Buffer): Promise<number | null> {
  try {
    const metadata = await parseBuffer(
      buffer,
      { mimeType: file.type || 'audio/webm', size: buffer.length },
      { duration: true }
    );

    return typeof metadata.format.duration === 'number' ? metadata.format.duration : null;
  } catch (error: any) {
    console.warn('Voice duration metadata unavailable:', error?.message);
    return null;
  }
}

async function validateFinalAudio(
  file: File,
  clientDurationMs: number | null
): Promise<
  | { ok: true; buffer: Buffer; durationSeconds: number | null }
  | { ok: false; error: string }
> {
  const baseValidation = await readAndValidateAudio(file);
  if (!baseValidation.ok) {
    return baseValidation;
  }

  const durationSeconds = await getAudioDurationSeconds(file, baseValidation.buffer);
  if (typeof durationSeconds === 'number') {
    if (durationSeconds > MAX_VOICE_DURATION_TOLERANCE_SECONDS) {
      return { ok: false, error: 'Voice recording must be 30 seconds or less.' };
    }

    return { ok: true, buffer: baseValidation.buffer, durationSeconds };
  }

  if (typeof clientDurationMs === 'number') {
    const clientDurationSeconds = clientDurationMs / 1000;
    if (clientDurationSeconds > MAX_VOICE_DURATION_TOLERANCE_SECONDS) {
      return { ok: false, error: 'Voice recording must be 30 seconds or less.' };
    }

    return { ok: true, buffer: baseValidation.buffer, durationSeconds: clientDurationSeconds };
  }

  return { ok: false, error: 'Could not verify recording length. Please try again.' };
}

/**
 * Transcribes a full audio file and returns the transcript string.
 * Used by patientExtractionAdapter for final processing.
 */
export async function transcribeAudio(formData: FormData): Promise<string> {
  const audioFile = formData.get('audio') as File | null;
  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!audioFile || !sarvamKey) return '';

  const clientDurationMsValue = formData.get('durationMs');
  const clientDurationMs = typeof clientDurationMsValue === 'string' ? Number(clientDurationMsValue) : null;

  const validated = await validateFinalAudio(audioFile, Number.isFinite(clientDurationMs) ? clientDurationMs : null);
  if (!validated.ok) throw new Error(validated.error);

  const client = new SarvamAIClient({ apiSubscriptionKey: sarvamKey });
  const tempFilePath = path.join(os.tmpdir(), `transcript_${Date.now()}${getAudioExtension(audioFile)}`);
  fs.writeFileSync(tempFilePath, validated.buffer);

  const response = await client.speechToText.transcribe({
    file: fs.createReadStream(tempFilePath) as any,
    model: 'saaras:v3',
    mode: 'transcribe',
  });
  fs.unlinkSync(tempFilePath);
  return response.transcript?.trim() ?? '';
}

/**
 * Lightweight chunk transcription called every ~2.5s during live recording.
 * Returns a partial transcript string or empty string on failure.
 */
export async function transcribeChunk(formData: FormData): Promise<string> {
  const audioChunk = formData.get('audio') as File | null;
  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!audioChunk || !sarvamKey) return '';

  try {
    const validatedAudio = await readAndValidateAudio(audioChunk);
    if (!validatedAudio.ok) return '';

    const client = new SarvamAIClient({ apiSubscriptionKey: sarvamKey });
    const tempFilePath = path.join(os.tmpdir(), `chunk_${Date.now()}${getAudioExtension(audioChunk)}`);
    fs.writeFileSync(tempFilePath, validatedAudio.buffer);
    const response = await client.speechToText.transcribe({
      file: fs.createReadStream(tempFilePath) as any,
      model: 'saaras:v3',
      mode: 'transcribe'
    });
    fs.unlinkSync(tempFilePath);
    return response.transcript?.trim() ?? '';
  } catch {
    return ''; // Silently degrade — live preview is best-effort
  }
}

export async function processRealVoiceInput(formData: FormData): Promise<VoiceDraft> {
  const audioFile = formData.get('audio') as File | null;
  const category = formData.get('category') as string || 'General';
  const clientDurationMsValue = formData.get('durationMs');
  const clientDurationMs = typeof clientDurationMsValue === 'string' ? Number(clientDurationMsValue) : null;

  if (!audioFile) {
    return {
      id: Math.random().toString(36).substring(7),
      transcript: '',
      structuredData: { ...emptyStructuredData, summary: 'No audio received.' },
      isFallback: true,
      status: 'failed',
      errorMsg: 'No audio received. Please try again.',
    };
  }

  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!sarvamKey) {
    return {
      id: Math.random().toString(36).substring(7),
      transcript: '',
      structuredData: { ...emptyStructuredData, summary: 'Transcription service unavailable.' },
      isFallback: true,
      status: 'failed',
      errorMsg: 'Voice transcription service is temporarily unavailable.',
    };
  }

  try {
    const validatedAudio = await validateFinalAudio(
      audioFile,
      Number.isFinite(clientDurationMs) ? clientDurationMs : null
    );
    if (!validatedAudio.ok) {
      return {
        id: Math.random().toString(36).substring(7),
        transcript: '',
        structuredData: { ...emptyStructuredData, summary: validatedAudio.error },
        isFallback: true,
        status: 'failed',
        errorMsg: validatedAudio.error,
      };
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: sarvamKey });

    // Write audio to temp file for Sarvam SDK streaming.
    const tempFilePath = path.join(os.tmpdir(), `voice_intake_${Date.now()}${getAudioExtension(audioFile)}`);
    fs.writeFileSync(tempFilePath, validatedAudio.buffer);

    // Step 1: Transcribe via Sarvam saaras:v3 (supports Kannada + English).
    const response = await client.speechToText.transcribe({
      file: fs.createReadStream(tempFilePath) as any,
      model: 'saaras:v3',
      mode: 'transcribe'
    });
    fs.unlinkSync(tempFilePath);

    const transcript = response.transcript || '';

    // Step 2: Extract structured fields via Sarvam chat.
    const { structuredData, modelUsed } = await extractStructuredVoiceDraft(transcript, category);

    return {
      id: Math.random().toString(36).substring(7),
      transcript,
      structuredData,
      isFallback: false,
      status: 'ready',
      modelUsed: `saaras:v3 (STT) + ${modelUsed} (extract)`
    };

  } catch (err: any) {
    console.error('Voice STT processing error:', err?.message);
    const readableError = getReadableVoiceProcessingError(err);
    return {
      id: Math.random().toString(36).substring(7),
      transcript: '',
      structuredData: { ...emptyStructuredData, summary: readableError },
      isFallback: true,
      status: 'failed',
      errorMsg: readableError,
    };
  }
}
