import { PatientIntakeDraft, VisitType, VoiceDraft } from './types';
import { requestSarvamToolObject } from './sarvamChatAdapter';

const VALID_VISIT_TYPES: VisitType[] = ['walk-in', 'booked', 'follow-up', 'emergency'];

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeVisitType(value: unknown): VisitType | null {
  const raw = normalizeNullableText(value)?.toLowerCase() ?? null;
  if (!raw) return null;
  if (raw.includes('emergency')) return 'emergency';
  if (raw.includes('follow')) return 'follow-up';
  if (raw.includes('book')) return 'booked';
  if (raw.includes('walk')) return 'walk-in';
  return null;
}

export async function extractPatientIntakeDraft(
  transcript: string
): Promise<{ structuredData: PatientIntakeDraft; modelUsed: string }> {
  let structuredData: PatientIntakeDraft = {
    patientName: null,
    age: null,
    phone: null,
    complaint: null,
    visitType: null,
    summary: transcript,
    missingFields: [],
  };

  if (!process.env.SARVAM_API_KEY || transcript.trim().length === 0) {
    structuredData.missingFields = ['Patient Name', 'Age', 'Phone', 'Complaint', 'Visit Type'];
    return { structuredData, modelUsed: 'mock-fallback' };
  }

  let modelUsed = 'sarvam-fallback';

  try {
    const { parsed, modelUsed: sarvamModel } = await requestSarvamToolObject<{
      patientName?: string | null;
      age?: string | null;
      phone?: string | null;
      complaint?: string | null;
      visitType?: string | null;
      summary?: string;
    }>({
      systemPrompt: `You extract structured patient intake fields from receptionist voice transcripts at Indian clinics.
Use the provided function tool to return extracted fields.

Rules:
- Never guess missing details. Use null when a field is missing.
- patientName: full name as spoken, or null.
- age: numeric string only ("45"), or null.
- phone: digits only, no spaces or dashes, or null.
- complaint: 5-10 word summary of the chief complaint, or null.
- visitType: one of "walk-in", "booked", "follow-up", "emergency", or null.
- summary: clean one-sentence summary of the intake in official language.
Only call the function. Do not answer in plain text.`,
      userPrompt: `Transcript: """${transcript}"""`,
      toolName: 'extract_patient_intake',
      toolDescription: 'Extracts structured patient intake details from a receptionist voice transcript.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', nullable: true },
          age:         { type: 'string', nullable: true },
          phone:       { type: 'string', nullable: true },
          complaint:   { type: 'string', nullable: true },
          visitType:   { type: 'string', nullable: true },
          summary:     { type: 'string' },
        },
        required: ['summary'],
      },
      maxTokens: 600,
    });

    modelUsed = sarvamModel;

    structuredData = {
      ...structuredData,
      patientName: normalizeNullableText(parsed.patientName),
      age:         normalizeNullableText(parsed.age),
      phone:       normalizeNullableText(parsed.phone)?.replace(/[^\d+]/g, '') ?? null,
      complaint:   normalizeNullableText(parsed.complaint),
      visitType:   normalizeVisitType(parsed.visitType),
      summary:     normalizeNullableText(parsed.summary) ?? transcript,
    };

    const missing: string[] = [];
    if (!structuredData.patientName) missing.push('Patient Name');
    if (!structuredData.phone)       missing.push('Phone');
    if (!structuredData.complaint)   missing.push('Complaint');
    if (!structuredData.visitType)   missing.push('Visit Type');
    structuredData.missingFields = missing;

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Patient extraction error:', msg);
    structuredData.missingFields = ['Patient Name', 'Phone', 'Complaint', 'Visit Type'];
    modelUsed = 'error-fallback';
  }

  return { structuredData, modelUsed };
}

export async function processPatientVoiceInput(fd: FormData): Promise<VoiceDraft> {
  const { transcribeAudio } = await import('./voiceAdapter');

  try {
    const transcript = await transcribeAudio(fd);

    if (!transcript || transcript.trim().length === 0) {
      return {
        id: 'temp',
        transcript: '',
        structuredData: {
          patientName: null, age: null, phone: null,
          complaint: null, visitType: null,
          summary: 'Could not transcribe audio.',
          missingFields: ['Patient Name', 'Phone', 'Complaint', 'Visit Type'],
        },
        isFallback: true,
        status: 'failed',
        errorMsg: 'Could not transcribe audio. Please try again.',
      };
    }

    const { structuredData, modelUsed } = await extractPatientIntakeDraft(transcript);

    return {
      id: 'temp',
      transcript,
      structuredData,
      isFallback: false,
      status: 'ready',
      modelUsed,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Processing failed';
    return {
      id: 'temp',
      transcript: '',
      structuredData: {
        patientName: null, age: null, phone: null,
        complaint: null, visitType: null,
        summary: '',
        missingFields: ['Patient Name', 'Phone', 'Complaint', 'Visit Type'],
      },
      isFallback: true,
      status: 'failed',
      errorMsg: msg,
    };
  }
}
