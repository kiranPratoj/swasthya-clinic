'use server';

import { SarvamAIClient } from 'sarvamai';

/**
 * Synthesize speech in Kannada using Sarvam AI bulbul:v3
 * Returns a base64-encoded WAV string ready for <audio> src
 */
export async function synthesizeKannadaSpeech(text: string): Promise<{ audioBase64: string | null; error?: string }> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return { audioBase64: null, error: 'TTS service unavailable.' };
  }

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    const response = await client.textToSpeech.convert({
      text,
      target_language_code: 'kn-IN',
      model: 'bulbul:v3',
      speaker: 'anand',   // male, clear voice
      pace: 0.9,
    });

    const audio = response.audios?.[0] ?? null;
    if (!audio) return { audioBase64: null, error: 'No audio generated.' };

    return { audioBase64: audio };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sarvam TTS error:', message);
    return { audioBase64: null, error: 'Speech synthesis failed.' };
  }
}
