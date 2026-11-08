import React from "react";
import { AbsoluteFill } from "remotion";
import { MoneyDot, Ripple } from "../kit";
import { HALF_L, INFL_CARD as CARD } from "../layout";
import { ARC_C, arcAt, BA, CAM0, MapCam, MapLayer, MIAMI, toScreen } from "../map";
import { clamp01, drift, EASE_IN_OUT, hitIn, lerp, lineOut, lineT, pulse, PUSH, tAtLength, tween } from "../motion";
import { useF, useKick } from "../scene";
import { at, HIT, SC } from "../timeline";

/*
 * 1. Map (bars 0-3), the quiet intro, timed to Martha's v3 b01 (from the bar 1 downbeat): "My mom
 * lives in Buenos Aires. I live in Miami, and every month I send her what I can." The two ghost
 * cities breathe on the intro's first accent; Buenos Aires pops on "Buenos Aires", Miami on
 * "Miami"; the arc draws Miami -> Buenos Aires and lands on the intro's strongest accent; the money
 * dot pops in Miami on "every month", flies the arc on "send her" and lands in Buenos Aires on
 * "what I can". Last beat: the camera pushes into Buenos Aires and the money dot opens into
 * scene 2's left panel (scene 2 draws the opening).
 */

const Z_PUSH = 5;
const PUSH_FROM = SC.inflation.from - 12; // the last beat
const SWAP = SC.inflation.from - SC.inflation.swap;
/** Where Buenos Aires sits on screen when the push hands over: the left panel's centre. */
export const PUSH_END = { x: HALF_L, y: CARD.y + CARD.h / 2 };
/** The money dot's radius at the hand-over (it opens into the left panel). */
export const BA_R_AT_SWAP = 14 * Z_PUSH;

/** The map camera for local frame f (also used to place the dot during the hand-over). */
export const mapCam = (f: number): MapCam => {
  const d = drift(f);
  const t = tween(f, [PUSH_FROM, SWAP], [0, 1], PUSH);
  const z = d * lerp(1, Z_PUSH, t);
  const start = toScreen({ ...CAM0, z: d }, BA);
  const s = { x: lerp(start.x, PUSH_END.x, t), y: lerp(start.y, PUSH_END.y, t) };
  return { cx: BA.x - (s.x - 960) / z, cy: BA.y - (s.y - 540) / z, z };
};

export const MapBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const fade = 1 - tween(f, [PUSH_FROM, SWAP - 2], [0, 1], EASE_IN_OUT);
  const cam = mapCam(f);
  const ba = { pop: hitIn(f, HIT.baPop), label: lineT(f, HIT.baLabel), labelOut: lineOut(f, SWAP - 2), halo: clamp01((f - HIT.dotLands) / 20) };
  const miami = { pop: hitIn(f, HIT.miamiPop), label: lineT(f, HIT.miamiLabel), labelOut: lineOut(f, SWAP - 2) };
  const arc = tween(f, [HIT.arcFrom, HIT.arcLand], [0, 1], EASE_IN_OUT);
  // The money dot: pops in Miami, flies the arc (even speed), lands in Buenos Aires, pulses on the last beats.
  const fly = tween(f, [HIT.dotGo - 1, HIT.dotLands], [0, 1], EASE_IN_OUT);
  const pos = arcAt(tAtLength(MIAMI, ARC_C, BA, fly));
  const p = Math.max(pulse(f, HIT.dotIn, 10), pulse(f, HIT.dotLands, 10), pulse(f, at(3, 4), 10));
  const dotR = 14 * hitIn(f, HIT.dotIn) * (1 + 0.22 * p) * k.scale;
  const ghostP = f >= HIT.ghost - 1 && f < HIT.ghost + 22 ? (f - HIT.ghost + 2) / 24 : 0;
  return (
    <AbsoluteFill>
      <MapLayer cam={cam} grid={fade} gridGlow={k.glow} arc={arc} arcOpacity={fade} miami={miami} ba={ba} labels={1}>
        {ghostP > 0 ? [MIAMI, BA].map((c, i) => <Ripple key={i} x={c.x} y={c.y} p={ghostP} r0={6} r1={46} color="#17201A" alpha={0.28} width={2} />) : null}
        {f >= HIT.baPop && f < HIT.baPop + 22 ? <Ripple x={BA.x} y={BA.y} p={(f - HIT.baPop) / 22} r0={12} r1={70} color="#17201A" alpha={0.35} /> : null}
        {f >= HIT.miamiPop && f < HIT.miamiPop + 22 ? <Ripple x={MIAMI.x} y={MIAMI.y} p={(f - HIT.miamiPop) / 22} r0={12} r1={70} color="#17201A" alpha={0.35} /> : null}
        {f >= HIT.dotIn && f < HIT.dotIn + 20 ? <Ripple x={MIAMI.x} y={MIAMI.y} p={(f - HIT.dotIn) / 20} r0={16} r1={64} alpha={0.45} /> : null}
        {[HIT.dotLands, at(3, 4)].map((b) => (f >= b - 1 && f < b + 19 ? <Ripple key={b} x={BA.x} y={BA.y} p={(f - b + 2) / 21} r0={16} r1={80} alpha={0.55 * fade} width={4} /> : null))}
        <MoneyDot x={pos.x} y={pos.y} r={dotR} />
      </MapLayer>
    </AbsoluteFill>
  );
};

export const S01Map = () => <MapBody f={useF()} />;

/** Screen position of Buenos Aires at local frame f (for the match cut). */
export const baOnScreen = (f: number) => toScreen(mapCam(f), BA);
