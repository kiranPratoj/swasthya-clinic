---
paths:
  - "src/lib/sarvamChatAdapter.ts"
  - "src/lib/reportParsingAdapter.ts"
  - "src/app/api/consult-voice/**"
  - "src/app/api/intake-voice/**"
  - "src/app/api/transcribe-chunk/**"
  - "src/app/api/tts/**"
---

# AI / Sarvam Rules

## Sarvam capabilities
- **sarvam-30b**: Text chat + tool-calling — use `requestSarvamToolObject()` in `sarvamChatAdapter.ts`
- **Sarvam STT**: Speech-to-text via `speechToText()` API
- **Sarvam TTS**: Text-to-speech via `textToSpeech()` API
- **Sarvam Document Intelligence**: OCR for images/PDFs — async job-based API

## Tool-calling pattern (Sarvam)
```ts
const result = await requestSarvamToolObject<MyType>({
  systemPrompt: '...',
  userPrompt: '...',
  toolName: 'tool_name',
  toolDescription: '...',
  parameters: { type: 'object', properties: { ... } },
  maxTokens: 700,
});
const data = result.parsed; // typed as MyType
```

## Document Intelligence (image OCR) flow
1. Wrap image in a ZIP (Sarvam requires ZIP for images, PDF directly)
2. `client.documentIntelligence.initialise({ language: 'en-IN', output_format: 'md' } as any)`
3. `getUploadLinks({ job_id, files: ['report.zip'] })` → presigned URL
4. PUT zip as `Uint8Array` with header `x-ms-blob-type: BlockBlob`
5. `start(job_id)` → poll `getStatus(job_id)` every 3s until Completed/Failed
6. `getDownloadLinks(job_id)` → fetch ZIP → extract `.md` files → pass text to `requestSarvamToolObject()`

## AI SDK v6 (if used)
- `generateObject` is REMOVED — use `generateText` with `output: Output.object({ schema })`
- Result is in `.output` property, not `.object`
- Model string for Vercel AI Gateway: `'anthropic/claude-haiku-4.5'`

## pdf-parse v2 API (class-based, not default function)
```ts
const { PDFParse } = await import('pdf-parse') as unknown as {
  PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> };
};
const parser = new PDFParse({ data: buffer });
const { text } = await parser.getText();
```
