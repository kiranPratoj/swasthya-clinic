import ClinicFallbackPage from '@/components/ClinicFallbackPage';

export default async function ClinicNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; path?: string }>;
}) {
  const { slug } = await searchParams;
  const slugText = slug ? ` for "${slug}"` : '';

  return (
    <ClinicFallbackPage
      title="Clinic not found"
      message={`We could not find a clinic${slugText}. Check the link or return to the Medilite home page.`}
      primaryHref="/onboard"
      primaryLabel="Register a Clinic"
      secondaryHref="/"
      secondaryLabel="Back to Home"
    />
  );
}
