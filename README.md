# CPIMS
## Commissioner Public Interaction Management System

CPIMS is a citizen-centric digital service platform for Commissioner office public interaction management.

It is designed as a **public interaction operating system prototype**, not a generic appointment app.

The platform brings together:
- public access governance
- citizen request intake
- walk-in preservation
- appointment discipline
- staff triage and scheduling
- transparent citizen tracking
- executive visibility
- AI-ready capability surfaces

---

## Purpose

CPIMS exists to improve:

### For Citizens
- clarity on when and how to approach the office
- fewer unnecessary visits
- transparent tracking and updates
- better trust in office responsiveness

### For Staff
- structured intake and triage
- controlled workflow states
- easier communication handling
- reduced ambiguity in routing and scheduling

### For Leadership
- real-time visibility into public interaction load
- issue distribution awareness
- measurable service operations
- future readiness for AI-assisted public service workflows

---

## Core Principles

- citizen first
- preserve walk-in access where applicable
- administrative discipline
- truth-governed workflow
- no fake metrics
- AI as advisory assistance, not authority
- demo-first, verification-driven execution

---

## Operating Model

This repository is governed through a **truth → build → verify** execution model.

Every new capability must pass through:

1. truth definition  
2. controlled lane execution  
3. browser/runtime verification  

See:
- `governance/GOVERNANCE.md`
- `governance/TRUTH_REGISTRY.md`
- `governance/EXECUTION_ROADMAP.md`
- `governance/PHASE_GATES.md`
- `governance/AUTONOMY_POLICY.md`

---

## Repository Structure

```text
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md

docs/
  demo/
  models/
  seeded_data.md

governance/
  GOVERNANCE.md
  TRUTH_REGISTRY.md
  EXECUTION_ROADMAP.md
  METRIC_DEFINITIONS.md
  PHASE_GATES.md
  AUTONOMY_POLICY.md
  AI_SURFACE_CONTRACT.md
  NOTIFICATION_MODEL.md
  DEFINITION_OF_DONE.md
  ARTIFACT_REVIEW_CHECKLIST.md

src/
  app/
  components/
  lib/

artifacts/
```

⸻

Core User Journeys

Citizen Journey

A citizen visits the platform, understands today’s public access mode, follows the correct path, submits a request if required, and tracks office action transparently.

Staff Journey

A staff member reviews incoming requests, updates lifecycle states, assigns slots where applicable, and records office notes while preserving public/internal boundaries.

Leadership Journey

The Commissioner or senior office staff views current load, issue distribution, and operational status through a dashboard grounded in record truth.

⸻

Current Product Direction

Phase 1
	•	public access rules
	•	homepage and schedule
	•	guided citizen intake
	•	request acknowledgement and tracking
	•	staff review and status updates
	•	executive dashboard
	•	seeded demo scenarios

Future Phases
	•	communication workflow modeling
	•	AI assistance surfaces
	•	administrative intelligence
	•	multilingual and voice-ready citizen service support

⸻

Development Expectations

This repo is designed for Antigravity multi-agent execution.

Agents must:
	•	stay within lane boundaries
	•	respect truth registry constraints
	•	produce artifacts
	•	avoid inventing business logic
	•	escalate ambiguity instead of guessing

⸻

Local Development

Add your actual project-specific commands here. Example:

npm install
npm run dev

Open local development server:

http://localhost:3000


⸻

WhatsApp Cloud API Setup

This project expects these environment variables:

```bash
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
```

Use this setup order.

1. Create or confirm your Meta business portfolio.
   Go to Meta Business Suite and create a business portfolio if you do not already have one. WhatsApp Cloud API requires a business portfolio because it is the container for your WhatsApp Business Account and business phone numbers.
   Link: https://business.facebook.com/
   Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

2. Create a Meta app.
   In Meta for Developers, create an app for your business use case, then add the WhatsApp product. The app dashboard setup flow creates or links the WABA and gives you the initial test resources.
   Link: https://developers.facebook.com/apps/
   Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

3. Finish the WhatsApp "Get Started" flow in the app dashboard.
   Open your app and go to WhatsApp > Quickstart or the WhatsApp setup panel. Completing this flow automatically creates a test WABA and test business phone number if needed.
   Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

4. Collect the three values this app needs.
   - `WHATSAPP_PHONE_NUMBER_ID`: the sender phone number ID
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`: the business or WABA context ID you want to store for account context
   - `WHATSAPP_TOKEN`: the access token used in the `Authorization: Bearer ...` header
   Meta uses Graph API calls of the form `https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages`.
   Sources:
   https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview
   https://whatsapp.github.io/WhatsApp-Nodejs-SDK/

5. Use Meta's temporary token only for initial testing.
   The Quickstart flow gives you a temporary access token. That is acceptable for early tests but not for production. For real deployment, use a system user token.
   Sources:
   https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview
   https://whatsapp.github.io/WhatsApp-Nodejs-SDK/

6. Add a real business phone number.
   In WhatsApp Manager or the setup flow, add and register the real number you want to send from. It must be a number you control, you must complete Meta verification and registration, and any number already registered in another WhatsApp API setup may need migration first.
   Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

7. Verify the number in WhatsApp Manager.
   You can reach WhatsApp Manager from:
   - Meta Business Suite > Accounts > WhatsApp Accounts
   - App Dashboard > WhatsApp > Quickstart
   - Direct URL: https://business.facebook.com/wa/manage/home/
   Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

8. Generate a long-lived production token.
   For production, use a System User Access Token rather than a short-lived user token. Create a system user in business settings, assign the app and assets it needs, and generate a token with at least these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
   Sources:
   https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview
   https://www.postman.com/meta/a31742be-ce5c-4b9d-a828-e10ee7f7a5a3/collection/3kru5r6/whatsapp-business-management-api

9. Put the values into your app environment.
   Set:

   ```bash
   WHATSAPP_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_BUSINESS_ACCOUNT_ID=...
   ```

10. Send a test text message.
    This app already uses the correct Cloud API pattern:
    - `POST /{PHONE_NUMBER_ID}/messages`
    - bearer token auth header
    - JSON body with `messaging_product`, `to`, `type: "text"`, and `text.body`
    Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

11. Check the 24-hour rule.
    The current implementation sends plain text, not templates. That is safest inside an open customer service window. For outbound-first reminders or confirmations at scale, you will likely need approved message templates later.
    Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

12. Add webhooks after sending works.
    Sending can work without webhooks, but production tracking should include inbound message and delivery status webhooks.
    Source: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview

Practical checklist:

- Create business portfolio
- Create Meta app
- Add WhatsApp product
- Complete WhatsApp get-started flow
- Add and register real sender number
- Copy `WHATSAPP_PHONE_NUMBER_ID`
- Copy the business or WABA context ID to store as `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Create a system user token with WhatsApp permissions
- Set env vars
- Send a test message
- Add webhook handling after send works


⸻

Verification Expectations

No work is complete without:
	•	visual proof
	•	browser walkthrough validation
	•	alignment with truth registry
	•	artifact generation

See:
	•	docs/demo/DEMO_NARRATIVE.md
	•	governance/ARTIFACT_REVIEW_CHECKLIST.md
	•	governance/DEFINITION_OF_DONE.md

⸻

Product Framing

Official label:
Commissioner Public Interaction Management System (CPIMS)

Presentation label:
BDA PRISM — Public Request, Interaction and Smart Management
