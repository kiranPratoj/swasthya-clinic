import { createClient } from '@supabase/supabase-js';

const URL = 'https://cvchdgvktlkvzqlwuhki.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y2hkZ3ZrdGxrdnpxbHd1aGtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUxMzgzNiwiZXhwIjoyMDkxMDg5ODM2fQ.SBTyiVAqP2xPe3QzkGw9yes2cmBIKDN3tuFRRIj2RrU';

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const TODAY = new Date().toISOString().split('T')[0];

const PATIENTS = [
  { name: 'Ravi Kumar',      age: 45, phone: '9845001001', complaint: 'Follow-up for hypertension, BP review',         visit_type: 'follow-up',  status: 'completed',  token: 1  },
  { name: 'Meera Nair',      age: 32, phone: '9845001002', complaint: 'Fever and body pain since 2 days',              visit_type: 'walk-in',    status: 'completed',  token: 2  },
  { name: 'Suresh Babu',     age: 58, phone: '9845001003', complaint: 'Diabetes quarterly checkup',                    visit_type: 'booked',     status: 'completed',  token: 3  },
  { name: 'Kavitha Reddy',   age: 29, phone: '9845001004', complaint: 'Severe headache and nausea since morning',      visit_type: 'walk-in',    status: 'in_progress',token: 4  },
  { name: 'Anand Krishnan',  age: 41, phone: '9845001005', complaint: 'Post-surgery wound check',                      visit_type: 'follow-up',  status: 'confirmed',  token: 5  },
  { name: 'Lakshmi Devi',    age: 67, phone: '9845001006', complaint: 'Joint pain in knees, difficulty walking',       visit_type: 'walk-in',    status: 'confirmed',  token: 6  },
  { name: 'Mohammed Irfan',  age: 35, phone: '9845001007', complaint: 'Chest tightness and shortness of breath',       visit_type: 'walk-in',    status: 'confirmed',  token: 7  },
  { name: 'Preethi Shetty',  age: 24, phone: '9845001008', complaint: 'Routine prenatal checkup, 20 weeks',            visit_type: 'booked',     status: 'confirmed',  token: 8  },
  { name: 'Venkatesh Rao',   age: 52, phone: '9845001009', complaint: 'Persistent cough and mild fever for a week',   visit_type: 'walk-in',    status: 'confirmed',  token: 9  },
  { name: 'Geetha Murthy',   age: 38, phone: '9845001010', complaint: 'Thyroid test results review',                   visit_type: 'follow-up',  status: 'confirmed',  token: 10 },
];

async function run() {
  // Upsert clinic
  const { data: clinic, error: cErr } = await db
    .from('clinics')
    .upsert({ name: 'Dr. Priya Sharma Clinic', slug: 'drpriya', phone: '+91 98456 12345', speciality: 'General Medicine' }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (cErr) throw new Error('Clinic: ' + cErr.message);
  console.log('✓ Clinic:', clinic.id);

  // Upsert doctor
  const { data: existingDoc } = await db.from('doctors').select('id').eq('clinic_id', clinic.id).limit(1).single();
  let doctorId = existingDoc?.id;
  if (!doctorId) {
    const { data: doc, error: dErr } = await db.from('doctors').insert({
      clinic_id: clinic.id,
      name: 'Dr. Priya Sharma',
      speciality: 'General Medicine',
      phone: '+91 98456 12345',
      working_hours: { mon:{open:true,slots:[{start:'09:00',end:'13:00'}]}, tue:{open:true,slots:[{start:'09:00',end:'13:00'}]}, wed:{open:true,slots:[{start:'09:00',end:'13:00'}]}, thu:{open:true,slots:[{start:'09:00',end:'13:00'}]}, fri:{open:true,slots:[{start:'09:00',end:'13:00'}]}, sat:{open:true,slots:[{start:'09:00',end:'12:00'}]}, sun:{open:false,slots:[{start:'09:00',end:'12:00'}]} },
      slot_duration_mins: 15,
    }).select('id').single();
    if (dErr) throw new Error('Doctor: ' + dErr.message);
    doctorId = doc.id;
  }
  console.log('✓ Doctor:', doctorId);

  // Seed patients + appointments
  for (const p of PATIENTS) {
    // Upsert patient by phone
    const { data: existing } = await db.from('patients').select('id').eq('clinic_id', clinic.id).eq('phone', p.phone).maybeSingle();
    let patientId = existing?.id;
    if (!patientId) {
      const { data: newP, error: pErr } = await db.from('patients')
        .insert({ clinic_id: clinic.id, name: p.name, age: p.age, phone: p.phone })
        .select('id').single();
      if (pErr) throw new Error(`Patient ${p.name}: ${pErr.message}`);
      patientId = newP.id;
    }

    // Insert appointment (skip if token already exists for today)
    const { error: aErr } = await db.from('appointments').upsert({
      clinic_id: clinic.id,
      patient_id: patientId,
      doctor_id: doctorId,
      token_number: p.token,
      visit_type: p.visit_type,
      complaint: p.complaint,
      status: p.status,
      booked_for: TODAY,
    }, { onConflict: 'clinic_id,booked_for,token_number', ignoreDuplicates: true });

    if (aErr) console.warn(`  ⚠ Token ${p.token} (${p.name}): ${aErr.message}`);
    else console.log(`  ✓ Token ${p.token} — ${p.name} [${p.status}]`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`\n🔗 Open: https://swasthya-clinic-theta.vercel.app/drpriya/admin`);
  console.log(`   Queue: https://swasthya-clinic-theta.vercel.app/drpriya/queue`);
}

run().catch(e => { console.error(e); process.exit(1); });
