/**
 * Seeds all three role-based auth users for the drpriya demo clinic.
 * Safe to re-run — existing users are reused, not duplicated.
 *
 * Run after seed-demo.mjs:
 *   node scripts/seed-all-users.mjs
 *
 * Users created:
 *   admin@drpriya.clinic        Swasthya@2025   admin
 *   doctor@drpriya.clinic       Doctor@2025     doctor
 *   reception@drpriya.clinic    Reception@2025  receptionist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvchdgvktlkvzqlwuhki.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y2hkZ3ZrdGxrdnpxbHd1aGtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUxMzgzNiwiZXhwIjoyMDkxMDg5ODM2fQ.SBTyiVAqP2xPe3QzkGw9yes2cmBIKDN3tuFRRIj2RrU';
const CLINIC_SLUG  = 'drpriya';

const USERS = [
  { email: 'admin@drpriya.clinic',       password: 'Swasthya@2025',  role: 'admin'        },
  { email: 'doctor@drpriya.clinic',      password: 'Doctor@2025',    role: 'doctor'       },
  { email: 'reception@drpriya.clinic',   password: 'Reception@2025', role: 'receptionist' },
];

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  // 1. Resolve clinic
  const { data: clinic, error: cErr } = await db
    .from('clinics').select('id').eq('slug', CLINIC_SLUG).single();
  if (cErr || !clinic) {
    throw new Error(`Clinic '${CLINIC_SLUG}' not found. Run seed-demo.mjs first.`);
  }
  console.log('✓ Clinic:', clinic.id);

  // 2. Load existing auth users once (avoid repeated admin.listUsers calls)
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existingByEmail = Object.fromEntries(
    (existing?.users ?? []).map(u => [u.email, u.id])
  );

  // 3. Upsert each user
  for (const { email, password, role } of USERS) {
    let userId = existingByEmail[email];

    if (userId) {
      console.log(`  → ${email} already exists (${userId})`);
    } else {
      const { data: created, error: uErr } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (uErr) throw new Error(`Create ${email}: ${uErr.message}`);
      userId = created.user.id;
      console.log(`  + ${email} created (${userId})`);
    }

    // 4. Upsert clinic_users row
    const { error: cuErr } = await db.from('clinic_users').upsert(
      { auth_user_id: userId, clinic_id: clinic.id, role },
      { onConflict: 'auth_user_id,clinic_id' }
    );
    if (cuErr) throw new Error(`clinic_users for ${email}: ${cuErr.message}`);
    console.log(`  ✓ ${role.padEnd(12)} → ${email}`);
  }

  const base = 'https://swasthya-clinic-theta.vercel.app';
  console.log('\n✅ All users seeded!\n');
  console.log(`Login URL: ${base}/login`);
  console.log('');
  console.log('Role          Email                        Password');
  console.log('────────────────────────────────────────────────────────');
  for (const { email, password, role } of USERS) {
    console.log(`${role.padEnd(14)}${email.padEnd(29)}${password}`);
  }
  console.log('');
  console.log(`After login each user lands at: ${base}/${CLINIC_SLUG}/queue`);
}

run().catch(e => { console.error('✗', e.message); process.exit(1); });
