import { cn } from "../lib/cn";

/*
 * Distant birds, drawn the way they read in a photograph: one smooth tapered silhouette.
 * The three wing poses share the same path structure, so the browser morphs between them
 * smoothly. Each bird flaps a few beats, then glides, like real birds do.
 */
const LEVEL = "M0 7 C6 3 12 2 18 6 C19 7 21 7 22 6 C28 2 34 3 40 7 C34 5 28 6 22 10 L20 11 L18 10 C12 6 6 5 0 7 Z";
const UP = "M2 0 C7 2 13 4 18 7 C19 8 21 8 22 7 C27 4 33 2 38 0 C33 4 28 7 22 10 L20 11 L18 10 C12 7 7 4 2 0 Z";
const DOWN = "M3 14 C8 10 13 7 18 7 C19 8 21 8 22 7 C27 7 32 10 37 14 C32 11 27 9 22 10 L20 11 L18 10 C13 9 8 11 3 14 Z";

// three wingbeats, then a glide for the rest of the cycle
const VALUES = [LEVEL, UP, LEVEL, DOWN, LEVEL, UP, LEVEL, DOWN, LEVEL, UP, LEVEL, DOWN, LEVEL, LEVEL].join(";");
const TIMES = "0;0.05;0.1;0.15;0.2;0.25;0.3;0.35;0.4;0.45;0.5;0.55;0.6;1";

export function Bird({ width = 32, color = "#16301D", cycle = 2.6, offset = 0 }: { width?: number; color?: string; cycle?: number; offset?: number }) {
  return (
    <svg viewBox="0 -1 40 16" width={width} height={(width * 16) / 40} className="overflow-visible" aria-hidden="true">
      <path d={LEVEL} fill={color}>
        <animate attributeName="d" dur={`${cycle}s`} begin={`${-offset}s`} repeatCount="indefinite" values={VALUES} keyTimes={TIMES} />
      </path>
    </svg>
  );
}

type FlockBird = { top: string; dur: number; delay: number; width: number; opacity: number; cycle: number };

const FLOCK: FlockBird[] = [
  { top: "17%", dur: 52, delay: -12, width: 34, opacity: 0.85, cycle: 2.4 },
  { top: "21%", dur: 52, delay: -13.4, width: 26, opacity: 0.75, cycle: 2.8 },
  { top: "14%", dur: 52, delay: -14.6, width: 22, opacity: 0.7, cycle: 2.2 },
  { top: "29%", dur: 70, delay: -44, width: 16, opacity: 0.5, cycle: 2.6 },
  { top: "26%", dur: 70, delay: -45.5, width: 13, opacity: 0.45, cycle: 3 },
];

/** A few birds crossing the scene, slowly. CSS moves them; SVG morphs the wings. */
export function Flock({ className, tone = "#16301D" }: { className?: string; tone?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {FLOCK.map((b, i) => (
        <div key={i} className="bird-drift absolute left-0" style={{ top: b.top, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, opacity: b.opacity }}>
          <div className="bird-glide" style={{ animationDelay: `${i * -0.9}s` }}>
            <Bird width={b.width} color={tone} cycle={b.cycle} offset={i * 0.37} />
          </div>
        </div>
      ))}
    </div>
  );
}
