# 08_GAPS_RISKS_AND_NEXT_STEPS

## 1. Architectural Risks
- **Service Role Bypass:** Because `src/lib/db.ts` uses `SUPABASE_SERVICE_ROLE_KEY`, a single missed `.eq('clinic_id', clinicId)` in `actions.ts` will leak data across clinics. 
- **Recommendation:** Implement a wrapper around the Supabase client that automatically applies the `clinic_id` filter to all queries, or switch to using short-lived custom JWTs that Supabase RLS can read natively.

## 2. Product Risks
- **WhatsApp Integration is Stubbed:** The `whatsappAdapter.ts` currently mocks sending messages. A real provider (like Twilio or Meta Graph API) must be integrated for the product to be truly complete.
- **AI Latency:** The consultation flow relies on a synchronous server action waiting for the Sarvam LLM to generate the SOAP note. If the LLM takes >15 seconds, the Vercel function may timeout, crashing the flow.
- **Role Enforcement:** While `proxy.ts` extracts `x-user-role`, there are currently no strong blocks preventing a `receptionist` from navigating to the `/[slug]/admin` page if they guess the URL. Granular role checks are needed inside the page components.

## 3. Schema / Logic Inconsistencies
- The `audit_log` is heavily used to derive the "Average Wait Time" in the Admin dashboard. This is brittle. If an audit log entry is missed, the metric breaks. A dedicated `wait_time_minutes` column on the `appointments` table or a `consultation_started_at` timestamp would be much safer.

## 4. Suggested Next Engineering Priorities
1. **Implement Real WhatsApp Provider:** Wire up `src/app/api/whatsapp/send` to a real API.
2. **Granular Role Checks:** Wrap sensitive pages (`/admin`, `/settings`) with a utility that reads `x-user-role` and throws a 403 if the user is not an `admin` or `doctor`.
3. **Async AI processing:** Move SOAP note generation to a background queue or edge function returning a stream, rather than a blocking server action.
4. **End-to-End Tests:** Implement Playwright/Cypress tests for the critical Intake -> Queue -> Consult -> Complete flow.
