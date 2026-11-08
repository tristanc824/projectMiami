import React from "react";

/** The app's icon sprite (nest-app-screens.html), as React components. */
type P = { size?: number; color?: string; style?: React.CSSProperties; strokeWidth?: number };

const S = ({ size = 24, color = "currentColor", style, children, vb = "0 0 24 24" }: P & { children: React.ReactNode; vb?: string }) => (
  <svg viewBox={vb} width={size} height={size} style={{ color, flex: "none", display: "block", ...style }}>
    {children}
  </svg>
);
const st = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IcSend = (p: P) => (<S {...p}><path d="M5 12h14M13 6l6 6-6 6" {...st} /></S>);
export const IcPlus = (p: P) => (<S {...p}><path d="M12 5v14M5 12h14" {...st} /></S>);
export const IcDown = (p: P) => (<S {...p}><path d="M12 5v14M6 13l6 6 6-6" {...st} /></S>);
export const IcUndo = (p: P) => (<S {...p}><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" {...st} /></S>);
export const IcLeaf = (p: P) => (<S {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10ZM2 21c0-3 1.9-5.4 5.1-6" {...st} /></S>);
export const IcSearch = (p: P) => (<S {...p}><circle cx="11" cy="11" r="7" {...st} /><path d="m20 20-3.5-3.5" {...st} /></S>);
export const IcHome = (p: P) => (<S {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" {...st} /></S>);
export const IcSprout = (p: P) => (<S {...p}><path d="M12 21v-9M12 12C12 8 9 5 4 5c0 4 3 7 8 7Zm0 0c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6Z" {...st} /></S>);
export const IcUser = (p: P) => (<S {...p}><circle cx="12" cy="8" r="4" {...st} /><path d="M4 21a8 8 0 0 1 16 0" {...st} /></S>);
export const IcShield = (p: P) => (<S {...p}><path d="M12 3 5 6v6c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6Z" {...st} /><path d="m9 12 2 2 4-4" {...st} /></S>);
export const IcChev = (p: P) => (<S {...p}><path d="m9 6 6 6-6 6" {...st} /></S>);
export const IcBack = (p: P) => (<S {...p}><path d="m15 6-6 6 6 6" {...st} /></S>);
export const IcInfo = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" {...st} /><path d="M12 11v5M12 8h.01" {...st} /></S>);
export const IcCheck = ({ strokeWidth = 3, ...p }: P) => (
  <S {...p}><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></S>
);

export const IcSignal = (p: P) => (
  <svg viewBox="0 0 18 12" width={18} height={12} style={{ color: p.color, display: "block" }}>
    <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
    <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
    <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
    <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
  </svg>
);
export const IcWifi = (p: P) => (
  <svg viewBox="0 0 16 12" width={16} height={12} style={{ color: p.color, display: "block" }}>
    <path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0Zm-4.6-4.7 1.5 1.6a4.4 4.4 0 0 1 6.2 0l1.5-1.6a6.6 6.6 0 0 0-9.2 0ZM.2 3.5l1.6 1.6a8.8 8.8 0 0 1 12.4 0l1.6-1.6a11 11 0 0 0-15.6 0Z" fill="currentColor" />
  </svg>
);
export const IcBattery = (p: P) => (
  <svg viewBox="0 0 27 13" width={27} height={13} style={{ color: p.color, display: "block" }}>
    <rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" />
    <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
    <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity=".4" />
  </svg>
);

/**
 * Face ID glyph. `scan` (0..1) sweeps the corner brackets around once; `done` (0..1)
 * morphs the face into a check, like the system confirmation.
 */
export const FaceId = ({ size = 72, color = "currentColor", scan = 0, done = 0 }: { size?: number; color?: string; scan?: number; done?: number }) => (
  <svg viewBox="0 0 72 72" width={size} height={size} style={{ color, display: "block", overflow: "visible" }}>
    <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <g transform={`rotate(${scan * 90} 36 36)`} opacity={1 - done * 0.0}>
        <path d="M6 22V12a6 6 0 0 1 6-6h10M50 6h10a6 6 0 0 1 6 6v10M66 50v10a6 6 0 0 1-6 6H50M22 66H12a6 6 0 0 1-6-6V50" />
      </g>
      <g opacity={1 - done}>
        <path d="M26 27v5M46 27v5M36 29v12h-3M28 48c5 4 11 4 16 0" />
      </g>
      <path d="M22 37l10 10 18-20" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - done} strokeWidth={4} opacity={done > 0.01 ? 1 : 0} />
    </g>
  </svg>
);
