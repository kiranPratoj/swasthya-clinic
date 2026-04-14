import ClinicFallbackPage from '@/components/ClinicFallbackPage';

export default function ClinicNotFound() {
  return (
    <ClinicFallbackPage
      title="Clinic not found"
      message="The clinic you are trying to access does not exist or this page is unavailable."
    />
  );
}
