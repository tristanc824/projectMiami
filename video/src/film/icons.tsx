import React from "react";

export { IcBack, IcCheck, IcChev, IcDown, IcHome, IcInfo, IcLeaf, IcPlus, IcSend, IcShield, IcSprout, IcUndo, IcUser } from "../ui/Icons";

/** Extra icons from the app's sprite (nest-app-screens.html) that ui/Icons doesn't have. */
type P = { size?: number; color?: string; style?: React.CSSProperties };
const st = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IcClock = ({ size = 24, color = "currentColor", style }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ color, display: "block", flex: "none", ...style }}>
    <circle cx="12" cy="12" r="9" {...st} /><path d="M12 7v5l3 2" {...st} />
  </svg>
);

export const IcKey = ({ size = 24, color = "currentColor", style }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ color, display: "block", flex: "none", ...style }}>
    <circle cx="8" cy="15" r="4" {...st} /><path d="m11 12 8-8m-3 3 2 2m-4 0 1.5 1.5" {...st} />
  </svg>
);

export const IcLock = ({ size = 24, color = "currentColor", style }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ color, display: "block", flex: "none", ...style }}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...st} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...st} />
  </svg>
);
