import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FLOAT_SHADOW, FONT } from "../theme";
import { clamp01, EASE_IN_OUT, EASE_OUT, lerp, spr, SPRING, track, tween } from "../ui/anim";
import { Avatar, Chip } from "../ui/Atoms";
import { Flock } from "../ui/Birds";
import { Finger } from "../ui/Finger";
import { FaceId } from "../ui/Icons";
import { camMap, Phone, PhoneOnStage } from "../ui/Phone";
import { AmountScreen, ConfirmScreen, SendToScreen, SlideToSend } from "../ui/screens";
import { PageBg, Shot } from "../ui/Stage";

const K = 1.9;
const BASE = { x: (1080 - 390 * K) / 2, y: 230, k: K };
const BIG = 4.6;

/* ---------------- 5a: tap Mamá, then Amount with the two chips floated ---------------- */

const MAMA = { x: 52, y: 218 };
const CHIPS = [
  { x: 113, y: 323, label: "No fee", to: 1010 },
  { x: 231, y: 323, label: "Arrives in a second", to: 1140 },
];

const ShotA = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = tween(f, [28, 46], [0, 1], EASE_IN_OUT);
  const zoom = tween(f, [40, 80], [1, 1.12], EASE_IN_OUT);
  const cam = { ...BASE, zoom, ox: 540, oy: BASE.y + 260 * K };
  const mama = camMap(cam, MAMA.x, MAMA.y);
  const press = tween(f, [16, 21], [0, 1]) - tween(f, [24, 30], [0, 1]);
  const lifts = CHIPS.map((_, i) => spr(f, fps, 52 + i * 7, SPRING.float));

  return (
    <PageBg>
      <PhoneOnStage cam={cam} style={{ filter: `blur(${lifts[0] * 6}px)` }}>
        <Phone>
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${-push * 117}px)`, filter: `brightness(${1 - push * 0.08})` }}>
            <SendToScreen mamaPress={press} />
          </div>
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - push) * 390}px)`, boxShadow: "-10px 0 30px rgba(0,0,0,0.08)" }}>
            <AmountScreen chipOpacity={lifts[0] > 0.001 ? 0 : 1} />
          </div>
        </Phone>
      </PhoneOnStage>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,234,0.5)", opacity: lifts[0] }} />
      {CHIPS.map((c, i) => {
        const t = lifts[i];
        if (t <= 0.001) return null;
        const s = camMap(cam, c.x, c.y);
        return (
          <div key={c.label} style={{ position: "absolute", left: lerp(s.x, 540, t), top: lerp(s.y, c.to, t), transform: `translate(-50%,-50%) scale(${lerp(s.s, BIG, t)})` }}>
            <Chip style={{ boxShadow: "0 1px 1px rgba(22,48,29,0.06), 0 5px 10px -4px rgba(22,48,29,0.2), 0 15px 30px -10px rgba(22,48,29,0.35)" }}>{c.label}</Chip>
          </div>
        );
      })}
      <Finger x={track(f, [[0, 900], [15, mama.x]]) + 6} y={track(f, [[0, 2050], [15, mama.y]]) + 10} press={press} ripple={f - 21} opacity={tween(f, [0, 6], [0, 1]) * (1 - tween(f, [28, 36], [0, 1]))} />
    </PageBg>
  );
};

/* ---------------- 5b: drag Slide to send, Face ID confirms ---------------- */

const SL = { left: 90, top: 990, w: 900, h: 160 };

const ShotB = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spr(f, fps, 0, SPRING.float);
  const p = tween(f, [18, 48], [0, 1], EASE_IN_OUT);
  const press = tween(f, [12, 17], [0, 1]) * (1 - tween(f, [49, 54], [0, 1]));
  const pad = SL.h * 0.097;
  const thumb = SL.h - pad * 2;
  const travel = SL.w - thumb - pad * 2;
  const fx = SL.left + pad + thumb / 2 + travel * p;
  const fy = SL.top + SL.h / 2;
  const tile = spr(f, fps, 50, SPRING.pop);
  const scan = tween(f, [52, 72], [0, 1], EASE_IN_OUT);
  const done = tween(f, [72, 82], [0, 1], EASE_OUT);

  return (
    <PageBg>
      <PhoneOnStage cam={{ ...BASE, y: 140, zoom: 1.05 }} style={{ filter: "blur(7px)", opacity: 0.7 }}>
        <Phone><ConfirmScreen slide={p} /></Phone>
      </PhoneOnStage>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,234,0.45)" }} />
      <div style={{ position: "absolute", left: SL.left, top: SL.top + (1 - enter) * 90, opacity: clamp01(enter * 1.4), borderRadius: 999, boxShadow: FLOAT_SHADOW }}>
        <SlideToSend progress={p} width={SL.w} height={SL.h} fontSize={58} complete={done} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: SL.top + SL.h + 36, textAlign: "center", fontSize: 36, color: C.ink4, opacity: clamp01(enter * 1.4) * (1 - done * 0.0) }}>
        Face ID confirms when you let go
      </div>
      {tile > 0.001 ? (
        <div style={{ position: "absolute", left: 540 - 140, top: 560 - 140, width: 280, height: 280, borderRadius: 84, background: C.white, display: "grid", placeItems: "center", boxShadow: FLOAT_SHADOW, transform: `scale(${0.6 + 0.4 * tile})`, opacity: clamp01(tile * 2) }}>
          <FaceId size={160} color={C.moss} scan={scan} done={done} />
        </div>
      ) : null}
      <Finger x={fx} y={fy} press={press} opacity={tween(f, [6, 12], [0, 1]) * (1 - tween(f, [52, 60], [0, 1]))} />
    </PageBg>
  );
};

/* ---------------- 5c: Arrived. Rosa with the check, then the Sunday row floats up ---------------- */

const ShotC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const av = spr(f, fps, 0, SPRING.ui);
  const badge = spr(f, fps, 12, SPRING.pop);
  const check = tween(f, [16, 28], [0, 1]);
  const head = spr(f, fps, 8, SPRING.soft);
  const row = spr(f, fps, 34, SPRING.float);
  const push = tween(f, [0, 110], [1, 1.04], EASE_IN_OUT);

  return (
    <PageBg>
      <Flock tone={C.moss} start={40} style={{ opacity: 0.4 }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, fontFamily: FONT }}>
        <div style={{ position: "absolute", left: 540 - 150, top: 330, width: 300, height: 300, transform: `scale(${0.85 + 0.15 * av})`, opacity: clamp01(av * 1.5) }}>
          <Avatar who="rosa" size={300} style={{ boxShadow: "0 30px 60px -30px rgba(22,48,29,0.5)" }} />
          <div style={{ position: "absolute", right: -8, bottom: -4, width: 112, height: 112, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", boxShadow: `0 0 0 12px ${C.page}`, transform: `scale(${badge})` }}>
            <svg viewBox="0 0 24 24" width={58} height={58}><path d="m5 12 5 5 9-10" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - check} /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", fontSize: 92, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.05, opacity: clamp01(head * 1.4), transform: `translateY(${(1 - head) * 30}px)` }}>
          Mamá has your $250.
        </div>
        <div style={{ position: "absolute", left: 90, right: 90, top: 880 + (1 - row) * 140, opacity: clamp01(row * 1.6), background: C.white, borderRadius: 48, padding: "34px 48px", display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 56, letterSpacing: "-0.02em", boxShadow: FLOAT_SHADOW }}>
          <span style={{ color: C.ink4 }}>When</span>
          <span style={{ fontWeight: 600 }}>Sunday, 9:41 PM</span>
        </div>
      </AbsoluteFill>
    </PageBg>
  );
};

/** Beat 5, send home: three quick shots, about three seconds each. */
export const B05Send = () => (
  <AbsoluteFill>
    <Shot from={0} dur={90} tail={14}><ShotA /></Shot>
    <Shot from={90} dur={90} tail={14} enter="push" enterLen={14}><ShotB /></Shot>
    <Shot from={180} dur={90} tail={20} enter="zoom" enterLen={14}><ShotC /></Shot>
  </AbsoluteFill>
);

