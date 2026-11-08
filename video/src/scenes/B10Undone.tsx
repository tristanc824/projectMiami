import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FLOAT_SHADOW, FONT } from "../theme";
import { clamp01, EASE_IN_OUT, lerp, spr, SPRING, track, tween } from "../ui/anim";
import { Finger } from "../ui/Finger";
import { FloatRow } from "../ui/FloatRow";
import { IcUndo } from "../ui/Icons";
import { camMap, Phone, PhoneOnStage } from "../ui/Phone";
import { HomeScreen, UNDO_START } from "../ui/screens";
import { PageBg, Shot } from "../ui/Stage";
import { UndoStage } from "./B09Undo";

const BTN = { left: 70, top: 930, w: 940, h: 172 };

const Tap = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lift = spr(f, fps, 0, SPRING.float);
  const press = tween(f, [16, 20], [0, 1]) * (1 - tween(f, [24, 30], [0, 1]));
  const fx = track(f, [[0, 1040], [14, 930]]);
  const fy = track(f, [[0, 1650], [14, BTN.top + BTN.h / 2 + 34]]);
  return (
    <PageBg>
      <AbsoluteFill style={{ transform: "scale(1.06)", transformOrigin: "50% 38%", filter: `blur(${lift * 6}px)` }}>
        <UndoStage secondsLeft={UNDO_START - 5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(243,240,234,0.55)", opacity: lift }} />
      <div
        style={{
          position: "absolute", left: BTN.left, top: BTN.top + (1 - lift) * 560, width: BTN.w, height: BTN.h, borderRadius: 999,
          background: press > 0.5 ? "#2A352D" : C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 22,
          fontFamily: FONT, fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: FLOAT_SHADOW,
          opacity: clamp01(lift * 2), transform: `scale(${1 - press * 0.03})`,
        }}
      >
        <IcUndo size={56} />Undo and get $500 back
      </div>
      <Finger x={fx} y={fy} press={press} ripple={f - 20} opacity={tween(f, [0, 8], [0, 1]) * (1 - tween(f, [30, 38], [0, 1]))} />
    </PageBg>
  );
};

const K = 1.9;
const BASE = { x: (1080 - 390 * K) / 2, y: 120, k: K };
const ROW = { x: 195, y: 548 }; // logical centre of the first Activity row

const Landed = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = tween(f, [0, 40], [1.0, 1.18], EASE_IN_OUT);
  const cam = { ...BASE, zoom, ox: 540, oy: BASE.y + ROW.y * K };
  const land = spr(f, fps, 8, SPRING.ui);
  const lift = spr(f, fps, 26, SPRING.float);
  const row = camMap(cam, ROW.x, ROW.y);
  return (
    <PageBg>
      <PhoneOnStage cam={cam} style={{ filter: `blur(${lift * 6}px)` }}>
        <Phone><HomeScreen undone={land} /></Phone>
      </PhoneOnStage>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,234,0.5)", opacity: lift }} />
      {lift > 0.001 ? (
        <div style={{ position: "absolute", left: lerp(row.x, 540, lift), top: lerp(row.y, 1000, lift), transform: `translate(-50%,-50%) scale(${lerp(row.s / 4.2, 1, lift)})`, opacity: clamp01(lift * 3) }}>
          <FloatRow
            glyph="?"
            title="New number"
            sub="Undone · Money back"
            subColor={C.moss}
            right={<span style={{ fontSize: 46, fontWeight: 600, color: C.ink4, textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>$500.00</span>}
          />
        </div>
      ) : null}
    </PageBg>
  );
};

/** Beat 10, money back: tap Undo, then Home with the "New number · Undone · Money back" row landing at the top of Activity. */
export const B10Undone = () => (
  <AbsoluteFill>
    <Shot from={0} dur={40} tail={14}><Tap /></Shot>
    <Shot from={40} dur={80} tail={22} enter="zoom" enterLen={14}><Landed /></Shot>
  </AbsoluteFill>
);
