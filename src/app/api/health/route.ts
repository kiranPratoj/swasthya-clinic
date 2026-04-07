import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase connectivity
  try {
    const { error } = await getDb().from('clinics').select('id').limit(1);
    checks.supabase = error ? `error: ${error.message}` : 'ok';
  } catch (e) {
    checks.supabase = `unreachable: ${e instanceof Error ? e.message : 'unknown'}`;
  }

  // Env vars present
  checks.sarvam_key = process.env.SARVAM_API_KEY ? 'ok' : 'missing';
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing';

  const healthy = Object.values(checks).every(v => v === 'ok');

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
