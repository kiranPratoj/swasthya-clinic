import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getClinicDb, auditLog } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const clinicId = (await headers()).get('x-clinic-id');
    if (!clinicId) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

    const fd = await request.formData();
    const patientName = (fd.get('patientName') as string)?.trim();
    const phone = (fd.get('phone') as string)?.trim();
    const complaint = (fd.get('complaint') as string)?.trim();
    const visitType = (fd.get('visitType') as string) || 'booked';
    const doctorId = fd.get('doctorId') as string;
    const bookedFor = (fd.get('bookedFor') as string) || new Date().toISOString().split('T')[0];

    if (!patientName || !phone || !complaint || !doctorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Phone must be a 10-digit number' }, { status: 400 });
    }

    const db = getClinicDb(clinicId);

    // Upsert patient by phone
    const { data: existing } = await db.from('patients').select('id')
      .eq('clinic_id', clinicId).eq('phone', phone).maybeSingle();

    let patientId: string;
    if (existing) {
      patientId = existing.id;
    } else {
      const { data: newP, error: pErr } = await db.from('patients')
        .insert({ clinic_id: clinicId, name: patientName, phone })
        .select('id').single();
      if (pErr) throw new Error(pErr.message);
      patientId = newP.id;
    }

    // Get token number
    const { data: tokenData } = await db.rpc('next_token_number', {
      p_clinic_id: clinicId,
      p_date: bookedFor,
    });
    const tokenNumber: number = tokenData ?? 1;

    // Create appointment with status 'booked' (not yet confirmed by receptionist)
    const { data: appt, error: apptErr } = await db.from('appointments').insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctorId,
      token_number: tokenNumber,
      visit_type: visitType,
      complaint,
      status: 'booked',
      booked_for: bookedFor,
    }).select('id').single();

    if (apptErr) throw new Error(apptErr.message);

    await auditLog(clinicId, 'patient', 'self_booked', appt.id, { tokenNumber, phone, bookedFor });

    return NextResponse.json({ appointmentId: appt.id, tokenNumber });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Booking failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
