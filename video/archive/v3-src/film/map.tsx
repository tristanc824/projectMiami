import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { DotGrid, head, mix, Reveal } from "./kit";
import { colC, CX, CY, T } from "./layout";
import { clamp01, EASE_OUT, evenDots, Pt, qpath, qpt } from "./motion";

/*
 * The minimal map: page, faint dot grid, two cities and one arc. A balanced composition rather
 * than a projection: Miami upper-left on the spec's column 4, Buenos Aires lower-right on column 9,
 * point-symmetric about the canvas centre. Frame 0 (and the film's last frame) = page + grid +
 * the two cities as small "ghost" dots.
 */

export const MIAMI: Pt = { x: colC(3), y: 380 }; // 605
export const BA: Pt = { x: colC(8), y: 700 }; // 1315
/** Control point: perpendicular to the chord at its midpoint (the canvas centre), bowing up-right. */
const chord = { x: BA.x - MIAMI.x, y: BA.y - MIAMI.y };
const clen = Math.hypot(chord.x, chord.y);
const BOW = 250;
export const ARC_C: Pt = { x: CX + (chord.y / clen) * BOW, y: CY - (chord.x / clen) * BOW };
export const arcAt = (t: number) => qpt(MIAMI, ARC_C, BA, t);
export const ARC_D = qpath(MIAMI, ARC_C, BA);
const DOTS = evenDots(MIAMI, ARC_C, BA, 20).pts;

export type MapCam = { cx: number; cy: number; z: number };
export const CAM0: MapCam = { cx: CX, cy: CY, z: 1 };
/** World point -> screen point. */
export const toScreen = (cam: MapCam, p: Pt): Pt => ({ x: CX + (p.x - cam.cx) * cam.z, y: CY + (p.y - cam.cy) * cam.z });

/** City dot radius: ghost (pop 0) -> full (pop 1, may overshoot). */
const CITY_R = 11;
const GHOST_R = 5;
const LABEL_GAP = 30;

export type City = { pop: number; label: number; labelOut?: number; halo?: number; o?: number };

const CityDot = ({ p, c, ink }: { p: Pt; c: City; ink: string }) => {
  const pop = c.pop;
  const r = GHOST_R + (CITY_R - GHOST_R) * pop;
  const a = 0.28 + 0.72 * clamp01(pop);
  const h = c.halo ?? 0;
  return (
    <g transform={`translate(${p.x} ${p.y})`} opacity={c.o ?? 1}>
      {h > 0 && h < 1 ? <circle r={CITY_R + 46 * EASE_OUT(h)} fill="none" stroke={ink} strokeOpacity={0.4 * (1 - h)} strokeWidth={2.5} /> : null}
      <circle r={26} fill={ink} opacity={0.06 * clamp01(pop)} />
      <circle r={Math.max(0, r)} fill={ink} opacity={a} />
    </g>
  );
};

/**
 * The map in world coordinates (= screen at CAM0). `arc` 0..1 draws the dotted arc from Miami;
 * `glow` lights it; `tone` 0..1 turns ink to white (over the meadow).
 */
export const MapLayer = ({
  cam = CAM0, grid = 1, gridGlow = 0, arc = 0, arcOpacity = 1, glow = 0, tone = 0, miami, ba, children, labels = 1,
}: {
  cam?: MapCam; grid?: number; gridGlow?: number; arc?: number; arcOpacity?: number; glow?: number; tone?: number;
  miami: City; ba: City; children?: React.ReactNode; labels?: number;
}) => {
  const ink = mix(C.ink, "#FFFFFF", tone);
  const shown = DOTS.length * clamp01(arc);
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${CX}px, ${CY}px) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
      <DotGrid opacity={grid} glow={gridGlow} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {glow > 0.001 ? (
          <g>
            <path d={ARC_D} fill="none" stroke={C.moss} strokeOpacity={0.16 * glow} strokeWidth={22} strokeLinecap="round" />
            <path d={ARC_D} fill="none" stroke={tone > 0.5 ? "#FFFFFF" : C.moss} strokeOpacity={0.8 * glow} strokeWidth={4} strokeLinecap="round" />
          </g>
        ) : null}
        {DOTS.map((p, i) => {
          const s = clamp01(shown - i);
          if (s <= 0) return null;
          return <circle key={i} cx={p.x} cy={p.y} r={2.8 * EASE_OUT(s)} fill={ink} opacity={0.5 * arcOpacity} />;
        })}
        <CityDot p={MIAMI} c={miami} ink={ink} />
        <CityDot p={BA} c={ba} ink={ink} />
      </svg>
      <div style={{ position: "absolute", left: MIAMI.x - 300, width: 600, top: MIAMI.y - CITY_R - LABEL_GAP - T.l * 1.05, display: "flex", justifyContent: "center", opacity: labels }}>
        <Reveal t={miami.label} out={miami.labelOut}><div style={head(T.l, ink)}>Miami</div></Reveal>
      </div>
      <div style={{ position: "absolute", left: BA.x - 300, width: 600, top: BA.y + CITY_R + LABEL_GAP, display: "flex", justifyContent: "center", opacity: labels }}>
        <Reveal t={ba.label} out={ba.labelOut}><div style={head(T.l, ink)}>Buenos Aires</div></Reveal>
      </div>
      {children}
    </AbsoluteFill>
  );
};
