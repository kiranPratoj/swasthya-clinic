Voice Intake QA Checklist

Run this before any demo or clinic pilot involving voice-based patient intake.

---

Mic and permissions

[ ] Grant mic → form loads, mic button is active
[ ] Deny mic → alert shows "Microphone access denied or not supported", no crash, form still usable without voice
[ ] Browser with no mic API → same graceful error, form usable
[ ] Record button disabled while formData upload is in flight (no double-submit)

Basic happy path (5-second recording)

[ ] Press record, speak patient name + complaint for ~5 seconds, press stop
[ ] Fields auto-fill: name, age, phone, complaint, visit type
[ ] Flash animation fires on filled fields (brief highlight before stabilising)
[ ] No field is overwritten if it was already manually edited (dirty flag check)

Long recording rejection

[ ] Record for > 30 seconds → server returns an error (Sarvam rejects, or size limit hit)
[ ] User sees error message (not silent fail, not blank form)
[ ] Form fields retain whatever the user had typed before attempting voice

Dirty field protection

[ ] Voice fills name field → user manually edits it → press record again → name field is NOT overwritten
[ ] Same check for: age, phone, complaint, visit type
[ ] Selecting an existing patient from the search results resets dirty flags → voice can now refill all fields
[ ] Creating a new patient (after 10-digit search with no match) also resets dirty flags

Mock mode (no Sarvam key)

[ ] Set SARVAM_API_KEY to empty or missing in env
[ ] Banner visible: "Running in mock/demo mode" (or equivalent)
[ ] Heuristic fallback runs: complaint is populated with something, not blank
[ ] No unhandled exception thrown to the browser

Sarvam rate-limit (429)

[ ] Sarvam returns 429 → error message shown to user ("Voice processing failed" or more specific)
[ ] Form remains usable with manually entered data
[ ] No blank form, no JS error in console

Multilingual speech

[ ] Speak complaint in Hindi → complaint field populates in Hindi or transliterated text
[ ] Speak complaint in Kannada → complaint populates (not blank, not a stopword)
[ ] Kannada stopwords (ರೋಗಿ, ಹೆಸರು, ವಯಸ್ಸು) do NOT appear in the name or complaint fields
[ ] Patient name with Kannada pronunciation → passes or fails gracefully (does not silently put garbage in the name field)

Auth guard

[ ] Call POST /api/intake-voice without a session cookie → 401 returned with { "error": "You must be signed in to use voice intake." }
[ ] Logged-in user → 200 (or 500 if Sarvam key missing, not 401)

Edge cases

[ ] Submit with empty audio blob → server returns error, form not cleared
[ ] Sarvam returns empty transcript → form stays as-is, no overwrite
[ ] Name normalizer rejects digit-heavy strings (e.g. "9876 ರೋಗಿ") → name field left blank, complaint still fills
[ ] Complaint longer than 160 chars → trimmed before storing
[ ] Question segments in transcript (e.g. "what is your age?") do NOT appear in complaint field
