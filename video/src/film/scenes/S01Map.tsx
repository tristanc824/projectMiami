import React from "react";
import { AbsoluteFill } from "remotion";
import { MoneyDot, Ripple } from "../kit";
import { HALF_L, INFL_CARD as CARD } from "../layout";
import { ARC_C, arcAt, BA, CAM0, MapCam, MapLayer, MIAMI, toScreen } from "../map";
import { CAM, clamp01, drift, EASE_IN_OUT, hitIn, lerp, lineOut, lineT, pulse, PUSH, tAtLength, tween } from "../motion";
import { useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";

/*
 * 1. The globe (bars 0-2), v4, under b01 (from bar 0 beat 2): "My mom lives in Buenos Aires. I live
 * in Miami, and every month I send her what I can." The Earth turns into place over the first beats
 * (the camera eases in from slightly wide); the Buenos Aires pin drops on "Buenos Aires", the Miami
 * pin on "Miami"; the arc draws Miami -> Buenos Aires; the money dot pops in Miami on "every month",
 * flies the arc on "send her" and lands in Buenos Aires on "what I can". Last beat: the camera
 * pushes into Buenos Aires and the money dot opens into scene 2's left panel.
 */

const Z_PUSH = 5;
const PUSH_FROM = SC.inflation.from - 14; // the last beat
const SWAP = SC.inflation.from - SC.inflation.swap;
/** Where Buenos Aires sits on screen when the push hands over: the left panel's centre. */
export const PUSH_END = { x: HALF_L, y: CARD.y + CARD.h / 2 };
/** The money dot's radius at the hand-over (it opens into the left panel). */
export const BA_R_AT_SWAP = 17 * Z_PUSH;
/** v4: the push goes into the Buenos Aires pin's head (moss, r 17), which opens into scene 2. */
const BA_HEAD = { x: BA.x, y: BA.y - 33 };

/** The map camera for local frame f (also used to place the dot during the hand-over). */
export const mapCam = (f: number): MapCam => {
  // v4: eases in from 0.9 over the first beats as the globe turns, then the usual slow drift.
  const d = drift(f) * lerp(0.9, 1, tween(f, [0, HIT.baPop], [0, 1], CAM));
  const t = tween(f, [PUSH_FROM, SWAP], [0, 1], PUSH);
  const z = d * lerp(1, Z_PUSH, t);
  const start = toScreen({ ...CAM0, z: d }, BA_HEAD);
  const s = { x: lerp(start.x, PUSH_END.x, t), y: lerp(start.y, PUSH_END.y, t) };
  return { cx: BA_HEAD.x - (s.x - 960) / z, cy: BA_HEAD.y - (s.y - 540) / z, z };
};

export const MapBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const fade = 1 - tween(f, [PUSH_FROM, SWAP - 2], [0, 1], EASE_IN_OUT);
  const cam = mapCam(f);
  const ba = { pop: hitIn(f, HIT.baPop) * (1 + 0.18 * pulse(f, HIT.dotLands, 12)), label: lineT(f, HIT.baLabel), labelOut: lineOut(f, SWAP - 2), halo: clamp01((f - HIT.dotLands) / 20) };
  const miami = { pop: hitIn(f, HIT.miamiPop), label: lineT(f, HIT.miamiLabel), labelOut: lineOut(f, SWAP - 2) };
  const arc = tween(f, [HIT.arcFrom, HIT.arcLand], [0, 1], EASE_IN_OUT);
  // The money dot: pops in Miami, flies the arc (even speed), lands in Buenos Aires, pulses on the last beats.
  const fly = tween(f, [HIT.dotGo - 1, HIT.dotLands], [0, 1], EASE_IN_OUT);
  const pos = arcAt(tAtLength(MIAMI, ARC_C, BA, fly));
  const p = Math.max(pulse(f, HIT.dotIn, 10), pulse(f, HIT.dotLands, 10));
  // The dot sinks into the Buenos Aires pin as it lands (the pin bounces).
  const dotR = 14 * hitIn(f, HIT.dotIn) * (1 + 0.22 * p) * k.scale * (1 - tween(f, [HIT.dotLands - 2, HIT.dotLands + 4], [0, 1], EASE_IN_OUT));
  // The Earth turns 70 degrees of longitude into its resting pose, settling as the first pin drops.
  const spin = 70 * (1 - tween(f, [0, HIT.baPop], [0, 1], CAM));
  const globeIn = tween(f, [0, 8], [0.75, 1], EASE_IN_OUT);
  return (
    <AbsoluteFill>
      <MapLayer cam={cam} grid={fade} gridGlow={k.glow} arc={arc} arcOpacity={fade} miami={miami} ba={ba} labels={1} spin={spin} globe={globeIn * fade}>
        {f >= HIT.baPop && f < HIT.baPop + 22 ? <Ripple x={BA.x} y={BA.y} p={(f - HIT.baPop) / 22} r0={12} r1={70} alpha={0.45} /> : null}
        {f >= HIT.miamiPop && f < HIT.miamiPop + 22 ? <Ripple x={MIAMI.x} y={MIAMI.y} p={(f - HIT.miamiPop) / 22} r0={12} r1={70} alpha={0.45} /> : null}
        {f >= HIT.dotIn && f < HIT.dotIn + 20 ? <Ripple x={MIAMI.x} y={MIAMI.y} p={(f - HIT.dotIn) / 20} r0={16} r1={64} alpha={0.45} /> : null}
        {[HIT.dotLands].map((b) => (f >= b - 1 && f < b + 19 ? <Ripple key={b} x={BA.x} y={BA.y} p={(f - b + 2) / 21} r0={16} r1={80} alpha={0.55 * fade} width={4} /> : null))}
        <MoneyDot x={pos.x} y={pos.y} r={dotR} />
      </MapLayer>
    </AbsoluteFill>
  );
};

export const S01Map = () => <MapBody f={useF()} />;

/** Screen position of Buenos Aires at local frame f (for the match cut). */
export const baOnScreen = (f: number) => toScreen(mapCam(f), BA);
