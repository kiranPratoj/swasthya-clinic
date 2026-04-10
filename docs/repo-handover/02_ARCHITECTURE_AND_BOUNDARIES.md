# 02_ARCHITECTURE_AND_BOUNDARIES

## 1. Rendering Model
The application relies heavily on **React Server Components (RSC)**.
- **Pages (`page.tsx`)** are almost exclusively Server Components. They securely access headers (`x-clinic-id`), fetch data directly using `getDb()`, and pass serialized props down to client components.
- **Interactive UI** is isolated into specific Client Components (e.g., forms, realtime queue displays) using `'use client'`.

## 2. Server Actions Usage
**All database mutations occur via Server Actions** defined in `src/app/actions.ts`.
- Client components do not talk to Supabase directly for writes.
- Actions typically read `x-clinic-id` from `headers()`, perform the mutation via the Supabase Service Role client, call `auditLog`, and then invoke `revalidatePath()` to refresh the UI.

## 3. Auth & Session Flow
- **Authentication:** Custom, lightweight JWT-style session cookies.
- **Login:** `/api/auth/login/route.ts` verifies credentials via Supabase `signInWithPassword`, looks up the user's clinic and role in `clinic_users`, and creates a signed `swasthya_session` cookie via `src/lib/session.ts`.
- **Middleware:** `src/proxy.ts` intercepts requests, validates the HMAC-signed cookie, ensures the user's `clinicId` matches the requested subdomain/slug, and injects HTTP headers (`x-clinic-id`, `x-user-id`, `x-user-role`).

## 4. Tenant Isolation Approach
- **Routing:** Every protected route is prefixed with a `[slug]` or resolved via subdomain.
- **Header Injection:** The middleware parses the slug, looks up the `clinic_id`, and sets `x-clinic-id`.
- **Data Access:** Server Components and Actions extract `x-clinic-id` using `headers().get('x-clinic-id')`. Every database query appends `.eq('clinic_id', clinicId)`.

## 5. Row Level Security (RLS) Assumptions
- **Server Bypass:** Because `getDb()` (used by RSC and Server Actions) is initialized with `SUPABASE_SERVICE_ROLE_KEY`, **RLS is completely bypassed on the server**.
- **Client Enforcement:** RLS policies (`supabase/migrations/00000_...sql`) exist primarily to secure client-side `Supabase Realtime` subscriptions (e.g., in `QueueDisplay.tsx`). The policies allow anonymous reads for specific tables where necessary but block all anon writes.

## 6. API Routes Usage
API Routes (`src/app/api/`) are reserved for tasks that do not fit the Server Action model well:
- **Audio streaming/uploading:** `/api/intake-voice`, `/api/transcribe-chunk`, `/api/tts`.
- **External Webhooks:** `/api/whatsapp/send`.
- **Authentication:** `/api/auth/login`.

## 7. Styling System
- **Strictly Vanilla CSS.**
- Global variables and layouts are defined in `src/app/globals.css`.
- Components use `style={{ ... }}` inline styling for layout and composition. 
- **Tailwind CSS is explicitly forbidden** per repository constraints.

## 8. Boundaries That Should Not Be Violated
1. **Never mutate data in Client Components.** Always use `actions.ts`.
2. **Never query without `clinic_id`.** Always append `.eq('clinic_id', clinicId)` to every Supabase query, even if RLS is bypassed. This is the ultimate safety net.
3. **Never bypass `proxy.ts`.** Do not attempt to implement route-level auth checks inside individual `page.tsx` files. Trust the middleware.
4. **Do not use `.env` directly in Client Components.** Ensure environment variables used by the client are prefixed with `NEXT_PUBLIC_`.

## 9. Dangerous Anti-Patterns to Avoid
- **Passing full Supabase responses to Client Components:** Always select only the necessary fields or map to defined Types (`src/lib/types.ts`) before passing data to `'use client'` boundaries.
- **Failing to `await` searchParams/params:** In Next.js 16+, `params` and `searchParams` are Promises. They MUST be awaited.
- **Assuming AI output is perfectly formatted:** Always parse JSON outputs defensively, as done in `src/lib/sarvamChatAdapter.ts`.
