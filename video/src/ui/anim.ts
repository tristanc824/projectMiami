import { Easing, interpolate, spring, SpringConfig } from "remotion";

/** Expo-style ease out: fast start, long soft landing (Apple-like). */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Symmetric ease for camera moves and drags. */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);

/** Clamped interpolate with an easing. */
export const tween = (
  f: number,
  range: [number, number],
  out: [number, number],
  ease: (t: number) => number = EASE_OUT,
) => interpolate(f, range, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const SPRING = {
  /** UI entrances: settles quickly with a whisper of overshoot. */
  ui: { damping: 18, stiffness: 140, mass: 0.9 } as Partial<SpringConfig>,
  /** Badges and checks: a small, confident pop. */
  pop: { damping: 11, stiffness: 190, mass: 0.7 } as Partial<SpringConfig>,
  /** Big pieces floating forward: heavy and calm, no overshoot. */
  float: { damping: 26, stiffness: 90, mass: 1.2 } as Partial<SpringConfig>,
  /** Text settling. */
  soft: { damping: 200, stiffness: 80, mass: 1 } as Partial<SpringConfig>,
};

export const spr = (f: number, fps: number, delay = 0, config: Partial<SpringConfig> = SPRING.ui) =>
  spring({ frame: f - delay, fps, config });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Piecewise keyframe track with eased segments. */
export const track = (f: number, keys: [number, number][], ease: (t: number) => number = EASE_IN_OUT) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f <= f1) return interpolate(f, [f0, f1], [v0, v1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return keys[keys.length - 1][1];
};
