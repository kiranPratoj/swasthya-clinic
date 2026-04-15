Here’s a clean voice-command feature spec for Medilite AI.

Voice Command Feature Spec

1. Goal

Enable staff and doctors to control the app using Siri-style voice commands for navigation and workflow actions.

This feature is:
	•	action-oriented
	•	screen-aware
	•	role-aware
	•	not a chatbot
	•	not autonomous

Primary value:
	•	reduce clicks
	•	reduce typing
	•	speed up common actions
	•	make the app more usable in busy clinics

⸻

2. Product principle

Voice is a shortcut layer over known app actions.

The app should still work fully with touch/mouse/keyboard.

Voice command is:
	•	optional
	•	confirmable
	•	constrained to supported actions

⸻

3. Target users
	•	Receptionist
	•	Doctor
	•	Admin
	•	Later: nurse/staff if triage is added

Patient-facing voice control is out of scope for first version.

⸻

4. Supported commands

A. Global navigation commands

Available from anywhere, subject to role.
	•	Open queue
	•	Open intake
	•	Open patients
	•	Open settings
	•	Go back
	•	Go home
	•	Refresh page

B. Patient search commands
	•	Search patient Ravi
	•	Find patient Sunita
	•	Search patient by phone 9876543210
	•	Open patient Ravi Kumar
	•	Open last visit for Ravi
	•	Show patient history for Sunita

C. Queue commands
	•	Call next
	•	Open current patient
	•	Show waiting patients
	•	Show completed patients
	•	Mark no show for token 24
	•	Cancel token 18
	•	Reschedule token 21

D. Consult commands
	•	Start consult
	•	Open last prescription
	•	Show previous visit
	•	Show latest report
	•	Add follow-up after 7 days
	•	Save consult
	•	Complete consult

E. Payment commands
	•	Mark paid
	•	Mark pending
	•	Set payment mode cash
	•	Set payment mode UPI

F. Report / document commands
	•	Upload report
	•	Open latest report
	•	Open blood test report
	•	Show diagnostics
	•	Read report summary

G. Voice assist commands

These trigger AI helpers, not direct workflow mutations.
	•	Start dictation
	•	Summarize history
	•	Summarize latest report
	•	Draft consultation note
	•	Explain in Kannada
	•	Explain in Hindi
	•	Read prescription aloud

⸻

5. Command scope by role

Receptionist

Allowed:
	•	queue
	•	intake
	•	patient search
	•	token actions
	•	payment update
	•	upload report

Blocked:
	•	finalize clinical note
	•	edit diagnosis
	•	sensitive doctor-only actions

Doctor

Allowed:
	•	open consult
	•	open previous visit
	•	show latest report
	•	start dictation
	•	save consult
	•	complete consult
	•	add follow-up

Blocked:
	•	admin settings
	•	broad payment/admin actions unless explicitly allowed

Admin

Allowed:
	•	navigation
	•	settings
	•	dashboard/reporting later

⸻

6. Intent schema

Each spoken command should be converted into a structured object.

Base shape

{
  "intent": "search_patient",
  "entity_type": "patient",
  "target": "Ravi Kumar",
  "parameters": {
    "phone": null,
    "token": null,
    "date_scope": "latest"
  },
  "confidence": 0.92,
  "requires_confirmation": false,
  "role": "receptionist",
  "screen_context": "queue"
}

Core intent list
	•	navigate_queue
	•	navigate_intake
	•	navigate_patients
	•	navigate_settings
	•	search_patient
	•	open_patient
	•	open_patient_history
	•	open_last_visit
	•	open_last_prescription
	•	call_next
	•	mark_no_show
	•	cancel_token
	•	reschedule_token
	•	start_consult
	•	save_consult
	•	complete_consult
	•	set_follow_up
	•	mark_payment_paid
	•	mark_payment_pending
	•	set_payment_mode
	•	upload_report
	•	open_latest_report
	•	open_report_by_type
	•	summarize_history
	•	summarize_report
	•	start_dictation
	•	draft_consult_note
	•	read_prescription_aloud
	•	translate_explanation

Entity types
	•	patient
	•	token
	•	visit
	•	report
	•	prescription
	•	payment
	•	follow_up
	•	screen

Parameters

Possible fields:
	•	patient_name
	•	phone
	•	token_number
	•	report_type
	•	payment_mode
	•	follow_up_days
	•	language
	•	date_scope
	•	doctor_name

⸻

7. Command parsing behavior

Step 1

Speech-to-text converts audio into text.

Step 2

Intent parser extracts:
	•	action
	•	target
	•	parameters
	•	confidence

Step 3

Resolver checks:
	•	current role
	•	current screen
	•	entity match quality
	•	whether action is safe
	•	whether confirmation is needed

Step 4

App either:
	•	executes immediately
	•	asks for clarification
	•	asks for confirmation
	•	rejects with a helpful message

⸻

8. UI behavior

A. Entry points

Use three possible entry points:

1. Global mic button

A small persistent mic icon in header or bottom command bar.

2. Command bar + mic

Search/command field with placeholder like:
	•	Search patient, open queue, call next…

3. Context mic

On consult page or queue page, a local mic for contextual actions.

B. Voice interaction flow
	1.	User taps mic
	2.	Listening state appears
	3.	Transcribed command appears as text
	4.	App shows interpreted action
	5.	App executes or asks follow-up

C. Visual states
	•	Idle
	•	Listening
	•	Processing
	•	Clarifying
	•	Confirming
	•	Success
	•	Error

D. Feedback style

Feedback should be short and operational.

Examples:
	•	Searching patient Ravi…
	•	Found 2 patients named Ravi.
	•	Mark token 24 as paid?
	•	Opened latest report.
	•	Sorry, I couldn’t identify the patient.

E. Screen-awareness

Command suggestions should vary by page.

On Queue
	•	Call next
	•	Mark no show
	•	Open patient Ravi

On Consult
	•	Show previous visit
	•	Open latest report
	•	Save consult
	•	Add follow-up after 7 days

On Patients
	•	Search patient by phone
	•	Open latest report
	•	Summarize history

⸻

9. Confirmation rules

No confirmation required

Safe, read-only, reversible, or navigation actions:
	•	Open queue
	•	Open intake
	•	Search patient Ravi
	•	Open latest report
	•	Show previous visit
	•	Summarize history
	•	Read prescription aloud

Confirmation required

Actions that mutate workflow or financial state:
	•	Call next
	•	Mark no show
	•	Cancel token
	•	Complete consult
	•	Mark paid
	•	Mark pending
	•	Set payment mode
	•	Add follow-up if overwriting existing value
	•	Upload report to specific patient when patient match is ambiguous

Clarification required

If ambiguity exists:
	•	multiple patient matches
	•	multiple reports
	•	unclear token number
	•	unsupported role action
	•	low-confidence parse

Example:
“Two patients named Sunita found. Do you mean Sunita M or Sunita R?”

⸻

10. Error handling rules

If STT fails

Show:
	•	Couldn’t hear clearly. Try again.

If intent confidence is low

Show:
	•	I’m not sure what action you want. Try a simpler command.

If entity match is unclear

Show:
	•	I found multiple matches. Please choose one.

If role is not allowed

Show:
	•	This action isn’t available for your role.

If backend action fails

Show:
	•	Action failed. Please retry manually.

⸻

11. Safety rules
	•	Never silently guess among multiple patient matches
	•	Never auto-complete risky actions without confirmation
	•	Never allow voice to overwrite final clinical record without explicit review
	•	Never use voice command as the only way to complete workflow
	•	Keep logs of parsed command, chosen intent, and action result for debugging

⸻

12. Analytics to track

Track:
	•	command usage count
	•	most common commands
	•	failed commands
	•	low-confidence commands
	•	ambiguous patient matches
	•	confirmation acceptance rate
	•	fallback-to-manual rate

This will help improve vocabulary later.

⸻

13. Milestone effort split

Milestone 1 — Basic voice navigation

Goal:
	•	prove Siri-style command flow works

Scope:
	•	mic button
	•	STT
	•	8 to 10 supported commands
	•	navigation + patient search + queue actions
	•	basic confirmation

Commands:
	•	Open queue
	•	Open intake
	•	Search patient [name]
	•	Search patient by phone
	•	Open last visit
	•	Call next
	•	Mark paid
	•	Mark pending

Effort:
1 to 2 weeks

⸻

Milestone 2 — Screen-aware workflow commands

Goal:
	•	make command layer useful in daily clinic flow

Scope:
	•	screen-aware command suggestions
	•	better role checks
	•	consult-related actions
	•	token-specific actions
	•	better ambiguity handling

Commands added:
	•	Start consult
	•	Save consult
	•	Complete consult
	•	Set follow-up after X days
	•	Open latest report
	•	Show previous visit

Effort:
2 to 3 weeks

⸻

Milestone 3 — AI-assisted voice actions

Goal:
	•	combine command layer with AI helper actions

Scope:
	•	start dictation
	•	summarize history
	•	summarize report
	•	draft consultation note
	•	translate explanation
	•	read prescription aloud

Important:
These remain assistive and optional.

Effort:
2 to 4 weeks

⸻

Milestone 4 — Production hardening

Goal:
	•	make the feature dependable in real clinic conditions

Scope:
	•	failure handling polish
	•	analytics
	•	multilingual tuning
	•	noisy environment testing
	•	command suggestions UX
	•	permission enforcement
	•	audit logging

Effort:
2 to 3 weeks

⸻

14. Total effort

Lean usable version

Milestone 1 only:
1 to 2 weeks

Strong V1 version

Milestone 1 + 2:
3 to 5 weeks

Full voice-command + AI-assist version

Milestone 1 + 2 + 3 + 4:
5 to 9 weeks

⸻

15. Recommendation

For Medilite AI, the best approach is:

Build first
	•	navigation
	•	patient search
	•	queue actions
	•	payment mark
	•	consult open/save/complete

Add next
	•	report open
	•	previous visit fetch
	•	follow-up commands

Add later
	•	dictation
	•	AI summaries
	•	multilingual explanations

That gives you a practical, impressive, and safe voice-command system without overreaching.