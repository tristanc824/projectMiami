import React, { useId } from "react";
import { C, FONT } from "../theme";
import { clamp01, EASE_OUT } from "../ui/anim";
import { mix, Pt, qpath, qpt } from "./kit";

/*
 * The minimal map: no borders, just a faint dot grid, three latitude lines and two cities on an
 * equirectangular projection, so Miami and Buenos Aires sit where they really are relative to
 * each other (Buenos Aires is ~60° south and ~22° east of Miami).
 */
const S = 11.6; // px per degree at zoom 1
const LON0 = -69.3;
const LAT0 = -4.4;
export const proj = (lon: number, lat: number): Pt => ({ x: 960 + (lon - LON0) * S, y: 540 - (lat - LAT0) * S });

export const MIAMI = proj(-80.19, 25.76);
export const BA = proj(-58.38, -34.6);
/** Control point of the gentle arc (bows east, like a flight path). */
export const ARC_C: Pt = { x: 1204, y: 452 };
export const arcAt = (t: number) => qpt(MIAMI, ARC_C, BA, t);

export type MapCam = { cx: number; cy: number; z: number };

/** World point -> screen point for a camera. */
export const mapToScreen = (cam: MapCam, p: Pt): Pt => ({ x: 960 + (p.x - cam.cx) * cam.z, y: 540 + (p.y - cam.cy) * cam.z });

type City = { p: Pt; name: string; pop: number; label: number; out?: number };

const CityMark = ({ c, ink, halo }: { c: City; ink: string; halo: number }) => {
  const s = c.pop;
  if (s <= 0.001) return null;
  return (
    <g transform={`translate(${c.p.x} ${c.p.y})`} opacity={1 - (c.out ?? 0)}>
      <circle r={9 + 22 * halo} fill="none" stroke={ink} strokeOpacity={0.35 * (1 - halo)} strokeWidth={2} />
      <circle r={22} fill={ink} opacity={0.07 * s} />
      <circle r={9 * s} fill={ink} />
    </g>
  );
};

const CityLabel = ({ c, ink, id }: { c: City; ink: string; id: string }) => {
  const t = EASE_OUT(clamp01(c.label));
  const o = clamp01(c.out ?? 0);
  if (t <= 0.001) return null;
  return (
    <g>
      <clipPath id={id}><rect x={c.p.x - 420} y={c.p.y - 36} width={392} height={64} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <text
          x={c.p.x - 34} y={c.p.y + 15 + (1 - t) * 60 - o * 60} textAnchor="end"
          style={{ fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em" }} fill={ink}
        >
          {c.name}
        </text>
      </g>
    </g>
  );
};

export const MapLayer = ({
  cam, grid = 1, arc = 0, arcFrom = 0, glow = 0, tone = 0, miami, ba, children,
}: {
  cam: MapCam; grid?: number; arc?: number; arcFrom?: number; glow?: number; tone?: number;
  miami: { pop: number; label: number; out?: number }; ba: { pop: number; label: number; out?: number }; children?: React.ReactNode;
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ink = mix(C.ink, "#FFFFFF", tone);
  const d = qpath(MIAMI, ARC_C, BA);
  const lat = (l: number) => proj(0, l).y;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <pattern id={`g${id}`} width={30} height={30} patternUnits="userSpaceOnUse">
          <circle cx={15} cy={15} r={1.7} fill={C.ink} opacity={0.17} />
        </pattern>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={10000} height={10000}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={30} pathLength={1} strokeDasharray={`${clamp01(arc - arcFrom)} 2`} strokeDashoffset={-arcFrom} />
        </mask>
      </defs>
      <g transform={`translate(960 540) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})`}>
        <g opacity={grid}>
          <rect x={-3000} y={-2000} width={8000} height={5000} fill={`url(#g${id})`} />
          {[23.44, 0, -23.44].map((l) => (
            <line key={l} x1={-3000} x2={5000} y1={lat(l)} y2={lat(l)} stroke={l === 0 ? C.sage : C.line} strokeWidth={l === 0 ? 2 : 1.5} strokeDasharray={l === 0 ? "10 12" : undefined} opacity={l === 0 ? 0.9 : 1} />
          ))}
        </g>
        <g mask={`url(#m${id})`}>
          {glow > 0 ? <path d={d} fill="none" stroke={tone > 0.5 ? "#fff" : C.moss} strokeOpacity={0.18 * glow} strokeWidth={16} strokeLinecap="round" /> : null}
          {glow > 0 ? <path d={d} fill="none" stroke={tone > 0.5 ? "#fff" : C.moss} strokeOpacity={0.55 * glow} strokeWidth={3} strokeLinecap="round" /> : null}
          <path d={d} fill="none" stroke={ink} strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 15" />
        </g>
        <CityMark c={{ p: MIAMI, name: "Miami", ...miami }} ink={ink} halo={0} />
        <CityMark c={{ p: BA, name: "Buenos Aires", ...ba }} ink={ink} halo={0} />
        <CityLabel c={{ p: MIAMI, name: "Miami", ...miami }} ink={ink} id={`a${id}`} />
        <CityLabel c={{ p: BA, name: "Buenos Aires", ...ba }} ink={ink} id={`b${id}`} />
        {children}
      </g>
    </svg>
  );
};
