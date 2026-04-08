import { NextRequest, NextResponse } from 'next/server';
import { synthesizeKannadaSpeech } from '@/lib/ttsAdapter';

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string; language?: string };

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
  }

  const { audioBase64, error } = await synthesizeKannadaSpeech(text);

  if (error || !audioBase64) {
    return NextResponse.json({ error: error ?? 'TTS failed.' }, { status: 500 });
  }

  return NextResponse.json({ audioBase64 });
}
