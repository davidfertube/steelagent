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
      {/* Shield shape */}
      <path
        d="M32 4L8 16v18c0 14 10.5 22.5 24 26 13.5-3.5 24-12 24-26V16L32 4z"
        fill="#0f172a"
      />
      <path
        d="M32 7L11 17.5v15.5c0 12.5 9.5 20 21 23.5 11.5-3.5 21-11 21-23.5V17.5L32 7z"
        fill="#1e293b"
        stroke="#22c55e"
        strokeWidth="1.5"
      />
      {/* Checkmark */}
      <path
        d="M22 33l7 7 13-14"
        stroke="#22c55e"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle inner glow on checkmark */}
      <path
        d="M22 33l7 7 13-14"
        stroke="#4ade80"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}
