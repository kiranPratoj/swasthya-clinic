import { SarvamAIClient } from 'sarvamai';
import JSZip from 'jszip';
import { requestSarvamToolObject } from './sarvamChatAdapter';
import type { ParsedReportData } from './types';

// pdf-parse v2 uses pdfjs-dist web workers which break in Next.js server.
// Both PDFs and images go through Sarvam Document Intelligence (OCR).

type ReportParseResult = {
  rawSummary: string | null;
  parsedData: ParsedReportData | null;
};

const EXTRACT_TOOL_PARAMS = {
  toolName: 'extract_report',
  toolDescription: 'Extracts structured lab report data from text',
  parameters: {
    type: 'object' as const,
    properties: {
      lab_name: { type: 'string', description: 'Name of the lab or diagnostic centre (e.g. TruScan Diagnostics). Do not use barcodes or ID numbers.' },
      report_date: { type: 'string', description: 'Reporting or result date (YYYY-MM-DD)' },
      collection_date: { type: 'string', description: 'Sample collection date (YYYY-MM-DD)' },
      referral: { type: 'string', description: 'Referring doctor or referral source' },
      sample_type: { type: 'string', description: 'Sample type e.g. EDTA, Serum, Urine' },
      tests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            unit: { type: 'string' },
            ref_range: { type: 'string' },
            flag: { type: 'string', enum: ['high', 'low', 'normal'] },
          },
          required: ['name', 'value'],
        },
      },
    },
  },
};

function extractRelevantSection(text: string): string {
  // Sarvam Doc Intelligence embeds base64 images inline — strip them first.
  // These can be 30KB+ each, making the markdown 70KB+ for a simple PDF.
  const stripped = text.replace(/!\[Image\]\(data:[^)]{20,}\)/g, '[image]');

  // The test data is often in an HTML <table> element
  const tableMatch = stripped.match(/<table[\s\S]*?<\/table>/i);
  if (tableMatch) {
    // Include up to 1500 chars before the table for header context (lab name, collection date, referral, sample type)
    const tableIdx = stripped.indexOf(tableMatch[0]);
    const start = Math.max(0, tableIdx - 1500);
    return stripped.slice(start, tableIdx + tableMatch[0].length + 500);
  }

  // Fallback: find test keywords and return surrounding text
  const markers = ['test description', 'haemoglobin', 'hemoglobin', 'hba1c', 'glucose', 'cholesterol', 'wbc', 'rbc', 'platelet'];
  const lower = stripped.toLowerCase();
  let bestIdx = -1;
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
  }
  const start = Math.max(0, (bestIdx === -1 ? 0 : bestIdx) - 300);
  return stripped.slice(start, start + 6000);
}

async function structureWithSarvam(text: string): Promise<ReportParseResult> {
  const relevant = extractRelevantSection(text);
  try {
    const result = await requestSarvamToolObject<ParsedReportData>({
      systemPrompt: 'You are a medical report parser. Extract structured data from the given lab report text. Return ALL test results you find.',
      userPrompt: `Extract all test results from this lab report:\n\n${relevant}`,
      ...EXTRACT_TOOL_PARAMS,
      maxTokens: 3000,
    });
    const parsed = result.parsed;
    if (!parsed) return { rawSummary: null, parsedData: null };
    return { rawSummary: buildSummary(parsed), parsedData: parsed };
  } catch (err) {
    console.error('[reportParser] Sarvam structuring failed:', (err as Error).message);
    return { rawSummary: null, parsedData: null };
  }
}

// ── Sarvam Document Intelligence — shared OCR pipeline ───────────────────────
// PDFs upload directly; images must be wrapped in a ZIP first.

async function parseViaSarvamDocIntelligence(
  filename: string,
  body: Uint8Array,
): Promise<ReportParseResult> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return { rawSummary: null, parsedData: null };

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    // 1. Create OCR job
    const initResponse = await client.documentIntelligence.initialise({
      job_parameters: { language: 'en-IN', output_format: 'md' },
    });
    const jobId = (initResponse as unknown as { job_id: string }).job_id;
    if (!jobId) return { rawSummary: null, parsedData: null };

    // 2. Get presigned upload URL
    const uploadResponse = await client.documentIntelligence.getUploadLinks({
      job_id: jobId,
      files: [filename],
    });
    const uploadUrls = (uploadResponse as unknown as {
      upload_urls: Record<string, { file_url: string; file_metadata?: Record<string, string> }>;
    }).upload_urls ?? {};
    const uploadInfo = Object.values(uploadUrls)[0];
    if (!uploadInfo?.file_url) return { rawSummary: null, parsedData: null };

    // 3. PUT to presigned URL
    const putHeaders: Record<string, string> = { 'x-ms-blob-type': 'BlockBlob' };
    if (uploadInfo.file_metadata) {
      for (const [k, v] of Object.entries(uploadInfo.file_metadata)) {
        if (typeof v === 'string') putHeaders[k] = v;
      }
    }
    // Uint8Array satisfies BodyInit in the fetch spec; cast needed for Next.js TS config
    const putRes = await fetch(uploadInfo.file_url, { method: 'PUT', headers: putHeaders, body: body as unknown as BodyInit });
    if (!putRes.ok) {
      console.error('[reportParser] upload failed:', putRes.status, putRes.statusText);
      return { rawSummary: null, parsedData: null };
    }

    // 4. Start processing
    await client.documentIntelligence.start(jobId);

    // 5. Poll until complete (max 90 seconds)
    const terminal = ['Completed', 'PartiallyCompleted', 'Failed'];
    let jobState = '';
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const status = await client.documentIntelligence.getStatus(jobId);
      jobState = (status as unknown as { job_state: string }).job_state ?? '';
      if (terminal.includes(jobState)) break;
    }
    if (!['Completed', 'PartiallyCompleted'].includes(jobState)) {
      console.error('[reportParser] OCR job did not complete, state:', jobState);
      return { rawSummary: null, parsedData: null };
    }

    // 6. Download result ZIP and extract markdown
    const downloadResponse = await client.documentIntelligence.getDownloadLinks(jobId);
    const downloadUrls = (downloadResponse as unknown as {
      download_urls: Record<string, { file_url: string }>;
    }).download_urls ?? {};
    const downloadInfo = Object.values(downloadUrls)[0];
    if (!downloadInfo?.file_url) return { rawSummary: null, parsedData: null };

    const dlRes = await fetch(downloadInfo.file_url);
    if (!dlRes.ok) return { rawSummary: null, parsedData: null };

    const resultZip = await JSZip.loadAsync(await dlRes.arrayBuffer());
    const mdFiles = Object.keys(resultZip.files).filter(
      (f) => f.endsWith('.md') && !resultZip.files[f]?.dir
    );
    if (mdFiles.length === 0) return { rawSummary: null, parsedData: null };

    const markdownText = await resultZip.files[mdFiles[0]]!.async('string');
    if (!markdownText.trim()) return { rawSummary: null, parsedData: null };

    // 7. Structure extracted text with Sarvam chat
    return structureWithSarvam(markdownText);
  } catch (err) {
    console.error('[reportParser] OCR pipeline failed:', err);
    return { rawSummary: null, parsedData: null };
  }
}

// ── Human-readable summary builder ───────────────────────────────────────────

function buildSummary(data: ParsedReportData): string {
  const parts: string[] = [];
  if (data.lab_name) parts.push(data.lab_name);
  const date = data.collection_date ?? data.report_date;
  if (date) parts.push(`Date: ${date}`);
  if (data.referral) parts.push(`Ref: ${data.referral}`);
  if (data.tests && data.tests.length > 0) {
    const abnormal = data.tests.filter(t => t.flag === 'high' || t.flag === 'low');
    if (abnormal.length > 0) {
      parts.push(
        `Abnormal: ${abnormal.map(t => `${t.name} ${t.value}${t.unit ? ' ' + t.unit : ''} (${t.flag})`).join(', ')}`
      );
    }
    parts.push(`${data.tests.length} test${data.tests.length !== 1 ? 's' : ''} recorded`);
  }
  return parts.join(' · ') || 'Report parsed';
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseReport(
  buffer: Buffer,
  mimeType: string,
): Promise<ReportParseResult> {
  try {
    if (mimeType === 'application/pdf') {
      // PDFs upload directly to Sarvam Doc Intelligence
      return await parseViaSarvamDocIntelligence('report.pdf', new Uint8Array(buffer));
    }
    if (mimeType.startsWith('image/')) {
      // Images must be wrapped in a ZIP before uploading
      const zip = new JSZip();
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      zip.file(`report.${ext}`, buffer);
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      return await parseViaSarvamDocIntelligence('report.zip', new Uint8Array(zipBuffer));
    }
    return { rawSummary: null, parsedData: null };
  } catch {
    return { rawSummary: null, parsedData: null };
  }
}
