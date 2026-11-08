import { Easing, interpolate } from "remotion";
import { BAR_F, FILM_FPS, KICKS } from "./timeline";

/*
 * The motion language (FILM_V2_SPEC.md section 4). Everything is a pure function of the frame,
 * including fractional frames (CameraMotionBlur samples between frames).
 */

/** Fast attack, long soft landing. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);
/** Camera: emphasized decelerate (production bible). */
export const CAM = Easing.bezier(0.05, 0.7, 0.1, 1);
/** The accelerating half of a push-through. */
export const PUSH = Easing.bezier(0.7, 0, 0.84, 0);
export const LINEAR = (t: number) => t;

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Clamped interpolate with an easing. */
export const tween = (f: number, range: [number, number], out: [number, number] = [0, 1], ease: (t: number) => number = EASE_OUT) =>
  range[1] <= range[0] ? (f >= range[1] ? out[1] : out[0]) : interpolate(f, range, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/**
 * Unit step response of a damped spring (mass 1), as a function of frames since the start.
 * Analytic, so it works for fractional frames. Default = the spec's hit spring (damping 14,
 * stiffness 220): crosses 1 after ~4 frames, peaks ~1.19 at ~6 frames, settles by ~16.
 */
export const springAt = (frames: number, damping = 14, stiffness = 220) => {
  if (frames <= 0) return 0;
  const t = frames / FILM_FPS;
  const w0 = Math.sqrt(stiffness);
  const z = damping / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (z - Math.sqrt(z * z - 1));
  const r2 = -w0 * (z + Math.sqrt(z * z - 1));
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

/**
 * Every hit is already visible ON its frame: motion starts one frame early (LEAD), so frame `at`
 * shows the first ~15-35% of the move (otherwise the first visible change would land a frame late).
 */
export const LEAD = 1;
/** Primary entrance: the spec's spring, landing on frame `at`. */
/** Springs move fastest on their 2nd-3rd frame, so they start one frame earlier still. */
export const SPRING_LEAD = LEAD + 1;
export const hitIn = (f: number, at: number) => springAt(f - at + SPRING_LEAD);
/** A calmer spring for big objects (phones, cards): small overshoot (~6%). */
export const settle = (f: number, at: number) => springAt(f - at + SPRING_LEAD, 22, 200);
/** Heavy, no overshoot. */
export const glide = (f: number, at: number) => springAt(f - at + SPRING_LEAD, 30, 160);

/** Masked line reveal timing: 9 frames per line, lines 6 frames apart, starting on `at`. */
export const lineT = (f: number, at: number, i = 0, len = 9) => tween(f, [at + i * 6 - LEAD, at + i * 6 + len - LEAD], [0, 1], EASE_OUT);
/** Masked line exit (upward), same rhythm. */
export const lineOut = (f: number, at: number, i = 0, len = 8) => tween(f, [at + i * 3 - LEAD, at + i * 3 + len - LEAD], [0, 1], EASE_IN);

/** Camera drift: about 0.4% scale per bar, from 1.000 at the scene's downbeat. */
export const drift = (f: number) => 1 + 0.004 * (Math.max(0, f) / BAR_F);

/* ------------------------------------------------------------------ kick accents */

const median = (xs: number[]) => {
  if (!xs.length) return 1;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const strongCache = new Map<string, number[]>();
/** Kicks in [from, to) stronger than that range's median strength. */
export const strongKicks = (from: number, to: number) => {
  const key = `${from}-${to}`;
  const hit = strongCache.get(key);
  if (hit) return hit;
  const ks = KICKS.filter(([k]) => k >= from && k < to);
  const med = median(ks.map(([, s]) => s));
  const out = ks.filter(([, s]) => s > med).map(([k]) => k);
  strongCache.set(key, out);
  return out;
};

/**
 * Kick accent at absolute frame `af` for a scene spanning [from, to): `scale` for the focal element
 * (1.000 -> 1.018 -> 1.000 over 8 frames) and `glow` 0..1 for the background (2% brighter, decays
 * over 10 frames). Visible on the kick frame itself.
 */
export const kick = (af: number, from: number, to: number) => {
  let p = 0;
  let g = 0;
  for (const k of strongKicks(from, to)) {
    const d = af - k;
    if (d < 0 || d >= 10) continue;
    const punch = d < 1 ? 0.6 + 0.4 * d : d < 8 ? Math.pow(1 - (d - 1) / 7, 2) : 0;
    p = Math.max(p, punch);
    g = Math.max(g, 1 - d / 10);
  }
  return { scale: 1 + 0.018 * p, glow: g };
};

/** A soft beat pulse 0..1..0 over `len` frames from `at` (for "pulses on the beat"). */
export const pulse = (f: number, at: number, len = 10) => {
  const d = f - at + LEAD;
  if (d < 0 || d > len) return 0;
  return d < 2 ? d / 2 : Math.pow(1 - (d - 2) / (len - 2), 2);
};

/** Quadratic bezier helpers. */
export type Pt = { x: number; y: number };
export const qpt = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export const qpath = (a: Pt, c: Pt, b: Pt) => `M${a.x.toFixed(2)} ${a.y.toFixed(2)} Q${c.x.toFixed(2)} ${c.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;

/** n+1 points evenly spaced by arc length along a quadratic bezier (both ends included). */
export const evenDots = (a: Pt, c: Pt, b: Pt, spacing: number) => {
  const N = 400;
  const pts: Pt[] = [];
  const len: number[] = [0];
  let prev = a;
  for (let i = 1; i <= N; i++) {
    const p = qpt(a, c, b, i / N);
    len.push(len[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = len[N];
  const n = Math.max(1, Math.round(total / spacing));
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const target = (total * i) / n;
    while (j < N && len[j + 1] < target) j++;
    const seg = len[j + 1] - len[j] || 1;
    const t = (j + (target - len[j]) / seg) / N;
    pts.push(i === n ? b : i === 0 ? a : qpt(a, c, b, t));
  }
  return { pts, total };
};

/** Parameter t at arc-length fraction s along a quadratic bezier (so a dot moves at even speed). */
export const tAtLength = (a: Pt, c: Pt, b: Pt, s: number) => {
  const N = 200;
  const len: number[] = [0];
  let prev = a;
  for (let i = 1; i <= N; i++) {
    const p = qpt(a, c, b, i / N);
    len.push(len[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const target = clamp01(s) * len[N];
  let j = 0;
  while (j < N && len[j + 1] < target) j++;
  const seg = len[j + 1] - len[j] || 1;
  return Math.min(1, (j + (target - len[j]) / seg) / N);
};
