import React from "react";
import { Img, staticFile } from "remotion";
import { C, FONT } from "../theme";

/* ---------- Avatars: photo crops matching the app's CSS background crops ---------- */

type Crop = { src: string; aspect: number; size: number; x: number; y: number };
/** Same crops as .rosa/.ana/.luis/.dani in nest-app-screens.html (background-size / position). */
export const PEOPLE: Record<"rosa" | "ana" | "luis" | "dani", Crop> = {
  rosa: { src: "selfie.jpg", aspect: 1000 / 563, size: 3, x: 0.6, y: 0.46 },
  ana: { src: "laugh.jpg", aspect: 1000 / 1500, size: 2.5, x: 0.42, y: 0.22 },
  luis: { src: "shop.jpg", aspect: 1000 / 1500, size: 4.2, x: 0.5, y: 0.3 },
  dani: { src: "phone.jpg", aspect: 1000 / 563, size: 3.3, x: 0.52, y: 0.28 },
};

export const Avatar = ({
  who, size = 44, style, children, bg, color,
}: { who?: keyof typeof PEOPLE; size?: number; style?: React.CSSProperties; children?: React.ReactNode; bg?: string; color?: string }) => {
  const crop = who ? PEOPLE[who] : null;
  const hFrac = crop ? crop.size / crop.aspect : 1; // image height as a multiple of the container
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flex: "none", position: "relative", overflow: "hidden",
        background: bg ?? C.sage1, color: color ?? C.moss, display: "grid", placeItems: "center",
        fontWeight: 600, fontSize: size * 0.36, ...style,
      }}
    >
      {crop ? (
        <Img
          src={staticFile(crop.src)}
          style={{
            position: "absolute", maxWidth: "none",
            width: `${crop.size * 100}%`, height: `${hFrac * 100}%`,
            left: `${(1 - crop.size) * crop.x * 100}%`, top: `${(1 - hFrac) * crop.y * 100}%`,
          }}
        />
      ) : (
        children
      )}
    </div>
  );
};

/* ---------- Chips ---------- */

export const Chip = ({
  tone = "green", children, style,
}: { tone?: "green" | "sky" | "amber" | "white"; children: React.ReactNode; style?: React.CSSProperties }) => {
  const t = {
    green: [C.sage1, C.moss], sky: [C.sky1, C.skyInk], amber: [C.amber1, C.amber], white: [C.white, C.ink],
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 11px",
        fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", background: t[0], color: t[1], fontFamily: FONT, ...style,
      }}
    >
      {children}
    </span>
  );
};

/* ---------- Buttons ---------- */

export const Button = ({
  kind = "dark", children, style,
}: { kind?: "dark" | "light" | "ghost"; children: React.ReactNode; style?: React.CSSProperties }) => {
  const k = {
    dark: { background: C.ink, color: "#fff" },
    light: { background: C.white, color: C.ink },
    ghost: { background: "transparent", color: C.ink6, height: 46 },
  }[kind];
  return (
    <div
      style={{
        height: 56, borderRadius: 999, fontFamily: FONT, fontWeight: 600, fontSize: 16, display: "flex",
        alignItems: "center", justifyContent: "center", gap: 8, width: "100%", letterSpacing: "-0.01em", ...k, ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ---------- Cards, key-value rows, list items ---------- */

export const Card = ({ children, style, tight }: { children: React.ReactNode; style?: React.CSSProperties; tight?: boolean }) => (
  <div style={{ background: C.white, borderRadius: 28, padding: tight ? "16px 20px" : 22, boxShadow: "0 1px 0 rgba(23,32,26,.04)", ...style }}>
    {children}
  </div>
);

export const Kv = ({ k, v, last, vStyle, style }: { k: string; v: React.ReactNode; last?: boolean; vStyle?: React.CSSProperties; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${C.line}`, ...style }}>
    <span style={{ color: C.ink4 }}>{k}</span>
    <span style={{ fontWeight: 500, ...vStyle }}>{v}</span>
  </div>
);

export const Item = ({
  left, title, sub, right, last, subStyle, style,
}: { left: React.ReactNode; title: React.ReactNode; sub: React.ReactNode; right?: React.ReactNode; last?: boolean; subStyle?: React.CSSProperties; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.line}`, ...style }}>
    {left}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 13, color: C.ink4, marginTop: 2, ...subStyle }}>{sub}</div>
    </div>
    {right}
  </div>
);

export const Amt = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", ...style }}>{children}</span>
);

/** The amber "+" / "?" circle used for unknown numbers. */
export const UnknownAvatar = ({ glyph = "+", size = 44 }: { glyph?: string; size?: number }) => (
  <Avatar size={size} bg={C.amber1} color={C.amber}>{glyph}</Avatar>
);
