import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT } from "../theme";
import { Scene } from "./timeline";
import { drift, kick } from "./motion";

/*
 * Each scene renders inside a <Sequence> that starts `swap` frames before its downbeat. useF()
 * returns the scene-local frame with 0 = the downbeat (negative during the incoming transition).
 * It reads useCurrentFrame(), so it also works inside CameraMotionBlur's sub-frame samples.
 */

export const SceneCtx = createContext<Scene | null>(null);

export const useScene = () => {
  const s = useContext(SceneCtx);
  if (!s) throw new Error("useScene outside a scene");
  return s;
};

export const useF = () => {
  const s = useScene();
  return useCurrentFrame() - s.swap;
};

/** Kick accent for the current scene at local frame f. */
export const useKick = (f: number) => {
  const s = useScene();
  return kick(s.from + f, s.from, s.to);
};

/** The scene's camera drift wrapper (0.4% per bar about the centre). */
export const Drift = ({ f, children, style }: { f: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <AbsoluteFill style={{ transform: `scale(${drift(f).toFixed(5)})`, transformOrigin: "960px 540px", fontFamily: FONT, ...style }}>{children}</AbsoluteFill>
);

/* ------------------------------------------------------------------ text measurement */

const cache = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null = null;

/** Width of a single line of text in px (Figtree must be loaded; it is, via theme.ts). */
export const measure = (text: string, size: number, weight = 600, trackingEm = -0.035) => {
  const key = `${text}|${size}|${weight}|${trackingEm}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return text.length * size * 0.5;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.5;
  const fam = FONT;
  ctx.font = `${weight} ${size}px ${fam}`;
  const w = ctx.measureText(text).width + text.length * trackingEm * size;
  const ready = typeof document.fonts?.check === "function" ? document.fonts.check(`${weight} ${size}px ${fam}`) : true;
  if (ready) cache.set(key, w);
  return w;
};
