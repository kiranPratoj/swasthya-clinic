---
paths:
  - "src/app/api/**"
---

# API Route Rules

## Auth pattern (every protected route)
```ts
const session = await getSessionOrNull();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const clinicId = request.headers.get('x-clinic-id');
if (!clinicId) return NextResponse.json({ error: 'Missing clinic' }, { status: 400 });
```

## File upload routes
- Validate mime type against allowlist before processing
- Reject files > 10 MB before uploading to storage
- Sanitize filename: `filename.replace(/[^a-zA-Z0-9._-]/g, '_')`
- Storage path pattern: `{clinicId}/{patientId}/{timestamp}_{filename}`

## Response format
- Always return `NextResponse.json()`
- Errors: `{ error: string }` with appropriate HTTP status
- Success: `{ data }` or specific named fields

## WhatsApp routes
- `/api/whatsapp/send` requires `x-clinic-id` header (staff only)
- Log every send to `communication_events` table via `logCommunicationEvent()`
- Never return raw API errors to client — sanitize first
