import { getDb } from './db';
import type { PatientReport } from './types';

const REPORT_BUCKET = 'clinic-reports';
const REPORT_SIGNED_URL_TTL_SECONDS = 86400;

type UnsignedPatientReport = Omit<PatientReport, 'signedUrl'>;

export async function attachPatientReportSignedUrls(
  reports: UnsignedPatientReport[]
): Promise<PatientReport[]> {
  const storageDb = getDb();

  return Promise.all(
    reports.map(async (report) => {
      if (!report.file_path) {
        return {
          ...report,
          signedUrl: '',
        };
      }

      const { data } = await storageDb.storage
        .from(REPORT_BUCKET)
        .createSignedUrl(report.file_path, REPORT_SIGNED_URL_TTL_SECONDS);

      return {
        ...report,
        signedUrl: data?.signedUrl ?? '',
      };
    })
  );
}
