type BrandMarkProps = {
  size?: number;
  className?: string;
};

export default function BrandMark({ size = 48, className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="24" y="8" width="16" height="48" rx="8" fill="var(--color-primary)" />
      <rect x="8" y="24" width="48" height="16" rx="8" fill="var(--color-primary)" />
      <rect x="6" y="13" width="14" height="14" rx="4" fill="var(--color-error-strong)" />
      <rect x="13" y="6" width="14" height="14" rx="4" fill="var(--color-error-strong)" />
      <circle cx="45" cy="45" r="6" fill="var(--color-error)" opacity="0.92" />
    </svg>
  );
}
