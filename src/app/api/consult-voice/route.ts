import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/voiceAdapter';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcript = await transcribeAudio(formData);
    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        transcript: '',
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not transcribe consultation audio.',
      },
      { status: 400 }
    );
  }
}
