import React from "react";
import { clamp01, EASE_IN_OUT } from "./anim";

const RINGS = [
  { cx: 23, cy: 32, rot: 90 },
  { cx: 36.5, cy: 24.206, rot: 210 },
  { cx: 36.5, cy: 39.794, rot: 330 },
];

/**
 * The three-ring Nest mark. `draw` (0..1) draws the rings one after another with
 * stroke-dashoffset, each starting a little after the previous one.
 */
export const NestMark = ({
  size = 64, color = "currentColor", draw = 1, strokeWidth = 5.5, style,
}: { size?: number; color?: string; draw?: number; strokeWidth?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ overflow: "visible", display: "block", flex: "none", ...style }}>
    <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      {RINGS.map((r, i) => {
        const p = EASE_IN_OUT(clamp01((draw - i * 0.17) / 0.66));
        return (
          <ellipse
            key={i}
            cx={r.cx}
            cy={r.cy}
            rx={18}
            ry={14}
            transform={`rotate(${r.rot} ${r.cx} ${r.cy})`}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - p}
            opacity={p > 0.002 ? 1 : 0}
          />
        );
      })}
    </g>
  </svg>
);

/** Mark + wordmark lockup. */
export const Lockup = ({
  size, color, draw = 1, wordOpacity = 1, wordShift = 0, fontSize,
}: { size: number; color: string; draw?: number; wordOpacity?: number; wordShift?: number; fontSize: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.24, color }}>
    <NestMark size={size} color={color} draw={draw} />
    <span style={{ fontWeight: 600, fontSize, letterSpacing: "-0.035em", opacity: wordOpacity, transform: `translateX(${wordShift}px)`, lineHeight: 1 }}>Nest</span>
  </div>
);
