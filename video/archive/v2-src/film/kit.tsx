import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { C, FONT } from "../theme";
import { IcBattery } from "../ui/Icons";
import { HomeBar, Island } from "../ui/Phone";
import { CX, CY, LABEL, PHONE_K, T, TRACK } from "./layout";
import { clamp01, EASE_OUT, lerp } from "./motion";

/* Shared pieces for the 16:9 film (v2). */

export const FLOAT =
  "0 2px 4px rgba(22,48,29,0.06), 0 18px 36px -12px rgba(22,48,29,0.20), 0 60px 120px -40px rgba(22,48,29,0.40)";
export const NIGHT = "#121613";

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Mix two #rrggbb colors. */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = clamp01(t);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
};

/* ------------------------------------------------------------------ backgrounds */

/** Warm paper with a soft vignette (every light scene). */
export const Paper = ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 42%, #F8F6F1 0%, ${C.page} 55%, #E7E1D5 100%)`, ...style }}>{children}</AbsoluteFill>
);

/**
 * The faint dot grid (30 px pitch, a dot on every multiple of 30 px, so (960, 540) is a dot).
 * Drawn in scene space so camera moves carry it. `glow` 0..1 = kick accent: the background brightens 2%.
 */
export const DotGrid = ({ opacity = 1, glow = 0, color = C.ink, dot = 1.6, alpha = 0.16 }: { opacity?: number; glow?: number; color?: string; dot?: number; alpha?: number }) => {
  const id = "dg" + Math.round(dot * 10) + color.replace("#", "");
  return (
    <>
      <svg width={6000} height={4000} style={{ position: "absolute", left: -2055, top: -1455, opacity, pointerEvents: "none" }}>
        <defs>
          <pattern id={id} width={30} height={30} patternUnits="userSpaceOnUse" x={0} y={0}>
            <circle cx={15} cy={15} r={dot} fill={color} opacity={alpha} />
          </pattern>
        </defs>
        <rect width={6000} height={4000} fill={`url(#${id})`} />
      </svg>
      {glow > 0.001 ? <AbsoluteFill style={{ background: `rgba(255,255,255,${(0.02 * glow).toFixed(4)})`, pointerEvents: "none" }} /> : null}
    </>
  );
};

/* ------------------------------------------------------------------ camera */

/** Scale (and optional shift) about a screen point. */
export const Cam = ({
  z = 1, ox = CX, oy = CY, dx = 0, dy = 0, blur = 0, children, style,
}: { z?: number; ox?: number; oy?: number; dx?: number; dy?: number; blur?: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <AbsoluteFill
    style={{
      transformOrigin: `${ox}px ${oy}px`,
      transform: `translate(${dx}px, ${dy}px) scale(${z})`,
      filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** CameraMotionBlur (180°, 6 samples) only while `on`. */
export const MoBlur = ({ on, children }: { on: boolean; children: React.ReactNode }) =>
  on ? (
    <CameraMotionBlur shutterAngle={180} samples={6}>
      {children}
    </CameraMotionBlur>
  ) : (
    <>{children}</>
  );

/* ------------------------------------------------------------------ type */

/** One line revealed from behind a mask. t: 0 hidden below, 1 in place; out: 0..1 leaves upward. */
export const Reveal = ({
  t, out = 0, children, style, inner,
}: { t: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; inner?: React.CSSProperties }) => {
  const a = clamp01(t);
  const o = clamp01(out);
  if (a <= 0.0001 || o >= 0.9999) return <div style={{ ...style, visibility: "hidden" }}><div style={inner}>{children}</div></div>;
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.16em", marginBottom: "-0.16em", paddingTop: "0.04em", marginTop: "-0.04em", ...style }}>
      <div style={{ transform: `translateY(${((1 - a) * 112 - o * 112).toFixed(2)}%)`, ...inner }}>{children}</div>
    </div>
  );
};

/** Headline text style at a type-scale size. */
export const head = (size: number, color: string = C.ink): React.CSSProperties => ({
  fontFamily: FONT, fontSize: size, fontWeight: 600, letterSpacing: TRACK, lineHeight: 1.05, color, whiteSpace: "nowrap",
});
/** Caption / body style (ink-400 by default). */
export const body = (size: number, color: string = C.ink4, weight = 500): React.CSSProperties => ({
  fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: "-0.01em", lineHeight: 1.35, color, whiteSpace: "nowrap",
});

/** A pill chip at film scale (32 px text by default). */
export const Pill = ({
  children, bg = C.sage1, color = C.moss, size = T.m, style,
}: { children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.32), height: Math.round(size * 1.9), padding: `0 ${Math.round(size * 0.66)}px`,
      borderRadius: 999, background: bg, color, fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", whiteSpace: "nowrap", lineHeight: 1, ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ the money dot */

/** Ana's money: a moss dot with a soft halo. (x, y) is its centre. */
export const MoneyDot = ({
  x, y, r = 14, glow = 1, ring = false, opacity = 1, color = C.moss,
}: { x: number; y: number; r?: number; glow?: number; ring?: boolean; opacity?: number; color?: string }) =>
  r <= 0.05 ? null : (
    <div
      style={{
        position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: color, opacity,
        boxShadow: [
          ring ? `0 0 0 ${Math.max(2, r * 0.22)}px rgba(255,255,255,0.95)` : null,
          `0 0 0 ${(r * 0.55 * glow).toFixed(2)}px rgba(47,93,58,${(0.14 * glow).toFixed(3)})`,
          `0 ${(r * 0.35).toFixed(2)}px ${(r * 1.4).toFixed(2)}px rgba(22,48,29,${(0.32 * glow).toFixed(3)})`,
        ].filter(Boolean).join(", "),
        pointerEvents: "none",
      }}
    />
  );

/** An expanding ring (shockwave / pulse). p: 0..1 progress. */
export const Ripple = ({ x, y, p, r0 = 14, r1 = 90, color = C.moss, width = 3, alpha = 0.55 }: { x: number; y: number; p: number; r0?: number; r1?: number; color?: string; width?: number; alpha?: number }) => {
  if (p <= 0 || p >= 1) return null;
  const e = EASE_OUT(p);
  const r = lerp(r0, r1, e);
  return (
    <div
      style={{
        position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%",
        border: `${(width * (1 - 0.5 * p)).toFixed(2)}px solid ${color}`, opacity: alpha * (1 - p), pointerEvents: "none",
      }}
    />
  );
};

/** A tap inside the app (logical px): a soft moss ripple. t = frames since the tap. */
export const Tap = ({ x, y, t, size = 44, color = "47,93,58" }: { x: number; y: number; t: number; size?: number; color?: string }) => {
  if (t < 0 || t > 18) return null;
  const p = t / 18;
  const e = EASE_OUT(p);
  return (
    <div style={{ position: "absolute", left: x - size, top: y - size, width: size * 2, height: size * 2, pointerEvents: "none", zIndex: 30 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `rgba(${color},${0.24 * (1 - p)})`, transform: `scale(${0.35 + 0.65 * e})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid rgba(${color},${0.55 * (1 - p)})`, transform: `scale(${0.3 + 0.9 * e})` }} />
    </div>
  );
};

/* ------------------------------------------------------------------ the Nest mark */

const RINGS = [
  { cx: 23, cy: 32, rot: 90 },
  { cx: 36.5, cy: 24.206, rot: 210 },
  { cx: 36.5, cy: 39.794, rot: 330 },
];

/** The three-ring mark with one progress value per ring (0..1 each), so rings can land on beats. */
export const Rings = ({
  size, color = C.moss, p = [1, 1, 1], strokeWidth = 5.5, style,
}: { size: number; color?: string; p?: number[]; strokeWidth?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ overflow: "visible", display: "block", flex: "none", ...style }}>
    <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      {RINGS.map((r, i) => {
        const t = clamp01(p[i] ?? 0);
        if (t <= 0.001) return null;
        return (
          <ellipse
            key={i} cx={r.cx} cy={r.cy} rx={18} ry={14} transform={`rotate(${r.rot} ${r.cx} ${r.cy})`}
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t}
          />
        );
      })}
    </g>
  </svg>
);

/** Mark + word, the chapter label's geometry (scale it up for the big lockup so the fly is exact). */
export const LabelBody = ({
  word, prev, roll = 1, p = [1, 1, 1], color = C.moss, wordColor = C.ink, wordT = 1,
}: { word: string; prev?: string; roll?: number; p?: number[]; color?: string; wordColor?: string; wordT?: number }) => {
  const r = clamp01(roll);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: LABEL.gap, fontFamily: FONT, color: wordColor }}>
      <Rings size={LABEL.mark} color={color} p={p} />
      <div style={{ position: "relative", height: LABEL.font * 1.3, overflow: "hidden", fontSize: LABEL.font, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.3, whiteSpace: "nowrap", clipPath: `inset(0 ${((1 - clamp01(wordT)) * 100).toFixed(2)}% 0 0)` }}>
        <div style={{ transform: `translateY(${((1 - r) * 105).toFixed(2)}%)` }}>{word}</div>
        {prev && r < 1 ? <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${(-r * 105).toFixed(2)}%)` }}>{prev}</div> : null}
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

/** Wifi icon in three arcs so it can drop out arc by arc. w: 0..1. */
const Wifi = ({ w, color }: { w: number; color: string }) => (
  <svg viewBox="0 0 16 12" width={16} height={12} style={{ display: "block" }}>
    <path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0Z" fill={color} opacity={clamp01(w * 3)} />
    <path d="M3.4 6.8l1.5 1.6a4.4 4.4 0 0 1 6.2 0l1.5-1.6a6.6 6.6 0 0 0-9.2 0Z" fill={color} opacity={clamp01(w * 3 - 1)} />
    <path d="M.2 3.5l1.6 1.6a8.8 8.8 0 0 1 12.4 0l1.6-1.6a11 11 0 0 0-15.6 0Z" fill={color} opacity={clamp01(w * 3 - 2)} />
  </svg>
);

export const FStatus = ({ light = false, net = {}, time = "9:41" }: { light?: boolean; net?: Net; time?: string }) => {
  const color = light ? "#fff" : C.ink;
  const wifi = net.wifi ?? 1;
  const bars = net.bars ?? 4;
  const tagT = net.tagT ?? 1;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 54, padding: "18px 30px 0 34px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color, zIndex: 8, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
      <span>{time}</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 3 }}>
        {bars > 0.02 ? <Signal bars={bars} color={color} /> : null}
        {net.tag && tagT > 0.01 ? (
          <span style={{ maxWidth: 90 * tagT, overflow: "hidden", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, color: net.tagColor ?? color, opacity: tagT }}>{net.tag}</span>
        ) : null}
        {wifi > 0.02 ? <Wifi w={wifi} color={color} /> : null}
        <IcBattery color={color} />
      </span>
    </div>
  );
};

/** The phone: one size and one bezel and shadow everywhere. Logical 390x844 inside. */
export const FPhone = ({
  children, net, light = false, bg = C.page, time, glare = true,
}: { children?: React.ReactNode; net?: Net; light?: boolean; bg?: string; time?: string; glare?: boolean }) => {
  const f = useCurrentFrame();
  const g = 20 + 8 * Math.sin(f / 80);
  return (
    <div
      style={{
        width: 390, height: 844, borderRadius: 54, background: bg, overflow: "hidden", position: "relative", fontFamily: FONT, color: C.ink,
        boxShadow: "0 0 0 9px #0F1511, 0 0 0 10px #2B3530, 0 50px 90px -30px rgba(10,22,14,0.50), 0 20px 40px -20px rgba(10,22,14,0.32)",
      }}
    >
      {children}
      <Island />
      <FStatus light={light} net={net} time={time} />
      <HomeBar light={light} />
      {glare ? <div style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none", background: `linear-gradient(118deg, rgba(255,255,255,0) ${g}%, rgba(255,255,255,0.06) ${g + 9}%, rgba(255,255,255,0) ${g + 22}%)` }} /> : null}
    </div>
  );
};

/** Places the 390x844 phone with its screen's top-left at (x, y) at the film's one phone scale. */
export const PhoneAt = ({ x, y, k = PHONE_K, children, style }: { x: number; y: number; k?: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 390, height: 844, transformOrigin: "0 0", transform: `scale(${k})`, ...style }}>{children}</div>
);

/** The phone at screen position ph, turned about its vertical axis by `angle` degrees (a device flip). */
export const FlipPhone = ({ ph, angle = 0, children, lift = 0 }: { ph: { x: number; y: number; k: number }; angle?: number; children: React.ReactNode; lift?: number }) =>
  Math.abs(angle) >= 89.9 ? null : (
    <div style={{ position: "absolute", left: ph.x, top: ph.y + lift, width: 390 * ph.k, height: 844 * ph.k, transform: `perspective(2600px) rotateY(${angle.toFixed(2)}deg)`, transformOrigin: "50% 50%" }}>
      <PhoneAt x={0} y={0} k={ph.k}>{children}</PhoneAt>
    </div>
  );

/** Slides one in-phone screen over another (a native push). t: 0 old, 1 new. */
export const PushScreens = ({ t, from, to }: { t: number; from: React.ReactNode; to: React.ReactNode }) => (
  <>
    {t < 1 ? <div style={{ position: "absolute", inset: 0, transform: `translateX(${-t * 117}px)`, filter: `brightness(${1 - t * 0.08})` }}>{from}</div> : null}
    {t > 0 ? <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - t) * 390}px)`, boxShadow: "-10px 0 30px rgba(0,0,0,0.08)" }}>{to}</div> : null}
  </>
);

/* ------------------------------------------------------------------ glyphs */

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

/** Fingerprint glyph. draw: 0..1 draws the ridges from the core outward. */
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
    <g fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9.5 12 4.5l8.5 5Z" />
      <path d="M6 11v6.5M10 11v6.5M14 11v6.5M18 11v6.5M4 20h16" />
    </g>
  </svg>
);

