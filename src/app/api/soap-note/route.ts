import { NextRequest, NextResponse } from 'next/server';
import { requestSarvamToolObject } from '@/lib/sarvamChatAdapter';

type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export async function POST(req: NextRequest) {
  const { transcript } = await req.json() as { transcript: string };

  if (!transcript || !transcript.trim()) {
    return NextResponse.json(
      { error: 'No transcript provided.' },
      { status: 400 }
    );
  }

  const { parsed } = await requestSarvamToolObject<SoapNote>({
    systemPrompt:
      'You are a medical scribe. Convert the consultation transcript into a structured SOAP note.',
    userPrompt: transcript,
    toolName: 'generate_soap_note',
    toolDescription:
      'Generate a SOAP note from a consultation transcript. Return JSON with subjective, objective, assessment, and plan fields.',
    parameters: {
      type: 'object',
      properties: {
        subjective: { type: 'string', description: "Patient's reported symptoms and history" },
        objective: { type: 'string', description: 'Observable findings and measurements' },
        assessment: { type: 'string', description: 'Diagnosis or clinical impression' },
        plan: { type: 'string', description: 'Treatment plan and next steps' },
      },
      required: ['subjective', 'objective', 'assessment', 'plan'],
    },
    maxTokens: 900,
  });

  return NextResponse.json(parsed);
}
