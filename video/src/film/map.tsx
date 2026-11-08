import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../theme";
import { DotGrid, mix, Reveal } from "./kit";
import { CX, CY, T } from "./layout";
import { clamp01, EASE_OUT, evenDots, Pt, qpath, qpt } from "./motion";
import POINTS from "./globe-points.json";

/*
 * v4 (FILM_V4.md 2): the opening is a stylized Earth in the brand palette instead of the plain map.
 * An orthographic globe (sky-blue ocean, moss land dots from the app's Natural Earth 1:110m land
 * geometry, src/film/globe-points.json) centred on the frame, turned to the Americas. Pins on Miami
 * and on Buenos Aires, Argentina; one arc between the pins carries the money dot. MIAMI, BA and the
 * arc are screen points of the globe at its resting pose, so the close (scene 12) can still sweep
 * the arc into the Nest mark.
 */

export const GLOBE = { cx: CX, cy: 560, r: 430 };
/** The resting pose: the centre of the visible face (degrees). */
export const POSE = { lat: -4, lon: -67 };
const RAD = Math.PI / 180;

export type P3 = { x: number; y: number; z: number };
/** Orthographic projection of (lat, lon) for a globe facing (lat0, lon0): screen x, y and depth z (1 = facing us). */
export const project = (lat: number, lon: number, lat0 = POSE.lat, lon0 = POSE.lon, g = GLOBE): P3 => {
  const p = lat * RAD;
  const l = (lon - lon0) * RAD;
  const p0 = lat0 * RAD;
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return { x: g.cx + g.r * x, y: g.cy - g.r * y, z };
};

export const MIAMI_LL = { lat: 25.76, lon: -80.19 };
export const BA_LL = { lat: -34.6, lon: -58.38 };
const m3 = project(MIAMI_LL.lat, MIAMI_LL.lon);
const b3 = project(BA_LL.lat, BA_LL.lon);
export const MIAMI: Pt = { x: m3.x, y: m3.y };
export const BA: Pt = { x: b3.x, y: b3.y };
/** Control point: perpendicular to the chord at its midpoint, bowing east over the Atlantic. */
const chord = { x: BA.x - MIAMI.x, y: BA.y - MIAMI.y };
const clen = Math.hypot(chord.x, chord.y);
const BOW = 300;
const MID = { x: (MIAMI.x + BA.x) / 2, y: (MIAMI.y + BA.y) / 2 };
export const ARC_C: Pt = { x: MID.x + (chord.y / clen) * BOW, y: MID.y - (chord.x / clen) * BOW };
export const arcAt = (t: number) => qpt(MIAMI, ARC_C, BA, t);
export const ARC_D = qpath(MIAMI, ARC_C, BA);
const DOTS = evenDots(MIAMI, ARC_C, BA, 18).pts;

export type MapCam = { cx: number; cy: number; z: number };
export const CAM0: MapCam = { cx: CX, cy: CY, z: 1 };
/** World point -> screen point. */
export const toScreen = (cam: MapCam, p: Pt): Pt => ({ x: CX + (p.x - cam.cx) * cam.z, y: CY + (p.y - cam.cy) * cam.z });

const LAT: number[] = [];
const LON: number[] = [];
for (let i = 0; i < (POINTS as number[]).length; i += 2) {
  LAT.push((POINTS as number[])[i]);
  LON.push((POINTS as number[])[i + 1]);
}

/** The globe: ocean sphere, land dots, rim light. `spin` = degrees of longitude still to turn (0 = resting pose). */
export const Globe = ({ spin = 0, o = 1, land = 1 }: { spin?: number; o?: number; land?: number }) => {
  const g = GLOBE;
  const dots: React.ReactNode[] = [];
  const lon0 = POSE.lon + spin;
  for (let i = 0; i < LAT.length; i++) {
    const p = project(LAT[i], LON[i], POSE.lat, lon0);
    if (p.z <= 0.02) continue;
    const r = 1.5 + 1.9 * p.z;
    dots.push(<circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={r.toFixed(2)} opacity={(0.42 + 0.58 * p.z) * land} />);
  }
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o }}>
      <defs>
        <radialGradient id="gOcean" cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#F2F8FB" />
          <stop offset="0.45" stopColor="#CFE6F3" />
          <stop offset="0.8" stopColor="#9CCBE6" />
          <stop offset="1" stopColor="#7DB6DA" />
        </radialGradient>
        <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0.86" stopColor="#5FA8D6" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5FA8D6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gShade" cx="70%" cy="78%" r="70%">
          <stop offset="0" stopColor="#235C7D" stopOpacity="0.16" />
          <stop offset="1" stopColor="#235C7D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={g.cx} cy={g.cy} r={g.r * 1.16} fill="url(#gHalo)" />
      <circle cx={g.cx} cy={g.cy + 26} r={g.r} fill="rgba(35,92,125,0.10)" style={{ filter: "blur(22px)" }} />
      <circle cx={g.cx} cy={g.cy} r={g.r} fill="url(#gOcean)" />
      <g fill={C.moss}>{dots}</g>
      <circle cx={g.cx} cy={g.cy} r={g.r} fill="url(#gShade)" />
      <circle cx={g.cx} cy={g.cy} r={g.r - 1} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} />
    </svg>
  );
};

export type City = { pop: number; label: number; labelOut?: number; halo?: number; o?: number };

/** A map pin whose tip sits on p: moss teardrop, white core, soft shadow. `pop` 0..1 (may overshoot). */
const Pin = ({ p, c }: { p: Pt; c: City }) => {
  const s = Math.max(0, c.pop);
  if (s <= 0.001) return null;
  const h = c.halo ?? 0;
  return (
    <g opacity={c.o ?? 1}>
      {h > 0 && h < 1 ? <circle cx={p.x} cy={p.y} r={10 + 50 * EASE_OUT(h)} fill="none" stroke={C.moss} strokeOpacity={0.5 * (1 - h)} strokeWidth={3} /> : null}
      <ellipse cx={p.x} cy={p.y + 1} rx={9 * Math.min(1, s)} ry={3.5 * Math.min(1, s)} fill="rgba(22,48,29,0.28)" />
      <g transform={`translate(${p.x} ${p.y}) scale(${s.toFixed(4)})`}>
        <path d="M0 0 C-4 -9 -17 -19 -17 -33 A17 17 0 1 1 17 -33 C17 -19 4 -9 0 0 Z" fill={C.moss} stroke="#FFFFFF" strokeWidth={3} />
        <circle cx={0} cy={-33} r={6.5} fill="#FFFFFF" />
      </g>
    </g>
  );
};

/** A label chip beside a pin (white pill, ink text). side -1 = to the pin's left, 1 = right. */
const PinLabel = ({ p, text, side, t, out = 0 }: { p: Pt; text: string; side: 1 | -1; t: number; out?: number }) => {
  const W = 760;
  const top = p.y - 33 - 30;
  return (
    <div style={{ position: "absolute", top, height: 60, left: side > 0 ? p.x + 30 : p.x - 30 - W, width: W, display: "flex", justifyContent: side > 0 ? "flex-start" : "flex-end", alignItems: "center" }}>
      <Reveal t={t} out={out}>
        <div style={{ height: 60, padding: "0 24px", borderRadius: 999, background: "rgba(255,255,255,0.94)", boxShadow: "0 10px 28px -14px rgba(22,48,29,0.45)", display: "flex", alignItems: "center", fontFamily: FONT, fontSize: T.m, fontWeight: 600, letterSpacing: "-0.025em", color: C.ink, whiteSpace: "nowrap" }}>
          {text}
        </div>
      </Reveal>
    </div>
  );
};

/**
 * The opening world: page + dot grid, the globe, the two pins, the arc (`arc` 0..1 draws it from
 * Miami, `glow` lights it solid). `spin` turns the globe (degrees of longitude to go).
 */
export const MapLayer = ({
  cam = CAM0, grid = 1, gridGlow = 0, arc = 0, arcOpacity = 1, glow = 0, tone = 0, miami, ba, children, labels = 1, spin = 0, globe = 1,
}: {
  cam?: MapCam; grid?: number; gridGlow?: number; arc?: number; arcOpacity?: number; glow?: number; tone?: number;
  miami: City; ba: City; children?: React.ReactNode; labels?: number; spin?: number; globe?: number;
}) => {
  const ink = mix(C.moss9, "#FFFFFF", tone);
  const shown = DOTS.length * clamp01(arc);
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${CX}px, ${CY}px) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
      <DotGrid opacity={grid} glow={gridGlow} />
      {globe > 0.001 ? <Globe spin={spin} o={globe} /> : null}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {glow > 0.001 ? (
          <g>
            <path d={ARC_D} fill="none" stroke="#FFFFFF" strokeOpacity={0.5 * glow} strokeWidth={14} strokeLinecap="round" />
            <path d={ARC_D} fill="none" stroke={C.moss} strokeOpacity={0.9 * glow} strokeWidth={5} strokeLinecap="round" />
          </g>
        ) : null}
        {DOTS.map((p, i) => {
          const s = clamp01(shown - i);
          if (s <= 0) return null;
          return <circle key={i} cx={p.x} cy={p.y} r={3.4 * EASE_OUT(s)} fill={ink} stroke="#FFFFFF" strokeWidth={1.2} opacity={0.85 * arcOpacity} />;
        })}
        <Pin p={MIAMI} c={miami} />
        <Pin p={BA} c={ba} />
      </svg>
      <div style={{ opacity: labels }}>
        <PinLabel p={MIAMI} text="Miami" side={-1} t={miami.label} out={miami.labelOut} />
        <PinLabel p={BA} text="Buenos Aires, Argentina" side={1} t={ba.label} out={ba.labelOut} />
      </div>
      {children}
    </AbsoluteFill>
  );
};
