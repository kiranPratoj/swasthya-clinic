import { PatientIntakeDraft, VisitType, VoiceDraft } from './types';
import { requestSarvamToolObject } from './sarvamChatAdapter';

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizePatientName(value: unknown): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;

  const cleaned = raw
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[,:;]+$/g, '')
    .trim();

  if (!cleaned) return null;
  if (/[0-9]/.test(cleaned)) return null;
  if (/[?!।,\n]/.test(cleaned)) return null;

  const lowered = cleaned.toLowerCase();
  if (
    lowered.includes('mobile') ||
    lowered.includes('phone') ||
    lowered.includes('complaint') ||
    lowered.includes('visit') ||
    lowered.includes('patient name') ||
    lowered.includes('ರೋಗಿ') ||
    lowered.includes('ಹೆಸರು') ||
    lowered.includes('ವಯಸ್ಸು')
  ) {
    return null;
  }

  const words = cleaned.split(/\s+/);
  if (words.length > 5) return null;

  return cleaned;
}

function normalizePhone(value: unknown): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

function normalizeAge(value: unknown): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;
  const match = raw.match(/\b(\d{1,3})\b/);
  return match?.[1] ?? null;
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

function normalizeComplaint(value: unknown): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;

  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (looksLikeQuestionSegment(cleaned)) return null;

  const lowered = cleaned.toLowerCase();
  if (
    lowered.startsWith('patient name') ||
    lowered.startsWith('phone') ||
    lowered.startsWith('mobile') ||
    lowered.startsWith('visit type')
  ) {
    return null;
  }

  return cleaned.length > 160 ? cleaned.slice(0, 160).trim() : cleaned;
}

function splitTranscriptSegments(text: string): string[] {
  return text
    .split(/[?!.।\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function looksLikeQuestionSegment(segment: string): boolean {
  const normalized = segment.toLowerCase();
  return (
    normalized.includes('ಹೇಳಿ') ||
    normalized.includes('ಎಷ್ಟು') ||
    normalized.includes('ಇದೆಯಾ') ||
    normalized.includes('ಇಲ್ಲವಾ') ||
    normalized.includes('ಬೇರೆ ಏನು') ||
    normalized.includes('what') ||
    normalized.includes('how many') ||
    normalized.includes('how long')
  );
}

function extractComplaintFromAnswers(text: string): string | null {
  const answerSegments = splitTranscriptSegments(text)
    .filter((segment) => !looksLikeQuestionSegment(segment))
    .map((segment) =>
      segment
        .replace(/^(?:ಓಕೆ|ಸರಿ|okay|ok|ಹೌದು|yes|ಇಲ್ಲ ಸರ್|ಇಲ್ಲ)\s*[,\-:]?\s*/i, '')
        .trim()
    )
    .filter((segment) => segment.length > 1)
    .filter((segment) => !/^ಇಲ್ಲ\b/i.test(segment));

  if (answerSegments.length === 0) {
    return null;
  }

  const complaint = answerSegments.join(', ');
  return complaint.length > 140 ? complaint.slice(0, 140).trim() : complaint;
}

function extractHeuristicFields(source: string): Partial<PatientIntakeDraft> {
  const text = source.trim();
  if (!text) {
    return {};
  }

  const phoneMatch = text.match(/(?:\+91[\s-]?)?(\d{10})/);
  const ageMatch =
    text.match(/(?:age|aged|ವಯಸ್ಸು|ವಯಸ್ಸಿನ|ವಯಸ್ಸು\s*ಸುಮಾರು)\D{0,8}(\d{1,3})/i) ??
    text.match(/\b(\d{1,3})\s*(?:years?|yrs?)\b/i);

  const complaintMatch =
    text.match(/(?:complaint|symptoms?|issue|problem|c\/o|ಕಂಪ್ಲೈಂಟ್|ದೂರು|ತೊಂದರೆ|ಲಕ್ಷಣಗಳು)[:\s-]*(.+)$/i) ??
    text.match(/(?:\d{10})[,，\s-]*(.+)$/);

  const firstSegment = text.split(/[,\n]/).map((part) => part.trim()).find(Boolean) ?? '';
  const hasExplicitNameMarker = /(?:patient name|name|ರೋಗಿ ಹೆಸರು|ಹೆಸರು|ಪೇಷಂಟ್ ಹೆಸರು|ಪೇಷಂಟ್ ನೇಮ್)/i.test(firstSegment);
  const cleanedName = hasExplicitNameMarker
    ? firstSegment
        .replace(/^(?:patient|name|patient name|ರೋಗಿ|ರೋಗಿ ಹೆಸರು|ಹೆಸರು|ಪೇಷಂಟ್|ಪೇಷಂಟ್ ಹೆಸರು|ಪೇಷಂಟ್ ನೇಮ್)[:\s-]*/i, '')
        .replace(/(?:age|aged|ವಯಸ್ಸು|mobile|phone|ಮೊಬೈಲ್|ದೂರವಾಣಿ).*/i, '')
        .trim()
    : '';

  const cleanedComplaint = normalizeNullableText(complaintMatch?.[1])
    ?.replace(/^\d+\s*,\s*/, '')
    ?.replace(/^(?:complaint|ಕಂಪ್ಲೈಂಟ್)[:\s-]*/i, '')
    ?.trim() ?? extractComplaintFromAnswers(text);

  return {
    patientName: cleanedName && cleanedName.length > 1 ? cleanedName : null,
    age: ageMatch?.[1] ?? null,
    phone: phoneMatch?.[1] ?? null,
    complaint: cleanedComplaint,
    visitType: normalizeVisitType(text),
  };
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
      patient_name?: string | null;
      age?: string | null;
      phone?: string | null;
      mobile?: string | null;
      complaint?: string | null;
      visitType?: string | null;
      visit_type?: string | null;
      summary?: string;
    }>({
      systemPrompt: `You extract structured patient intake fields from receptionist voice transcripts at Indian clinics.
Use the provided function tool to return extracted fields.

Rules:
- Never guess missing details. Use null when a field is missing.
- Ignore receptionist or doctor questions. Extract only confirmed patient facts from the answers.
- If the transcript is a back-and-forth conversation, do not copy the question text into patientName or complaint.
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

    const heuristic = extractHeuristicFields(
      [transcript, normalizeNullableText(parsed.summary) ?? ''].filter(Boolean).join(', ')
    );

    structuredData = {
      ...structuredData,
      patientName:
        normalizePatientName(parsed.patientName) ??
        normalizePatientName(parsed.patient_name) ??
        heuristic.patientName ??
        null,
      age:
        normalizeAge(parsed.age) ??
        heuristic.age ??
        null,
      phone:
        normalizePhone(parsed.phone) ??
        normalizePhone(parsed.mobile) ??
        heuristic.phone ??
        null,
      complaint:
        normalizeComplaint(parsed.complaint) ??
        heuristic.complaint ??
        null,
      visitType:
        normalizeVisitType(parsed.visitType) ??
        normalizeVisitType(parsed.visit_type) ??
        heuristic.visitType ??
        null,
      summary: normalizeNullableText(parsed.summary) ?? transcript,
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
    const heuristic = extractHeuristicFields(transcript);
    structuredData = {
      ...structuredData,
      patientName: heuristic.patientName ?? null,
      age: heuristic.age ?? null,
      phone: heuristic.phone ?? null,
      complaint: heuristic.complaint ?? null,
      visitType: heuristic.visitType ?? null,
    };

    const missing: string[] = [];
    if (!structuredData.patientName) missing.push('Patient Name');
    if (!structuredData.phone) missing.push('Phone');
    if (!structuredData.complaint) missing.push('Complaint');
    if (!structuredData.visitType) missing.push('Visit Type');
    structuredData.missingFields = missing;
    modelUsed = 'error-fallback';
  }

  return { structuredData, modelUsed };
}

export async function processPatientVoiceInput(fd: FormData): Promise<VoiceDraft> {
  const { transcribeAudioWithMetadata } = await import('./voiceAdapter');
  const supportedLanguageCodes = new Set(['kn-IN', 'en-IN']);

  try {
    const { transcript, languageCode } = await transcribeAudioWithMetadata(fd);

    if (languageCode && !supportedLanguageCodes.has(languageCode)) {
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
        errorMsg: 'Voice intake currently supports Kannada or English only. Please switch to manual entry for other languages.',
      };
    }

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
