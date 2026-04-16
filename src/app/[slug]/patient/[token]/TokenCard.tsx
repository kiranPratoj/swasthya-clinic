import { getClinicDb } from '@/lib/db';
import type { QueueItem } from '@/lib/types';

type TokenCardProps = {
  appointment: QueueItem;
};

function formatVisitType(value: QueueItem['visit_type']): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export default async function TokenCard({
  appointment,
}: TokenCardProps) {
  const db = getClinicDb(appointment.clinic_id);

  const [{ data: clinic }, { count }] = await Promise.all([
    db.from('clinics').select('name').eq('id', appointment.clinic_id).single(),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', appointment.clinic_id)
      .eq('booked_for', appointment.booked_for)
      .in('status', ['booked', 'confirmed', 'in_progress'])
      .lt('token_number', appointment.token_number),
  ]);

  const clinicName = typeof clinic?.name === 'string' ? clinic.name : 'Medilite AI';
  const patientsAhead = count ?? 0;
  const printButtonId = `print-token-${appointment.id}`;
  const printScript = `
    (() => {
      const button = document.getElementById(${JSON.stringify(printButtonId)});
      if (!button) return;
      button.addEventListener('click', () => {
        window.print();
      });
    })();
  `;

  return (
    <div
      className="max-w-xl"
      style={{
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <style>{`
        @media print {
          #${printButtonId} {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <p
            style={{
              color: 'var(--color-primary)',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {clinicName}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Your Token Number
          </p>
        </div>

        <div
          style={{
            fontSize: '6rem',
            lineHeight: 1,
            fontWeight: 900,
            color: 'var(--color-primary)',
          }}
        >
          {appointment.token_number}
        </div>

        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            {appointment.patient.name}
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>{appointment.complaint}</p>
        </div>

        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.45rem 0.8rem',
              borderRadius: '999px',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              fontWeight: 800,
              fontSize: '0.82rem',
            }}
          >
            {formatVisitType(appointment.visit_type)}
          </span>
        </div>

        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.95rem 1rem',
            display: 'grid',
            gap: '0.3rem',
          }}
        >
          <p style={{ fontWeight: 800 }}>Please wait to be called</p>
          <p style={{ color: 'var(--color-text-muted)' }}>ಕರೆಯುವವರೆಗೆ ದಯವಿಟ್ಟು ಕಾಯಿರಿ</p>
        </div>

        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.95rem 1rem',
          }}
        >
          <p style={{ fontWeight: 700 }}>
            {patientsAhead} patients ahead of you
          </p>
        </div>

        <button
          id={printButtonId}
          type="button"
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.95rem 1rem',
            background: 'var(--color-accent)',
            color: 'white',
            fontWeight: 800,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          Print
        </button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: printScript }} />
    </div>
  );
}
