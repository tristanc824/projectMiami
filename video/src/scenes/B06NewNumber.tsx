import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { clamp01, EASE_IN_OUT, lerp, spr, SPRING, tween } from "../ui/anim";
import { FloatRow } from "../ui/FloatRow";
import { NightBg } from "../ui/NightBg";
import { camMap, Phone, PhoneOnStage } from "../ui/Phone";
import { MessagesThread, SendToScreen } from "../ui/screens";
import { PageBg, Shot } from "../ui/Stage";

const K = 1.9;
const BASE = { x: (1080 - 390 * K) / 2, y: 230, k: K };
const ROW = { x: 195, y: 480 }; // logical centre of the +54 row in Send to

const Thread = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <NightBg />
      <PhoneOnStage cam={{ x: (1080 - 390 * 2.1) / 2, y: 186 - f * 0.6, k: 2.1 }} style={{ filter: "brightness(0.9)" }}>
        <Phone dark bg="#0E100F"><MessagesThread /></Phone>
      </PhoneOnStage>
    </AbsoluteFill>
  );
};

const SendTo = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = tween(f, [0, 70], [1.0, 1.12], EASE_IN_OUT);
  const cam = { ...BASE, zoom, ox: 540, oy: BASE.y + ROW.y * K };
  const glow = tween(f, [10, 24], [0, 1]);
  const lift = spr(f, fps, 22, SPRING.float);
  const row = camMap(cam, ROW.x, ROW.y);
  const k = lerp(row.s / 4.2, 1, lift);

  return (
    <PageBg>
      <PhoneOnStage cam={cam} style={{ filter: `blur(${lift * 6}px)` }}>
        <Phone><SendToScreen rowGlow={glow} /></Phone>
      </PhoneOnStage>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,234,0.5)", opacity: lift }} />
      {lift > 0.001 ? (
        <div style={{ position: "absolute", left: lerp(row.x, 540, lift), top: lerp(row.y, 1010, lift), transform: `translate(-50%,-50%) scale(${k})`, opacity: clamp01(lift * 3) }}>
          <FloatRow glyph="+" title="+54 9 11 5555 0142" sub="New · 24 hours to undo" subColor={C.amber} style={{ boxShadow: `0 0 0 ${6 * glow}px rgba(138,90,16,0.14), 0 2px 4px rgba(22,48,29,0.06), 0 24px 48px -16px rgba(22,48,29,0.25), 0 70px 130px -40px rgba(22,48,29,0.45)` }} />
        </div>
      ) : null}
    </PageBg>
  );
};

/** Beat 6, the new number: half a second back on the thread, then Send to. The +54 row glows amber and floats forward. */
export const B06NewNumber = () => (
  <AbsoluteFill>
    <Shot from={0} dur={18} tail={12}><Thread /></Shot>
    <Shot from={18} dur={72} tail={20} enter="push" enterLen={12}><SendTo /></Shot>
  </AbsoluteFill>
);
