export function getPatientPortalBasePath(pathname: string, slug: string): string {
  if (pathname === `/${slug}/portal` || pathname.startsWith(`/${slug}/portal/`)) {
    return `/${slug}/portal`;
  }

  return '/portal';
}
