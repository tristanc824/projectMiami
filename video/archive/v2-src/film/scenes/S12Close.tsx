import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../../theme";
import { Flock } from "../../ui/Birds";
import { body, Cam, head, LabelBody, MoneyDot, Reveal, Ripple } from "../kit";
import { CX, T } from "../layout";
import { BIG, LABEL_H, lockCentred, markCentred } from "../lockup";
import { BA, CAM0, MapLayer, toScreen } from "../map";
import { CAM, EASE_IN, EASE_IN_OUT, EASE_OUT, lerp, lineOut, lineT, pulse, tween } from "../motion";
import { useF, useKick } from "../scene";
import { at, HIT, SC } from "../timeline";

/*
 * 12. Close (bars 36-39) and 13. End card (bars 40-41) as one shot. Pull back to the map: the dot
 * waits in Buenos Aires, the arc glows on the beat. The meadow and birds wash in; on "That's why we
 * use Nest" the dot lifts into the centre and the rings land on beats 2-4 of bar 37 (white), the
 * wordmark with ring 3; "Protect what matters." on bar 38. Bar 40: the Solana line. Bar 41:
 * everything eases back to frame 0's composition (page, faint grid, the two ghost city dots), so the
 * film loops.
 */

/** [TEAM: URL] The site address for the end card. Empty = the line is hidden. */
export const END_URL = "";

const FROM = SC.close.from;
const L = (abs: number) => abs - FROM;
const LOCK_CY = 452;
const RING_AT = [L(HIT.closeRing1), L(HIT.closeRing2), L(HIT.closeRing3)];
const WORD_AT = L(HIT.closeRing3);
const BEATS36 = [at(36, 1), at(36, 2), at(36, 3), at(36, 4)].map(L);
const LOOP = L(HIT.loopFrom);
const END = SC.close.dur + SC.end.dur; // 294

export const CloseBody = ({ f }: { f: number }) => {
  const k = useKick(Math.min(f, SC.close.dur - 1));
  const inT = tween(f, [-SC.close.swap, 0], [0, 1], CAM);
  const wash = tween(f, [BEATS36[1], L(HIT.lift)], [0, 1], EASE_IN_OUT) * (1 - tween(f, [LOOP, END - 10], [0, 1], EASE_IN_OUT));
  const tone = tween(f, [BEATS36[3], L(HIT.lift)], [0, 1]);
  const mapOut = 1 - tween(f, [L(HIT.lift), L(HIT.lift) + 12], [0, 1], EASE_IN);
  const ghostIn = tween(f, [LOOP + 10, END - 10], [0, 1], EASE_IN_OUT);
  const beatP = Math.max(...BEATS36.map((b) => pulse(f, b, 12)));
  const glow = f < L(HIT.lift) ? 0.45 + 0.55 * beatP : 0;
  // The dot: waits in Buenos Aires, lifts to the mark's centre, becomes the mark.
  const baS = toScreen(CAM0, BA);
  const lift = tween(f, [L(HIT.lift), RING_AT[0]], [0, 1], EASE_IN_OUT);
  const markX = lerp(CX, lockCentred(CX, LOCK_CY).x + (BIG * 40) / 2, tween(f, [WORD_AT, WORD_AT + 10], [0, 1], EASE_OUT));
  const dot = { x: lerp(baS.x, CX, lift), y: lerp(baS.y, LOCK_CY, lift) - Math.sin(Math.PI * lift) * 110 };
  const dotR = 14 * (1 + 0.2 * beatP) * (1 - tween(f, [RING_AT[0], RING_AT[0] + 8], [0, 1], EASE_OUT));
  const p = RING_AT.map((a) => tween(f, [a - 1, a + 7], [0, 1], EASE_OUT));
  const wordT = tween(f, [WORD_AT, WORD_AT + 9], [0, 1], EASE_OUT);
  const pos = { x: lerp(markCentred(CX, LOCK_CY).x, lockCentred(CX, LOCK_CY).x, tween(f, [WORD_AT, WORD_AT + 10], [0, 1], EASE_OUT)), y: markCentred(CX, LOCK_CY).y };
  const textOut = lineOut(f, LOOP);
  const lockOut = tween(f, [LOOP, LOOP + 10], [0, 1], EASE_IN);
  const mask = `linear-gradient(to top, #000 ${(wash * 140 - 40).toFixed(2)}%, rgba(0,0,0,0) ${(wash * 140).toFixed(2)}%)`;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* the map (pull-back lands on bar 36) */}
      <Cam z={lerp(1.25, 1, inT)} blur={(1 - inT) * 10}>
        <AbsoluteFill style={{ opacity: mapOut }}>
          <MapLayer arc={1} glow={glow} tone={tone} grid={1 - wash} gridGlow={k.glow} miami={{ pop: 1, label: 1 }} ba={{ pop: 1, label: 1 }}>
            {f < L(HIT.lift) ? BEATS36.map((b) => (f >= b && f < b + 20 ? <Ripple key={b} x={BA.x} y={BA.y} p={(f - b) / 20} r0={16} r1={64} color={tone > 0.5 ? "#FFFFFF" : C.moss} alpha={0.45} /> : null)) : null}
          </MapLayer>
        </AbsoluteFill>
      </Cam>
      {/* the loop: frame 0's composition fades back in under the receding meadow */}
      {ghostIn > 0 ? (
        <AbsoluteFill style={{ opacity: ghostIn }}>
          <MapLayer arc={0} miami={{ pop: 0, label: 0 }} ba={{ pop: 0, label: 0 }} />
        </AbsoluteFill>
      ) : null}
      {/* meadow and birds */}
      {wash > 0.001 ? (
        <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, background: C.moss9, overflow: "hidden" }}>
          <Img src={staticFile("meadow.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 72%", transform: `scale(${tween(f, [0, END], [1.04, 1.1], (t) => t)})` }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,24,16,0.34) 0%, rgba(10,24,16,0.08) 45%, rgba(10,24,16,0.12) 70%, rgba(10,24,16,0.58) 100%)" }} />
          <Flock start={200} tone="#1C2A22" height={1080} scale={0.85} style={{ opacity: 0.8 }} />
        </AbsoluteFill>
      ) : null}
      {f < RING_AT[0] + 8 ? <MoneyDot x={f < L(HIT.lift) ? baS.x : dot.x} y={f < L(HIT.lift) ? baS.y : dot.y} r={dotR} ring={tone > 0.5} /> : null}
      {RING_AT.map((a, i) => (f >= a && f < a + 18 ? <Ripple key={i} x={markX} y={LOCK_CY} p={(f - a) / 18} r0={60} r1={250 - i * 30} color="#FFFFFF" width={3} alpha={0.45} /> : null))}
      {f >= RING_AT[0] ? (
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transformOrigin: "0 0", transform: `scale(${BIG})`, opacity: 1 - lockOut, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.18))" }}>
          <div style={{ transform: `scale(${k.scale})`, transformOrigin: "20px 20.8px" }}>
            <LabelBody word="Nest" p={p} wordT={wordT} color="#FFFFFF" wordColor="#FFFFFF" />
          </div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: LOCK_CY + (BIG * LABEL_H) / 2 + 40, display: "flex", flexDirection: "column", alignItems: "center", textShadow: "0 2px 24px rgba(10,22,14,0.35)" }}>
        <Reveal t={lineT(f, L(HIT.tagline))} out={textOut}><div style={head(T.xl, "#FFFFFF")}>Protect what matters.</div></Reveal>
        {END_URL ? <Reveal t={lineT(f, L(HIT.endLine))} out={textOut} style={{ marginTop: 20 }}><div style={body(T.l, "rgba(255,255,255,0.92)")}>{END_URL}</div></Reveal> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 984, display: "flex", justifyContent: "center", textShadow: "0 1px 12px rgba(0,0,0,0.35)" }}>
        <Reveal t={lineT(f, L(HIT.endLine), 1)} out={textOut}>
          <div style={body(T.s, "rgba(255,255,255,0.88)")}>Live on Solana devnet with test USDC. Ana and her mom are an illustrative story.</div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

export const S12Close = () => <CloseBody f={useF()} />;
export const S13End = () => <CloseBody f={useF() + SC.close.dur} />;
