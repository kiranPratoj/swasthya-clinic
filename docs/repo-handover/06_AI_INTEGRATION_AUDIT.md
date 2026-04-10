# 06_AI_INTEGRATION_AUDIT

This project relies entirely on **Sarvam AI** for all AI capabilities. The integrations are strongly encapsulated in adapter files inside `src/lib/`.

## 1. Speech-to-Text (STT)
- **Adapter:** `src/lib/voiceAdapter.ts`
- **Model:** `saaras:v3`
- **Usage:**
  - `/api/intake-voice` processes full audio uploads for patient registration.
  - `/api/transcribe-chunk` processes rapid chunks for a "live transcription" UI effect.
- **Fallbacks:** If STT fails, the API returns a generic "Could not transcribe audio" string, and the system relies on manual data entry by the receptionist.

## 2. LLM / Information Extraction
- **Adapter:** `src/lib/sarvamChatAdapter.ts`
- **Model:** `sarvam-30b`
- **Usage:**
  - **Patient Intake (`patientExtractionAdapter.ts`):** Takes the STT transcript and uses a strict `tool_choice` schema to extract `patientName`, `phone`, `complaint`, and `visitType`.
  - **Consult SOAP Generation (`actions.ts`):** Takes a doctor's dictation transcript and uses a tool schema to extract `subjective`, `objective`, `assessment`, `plan`, `diagnosis`, and `prescription` (array of drugs).
- **Format Forcing:** Because LLMs can hallucinate markdown, `sarvamChatAdapter.ts` contains manual string parsing (`extractJsonObjectCandidate`) to salvage JSON payloads if the model accidentally returns markdown code blocks (` ```json `).

## 3. Text-to-Speech (TTS)
- **Adapter:** `src/lib/ttsAdapter.ts`
- **Endpoint:** `/api/tts/route.ts`
- **Model / Target:** Sarvam TTS targeting `kn-IN` (Kannada) with the `meera` speaker voice.
- **Usage:** Patient portal history cards allow patients to click "Listen" to hear their visit summary spoken aloud.
- **Fallbacks:** If `SARVAM_API_KEY` is missing, the endpoint returns a 503 with `{ error: 'Audio unavailable' }`, and the UI degrades gracefully.

## 4. Privacy & Data Movement
- Voice blobs are temporarily stored in the server's `os.tmpdir()` (`/tmp`), streamed to Sarvam AI, and explicitly deleted via `fs.unlinkSync` in a `finally` block (`voiceAdapter.ts`).
- Transcripts and patient data are sent to Sarvam AI for LLM extraction. This implies a trust boundary with Sarvam AI regarding PII (Personally Identifiable Information).
