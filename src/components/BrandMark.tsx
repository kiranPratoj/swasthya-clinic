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
      <rect x="23" y="7" width="18" height="50" rx="8.5" fill="#2C86F5" opacity="0.92" />
      <rect x="7" y="23" width="50" height="18" rx="8.5" fill="#1461D3" />
      <path
        d="M23 41H16.5C11.8056 41 8 37.1944 8 32.5V23H41L23 41Z"
        fill="#0B47B8"
      />
      <rect x="41" y="23" width="16" height="18" rx="8" fill="#4B9CFF" opacity="0.86" />
      <circle cx="47" cy="17" r="5" fill="#2C86F5" />
      <rect x="8" y="23" width="15" height="18" rx="7.5" fill="#0D52C4" />
      <rect x="23" y="7" width="18" height="16" rx="7.5" fill="#4B9CFF" />
    </svg>
  );
}
