import React from "react";
import { useCurrentFrame } from "remotion";

/*
 * The website's birds (web-earth/src/components/Birds.tsx): one tapered silhouette with three
 * wing poses that share a path structure. Here the wings are driven by the frame number
 * (no SMIL/CSS), so every render is deterministic.
 */
const LEVEL = "M0 7 C6 3 12 2 18 6 C19 7 21 7 22 6 C28 2 34 3 40 7 C34 5 28 6 22 10 L20 11 L18 10 C12 6 6 5 0 7 Z";
const UP = "M2 0 C7 2 13 4 18 7 C19 8 21 8 22 7 C27 4 33 2 38 0 C33 4 28 7 22 10 L20 11 L18 10 C12 7 7 4 2 0 Z";
const DOWN = "M3 14 C8 10 13 7 18 7 C19 8 21 8 22 7 C27 7 32 10 37 14 C32 11 27 9 22 10 L20 11 L18 10 C13 9 8 11 3 14 Z";

const NUM = /-?\d*\.?\d+/g;
const nums = (d: string) => (d.match(NUM) ?? []).map(Number);
const TEMPLATE = LEVEL.split(NUM);
const L = nums(LEVEL);
const U = nums(UP);
const D = nums(DOWN);

const morph = (to: number[], t: number) => {
  let out = TEMPLATE[0];
  for (let i = 0; i < L.length; i++) out += (L[i] + (to[i] - L[i]) * t).toFixed(2) + TEMPLATE[i + 1];
  return out;
};

/** Wing pose for a phase in [0,1): three wingbeats, then a glide. */
export const wingPath = (phase: number) => {
  const p = ((phase % 1) + 1) % 1;
  if (p > 0.6) return LEVEL;
  const s = Math.sin((p / 0.6) * Math.PI * 2 * 3);
  return s >= 0 ? morph(U, s * 0.9) : morph(D, -s * 0.9);
};

export const Bird = ({ width = 40, color = "#16301D", phase = 0 }: { width?: number; color?: string; phase?: number }) => (
  <svg viewBox="0 -1 40 16" width={width} height={(width * 16) / 40} style={{ overflow: "visible", display: "block" }}>
    <path d={wingPath(phase)} fill={color} />
  </svg>
);

type FlockBird = { x0: number; y: number; speed: number; width: number; opacity: number; cycle: number; off: number };

const DEFAULT_FLOCK: FlockBird[] = [
  { x0: -120, y: 0.17, speed: 3.1, width: 62, opacity: 0.85, cycle: 64, off: 0 },
  { x0: -210, y: 0.205, speed: 3.0, width: 48, opacity: 0.75, cycle: 74, off: 0.3 },
  { x0: -300, y: 0.15, speed: 3.2, width: 40, opacity: 0.7, cycle: 58, off: 0.55 },
  { x0: -60, y: 0.27, speed: 2.1, width: 28, opacity: 0.5, cycle: 70, off: 0.15 },
  { x0: -150, y: 0.255, speed: 2.0, width: 24, opacity: 0.45, cycle: 80, off: 0.7 },
];

/** A few birds crossing the frame, left to right, bobbing gently. `start` shifts them along their path. */
export const Flock = ({
  tone = "#1C2A22", start = 0, height = 1920, flock = DEFAULT_FLOCK, scale = 1, style,
}: { tone?: string; start?: number; height?: number; flock?: FlockBird[]; scale?: number; style?: React.CSSProperties }) => {
  const f = useCurrentFrame() + start;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", ...style }}>
      {flock.map((b, i) => {
        const x = b.x0 + b.speed * f;
        const y = b.y * height + Math.sin(f / 22 + i * 1.7) * 7 + Math.sin(f / 61 + i) * 10;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, opacity: b.opacity, transform: `rotate(${Math.sin(f / 30 + i) * 3}deg)` }}>
            <Bird width={b.width * scale} color={tone} phase={f / b.cycle + b.off} />
          </div>
        );
      })}
    </div>
  );
};
