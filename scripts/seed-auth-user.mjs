/**
 * Creates a demo Supabase Auth user and links them to the drpriya clinic.
 * Run once after `node scripts/seed-demo.mjs`.
 *
 * Usage:
 *   node scripts/seed-auth-user.mjs
 *
 * Demo credentials created:
 *   Email:    admin@drpriya.clinic
 *   Password: Swasthya@2025
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvchdgvktlkvzqlwuhki.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y2hkZ3ZrdGxrdnpxbHd1aGtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUxMzgzNiwiZXhwIjoyMDkxMDg5ODM2fQ.SBTyiVAqP2xPe3QzkGw9yes2cmBIKDN3tuFRRIj2RrU';

const DEMO_EMAIL    = 'admin@drpriya.clinic';
const DEMO_PASSWORD = 'Swasthya@2025';
const CLINIC_SLUG   = 'drpriya';

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  // 1. Look up the clinic
  const { data: clinic, error: cErr } = await db
    .from('clinics').select('id').eq('slug', CLINIC_SLUG).single();
  if (cErr || !clinic) throw new Error(`Clinic '${CLINIC_SLUG}' not found. Run seed-demo.mjs first.`);
  console.log('✓ Clinic:', clinic.id);

  // 2. Create (or retrieve) the auth user
  const { data: existing } = await db.auth.admin.listUsers();
  const alreadyExists = existing?.users?.find(u => u.email === DEMO_EMAIL);

  let userId;
  if (alreadyExists) {
    userId = alreadyExists.id;
    console.log('✓ Auth user already exists:', userId);
  } else {
    const { data: created, error: uErr } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,   // skip email confirmation for demo
    });
    if (uErr) throw new Error('Create user: ' + uErr.message);
    userId = created.user.id;
    console.log('✓ Auth user created:', userId);
  }

  // 3. Upsert clinic_users row
  const { error: cuErr } = await db.from('clinic_users').upsert(
    { auth_user_id: userId, clinic_id: clinic.id, role: 'admin' },
    { onConflict: 'auth_user_id,clinic_id' }
  );
  if (cuErr) throw new Error('clinic_users: ' + cuErr.message);
  console.log('✓ clinic_users row upserted');

  console.log('\n✅ Auth seed complete!');
  console.log(`\n🔑 Login at: https://swasthya-clinic-theta.vercel.app/login`);
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
}

run().catch(e => { console.error('✗', e.message); process.exit(1); });
