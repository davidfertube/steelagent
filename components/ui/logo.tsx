interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SpecVault logo"
      role="img"
    >
      {/* Abstract "S" lettermark — two offset rounded bars forming an S shape */}
      <rect x="8" y="8" width="48" height="48" rx="12" fill="#0f172a" />
      <path
        d="M40 16H26c-4.4 0-8 3.6-8 8s3.6 8 8 8h12c4.4 0 8 3.6 8 8s-3.6 8-8 8H24"
        stroke="#22c55e"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
