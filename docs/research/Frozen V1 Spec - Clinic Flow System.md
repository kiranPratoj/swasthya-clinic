# Frozen V1 Spec - Clinic Flow System

This document is the product freeze reference for V1.

It supersedes broader research ideas in:
- `docs/research/Indian Clinic Operations & App Design.md`
- `docs/research/Clinic App Workflow Design.md`
- `docs/research/Clinic App Blueprint for Tier 2_3 India.md`

Those research notes are exploratory.
This file is repo-truth.

## Product statement

A queue-first clinic flow system for Indian OPD clinics that helps staff move a patient from intake to consult to continuity with minimal friction.

## V1 objective

Make the clinic run smoothly with:
- fast patient lookup
- quick token creation
- live queue visibility
- simple doctor consult completion
- saved visit continuity
- lightweight payment marking

AI is present, but never required.

## Frozen V1 backbone

1. Search patient by phone
2. Reuse or create patient
3. Create token for today
4. Show live queue
5. Call next / start consult
6. Doctor completes consult manually
7. Save visit into continuity/history
8. Mark payment paid or pending

## Product principles

- Queue-first
- Walk-in-first
- Phone-number-first
- Manual core, AI-assisted
- Doctor should not do admin work
- Patient should not need to download an app
- Receptionist should learn it in 10 minutes
- AI optional, never mandatory
- Final medical record is always human-approved

## In scope for V1

### Reception / intake
- phone-number-first lookup
- returning-patient reuse
- quick new patient creation
- minimal fields only:
  - name
  - phone
  - age
  - visit type
  - complaint
- token generation for today

### Queue
- live queue
- waiting order
- call next
- cancel / no-show / reschedule
- repeat-patient cue if available

### Consult
- patient basics
- current complaint
- manual diagnosis entry
- manual prescription rows
- optional follow-up date
- mark complete
- print-ready visit summary

### Continuity / history
- save previous consultations into visit history
- fetchable patient history
- last visits visible to staff and patient where allowed

### Payment
- mark paid / pending
- payment mode:
  - cash
  - UPI

### AI assist layers
- voice-first intake extraction
- previous-record summary where already available
- voice-to-consult draft
- patient-friendly summary where already generated from the saved record

All AI outputs must be:
- editable
- confirmable
- skippable

## Out of scope for V1

- nurse as a required role promise
- full triage workflow as a named V1 module
- diagnostics upload and retrieval as a V1 promise
- handwritten prescription photo parse
- receipt OCR / payment parsing
- full WhatsApp bot automation
- AI-first doctor workflow
- mandatory voice usage
- full SOAP-heavy documentation as the product promise
- GST-heavy invoicing
- inventory / pharmacy
- lab integration
- ABHA / ABDM deep integration
- telemedicine
- multi-branch support
- heavy analytics dashboards
- patient self-booking as core flow
- patient self-raise into queue

## Final V1 status model

### Clinical status
- Waiting
- In Consult
- Completed
- Cancelled
- No Show
- Rescheduled

### Payment

Keep payment as a field, not a workflow status:
- Pending
- Paid

## Final V1 screen structure

### Staff
- Queue
- Intake
- Patients
- Consult
- More

### Under More
- Settings

### Public
- Patient token / status page
- Own visit history

## Role visibility

### Receptionist

Can see:
- intake
- queue
- patient basics
- payment status
- basic continuity

Cannot see by default:
- detailed clinical notes
- detailed diagnosis history

### Doctor

Can see:
- queue
- consult context
- previous consultations
- diagnosis / prescription / follow-up

Should not be forced through:
- intake
- payment workflow
- admin screens

### Admin

Can see:
- settings
- oversight
- reporting as a secondary surface

### Patient

Can see:
- own token/status
- own prescription/summary
- own consultation history

## AI operating rule

Core workflow is deterministic.
AI is ambient, optional, and confirmable.

If AI fails:
- intake still works
- queue still works
- doctor still completes consult
- history still saves

## Success criteria for V1

V1 is successful if a clinic can reliably do:
- receptionist finds patient by phone
- patient gets token fast
- queue remains visible and usable
- doctor completes consult without AI dependency
- visit is saved for repeat continuity
- payment is marked simply
- repeat patient returns without duplicate chaos

## V1 story

Fast intake, live queue, simple consult, saved continuity.
