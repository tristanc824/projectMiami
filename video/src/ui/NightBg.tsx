import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/** Miami at night through a window, lamp light only: warm lamp glow plus soft out-of-focus city lights. */
const BOKEH = [
  { x: 120, y: 260, r: 120, c: "rgba(242,181,107,0.30)" },
  { x: 930, y: 180, r: 90, c: "rgba(111,163,201,0.22)" },
  { x: 860, y: 520, r: 150, c: "rgba(242,181,107,0.16)" },
  { x: 60, y: 760, r: 80, c: "rgba(111,163,201,0.18)" },
  { x: 1000, y: 980, r: 110, c: "rgba(232,140,90,0.16)" },
  { x: 180, y: 1450, r: 140, c: "rgba(242,181,107,0.14)" },
  { x: 960, y: 1620, r: 100, c: "rgba(111,163,201,0.15)" },
  { x: 520, y: 120, r: 70, c: "rgba(255,214,160,0.18)" },
];

export const NightBg = ({ drift = 0.25, dim = 0 }: { drift?: number; dim?: number }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(90% 60% at 18% 12%, #5A3F24 0%, #2A2119 34%, #121311 70%, #0A0B0A 100%)" }}>
      {BOKEH.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: b.x - b.r + Math.sin(f / 70 + i) * 14 * drift * 4, top: b.y - b.r + f * drift * (i % 2 ? -1 : 1),
            width: b.r * 2, height: b.r * 2, borderRadius: "50%", background: b.c, filter: "blur(26px)",
          }}
        />
      ))}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 50% 55%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)" }} />
      {dim > 0 ? <AbsoluteFill style={{ background: `rgba(0,0,0,${dim})` }} /> : null}
    </AbsoluteFill>
  );
};
