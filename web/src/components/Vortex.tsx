/**
 * QRONOS-style vortex: thin curves that sweep in from the top and converge on the globe.
 * Static SVG (no per-frame work); the only motion is a slow opacity breathe on the whole layer,
 * which the compositor handles without repainting.
 */
const W = 1440;
const H = 900;
const CX = W / 2;
const FOCUS_Y = 700; // where the curves converge, roughly the top of the globe
const N = 64;

const curves = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  const x0 = -260 + t * (W + 520); // start slightly beyond both edges
  const dx = x0 - CX;
  const endX = CX + dx * 0.035;
  return `M${x0.toFixed(1)},-40 C${(CX + dx * 0.9).toFixed(1)},${(H * 0.42).toFixed(1)} ${(CX + dx * 0.22).toFixed(1)},${(FOCUS_Y - 90).toFixed(1)} ${endX.toFixed(1)},${FOCUS_Y}`;
});

export function Vortex({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vx-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.45" stopColor="#B9D4FF" stopOpacity="0.16" />
          <stop offset="0.85" stopColor="#7DB4FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="vx-fade" cx="0.5" cy="0.8" r="0.75">
          <stop offset="0.35" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="vx-mask"><rect width={W} height={H} fill="url(#vx-fade)" /></mask>
      </defs>
      <g mask="url(#vx-mask)" fill="none" stroke="url(#vx-stroke)" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
        {curves.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}
