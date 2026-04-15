import { generateText, Output } from 'ai';
import { z } from 'zod';
import { requestSarvamToolObject } from './sarvamChatAdapter';
import type { ParsedReportData } from './types';

// Gateway model — haiku is fast and cheap for document extraction
const VISION_MODEL = 'anthropic/claude-haiku-4.5';

// Shared Zod schema for structured report data
const ReportSchema = z.object({
  lab_name: z.string().optional().describe('Name of the lab or hospital that issued the report'),
  report_date: z.string().optional().describe('Report date in YYYY-MM-DD format'),
  tests: z
    .array(
      z.object({
        name: z.string().describe('Name of the test or parameter'),
        value: z.string().describe('Measured value as a string'),
        unit: z.string().describe('Unit of measurement (e.g. mg/dL, g/dL)'),
        ref_range: z.string().describe('Reference range as printed (e.g. 70-100)'),
        flag: z
          .enum(['high', 'low', 'normal'])
          .nullable()
          .describe('Whether the value is high, low, or within normal range'),
      })
    )
    .optional()
    .describe('Individual test results'),
});

type ReportParseResult = {
  rawSummary: string | null;
  parsedData: ParsedReportData | null;
};

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

  // Truncate to avoid Sarvam token overflow
  const truncated = rawText.slice(0, 4000);

  try {
    const parsedResult = await requestSarvamToolObject<ParsedReportData>({
      systemPrompt:
        'You are a medical report parser. Extract structured data from the given lab report text.',
      userPrompt: `Extract all test results from this lab report:\n\n${truncated}`,
      toolName: 'extract_report',
      toolDescription: 'Extracts structured lab report data from text',
      parameters: {
        type: 'object',
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
    });

    const parsed = parsedResult.parsed;
    if (!parsed) return { rawSummary: rawText.slice(0, 500), parsedData: null };
    return { rawSummary: buildSummary(parsed), parsedData: parsed };
  } catch {
    return { rawSummary: rawText.slice(0, 500), parsedData: null };
  }
}

// ── Image path: AI Gateway → Claude vision → generateText + Output.object ─────

async function parseImage(buffer: Buffer, mimeType: string): Promise<ReportParseResult> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return { rawSummary: null, parsedData: null };
  }

  const base64 = buffer.toString('base64');

  // AI SDK only accepts these specific image mime types
  const imageType = (
    mimeType === 'image/png'  ? 'image/png'  :
    mimeType === 'image/webp' ? 'image/webp' :
    mimeType === 'image/gif'  ? 'image/gif'  :
    'image/jpeg'
  ) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  try {
    const { output } = await generateText({
      model: VISION_MODEL,
      output: Output.object({ schema: ReportSchema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${imageType};base64,${base64}`,
            },
            {
              type: 'text',
              text: 'This is a medical lab report. Extract all test results. For each test record the name, value, unit, reference range, and whether the value is high/low/normal. Also extract the lab name and report date if visible.',
            },
          ],
        },
      ],
    });

    if (!output) return { rawSummary: null, parsedData: null };
    const data = output as ParsedReportData;
    return { rawSummary: buildSummary(data), parsedData: data };
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
    // Never let parsing failure block the upload
    return { rawSummary: null, parsedData: null };
  }
}
