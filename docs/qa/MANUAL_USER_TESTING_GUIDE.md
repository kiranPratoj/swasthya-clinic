# Manual User Testing Guide

This guide is for a fresher who has never done QA before.

Use it to test the app manually, step by step, from login to patient flow completion.

This is not a technical document.
Follow the steps in order.
If something breaks, note it clearly and move to the next stage unless the flow is completely blocked.

---

## 1. Purpose

You are checking whether the clinic app works like a real clinic tool.

You are **not** trying to test every tiny edge case.

You are checking:
- can staff log in
- can reception create a token
- can queue move correctly
- can doctor finish a consult
- can history show the visit properly
- can patient-facing flow work where available

---

## 2. What To Record

For every test step, mark one of these:

- `PASS` = it worked as expected
- `FAIL` = it did not work
- `BLOCKED` = you could not continue because something earlier broke
- `NOT TESTED` = you skipped it

If you mark `FAIL`, always write:

1. what you clicked
2. what you expected
3. what actually happened
4. screenshot if possible

Use simple language.

Bad bug report:

`queue broken`

Good bug report:

`Clicked "Create Token" after entering patient name and complaint. Expected success card with token number. Actual result: button stayed loading and no token was created.`

---

## 3. Before You Start

Make sure you have:

- app URL
- working login credentials
- browser access
- ability to take screenshots

Recommended browser:

- Chrome

Recommended test mode:

- use normal browser window for staff testing
- use private/incognito window for patient/public flow testing

---

## 4. Main Roles To Test

Use these roles separately.
Do not mix them in one session.

### Receptionist
Should mainly test:
- queue
- intake
- patients

### Doctor
Should mainly test:
- queue
- consult
- history

### Admin
Should mainly test:
- access and visibility
- admin-only areas if needed

### Patient / Public
Should mainly test:
- public patient portal or token page
- login if patient login is enabled

---

## 5. Test Data Rule

While testing, create simple fake patients.

Use names like:
- Test Patient One
- Test Patient Two
- Queue Test Three

Use mobile numbers that are easy to track, for example:
- 9001112201
- 9001112202
- 9001112203

If testing shared-family number behavior, use the same number intentionally for two different patients.

Do not use real patient data.

---

## 6. Stage 0 — Quick Smoke Check

Do this first before deeper testing.

### Step 0.1 — Open the app

Go to:

- landing page
- login page

Expected:
- page loads
- branding looks normal
- no blank page
- no obvious crash

### Step 0.2 — Login works

Log in with one staff user.

Expected:
- login succeeds
- user lands inside clinic console
- no error loop

### Step 0.3 — Main navigation is visible

Check top navigation or bottom navigation.

Expected:
- Queue visible
- Intake visible
- Patients visible
- More visible if used

If this stage fails, stop and report it first.

---

## 7. Stage 1 — Receptionist Flow

This is the most important stage.

Goal:

Make sure front-desk staff can move a patient into the queue without confusion.

### Step 1.1 — Open Intake

Login as receptionist.
Open the `Intake` page.

Expected:
- page opens
- phone lookup appears first
- form is not overcrowded

### Step 1.2 — Search existing patient by phone

Type at least 3 digits of a known patient phone number.

Expected:
- matching patient results appear automatically
- page should not need manual refresh

### Step 1.3 — Select an existing patient

Click an existing patient result.

Expected:
- patient name fills
- age fills if available
- phone fills
- this should clearly feel like selecting one patient, not just copying a phone number

### Step 1.4 — Search a phone with no match

Type a full 10-digit number that does not exist.

Expected:
- app shows no match
- app moves to create new patient step
- no page refresh needed

### Step 1.5 — Create a new patient manually

Fill:
- patient name
- age if available
- complaint
- visit type
- payment fields if required in the current form

Click `Create Token`.

Expected:
- success confirmation is shown
- token number is visible
- user understands what happened

### Step 1.6 — Create another token immediately

After the first token is created, try to create the next one.

Expected:
- page should reset correctly
- no full browser refresh should be required
- next patient can be entered normally

### Step 1.7 — Shared mobile number check

If the app supports more than one patient with the same mobile:

1. search shared number
2. select patient A
3. confirm correct name is filled
4. go back
5. select patient B
6. confirm patient B details are different and correct

Expected:
- selected patient stays isolated
- wrong family member should not be auto-used

---

## 8. Stage 2 — Voice Intake Check

Do this only after manual intake works.

Goal:

Check whether voice is useful, but remember:
manual flow is the real fallback.

### Step 2.1 — Mic permission

Tap the voice button.

Expected:
- browser asks for microphone permission if needed
- if mic is denied, app should fail gracefully

### Step 2.2 — Kannada voice test

Speak in Kannada with:
- name
- age
- phone
- symptom

Expected:
- transcript appears
- some fields auto-fill
- missing fields are clearly asked for confirmation

### Step 2.3 — English voice test

Repeat the same in English.

Expected:
- transcript appears
- fields auto-fill where possible

### Step 2.4 — Short name test

Try a short name or initials, for example:
- Ravi
- R K
- K C

Expected:
- if the app is unsure, manual correction should still be easy
- app should not silently put garbage into the wrong field

### Step 2.5 — Unsupported language behavior

If you intentionally speak in another language, check what happens.

Expected for current V1:
- app should not confidently auto-fill unsupported-language data into the form
- it should guide the user back to Kannada/English or manual entry

### Step 2.6 — Manual correction after voice

Edit the voice-filled fields manually.

Expected:
- user can correct name, phone, complaint, visit type easily
- final save should use corrected values

---

## 9. Stage 3 — Queue Flow

Goal:

Check whether the token created in intake appears properly in the live queue.

### Step 3.1 — Open Queue

Go to the queue page after creating a token.

Expected:
- newly created patient appears
- status should be waiting/booked/confirmed based on app behavior

### Step 3.2 — No manual refresh check

Observe whether the queue updates automatically.

Expected:
- queue should reflect new token without full page reload

### Step 3.3 — Check ordering

Look at token order.

Expected:
- queue list should display in token order
- `Call Next` should follow the next waiting token

### Step 3.4 — Call Next

Click `Call Next Patient`.

Expected:
- next waiting token moves into consult
- status changes correctly

### Step 3.5 — Manual consult open

If the doctor can directly open another patient from the queue, note it.

Expected:
- record whether this is visible
- record whether it feels intentional or confusing

Do not decide by guess.
Just record exactly what the app allows.

### Step 3.6 — Status actions

Test available status actions like:
- no show
- cancel
- reschedule

Expected:
- action works
- confirmation appears if destructive
- queue updates after action

---

## 10. Stage 4 — Doctor Consultation

Use doctor login for this stage.

Goal:

Check whether the doctor can finish a consult without admin friction.

### Step 4.1 — Open consult from queue

Expected:
- patient name is correct
- token is correct
- complaint is visible

### Step 4.2 — Check continuity

For a returning patient, see whether previous visit/history cards appear.

Expected:
- useful recent context visible
- no unrelated patient shown

### Step 4.3 — Fill consultation manually

Complete:
- diagnosis
- prescription rows
- follow-up reminder/date if available

Expected:
- form is usable without voice
- doctor can finish consult manually

### Step 4.4 — Consult voice check

If doctor voice/scribe is enabled:

1. record a short consult note
2. wait for transcript
3. review generated content

Expected:
- transcript appears
- structured content appears if supported
- doctor can edit it before saving

### Step 4.5 — Save consult

Expected:
- visit is saved
- app moves to print/summary/billing step based on current flow

---

## 11. Stage 5 — Billing / Payment Visibility

Goal:

Check whether payment status is understandable.

### Step 5.1 — During intake or consult

Observe when payment is first captured.

Write down:
- is it taken at intake
- is it taken again at consult end
- is it one payment step or two

Expected:
- behavior should be understandable
- it should not feel like duplicate collection without explanation

### Step 5.2 — History payment check

Open patient history for a tested patient.

Expected:
- payment should be visible clearly as simple state
- example: `Paid` or `Pending`

### Step 5.3 — Queue payment visibility

If queue shows due/paid amount, check that it matches the visit state.

Expected:
- queue and history should not contradict each other

---

## 12. Stage 6 — Print / Summary

Goal:

Check whether the final printed or printable output is acceptable for clinic use.

### Step 6.1 — Open print/summary view

Expected:
- clinic branding is correct
- patient name is correct
- diagnosis is visible
- prescription rows are visible

### Step 6.2 — Print behavior

Click print if available.

Expected:
- printable view opens cleanly
- no broken layout

### Step 6.3 — Completeness

Expected:
- no fake data
- no unrelated patient details
- empty medicine rows should not show as junk

---

## 13. Stage 7 — Patient History

Goal:

Check whether revisit continuity actually works.

### Step 7.1 — Open patient profile

Go to patient details page if available.

Expected:
- patient basics shown correctly

### Step 7.2 — Open history

Expected:
- latest visit appears first
- complaint, diagnosis, or notes are visible
- payment state is visible

### Step 7.3 — Continuity check

For a patient you just completed:

Expected:
- the new visit should appear in history
- previous visits should remain visible

---

## 14. Stage 8 — Patient / Public Flow

Do this in an incognito window if possible.

Goal:

Check whether patient-facing flow works without staff login.

### Step 8.1 — Open patient token page or portal link

Use:
- token page
- portal magic link
- patient login if enabled

Expected:
- page opens without staff session
- patient sees only their own data

### Step 8.2 — Invalid link check

Open:
- invalid token
- expired portal link

Expected:
- clear error page
- no crash
- no clinic internal data leak

### Step 8.3 — Patient login flow

If patient login exists:

Expected:
- OTP or login step is understandable
- patient can select their profile if needed
- patient sees appointments/history/reports only for themselves

---

## 15. Stage 9 — Role Restriction Check

Goal:

Make sure each role sees only what they should.

### Receptionist

Check:
- can access queue
- can access intake
- can access patients
- cannot do doctor-only consult actions if restricted

### Doctor

Check:
- can access consult
- can access history
- can finish visit

### Admin

Check:
- has wider access where expected

### Patient/Public

Check:
- cannot see clinic staff pages

---

## 16. Stage 10 — Final Regression Pass

After all main testing, do one short final pass.

Check:

- app still logs in
- intake still works
- queue still updates
- consult still saves
- history still shows visit
- public page still opens

Expected:
- no new breakage after earlier tests

---

## 17. What To Report At The End

At the end of testing, create one simple summary.

Use this format:

### Summary

- Total cases tested:
- Passed:
- Failed:
- Blocked:

### Major issues

1.  
2.  
3.  

### Minor issues

1.  
2.  
3.  

### Notes

- anything confusing
- anything impressive
- anything that may confuse a real clinic user

---

## 18. Simple Bug Severity Guide

Use this simple rule:

### High

The core clinic flow breaks.

Examples:
- cannot login
- cannot create token
- cannot open consult
- cannot save visit

### Medium

Flow works but is confusing or partially wrong.

Examples:
- payment not clearly visible
- wrong message shown
- voice fills wrong field but user can still correct it

### Low

Cosmetic or small clarity issue.

Examples:
- spacing issue
- small copy issue
- label wording can be better

---

## 19. Related Docs

Use these after this guide if needed:

- [GOLDEN_PATH.md](/Users/shilpashree/.gemini/antigravity/scratch/clinic-system/docs/qa/GOLDEN_PATH.md)
- [INTAKE_VOICE.md](/Users/shilpashree/.gemini/antigravity/scratch/clinic-system/docs/qa/INTAKE_VOICE.md)

This file is the beginner-friendly main guide.
Those two files are deeper checklists for focused retesting.
