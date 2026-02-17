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
      {/* Hexagonal bolt shape */}
      <polygon points="32,2 56,17 56,47 32,62 8,47 8,17" fill="#0f172a" />
      <polygon
        points="32,5 53.5,18.5 53.5,45.5 32,59 10.5,45.5 10.5,18.5"
        fill="#1e293b"
        stroke="#22c55e"
        strokeWidth="1.5"
      />
      {/* Steel I-beam cross section */}
      <rect x="16" y="20" width="32" height="5" rx="0.5" fill="#22c55e" />
      <rect x="16" y="39" width="32" height="5" rx="0.5" fill="#22c55e" />
      <rect x="28" y="25" width="8" height="14" rx="0.5" fill="#22c55e" />
      {/* Subtle inner glow lines */}
      <rect x="17" y="21" width="30" height="1" rx="0.5" fill="#4ade80" opacity="0.4" />
      <rect x="17" y="40" width="30" height="1" rx="0.5" fill="#4ade80" opacity="0.4" />
      <rect x="29" y="26" width="6" height="1" rx="0.5" fill="#4ade80" opacity="0.3" />
      {/* Corner accent marks */}
      <line x1="14" y1="15" x2="20" y2="15" stroke="#22c55e" strokeWidth="0.75" opacity="0.5" />
      <line x1="14" y1="15" x2="14" y2="21" stroke="#22c55e" strokeWidth="0.75" opacity="0.5" />
      <line x1="50" y1="49" x2="44" y2="49" stroke="#22c55e" strokeWidth="0.75" opacity="0.5" />
      <line x1="50" y1="49" x2="50" y2="43" stroke="#22c55e" strokeWidth="0.75" opacity="0.5" />
    </svg>
  );
}
