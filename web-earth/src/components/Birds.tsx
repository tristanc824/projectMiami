import { useId, type CSSProperties } from "react";
import { cn } from "../lib/cn";

/**
 * A barn swallow in flight, facing right: forked tail, blue-black sheen, rust throat, cream belly.
 * Both wings rotate from the shoulder (see .wing-near / .wing-far in index.css), so the flap reads as real.
 */
export function Swallow({ className, flap = 0.5, style, tone }: { className?: string; flap?: number; style?: CSSProperties; tone?: string }) {
  const id = useId().replace(/:/g, "");
  const body = tone ?? `url(#b${id})`;
  const wing = tone ?? `url(#w${id})`;
  return (
    <svg viewBox="0 0 120 64" className={cn("h-8 w-16 overflow-visible", className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35566B" />
          <stop offset="1" stopColor="#15242C" />
        </linearGradient>
        <linearGradient id={`w${id}`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2B4A5E" />
          <stop offset="1" stopColor="#101C22" />
        </linearGradient>
      </defs>
      <g transform="rotate(-10 60 32)">
      {/* far wing, behind the body */}
      <g className="wing-far" style={{ animationDuration: `${flap}s` }}>
        <path d="M68 30 C 58 10 40 -4 12 -2 C 34 6 50 18 60 33 Z" fill={tone ?? "#0F1A20"} opacity={tone ? 0.55 : 0.7} />
      </g>
      {/* forked tail streamers */}
      <path d="M34 33 C 24 30 12 24 2 16 C 12 28 20 33 30 36 C 20 40 10 46 3 54 C 16 46 26 41 36 38 Z" fill={body} />
      {/* body */}
      <path d="M32 34 C 44 26 64 24 82 26 C 92 27 100 29 104 32 C 98 36 88 39 76 39 C 58 40 44 38 32 36 Z" fill={body} />
      {/* belly */}
      {!tone && <path d="M48 37 C 60 40 78 40 92 36 C 84 41 70 43 58 41 C 54 40 50 39 48 37 Z" fill="#F3E9D6" />}
      {/* head, throat and beak */}
      <circle cx="94" cy="30" r="9.5" fill={body} />
      {!tone && <path d="M95 33 C 98 36 101 36 103 33 C 100 32 97 32 95 33 Z" fill="#C2693E" />}
      <path d="M103 29 L 111 31 L 103 32.5 Z" fill={tone ?? "#1A1A1A"} />
      {!tone && <circle cx="97" cy="28.5" r="1.3" fill="#F3E9D6" />}
      {/* near wing, in front */}
      <g className="wing-near" style={{ animationDuration: `${flap}s` }}>
        <path d="M70 30 C 60 8 38 -8 2 -6 C 28 2 48 16 62 36 Z" fill={wing} />
        {!tone && <path d="M66 30 C 56 14 40 4 20 0" fill="none" stroke="#4E6F84" strokeWidth="0.8" opacity="0.6" />}
      </g>
      </g>
    </svg>
  );
}

/** A minted gold coin with a rim, the engraved Nest mark and a moving shine. */
export function Coin({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 40" className={cn("h-7 w-7 drop-shadow-[0_4px_6px_rgba(107,83,64,0.35)]", className)} aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFF1C2" />
          <stop offset="0.45" stopColor="#F2C46D" />
          <stop offset="1" stopColor="#B07C2A" />
        </radialGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FCE3A0" />
          <stop offset="1" stopColor="#8E6220" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}><circle cx="20" cy="20" r="18" /></clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#r${id})`} />
      <circle cx="20" cy="20" r="15" fill={`url(#g${id})`} />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#9A6B22" strokeWidth="0.6" strokeDasharray="0.8 1.6" opacity="0.7" />
      {/* engraved Nest mark */}
      <g transform="translate(11 11) scale(0.28)" fill="none" stroke="#8E6220" strokeWidth="6" opacity="0.85">
        <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)" />
        <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)" />
        <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)" />
      </g>
      <g clipPath={`url(#c${id})`}>
        <rect className="coin-shine" x="-20" y="-6" width="12" height="52" fill={`url(#s${id})`} transform="rotate(20 20 20)" />
      </g>
    </svg>
  );
}

/** A round songbird sitting on something: soft shading, feather detail and a blink. */
export function PerchedBird({
  className,
  body = "#4E8055",
  belly = "#EFE6D2",
  wing = "#2F5D3A",
  flip,
  delay = 0,
}: {
  className?: string;
  body?: string;
  belly?: string;
  wing?: string;
  flip?: boolean;
  delay?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 44" className={cn("h-11 w-12", className)} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">
      <defs>
        <radialGradient id={`p${id}`} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <path d="M20 35v6M26 35v6M18 41h5M24 41h5" stroke="#6B5340" strokeWidth="1.6" strokeLinecap="round" />
      <g className="bird-peck" style={{ animationDelay: `${delay}s` }}>
        <path d="M9 25 L1 20 L3 24 L0 27 L4 29 Z" fill={wing} />
        <circle cx="23" cy="22" r="14" fill={body} />
        <path d="M23 36a14 14 0 0 0 13.6-10.6H12.2A14 14 0 0 0 23 36z" fill={belly} />
        <circle cx="23" cy="22" r="14" fill={`url(#p${id})`} />
        <path d="M10 22c4-6.5 13.5-6.5 17.5 1-6 3.2-12.5 3.2-17.5-1z" fill={wing} />
        <path d="M13 22.5c3 1.6 7 1.9 11 .6M14.5 20.4c2.6 1 5.6 1.2 8.6.4" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.7" fill="none" />
        <circle cx="33.5" cy="22.5" r="2.2" fill="#E8A48A" opacity="0.55" />
        <path d="M36.5 18.5 L44 20.5 L36.5 22.5 Z" fill="#E7B65B" />
        <path d="M36.5 20.5 L44 20.5 L36.5 22.5 Z" fill="#C8933B" />
        <g className="bird-eye">
          <circle cx="31" cy="17" r="2.1" fill="#1E2A22" />
          <circle cx="31.7" cy="16.3" r="0.6" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}

type FlockBird = { top: string; dur: number; delay: number; size: number; opacity: number; flap: number };

const FLOCK: FlockBird[] = [
  { top: "18%", dur: 46, delay: -10, size: 46, opacity: 0.8, flap: 0.5 },
  { top: "22%", dur: 46, delay: -11.6, size: 34, opacity: 0.7, flap: 0.44 },
  { top: "15%", dur: 46, delay: -12.6, size: 28, opacity: 0.6, flap: 0.56 },
  { top: "30%", dur: 64, delay: -40, size: 22, opacity: 0.45, flap: 0.4 },
];

/** A few swallows crossing the photo as flat silhouettes. Pure CSS transforms. */
export function Flock({ className, tone = "#17201A" }: { className?: string; tone?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {FLOCK.map((b, i) => (
        <div key={i} className="bird-drift absolute left-0" style={{ top: b.top, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, opacity: b.opacity }}>
          <div className="bird-glide" style={{ animationDelay: `${i * -0.9}s` }}>
            <Swallow tone={tone} flap={b.flap} style={{ width: b.size, height: b.size / 1.875 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
