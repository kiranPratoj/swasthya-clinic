'use client';

type Props = {
  date: string;
  summary: string;
};

function extractDiagnosis(summary: string): string {
  const match = summary.match(/^Diagnosis:\s*(.+)/m);
  const diagnosis = match?.[1]?.trim() ?? '';
  return diagnosis || 'Visit record';
}

function extractPrescription(summary: string): string[] {
  const lines = summary.split('\n');
  const rxStart = lines.findIndex((line) => line.trim() === 'Prescription:');
  if (rxStart === -1) return [];

  const items: string[] = [];
  for (let index = rxStart + 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line || line.startsWith('Follow-up')) break;
    if (line.startsWith('-')) items.push(line.slice(1).trim());
  }
  return items;
}

function extractFollowUp(summary: string): string {
  const match = summary.match(/^Follow-up (?:Date|Reminder):\s*(.+)/m);
  return match?.[1]?.trim() ?? '';
}

export default function PortalHistoryCard({ date, summary }: Props) {
  const diagnosis = extractDiagnosis(summary);
  const prescription = extractPrescription(summary);
  const followUp = extractFollowUp(summary);

  return (
    <article
      style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        display: 'grid',
        gap: '0.8rem',
      }}
    >
      <div style={{ display: 'grid', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {date}
        </span>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{diagnosis}</h3>
      </div>

      {prescription.length > 0 && (
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Prescription
          </p>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            {prescription.map((item) => (
              <p key={item} style={{ fontSize: '0.88rem', color: 'var(--color-text)', margin: 0 }}>
                {item}
              </p>
            ))}
          </div>
        </div>
      )}

      {followUp && (
        <div style={{ display: 'grid', gap: '0.3rem' }}>
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Follow-up
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', margin: 0 }}>{followUp}</p>
        </div>
      )}
    </article>
  );
}
