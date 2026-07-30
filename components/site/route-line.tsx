/**
 * Signature motif: a dashed "road" line (Vienna → Belgrade). Pure SVG,
 * animated later (M5) via stroke-dashoffset inside useGSAP; renders static
 * (and fully visible) without JS or under prefers-reduced-motion.
 */
export function RouteLine({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 96"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M-8 78 C 140 20, 300 92, 460 56 S 760 10, 920 52 S 1140 84, 1210 40"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 14"
        data-route-line
      />
      <circle cx="24" cy="70" r="5" fill="currentColor" />
      <circle cx="1176" cy="46" r="5" fill="currentColor" />
    </svg>
  );
}
