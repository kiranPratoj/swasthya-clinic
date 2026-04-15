import { SarvamAIClient } from 'sarvamai';
import JSZip from 'jszip';
import { requestSarvamToolObject } from './sarvamChatAdapter';
import type { ParsedReportData } from './types';

type ReportParseResult = {
  rawSummary: string | null;
  parsedData: ParsedReportData | null;
};

// Shared Sarvam tool parameters for structured extraction
const EXTRACT_TOOL_PARAMS = {
  toolName: 'extract_report',
  toolDescription: 'Extracts structured lab report data from text',
  parameters: {
    type: 'object' as const,
    properties: {
      lab_name: { type: 'string', description: 'Name of the lab or hospital' },
      report_date: { type: 'string', description: 'Date of the report (YYYY-MM-DD)' },
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

async function structureWithSarvam(text: string): Promise<ReportParseResult> {
  const truncated = text.slice(0, 4000);
  try {
    const result = await requestSarvamToolObject<ParsedReportData>({
      systemPrompt: 'You are a medical report parser. Extract structured data from the given lab report text.',
      userPrompt: `Extract all test results from this lab report:\n\n${truncated}`,
      ...EXTRACT_TOOL_PARAMS,
    });
    const parsed = result.parsed;
    if (!parsed) return { rawSummary: text.slice(0, 500), parsedData: null };
    return { rawSummary: buildSummary(parsed), parsedData: parsed };
  } catch {
    return { rawSummary: text.slice(0, 500), parsedData: null };
  }
}

// ── PDF path: pdf-parse → text → Sarvam tool-calling ─────────────────────────

async function parsePdf(buffer: Buffer): Promise<ReportParseResult> {
  let rawText = '';
  try {
    const { PDFParse } = (await import('pdf-parse')) as unknown as {
      PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> };
    };
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    rawText = result.text?.trim() ?? '';
  } catch {
    return { rawSummary: null, parsedData: null };
  }

  if (!rawText) return { rawSummary: null, parsedData: null };
  return structureWithSarvam(rawText);
}

// ── Image path: Sarvam Document Intelligence (OCR) → Sarvam tool-calling ─────

async function parseImage(buffer: Buffer, mimeType: string): Promise<ReportParseResult> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return { rawSummary: null, parsedData: null };

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    // Sarvam Document Intelligence requires images packed in a ZIP
    const zip = new JSZip();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    zip.file(`report.${ext}`, buffer);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 1. Create job (cast to bypass SDK type — raw API uses snake_case fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initResponse = await client.documentIntelligence.initialise(
      { language: 'en-IN', output_format: 'md' } as any
    );
    const jobId = (initResponse as unknown as { job_id: string }).job_id;
    if (!jobId) return { rawSummary: null, parsedData: null };

    // 2. Get presigned upload URL
    const uploadResponse = await client.documentIntelligence.getUploadLinks({
      job_id: jobId,
      files: ['report.zip'],
    });
    const uploadUrls = (uploadResponse as unknown as {
      upload_urls: Record<string, { file_url: string; file_metadata?: Record<string, string> }>;
    }).upload_urls ?? {};
    const uploadInfo = Object.values(uploadUrls)[0];
    if (!uploadInfo?.file_url) return { rawSummary: null, parsedData: null };

    // 3. PUT zip to presigned URL
    const putHeaders: Record<string, string> = { 'x-ms-blob-type': 'BlockBlob' };
    if (uploadInfo.file_metadata) {
      for (const [k, v] of Object.entries(uploadInfo.file_metadata)) {
        if (typeof v === 'string') putHeaders[k] = v;
      }
    }
    const putRes = await fetch(uploadInfo.file_url, { method: 'PUT', headers: putHeaders, body: new Uint8Array(zipBuffer) });
    if (!putRes.ok) return { rawSummary: null, parsedData: null };

    // 4. Start processing
    await client.documentIntelligence.start(jobId);

    // 5. Poll until complete (max ~90 seconds)
    let jobState = '';
    const terminal = ['Completed', 'PartiallyCompleted', 'Failed'];
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const status = await client.documentIntelligence.getStatus(jobId);
      jobState = (status as unknown as { job_state: string }).job_state ?? '';
      if (terminal.includes(jobState)) break;
    }
    if (!['Completed', 'PartiallyCompleted'].includes(jobState)) {
      return { rawSummary: null, parsedData: null };
    }

    // 6. Download result ZIP
    const downloadResponse = await client.documentIntelligence.getDownloadLinks(jobId);
    const downloadUrls = (downloadResponse as unknown as {
      download_urls: Record<string, { file_url: string }>;
    }).download_urls ?? {};
    const downloadInfo = Object.values(downloadUrls)[0];
    if (!downloadInfo?.file_url) return { rawSummary: null, parsedData: null };

    const dlRes = await fetch(downloadInfo.file_url);
    if (!dlRes.ok) return { rawSummary: null, parsedData: null };
    const resultBuffer = Buffer.from(await dlRes.arrayBuffer());

    // 7. Extract markdown from result ZIP
    const resultZip = await JSZip.loadAsync(resultBuffer);
    const mdFiles = Object.keys(resultZip.files).filter(
      (f) => f.endsWith('.md') && !resultZip.files[f]?.dir
    );
    if (mdFiles.length === 0) return { rawSummary: null, parsedData: null };

    const markdownText = await resultZip.files[mdFiles[0]]!.async('string');
    if (!markdownText.trim()) return { rawSummary: null, parsedData: null };

    // 8. Structure with Sarvam chat
    return structureWithSarvam(markdownText);
  } catch {
    return { rawSummary: null, parsedData: null };
  }
}

// ── Human-readable summary builder ───────────────────────────────────────────

function buildSummary(data: ParsedReportData): string {
  const parts: string[] = [];
  if (data.lab_name) parts.push(data.lab_name);
  if (data.report_date) parts.push(`Date: ${data.report_date}`);
  if (data.tests && data.tests.length > 0) {
    const abnormal = data.tests.filter(t => t.flag === 'high' || t.flag === 'low');
    if (abnormal.length > 0) {
      parts.push(
        `Abnormal: ${abnormal.map(t => `${t.name} ${t.value}${t.unit} (${t.flag})`).join(', ')}`
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
    if (mimeType === 'application/pdf') return await parsePdf(buffer);
    if (mimeType.startsWith('image/')) return await parseImage(buffer, mimeType);
    return { rawSummary: null, parsedData: null };
  } catch {
    return { rawSummary: null, parsedData: null };
  }
}
