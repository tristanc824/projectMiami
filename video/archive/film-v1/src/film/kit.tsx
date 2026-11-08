import React, { useId } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { clamp01, EASE_OUT, lerp, tween } from "../ui/anim";
import { IcBattery } from "../ui/Icons";
import { NestMark } from "../ui/NestMark";
import { HomeBar, Island } from "../ui/Phone";

/* Shared pieces for the 16:9 film. Canvas constants live here (theme.ts W/H are the 9:16 cut). */

export const W = 1920;
export const H = 1080;
export const CX = W / 2;
export const CY = H / 2;

/** Camera curve from the production bible: emphasized decelerate. */
export const CAM = Easing.bezier(0.05, 0.7, 0.1, 1);
/** The accelerating half of a push-through (the outgoing shot). */
export const PUSH = Easing.bezier(0.7, 0, 0.84, 0);
/** Night background for the scam beats. */
export const NIGHT = "#121613";

export const FLOAT =
  "0 2px 4px rgba(22,48,29,0.06), 0 18px 36px -12px rgba(22,48,29,0.20), 0 60px 120px -40px rgba(22,48,29,0.40)";

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Mix two #rrggbb colors. */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = clamp01(t);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
};

/* ------------------------------------------------------------------ camera helpers */

/** Outgoing half of a push-through: accelerating zoom + blur over the last `len` frames. */
export const pushOut = (f: number, dur: number, len = 12, to = 2.6) => {
  const t = tween(f, [dur - len, dur], [0, 1], PUSH);
  return { z: 1 + (to - 1) * t, blur: t * 16, t };
};

/** Incoming half: the next shot keeps growing into place and comes out of the blur. */
export const pushIn = (f: number, len = 16, from = 0.82) => {
  const t = tween(f, [0, len], [0, 1], CAM);
  return { z: from + (1 - from) * t, blur: (1 - t) * 12, t };
};

/** Zoom about a screen point (ox, oy), optionally moving that point to (tx, ty). */
export const Zoom = ({
  z = 1, ox = CX, oy = CY, tx, ty, blur = 0, children, style,
}: { z?: number; ox?: number; oy?: number; tx?: number; ty?: number; blur?: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const dx = (tx ?? ox) - ox;
  const dy = (ty ?? oy) - oy;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${ox}px ${oy}px`,
        transform: `translate(${dx}px, ${dy}px) scale(${z})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Directional motion blur (SVG Gaussian with separate x / y deviation) for pans and tilts. */
export const MBlur = ({ x = 0, y = 0, children, style }: { x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const id = "mb" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const on = x > 0.4 || y > 0.4;
  return (
    <>
      {on ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: on ? `url(#${id})` : undefined, ...style }}>{children}</AbsoluteFill>
    </>
  );
};

/* ------------------------------------------------------------------ type */

/** One line of text revealed from behind a mask. t: 0 hidden below, 1 in place; out: 0..1 leaves upward. */
export const Reveal = ({
  t, out = 0, children, style, inner,
}: { t: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; inner?: React.CSSProperties }) => (
  <div style={{ overflow: "hidden", paddingBottom: "0.14em", marginBottom: "-0.14em", ...style }}>
    <div style={{ transform: `translateY(${(1 - clamp01(t)) * 118 - clamp01(out) * 118}%)`, ...inner }}>{children}</div>
  </div>
);

const EASE_IN_Q = Easing.bezier(0.5, 0, 0.75, 0);

/**
 * Keyword caption: short lines revealed by mask, one after another. `at` = first frame,
 * `out` = frame the lines start leaving (optional).
 */
export const Caption = ({
  lines, at, out, x, y, size = 84, color = C.ink, align = "left", sub, subColor = C.ink4, subSize = 38, width = 760, subAt,
}: {
  lines: string[]; at: number; out?: number; x: number; y: number; size?: number; color?: string;
  align?: "left" | "right" | "center"; sub?: string; subColor?: string; subSize?: number; width?: number; subAt?: number;
}) => {
  const f = useCurrentFrame();
  const o = (i: number) => (out === undefined ? 0 : tween(f, [out + i * 3, out + i * 3 + 12], [0, 1], EASE_IN_Q));
  const left = align === "left" ? x : align === "right" ? x - width : x - width / 2;
  return (
    <div style={{ position: "absolute", left, top: y, width, textAlign: align, fontFamily: FONT }}>
      {lines.map((l, i) => (
        <Reveal key={i} t={tween(f, [at + i * 4, at + i * 4 + 18], [0, 1], EASE_OUT)} out={o(i)}>
          <div style={{ fontSize: size, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.04, color }}>{l}</div>
        </Reveal>
      ))}
      {sub ? (
        <Reveal t={tween(f, [subAt ?? at + lines.length * 4 + 6, (subAt ?? at + lines.length * 4 + 6) + 18], [0, 1], EASE_OUT)} out={o(lines.length)} style={{ marginTop: 22 }}>
          <div style={{ fontSize: subSize, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2, color: subColor }}>{sub}</div>
        </Reveal>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ the money dot */

/** Ana's money: a moss dot with a soft halo. (x, y) is its centre in the parent's px. */
export const MoneyDot = ({
  x, y, r = 14, glow = 1, ring = false, opacity = 1, color = C.moss,
}: { x: number; y: number; r?: number; glow?: number; ring?: boolean; opacity?: number; color?: string }) => (
  <div
    style={{
      position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: color, opacity,
      boxShadow: [
        ring ? `0 0 0 ${Math.max(2, r * 0.22)}px rgba(255,255,255,0.95)` : null,
        `0 0 0 ${r * 0.55 * glow}px rgba(47,93,58,${0.14 * glow})`,
        `0 ${r * 0.35}px ${r * 1.4}px rgba(22,48,29,${0.35 * glow})`,
      ].filter(Boolean).join(", "),
      pointerEvents: "none",
    }}
  />
);

/** A tap: a soft moss ripple (44pt), authored in the phone's logical px. t = frames since the tap. */
export const Ripple = ({ x, y, t, size = 44, color = "47,93,58" }: { x: number; y: number; t: number; size?: number; color?: string }) => {
  if (t < 0 || t > 20) return null;
  const p = t / 20;
  const e = EASE_OUT(p);
  return (
    <div style={{ position: "absolute", left: x - size, top: y - size, width: size * 2, height: size * 2, pointerEvents: "none", zIndex: 30 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `rgba(${color},${0.22 * (1 - p)})`, transform: `scale(${0.35 + 0.65 * e})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid rgba(${color},${0.5 * (1 - p)})`, transform: `scale(${0.3 + 0.9 * e})` }} />
    </div>
  );
};

/* ------------------------------------------------------------------ chapter label */

export const LABEL = { left: 64, top: 50, mark: 42, font: 34, gap: 12 };

/** The small "Nest mark + chapter word" marker. `roll` (0..1) rolls `prev` up and `word` in. */
export const LabelBody = ({
  word, prev, roll = 1, draw = 1, color = C.moss, wordColor, out = 0,
}: { word: string; prev?: string; roll?: number; draw?: number; color?: string; wordColor?: string; out?: number }) => {
  const r = clamp01(roll);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: LABEL.gap, fontFamily: FONT, color: wordColor ?? color }}>
      <div style={{ transform: `scale(${1 - out * 0.4})`, opacity: 1 - out }}>
        <NestMark size={LABEL.mark} color={color} draw={draw} />
      </div>
      <div style={{ position: "relative", height: LABEL.font * 1.3, overflow: "hidden", fontSize: LABEL.font, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.3, whiteSpace: "nowrap" }}>
        <div style={{ transform: `translateY(${(1 - r) * 105 - out * 105}%)` }}>{word}</div>
        {prev && r < 1 ? <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${-r * 105}%)` }}>{prev}</div> : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ phone */

export type Net = { wifi?: number; bars?: number; tag?: string; tagT?: number; tagColor?: string };

const Signal = ({ bars, color }: { bars: number; color: string }) => (
  <svg viewBox="0 0 18 12" width={18} height={12} style={{ display: "block" }}>
    {[
      [0, 8, 4], [5, 5.5, 6.5], [10, 3, 9], [15, 0, 12],
    ].map(([x, y, h], i) => (
      <rect key={i} x={x} y={y} width={3} height={h} rx={1} fill={color} opacity={0.22 + 0.78 * clamp01(bars - i)} />
    ))}
  </svg>
);

/** Wifi icon in three parts so it can drop out arc by arc. w: 0..1. */
const Wifi = ({ w, color }: { w: number; color: string }) => (
  <svg viewBox="0 0 16 12" width={16} height={12} style={{ display: "block" }}>
    <path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0Z" fill={color} opacity={clamp01(w * 3)} />
    <path d="M3.4 6.8l1.5 1.6a4.4 4.4 0 0 1 6.2 0l1.5-1.6a6.6 6.6 0 0 0-9.2 0Z" fill={color} opacity={clamp01(w * 3 - 1)} />
    <path d="M.2 3.5l1.6 1.6a8.8 8.8 0 0 1 12.4 0l1.6-1.6a11 11 0 0 0-15.6 0Z" fill={color} opacity={clamp01(w * 3 - 2)} />
  </svg>
);

export const FStatus = ({ light = false, net = {} }: { light?: boolean; net?: Net }) => {
  const color = light ? "#fff" : C.ink;
  const wifi = net.wifi ?? 1;
  const bars = net.bars ?? 4;
  const tagT = net.tagT ?? 1;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 54, padding: "18px 30px 0 34px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color, zIndex: 8, fontFamily: FONT }}>
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 3 }}>
        {bars > 0.02 ? <Signal bars={bars} color={color} /> : null}
        {net.tag ? (
          <span style={{ maxWidth: 90 * tagT, overflow: "hidden", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, color: net.tagColor ?? color, opacity: tagT }}>{net.tag}</span>
        ) : null}
        {wifi > 0.02 ? <Wifi w={wifi} color={color} /> : null}
        <IcBattery color={color} />
      </span>
    </div>
  );
};

/** Phone frame for the film: like ui/Phone but with a live network state and a faint moving reflection. */
export const FPhone = ({
  children, net, light = false, bg = C.page, shadow = true,
}: { children?: React.ReactNode; net?: Net; light?: boolean; bg?: string; shadow?: boolean }) => {
  const f = useCurrentFrame();
  const g = 18 + 10 * Math.sin(f / 70);
  return (
    <div
      style={{
        width: 390, height: 844, borderRadius: 54, background: bg, overflow: "hidden", position: "relative", fontFamily: FONT, color: C.ink,
        boxShadow: shadow
          ? "0 0 0 9px #0F1511, 0 0 0 10px #2B3530, 0 50px 90px -30px rgba(10,22,14,0.55), 0 20px 40px -20px rgba(10,22,14,0.35)"
          : "0 0 0 9px #0F1511, 0 0 0 10px #2B3530",
      }}
    >
      {children}
      <Island />
      <FStatus light={light} net={net} />
      <HomeBar light={light} />
      <div style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none", background: `linear-gradient(118deg, rgba(255,255,255,0) ${g}%, rgba(255,255,255,0.07) ${g + 9}%, rgba(255,255,255,0) ${g + 22}%)` }} />
    </div>
  );
};

/** Places a 390x844 phone with its top-left at (x, y), scaled by k. */
export const PhoneAt = ({ x, y, k, children, style }: { x: number; y: number; k: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: `scale(${k})`, ...style }}>{children}</div>
);

/** Logical phone point -> screen point. */
export const onPhone = (p: { x: number; y: number; k: number }, lx: number, ly: number) => ({ x: p.x + lx * p.k, y: p.y + ly * p.k });

/** Slides one in-phone screen over another (a native push). t: 0 old, 1 new. */
export const PushScreens = ({ t, from, to }: { t: number; from: React.ReactNode; to: React.ReactNode }) => (
  <>
    {t < 1 ? <div style={{ position: "absolute", inset: 0, transform: `translateX(${-t * 117}px)`, filter: `brightness(${1 - t * 0.08})` }}>{from}</div> : null}
    {t > 0 ? <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - t) * 390}px)`, boxShadow: "-10px 0 30px rgba(0,0,0,0.08)" }}>{to}</div> : null}
  </>
);

/* ------------------------------------------------------------------ glyphs */

/** Quadratic bezier helpers. */
export type Pt = { x: number; y: number };
export const qpt = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export const qpath = (a: Pt, c: Pt, b: Pt) => `M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;

/** Concentric ridge arcs (angles in degrees, 0 = top, clockwise), like the system fingerprint glyph. */
const RIDGES: [number, number, number][] = [
  [6, -165, 165],
  [13, -150, 35], [13, 70, 150],
  [20, -140, -25], [20, 8, 140],
  [27, -125, 60], [27, 92, 128],
  [34, -105, -45], [34, -18, 100],
  [41, -72, 72],
];
const ridgePath = (r: number, a0: number, a1: number) => {
  const pts: string[] = [];
  const n = Math.max(6, Math.round(Math.abs(a1 - a0) / 6));
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push(`${(50 + r * Math.sin(a)).toFixed(2)} ${(52 - r * 1.12 * Math.cos(a)).toFixed(2)}`);
  }
  return "M" + pts.join(" L");
};

/** Fingerprint glyph (not Face ID). draw: 0..1 draws the ridges from the core outward. */
export const Fingerprint = ({ size = 200, color = C.moss, draw = 1, strokeWidth = 4.2 }: { size?: number; color?: string; draw?: number; strokeWidth?: number }) => (
  <svg viewBox="2 0 96 104" width={size} height={size * (104 / 96)} style={{ display: "block", overflow: "visible" }}>
    <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {RIDGES.map(([r, a0, a1], i) => {
        const p = clamp01((draw - i * 0.05) / 0.55);
        return <path key={i} d={ridgePath(r, a0, a1)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - EASE_OUT(p)} opacity={p > 0.001 ? 1 : 0} />;
      })}
    </g>
  </svg>
);

/** Check mark that draws itself. */
export const Check = ({ size = 40, color = "#fff", t = 1, strokeWidth = 3 }: { size?: number; color?: string; t?: number; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
    <path d="m5 12 5 5 9-10" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(t)} />
  </svg>
);

/** A small classical bank building. */
export const BankGlyph = ({ size = 48, color = C.ink4 }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
    <g fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 4l9 5.5Z" />
      <path d="M5.5 10v7.5M9.8 10v7.5M14.2 10v7.5M18.5 10v7.5M3.5 20.5h17" />
    </g>
  </svg>
);

/** Pill chip at film scale. */
export const BigChip = ({
  children, bg = C.sage1, color = C.moss, size = 36, style,
}: { children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, padding: `${size * 0.32}px ${size * 0.62}px`, borderRadius: 999, background: bg, color, fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

export { lerp };
