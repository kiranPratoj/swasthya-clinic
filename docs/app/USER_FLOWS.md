# Medilite AI User Flows

This file describes the current route-level flows. It complements `BUSINESS_LOGIC.md`.

## Public Routes

### `/`
- Marketing landing page for Medilite AI.
- Explains product value and routes prospects to onboarding/demo.

### `/onboard`
- Clinic owner onboarding flow.
- Creates a clinic slug and default doctor setup.

### `/{slug}/book`
- Public appointment booking flow for a clinic.

### `/{slug}/portal/login`
- Patient login via mobile number + WhatsApp OTP.

### `/{slug}/portal/[token]`
- Magic-link based portal bootstrap.

### `/{slug}/portal`
- Patient portal once authenticated through patient session flow.

### `/{slug}/patient/[token]`
- Legacy token-based patient continuity route.

## Staff Routes

### `/login`
- Staff login entrypoint.

### `/{slug}/intake`
- Reception workflow.
- Search patient, create/reuse patient, create appointment, assign token.

### `/{slug}/queue`
- Day queue for staff and doctor operations.

### `/{slug}/queue/[appointmentId]/consult`
- Doctor consultation form and visit completion flow.

### `/{slug}/patients`
- Patient registry/list view.

### `/{slug}/patients/[id]`
- Patient profile, history, reports, and operational actions.

### `/{slug}/history`
- Staff-facing history view.

### `/{slug}/admin`
- Admin/doctor insight view for clinic KPIs and day summary.

### `/{slug}/settings`
- Doctor profile and appointment settings.

## Supporting API Routes

### `/api/auth/login`
- Staff authentication.

### `/api/auth/logout`
- Staff logout.

### `/api/intake-voice`
- Voice intake processing.

### `/api/consult-voice`
- Consultation voice processing helper.

### `/api/soap-note`
- AI SOAP drafting endpoint/helper.

### `/api/transcribe-chunk`
- Streaming/chunk transcription support.

### `/api/upload-report`
- Report upload flow.

### `/api/parse-receipt`
- Receipt parsing support.

### `/api/tts`
- TTS playback support.

### `/api/whatsapp/send`
- Outbound WhatsApp messaging.

### `/api/patient-auth/request-otp`
- Request WhatsApp OTP for patient portal.

### `/api/patient-auth/verify-otp`
- Verify OTP and create patient session.

### `/api/patient-auth/select-profile`
- Select patient profile if phone matches multiple patient records.

### `/api/patient-auth/logout`
- End patient session.

### `/api/patient-auth/bootstrap-token`
- Bootstrap patient token/session flow.
