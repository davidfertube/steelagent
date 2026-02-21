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
      {/* Outer vault door ring */}
      <circle cx="32" cy="32" r="30" fill="#0f172a" />
      <circle cx="32" cy="32" r="30" stroke="#22c55e" strokeWidth="3" fill="none" />
      {/* Inner ring — vault wheel hub */}
      <circle cx="32" cy="32" r="18" stroke="#22c55e" strokeWidth="2" fill="#1e293b" />
      {/* Wheel spokes — steel bolt pattern */}
      <line x1="32" y1="14" x2="32" y2="20" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="44" x2="32" y2="50" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="32" x2="20" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="32" x2="50" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center lock bolt */}
      <circle cx="32" cy="32" r="5" fill="#22c55e" />
      <circle cx="32" cy="32" r="4" fill="none" stroke="#4ade80" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
