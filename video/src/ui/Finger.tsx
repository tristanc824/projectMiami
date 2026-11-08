import React from "react";
import { clamp01, EASE_OUT } from "./anim";

/**
 * Simulated touch: a soft translucent disc with a white rim (the way product demos show taps).
 * press (0..1) squashes it; `ripple` is the frame offset since the last tap (draws an expanding ring).
 */
export const Finger = ({
  x, y, press = 0, opacity = 1, ripple, size = 116,
}: { x: number; y: number; press?: number; opacity?: number; ripple?: number; size?: number }) => {
  const r = ripple === undefined ? -1 : ripple;
  const rp = clamp01(r / 22);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity }}>
      {r >= 0 && r <= 22 ? (
        <div
          style={{
            position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.9)", boxShadow: "0 0 0 1px rgba(23,32,26,0.12)",
            transform: `scale(${1 + EASE_OUT(rp) * 1.1})`, opacity: 1 - rp,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.55), rgba(220,226,222,0.38) 62%, rgba(200,206,202,0.3))",
          border: "3px solid rgba(255,255,255,0.92)",
          boxShadow: "0 14px 34px -8px rgba(10,20,14,0.38), inset 0 0 0 1px rgba(23,32,26,0.10)",
          transform: `scale(${1 - press * 0.16})`,
        }}
      />
    </div>
  );
};
