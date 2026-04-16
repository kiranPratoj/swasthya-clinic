import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrNull } from '@/lib/auth';
import { getDb, getClinicDb } from '@/lib/db';
import { parseReport } from '@/lib/reportParsingAdapter';
import type { ReportType } from '@/lib/types';

// OCR polling takes up to 90s — extend function timeout beyond Next.js 30s default
export const maxDuration = 300;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_REPORT_TYPES = new Set<ReportType>([
  'blood_test',
  'xray',
  'scan',
  'prescription',
  'other',
]);

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: 'You must be signed in to upload reports.' }, { status: 401 });
  }

  const { clinicId, role } = session;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const patientId = formData.get('patientId') as string | null;
  const reportType = (formData.get('reportType') as string | null) ?? 'other';
  const appointmentId = (formData.get('appointmentId') as string | null) || null;

  if (!file) return NextResponse.json({ error: 'No file selected.' }, { status: 400 });
  if (!patientId) return NextResponse.json({ error: 'Patient ID missing.' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large. Please use a file under 10 MB.' }, { status: 413 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF or photo (JPEG, PNG).' },
      { status: 415 }
    );
  }

  const safeReportType: ReportType = ALLOWED_REPORT_TYPES.has(reportType as ReportType)
    ? (reportType as ReportType)
    : 'other';

  // Sanitise filename — strip path separators and limit length
  const safeName = file.name.replace(/[/\\]/g, '_').slice(0, 200);
  const storagePath = `${clinicId}/${patientId}/${Date.now()}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Upload to Supabase Storage (service role — private bucket)
  const db = getDb();
  const { error: uploadError } = await db.storage
    .from('clinic-reports')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload-report] storage upload error:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed. Please check your connection and try again.' }, { status: 500 });
  }

  // 2. Parse content with AI (never blocks — returns nulls on failure)
  const { rawSummary, parsedData } = await parseReport(buffer, file.type);

  // 3. Persist metadata to patient_reports
  const clinicDb = getClinicDb(clinicId);
  const { data: report, error: insertError } = await clinicDb
    .from('patient_reports')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: appointmentId,
      file_name: safeName,
      file_path: storagePath,
      mime_type: file.type,
      report_type: safeReportType,
      raw_summary: rawSummary,
      parsed_data: parsedData,
      uploaded_by_role: role,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[upload-report] db insert error:', insertError.message);
    // Clean up orphaned file so storage quota isn't wasted
    await db.storage.from('clinic-reports').remove([storagePath]);
    return NextResponse.json({ error: 'Could not save the report. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    reportId: report.id,
    rawSummary,
    parsedData,
  });
}
