import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrNull } from '@/lib/auth';
import { processPatientVoiceInput } from '@/lib/patientExtractionAdapter';

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json(
      { error: 'You must be signed in to use voice intake.' },
      { status: 401 }
    );
  }

  try {
    const fd = await request.formData();
    const draft = await processPatientVoiceInput(fd);
    return NextResponse.json(draft);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Voice processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
