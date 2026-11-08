import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../theme";
import { IcLeaf } from "../icons";
import { Cam, DotGrid, LabelBody, MoneyDot, Pill, Reveal, Ripple } from "../kit";
import { CX, CY, T } from "../layout";
import { BIG, LABEL_H, lockCentred, markCentred } from "../lockup";
import { EASE_OUT, lerp, lineOut, lineT, PUSH, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";

/*
 * 3. The drop (bars 8-10). On frame 391 the money dot bursts into the Nest mark: ring 1 on the
 * drop, ring 2 a beat later, ring 3 a beat after that, the wordmark on the next beat (the mark
 * slides left to make room, so the lockup ends centred). "Held in US dollars" on bar 9. Bar 10:
 * the lockup flies to the chapter label (drawn by Film.tsx's ChapterLabel from HIT.fly on), and
 * the camera pushes through into 24/7.
 */

const FROM = SC.drop.from;
const L = (abs: number) => abs - FROM;
export const RING_AT = [L(HIT.ring1), L(HIT.ring2), L(HIT.ring3)];

/** Ring progress for a ring landing on local frame a. */
export const ringP = (f: number, a: number) => tween(f, [a - 1, a + 7], [0, 1], EASE_OUT);

/** The big lockup's top-left at local frame f (mark centred until the word arrives, then centred lockup). */
export const dropLockPos = (f: number) => {
  const slide = tween(f, [L(HIT.word) - 1, L(HIT.word) + 9], [0, 1], EASE_OUT);
  const a = markCentred(CX, CY);
  const b = lockCentred(CX, CY);
  return { x: lerp(a.x, b.x, slide), y: a.y, wordT: tween(f, [L(HIT.word) - 1, L(HIT.word) + 8], [0, 1], EASE_OUT) };
};

export const DropBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const p = RING_AT.map((a) => ringP(f, a));
  const pos = dropLockPos(f);
  const markC = { x: pos.x + (BIG * 40) / 2, y: CY };
  const kw = lineT(f, L(HIT.keyword));
  const kwOut = lineOut(f, L(HIT.fly));
  const push = tween(f, [SC.drop.dur - 12, SC.drop.dur - SC.always.swap], [0, 1], PUSH);
  const dotR = 14 * (1 - tween(f, [-1, 7], [0, 1], EASE_OUT));
  const flash = Math.max(0, 1 - f / 8);
  const ownLockup = f < L(HIT.fly);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Cam z={1 + 0.9 * push} blur={push * 6}>
        <Drift f={f}>
          <DotGrid glow={k.glow} />
        </Drift>
      </Cam>
      {flash > 0 ? <AbsoluteFill style={{ background: `radial-gradient(circle at ${CX}px ${CY}px, rgba(255,255,255,${(0.55 * flash).toFixed(3)}) 0%, rgba(255,255,255,0) 40%)` }} /> : null}
      {RING_AT.map((a, i) => (f >= a && f < a + 18 ? <Ripple key={i} x={markC.x} y={markC.y} p={(f - a) / 18} r0={60} r1={260 - i * 30} width={3} alpha={0.4} /> : null))}
      {ownLockup ? (
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transformOrigin: "0 0", transform: `scale(${BIG})` }}>
          <div style={{ transform: `scale(${k.scale * (1 + 0.04 * Math.max(...RING_AT.map((a) => (f >= a ? Math.max(0, 1 - (f - a) / 8) : 0))))})`, transformOrigin: "20px 20.8px" }}>
            <LabelBody word="Nest" p={p} wordT={pos.wordT} />
          </div>
        </div>
      ) : null}
      {dotR > 0.05 ? <MoneyDot x={CX} y={CY} r={dotR} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + (BIG * LABEL_H) / 2 + 48, display: "flex", justifyContent: "center" }}>
        <Reveal t={kw} out={kwOut}>
          <Pill size={T.l}><IcLeaf size={44} />Held in US dollars</Pill>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 3 owns the lockup until the fly; the ChapterLabel draws it after. */
export const S03Drop = () => <DropBody f={useF()} />;

