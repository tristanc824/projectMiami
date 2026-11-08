import React from "react";
import { C, FONT } from "../theme";
import { IcBattery, IcSignal, IcWifi } from "./Icons";

/** Logical device size from nest-app-screens.html (iPhone 15, CSS px). */
export const PHONE_W = 390;
export const PHONE_H = 844;

export const StatusBar = ({ light = false }: { light?: boolean }) => {
  const color = light ? "#fff" : C.ink;
  return (
    <div
      style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 54, padding: "18px 30px 0 34px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color, zIndex: 8,
      }}
    >
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 3 }}>
        <IcSignal color={color} />
        <IcWifi color={color} />
        <IcBattery color={color} />
      </span>
    </div>
  );
};

export const Island = () => (
  <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", width: 124, height: 36, borderRadius: 20, background: "#0B0F0C", zIndex: 9 }} />
);

export const HomeBar = ({ light = false }: { light?: boolean }) => (
  <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 136, height: 5, borderRadius: 5, background: light ? "#fff" : C.ink, opacity: 0.9, zIndex: 9 }} />
);

/** Device frame with bezel, island, status bar and home indicator, at logical 390x844. */
export const Phone = ({
  children, bg = C.page, dark = false, style, shadow = true,
}: { children?: React.ReactNode; bg?: string; dark?: boolean; style?: React.CSSProperties; shadow?: boolean }) => (
  <div
    style={{
      width: PHONE_W, height: PHONE_H, borderRadius: 54, background: bg, overflow: "hidden", position: "relative",
      fontFamily: FONT, color: C.ink,
      boxShadow: shadow
        ? "0 0 0 9px #0F1511, 0 0 0 10px #2B3530, 0 50px 90px -30px rgba(10,22,14,0.55), 0 20px 40px -20px rgba(10,22,14,0.35)"
        : "0 0 0 9px #0F1511, 0 0 0 10px #2B3530",
      ...style,
    }}
  >
    {children}
    <Island />
    <StatusBar light={dark} />
    <HomeBar light={dark} />
  </div>
);

/**
 * Places a logical-size phone on the 1080x1920 canvas. (x, y) is the top-left of the
 * screen in canvas px, k the scale. `cam` adds a camera zoom about a canvas point.
 */
export type Cam = { x: number; y: number; k: number; zoom?: number; ox?: number; oy?: number };

export const camMap = (cam: Cam, lx: number, ly: number) => {
  const z = cam.zoom ?? 1;
  const ox = cam.ox ?? 540;
  const oy = cam.oy ?? 960;
  const sx = cam.x + lx * cam.k;
  const sy = cam.y + ly * cam.k;
  return { x: ox + (sx - ox) * z, y: oy + (sy - oy) * z, s: cam.k * z };
};

export const PhoneOnStage = ({ cam, children, style }: { cam: Cam; children: React.ReactNode; style?: React.CSSProperties }) => {
  const z = cam.zoom ?? 1;
  const ox = cam.ox ?? 540;
  const oy = cam.oy ?? 960;
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${ox}px ${oy}px`, transform: `scale(${z})`, ...style }}>
      <div style={{ position: "absolute", left: cam.x, top: cam.y, transformOrigin: "0 0", transform: `scale(${cam.k})` }}>{children}</div>
    </div>
  );
};
