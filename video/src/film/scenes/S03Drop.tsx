import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../theme";
import { IcLeaf } from "../icons";
import { Cam, DotGrid, FPhone, LabelBody, MoneyDot, PhoneAt, Pill, Reveal, Ripple } from "../kit";
import { CX, CY, HALF_L, HALF_R, phoneAt, T } from "../layout";
import { BIG, LABEL_H, lockCentred, markCentred } from "../lockup";
import { clamp01, EASE_IN_OUT, EASE_OUT, glide, lerp, lineOut, lineT, PUSH, settle, springAt, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { MamaHome } from "../screens";

/*
 * 3. The drop (bars 8-10), v3. On frame 391 the money dot bursts into the FULL Nest mark, centred,
 * with a scale punch (1.25 -> 1, spring) and a soft flash, so the biggest beat lands on the brand,
 * not on a lone ring that reads as "0". Beats 2 and 3 are accent punches; the wordmark masks in on
 * beat 4. Bar 9 (the mechanism, on "...in US dollars"): the lockup steps into the left half and
 * Mamá's phone lands in the right half with her balance in dollars; on beat 2 the chip "Held in
 * digital US dollars (USDC)" lands under the lockup. Bar 10: the lockup flies to the chapter label
 * (drawn by Film.tsx from HIT.fly on) and the camera pushes into Mamá's phone, through to 24/7.
 */

const FROM = SC.drop.from;
const L = (abs: number) => abs - FROM;
export const RING_AT = [L(HIT.ring1), L(HIT.ring2), L(HIT.ring3)];
/** Where the lockup sits in bar 9 (centre of the lockup), and where the chapter-label fly starts. */
export const DROP_LEFT = { cx: HALF_L, cy: 486 };
const PH = phoneAt(HALF_R);

/** The big lockup's top-left at local frame f. */
export const dropLockPos = (f: number) => {
  const slide = tween(f, [L(HIT.word) - 1, L(HIT.word) + 9], [0, 1], EASE_OUT);
  const step = glide(f, L(HIT.keyword));
  const a = markCentred(CX, CY);
  const b = lockCentred(CX, CY);
  const c = lockCentred(DROP_LEFT.cx, DROP_LEFT.cy);
  const x0 = lerp(a.x, b.x, slide);
  return { x: lerp(x0, c.x, step), y: lerp(a.y, c.y, step), wordT: tween(f, [L(HIT.word) - 1, L(HIT.word) + 8], [0, 1], EASE_OUT) };
};

export const DropBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  // All three rings land together on the drop (4 frames), then beats 2 and 3 are punches.
  const draw = tween(f, [-3, 0], [0, 1], EASE_OUT);
  const p = [draw, draw, draw];
  const slam = 1 + 0.25 * (1 - springAt(f + 2, 12, 300));
  const accents = RING_AT.slice(1).map((a) => (f >= a - 1 ? Math.max(0, 1 - (f - a + 1) / 8) : 0));
  const punch = slam * (1 + 0.045 * Math.max(...accents)) * k.scale;
  const pos = dropLockPos(f);
  const markC = { x: pos.x + (BIG * 40) / 2, y: pos.y + (BIG * LABEL_H) / 2 };
  const chip = lineT(f, L(HIT.chip));
  // The chip stays until the push-through (3.3 s on screen); it rises to the lockup's place as the lockup flies off.
  const chipOut = lineOut(f, SC.drop.dur - 10);
  const chipUp = tween(f, [L(HIT.fly), L(HIT.fly) + 14], [0, 1], EASE_IN_OUT);
  const push = tween(f, [SC.drop.dur - 12, SC.drop.dur - SC.always.swap], [0, 1], PUSH);
  const dotR = 14 * (1 - tween(f, [-3, 0], [0, 1], EASE_OUT));
  const flash = f >= 0 ? Math.max(0, 1 - f / 9) : 0;
  const ownLockup = f < L(HIT.fly);
  const ph = settle(f, L(HIT.keyword));
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Cam z={1 + 2.2 * push} ox={HALF_R} oy={CY} blur={push * 6}>
        <Drift f={f}>
          <DotGrid glow={Math.max(k.glow, flash)} />
          {f >= L(HIT.keyword) - 2 ? (
            <PhoneAt x={PH.x} y={PH.y + (1 - ph) * 90} style={{ opacity: clamp01(ph * 2.5) }}>
              <FPhone><MamaHome line={tween(f, [L(HIT.keyword) + 4, L(HIT.keyword) + 20], [0, 1], EASE_IN_OUT)} /></FPhone>
            </PhoneAt>
          ) : null}
          <div style={{ position: "absolute", left: DROP_LEFT.cx - 420, width: 840, top: lerp(DROP_LEFT.cy + (BIG * LABEL_H) / 2 + 40, CY - 31, chipUp), display: "flex", justifyContent: "center" }}>
            <Reveal t={chip} out={chipOut}>
              <Pill size={T.m}><IcLeaf size={30} />Held in digital US dollars (USDC)</Pill>
            </Reveal>
          </div>
        </Drift>
      </Cam>
      {flash > 0 ? <AbsoluteFill style={{ background: `radial-gradient(circle at ${CX}px ${CY}px, rgba(255,255,255,${(0.7 * flash).toFixed(3)}) 0%, rgba(255,255,255,${(0.18 * flash).toFixed(3)}) 45%, rgba(255,255,255,0) 75%)` }} /> : null}
      {RING_AT.map((a, i) => (f >= a && f < a + 20 ? <Ripple key={i} x={markC.x} y={markC.y} p={(f - a) / 20} r0={90} r1={i === 0 ? 420 : 260} width={i === 0 ? 5 : 3} alpha={i === 0 ? 0.5 : 0.3} /> : null))}
      {ownLockup ? (
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transformOrigin: "0 0", transform: `scale(${BIG})` }}>
          <div style={{ transform: `scale(${punch.toFixed(4)})`, transformOrigin: "20px 20.8px" }}>
            <LabelBody word="Nest" p={p} wordT={pos.wordT} />
          </div>
        </div>
      ) : null}
      {dotR > 0.05 ? <MoneyDot x={CX} y={CY} r={dotR} /> : null}
    </AbsoluteFill>
  );
};

/** Scene 3 owns the lockup until the fly; the ChapterLabel draws it after. */
export const S03Drop = () => <DropBody f={useF()} />;
