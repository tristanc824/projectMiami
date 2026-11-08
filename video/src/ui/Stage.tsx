import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, H, SAFE, W } from "../theme";
import { EASE_OUT, EASE_IN_OUT, tween } from "./anim";

/**
 * A logical canvas scaled up to 1080x1920, so app UI can be authored in the app's own CSS px
 * (from nest-app-screens.html) and floated large without retyping sizes.
 */
export const Stage = ({ k, children, style }: { k: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: W / k, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0", fontFamily: FONT, color: C.ink, ...style }}>
    {children}
  </div>
);

/** Warm paper background with a gentle vignette, for the app beats. */
export const PageBg = ({ children }: { children?: React.ReactNode }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 38%, #F8F6F1 0%, ${C.page} 52%, #E6E0D4 100%)`, fontFamily: FONT, color: C.ink }}>
    {children}
  </AbsoluteFill>
);

/** The meadow photo with a slow push-in. */
export const Meadow = ({
  position = "46% 70%", from = 1, to = 1.06, dur = 150, drift = 0, children, brightness = 1,
}: { position?: string; from?: number; to?: number; dur?: number; drift?: number; children?: React.ReactNode; brightness?: number }) => {
  const f = useCurrentFrame();
  const s = tween(f, [0, dur], [from, to], EASE_IN_OUT);
  const dx = tween(f, [0, dur], [0, drift], EASE_IN_OUT);
  return (
    <AbsoluteFill style={{ background: C.moss9, overflow: "hidden" }}>
      <Img
        src={staticFile("meadow.jpg")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position, transform: `translateX(${dx}px) scale(${s})`, filter: `saturate(1.08) brightness(${brightness})` }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** The small honesty pill (VIDEO_SCRIPT.md section 4): top right, under the 14% line. */
export const PrototypePill = ({ dark = false, opacity = 1 }: { dark?: boolean; opacity?: number }) => (
  <div
    style={{
      position: "absolute", top: SAFE.top + 14, right: SAFE.side, padding: "10px 22px", borderRadius: 999,
      fontFamily: FONT, fontWeight: 500, fontSize: 28, letterSpacing: "-0.005em", opacity,
      background: dark ? "rgba(255,255,255,0.12)" : "rgba(250,248,244,0.86)",
      color: dark ? "rgba(255,255,255,0.7)" : C.ink4,
      backdropFilter: "blur(14px)",
      border: dark ? "none" : `1px solid ${C.line}`,
      boxShadow: dark ? "none" : "0 8px 22px -12px rgba(22,48,29,0.35)",
    }}
  >
    Prototype
  </div>
);

export type Enter = "cut" | "fade" | "push" | "pushUp" | "zoom" | "blur";

/** Entrance styles for the incoming shot during a transition of `len` frames. */
export const enterStyle = (f: number, kind: Enter, len: number): React.CSSProperties => {
  if (kind === "cut" || len <= 0) return {};
  const t = tween(f, [0, len], [0, 1], kind === "fade" ? EASE_IN_OUT : EASE_OUT);
  if (t >= 1) return {};
  switch (kind) {
    case "fade":
      return { opacity: t };
    case "push":
      return { transform: `translateX(${(1 - t) * W}px)`, boxShadow: "-40px 0 80px rgba(10,20,14,0.25)" };
    case "pushUp":
      return { transform: `translateY(${(1 - t) * H * 0.35}px)`, opacity: Math.min(1, t * 2.2) };
    case "zoom":
      return { opacity: Math.min(1, t * 1.6), transform: `scale(${1.06 - 0.06 * t})`, filter: `blur(${(1 - t) * 14}px)` };
    case "blur":
      return { opacity: Math.min(1, t * 1.4), filter: `blur(${(1 - t) * 18}px)` };
  }
  return {};
};

/**
 * One shot on the timeline. It starts at `from`, lasts `dur` frames, and is kept alive for
 * `tail` extra frames so the next shot can transition over it.
 */
export const Shot = ({
  from, dur, tail = 0, enter = "cut", enterLen = 0, children, name,
}: { from: number; dur: number; tail?: number; enter?: Enter; enterLen?: number; children: React.ReactNode; name?: string }) => (
  <Sequence from={from} durationInFrames={dur + tail} name={name}>
    <ShotInner enter={enter} enterLen={enterLen}>{children}</ShotInner>
  </Sequence>
);

const ShotInner = ({ enter, enterLen, children }: { enter: Enter; enterLen: number; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ overflow: "hidden", ...enterStyle(f, enter, enterLen) }}>{children}</AbsoluteFill>;
};
