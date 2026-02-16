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
      aria-label="SteelAgent logo"
      role="img"
    >
      {/* Hexagon — materials science / molecular structure */}
      <polygon
        points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
        fill="#22c55e"
      />
      {/* Inner hexagon border for depth */}
      <polygon
        points="32,7 54,19.5 54,44.5 32,57 10,44.5 10,19.5"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {/* Document body */}
      <rect x="21" y="17" width="18" height="24" rx="1.5" fill="white" />
      {/* Document corner fold */}
      <path d="M33 17 L39 23 L33 23 Z" fill="#d1d5db" />
      {/* Document lines (spec text) */}
      <rect x="25" y="26" width="10" height="1.5" rx="0.75" fill="#d1d5db" />
      <rect x="25" y="30" width="8" height="1.5" rx="0.75" fill="#d1d5db" />
      <rect x="25" y="34" width="11" height="1.5" rx="0.75" fill="#d1d5db" />
      {/* Verification checkmark circle */}
      <circle cx="38" cy="40" r="8" fill="#16a34a" />
      <circle cx="38" cy="40" r="7" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
      {/* Checkmark */}
      <polyline
        points="33.5,40 36.5,43 42.5,37"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
