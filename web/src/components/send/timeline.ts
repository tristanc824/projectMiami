/**
 * One transfer, scripted on a single clock (ms). Everything in the Send flow reads from this table,
 * so timing changes happen in one place.
 */
export const LOOP = 6000;

export const T = {
  press: 350, //            sender taps Send
  legA: [350, 1450], //     comet: You → Nest
  check: [1450, 2300], //   Nest scans the transfer
  legB: [2350, 3450], //    comet: Nest → Family
  type: [3550, 4450], //    receipt signature types in
  fade: 5400, //            everything settles back for the next loop
} as const;

/** Simulated network time shown on the timer (Solana settles in about a second). */
export const SETTLE_SECONDS = 0.9;

export type Phase = "send" | "check" | "passed" | "arrived" | "reset";

export function phaseAt(t: number): Phase {
  if (t < T.check[0]) return "send";
  if (t < T.check[1]) return "check";
  if (t < T.legB[1]) return "passed";
  if (t < T.fade) return "arrived";
  return "reset";
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 0→1 progress of `t` through the window [a, b]. */
export const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Spring-like overshoot used for CSS state transitions. */
export const SPRING = "cubic-bezier(0.34, 1.45, 0.64, 1)";
