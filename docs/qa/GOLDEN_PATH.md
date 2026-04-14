Golden Path QA Checklist

This is the critical path that must work boringly reliably before any demo or clinic pilot.
Walk this end-to-end at least once before going live.

---

Step 1 — Receptionist: Intake

[ ] Type 3 digits into the phone search field → debounce triggers, existing patients matching those digits appear in dropdown
[ ] Select an existing patient → all fields (name, age, phone) populate from the record
[ ] Fields populated from an existing patient cannot be accidentally overwritten by a subsequent voice recording (dirty flag active)
[ ] Type a complete 10-digit phone with no match → form auto-advances to new patient entry (no match message shown)
[ ] Submit new patient → token number shown in a large, clearly visible card (green)
[ ] Token card shows: patient name, token number, approximate wait time
[ ] Submit button disabled while form is submitting (no double-token bug)

Step 2 — Queue (realtime)

[ ] New token from step 1 appears in the queue without a manual page refresh (realtime Supabase subscription)
[ ] Appearance latency is under ~2 seconds on a normal connection
[ ] Status column shows "Waiting" for the new token
[ ] Call Next button changes the first Waiting token to "In Consult" status
[ ] Call Next button is disabled (or hidden) when there are no Waiting tokens
[ ] Token row shows: patient name, token number, complaint, status
[ ] Status chip colour changes correctly: Waiting (grey/blue) → In Consult (yellow/orange) → Completed (green)
[ ] Cancel token action works: status → cancelled, confirmation required
[ ] Mark No Show action works: status → no_show, confirmation required
[ ] Reschedule token action works: appointment moved, queue updates

Step 3 — Doctor: Consultation

[ ] Open consult page via queue "Open" link → page loads with patient name + token number in header
[ ] History cards appear for returning patients (last 1–3 visits shown)
[ ] History card shows: visit date, diagnosis headline, summary snippet
[ ] Press Start Recording → recording state activates (button changes, recording indicator visible)
[ ] Speak for ~10 seconds → press Stop → transcription completes → SOAP fields populated
[ ] SOAP fields are editable after voice fill (doctor can correct any field)
[ ] If Sarvam fails → raw transcript appears in Subjective, objective/assessment/plan show honest fallback (not fake boilerplate)
[ ] Diagnosis field is required (form cannot submit without it)
[ ] Add medicine row: drug, dose, frequency inputs work; row can be removed
[ ] Follow-up date picker accepts future dates only (min = today)
[ ] Submit → visit saved → billing step appears (not immediate redirect to print)

Step 4 — Billing

[ ] Billing panel appears after consult save (not a new page, inline step)
[ ] Fee input accepts numbers
[ ] Cash / UPI toggle switches correctly
[ ] UPI selected → UTR reference input appears
[ ] "Mark as Paid" → calls updateAppointmentPayment → success state shown
[ ] "Skip (collect later)" → payment_status set to pending → goes to print view
[ ] Print view shows payment row: "Paid — ₹{amount} · {mode}" OR "Payment pending"

Step 5 — Print prescription

[ ] Print header shows actual clinic name (not hardcoded "Medilite AI")
[ ] Patient name, age, complaint, date, doctor name, token number are all correct
[ ] Prescription table renders all added medicines
[ ] If no medicines added: "No medicines recorded." renders (not blank table)
[ ] Follow-up date row appears only if a date was set
[ ] Doctor's signature line appears at the bottom
[ ] window.print() is triggered by Print button without JS errors
[ ] Back to Queue button returns to the correct queue page

Step 6 — Patient history

[ ] Navigate to patient profile → visit history tab loads
[ ] Most recent visit shown first
[ ] HistoryCard shows: date, diagnosis, prescription list
[ ] TTS "Listen" button plays summary aloud (if TTS is available) OR shows graceful error if TTS unavailable
[ ] Old summary format (without "Follow-up Reminder:") is handled without crashing the regex

Step 7 — Patient token page

[ ] Navigate to /{slug}/patient/{token} → page resolves correctly for today's token
[ ] Page shows current appointment status
[ ] Page shows visit info (complaint, doctor name)
[ ] If token is invalid or from a different day → notFound() or clear error shown

---

Regression: after a full golden path run

[ ] Queue page does not show completed token in the active queue
[ ] Patient profile history now shows the visit just completed
[ ] No JS console errors throughout the entire flow
[ ] No 500 errors in network tab
[ ] Build passes: pnpm build exits 0
