import Link from 'next/link';

export default function NavDemoButton({ className }: { className?: string }) {
  return (
    <Link href="/onboard" className={className ?? 'bda-nav-link bda-nav-link--primary'}>
      Start Free Trial
    </Link>
  );
}
