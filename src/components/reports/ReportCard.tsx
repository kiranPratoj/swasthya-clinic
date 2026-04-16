import type { PatientReport } from '@/lib/types';

const REPORT_TYPE_LABELS: Record<string, string> = {
  blood_test: 'Blood Test',
  xray: 'X-Ray',
  scan: 'Scan / Ultrasound',
  prescription: 'Prescription',
  other: 'Report',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReportCard({ report }: { report: PatientReport }) {
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] ?? 'Report';
  const tests = report.parsed_data?.tests ?? [];
  const abnormal = tests.filter(t => t.flag === 'high' || t.flag === 'low');

  return (
    <article style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      background: 'white',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '0.75rem 1rem',
        borderBottom: tests.length > 0 ? '1px solid var(--color-border)' : 'none',
        gap: '0.75rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-primary)',
              background: 'var(--color-primary-soft)',
              padding: '2px 8px',
              borderRadius: '999px',
            }}>
              {typeLabel}
            </span>
            {abnormal.length > 0 && (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#dc2626',
                background: '#fef2f2',
                padding: '2px 8px',
                borderRadius: '999px',
              }}>
                {abnormal.length} Abnormal
              </span>
            )}
          </div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
            {report.parsed_data?.lab_name && (
              <span>{report.parsed_data.lab_name} · </span>
            )}
            {report.parsed_data?.collection_date
              ? `Collected: ${report.parsed_data.collection_date}`
              : report.parsed_data?.report_date
                ? report.parsed_data.report_date
                : formatDate(report.created_at)}
          </div>
          {(report.parsed_data?.referral || report.parsed_data?.sample_type) && (
            <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {report.parsed_data.sample_type && <span>Sample: {report.parsed_data.sample_type}</span>}
              {report.parsed_data.sample_type && report.parsed_data.referral && <span> · </span>}
              {report.parsed_data.referral && <span>Ref: {report.parsed_data.referral}</span>}
            </div>
          )}
          {report.raw_summary && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
              {report.raw_summary}
            </p>
          )}
        </div>

        {report.signedUrl && (
          <a
            href={report.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              background: 'var(--color-primary-soft)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            View ↗
          </a>
        )}
      </div>

      {/* Test results table */}
      {tests.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem 1rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Test</th>
                <th style={{ padding: '0.4rem 0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Value</th>
                <th style={{ padding: '0.4rem 0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Range</th>
                <th style={{ padding: '0.4rem 0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.45rem 1rem', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700 }}>
                    {t.value}{t.unit ? ` ${t.unit}` : ''}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', color: 'var(--color-text-muted)' }}>
                    {t.ref_range || '—'}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem' }}>
                    {t.flag === 'high'   && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.72rem' }}>HIGH</span>}
                    {t.flag === 'low'    && <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.72rem' }}>LOW</span>}
                    {t.flag === 'normal' && <span style={{ color: '#16a34a', fontSize: '0.72rem' }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No parsing available */}
      {!report.raw_summary && tests.length === 0 && (
        <div style={{ padding: '0.6rem 1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          {report.signedUrl
            ? 'AI parsing unavailable — open the file to view contents.'
            : 'File stored. Link unavailable.'}
        </div>
      )}
    </article>
  );
}
