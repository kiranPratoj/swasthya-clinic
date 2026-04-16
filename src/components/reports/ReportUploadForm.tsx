'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportType, ParsedReportData } from '@/lib/types';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  blood_test: 'Blood Test',
  xray: 'X-Ray',
  scan: 'Scan / Ultrasound',
  prescription: 'Prescription',
  other: 'Other',
};

type Props = {
  patientId: string;
  appointmentId?: string;
};

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function ReportUploadForm({ patientId, appointmentId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>('idle');
  const [reportType, setReportType] = useState<ReportType>('blood_test');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state === 'uploading') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setState('idle');
    setErrorMsg('');
    setParsedSummary(null);
    setParsedData(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setState('uploading');
    setErrorMsg('');

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('patientId', patientId);
    fd.append('reportType', reportType);
    if (appointmentId) fd.append('appointmentId', appointmentId);

    try {
      const res = await fetch('/api/upload-report', { method: 'POST', body: fd });
      const payload = await res.json() as {
        reportId?: string;
        rawSummary?: string | null;
        parsedData?: ParsedReportData | null;
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(payload.error ?? 'Upload failed.');
        setState('error');
        return;
      }

      setParsedSummary(payload.rawSummary ?? null);
      setParsedData(payload.parsedData ?? null);
      setState('done');
      router.refresh(); // reload server component to show new report
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  function reset() {
    setState('idle');
    setSelectedFile(null);
    setParsedSummary(null);
    setParsedData(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const isLoading = state === 'uploading';

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--color-primary-outline)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'grid',
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>📎</span>
        <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>Upload Report</strong>
      </div>

      {/* Report type */}
      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
          Report Type
        </label>
        <select
          value={reportType}
          onChange={e => setReportType(e.target.value as ReportType)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: '0.88rem',
            background: 'white',
            color: 'var(--color-text)',
          }}
        >
          {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* File picker */}
      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
          File (PDF, photo, or image)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          disabled={isLoading}
          style={{
            fontSize: '0.85rem',
            width: '100%',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'white',
            color: 'var(--color-text)',
          }}
        />
        {selectedFile && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {/* Actions */}
      {state !== 'done' && (
        <>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            style={{
              padding: '0.75rem',
              background: !selectedFile || isLoading ? 'var(--color-bg-soft)' : 'var(--color-primary)',
              color: !selectedFile || isLoading ? 'var(--color-text-muted)' : 'white',
              border: !selectedFile || isLoading ? '1px solid var(--color-border)' : 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: !selectedFile || isLoading ? 'not-allowed' : 'pointer',
              opacity: !selectedFile || isLoading ? 1 : undefined,
            }}
          >
            {isLoading ? `⏳ Reading report… (${elapsed}s)` : '⬆ Upload & Parse'}
          </button>
          {isLoading && elapsed >= 5 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '0.25rem 0 0' }}>
              {elapsed < 20 ? 'AI is extracting test values from the report…' : 'Almost done — large reports take a moment…'}
            </p>
          )}
        </>
      )}

      {/* Error */}
      {state === 'error' && (
        <div style={{ background: 'var(--color-error-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-error)' }}>
          {errorMsg}
          <button onClick={reset} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: 'var(--color-error)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {state === 'done' && (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
            ✓ Uploaded successfully
          </div>
          {parsedSummary && (
            <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.83rem', color: 'var(--color-text)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>AI Summary</span>
              <p style={{ margin: '0.3rem 0 0' }}>{parsedSummary}</p>
            </div>
          )}
          {!parsedSummary && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              AI parsing unavailable — file stored, view it from the report card below.
            </p>
          )}
          {parsedData?.tests && parsedData.tests.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Test</th>
                    <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Value</th>
                    <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Range</th>
                    <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.tests.map((t, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{t.name}</td>
                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{t.value} {t.unit}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--color-text-muted)' }}>{t.ref_range}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        {t.flag === 'high' && <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>HIGH</span>}
                        {t.flag === 'low'  && <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.75rem' }}>LOW</span>}
                        {t.flag === 'normal' && <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>Normal</span>}
                        {!t.flag && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            + Upload another report
          </button>
        </div>
      )}
    </div>
  );
}
