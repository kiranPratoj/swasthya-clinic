import { NextRequest, NextResponse } from 'next/server';
import { transcribeChunk } from '@/lib/voiceAdapter';

export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const transcript = await transcribeChunk(fd);
    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ transcript: '' });
  }
}
