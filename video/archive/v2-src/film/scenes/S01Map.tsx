import React from "react";
import { AbsoluteFill } from "remotion";
import { MoneyDot, Ripple } from "../kit";
import { HALF_L, INFL_CARD as CARD } from "../layout";
import { BA, CAM0, MapCam, MapLayer, MIAMI, toScreen } from "../map";
import { clamp01, drift, EASE_IN_OUT, hitIn, lerp, lineOut, lineT, pulse, PUSH, tween } from "../motion";
import { useF, useKick } from "../scene";
import { at, HIT, SC } from "../timeline";

/*
 * 1. Map (bars 0-3), the quiet intro. Ordered to Ana's line ("My mom lives in Buenos Aires.
 * I live in Miami."): Buenos Aires pops on "Aires" (the intro's first accent), Miami on "Miami",
 * the arc draws Miami -> Buenos Aires and lands on the intro's strongest accent, then the money
 * dot waits in Miami, pulsing on every beat. Last beat: the camera pushes into Buenos Aires and the
 * dot opens into scene 2's left panel (scene 2 draws the opening).
 */

const Z_PUSH = 5;
const PUSH_FROM = SC.inflation.from - 12; // the last beat
const SWAP = SC.inflation.from - SC.inflation.swap;
/** Where Buenos Aires sits on screen when the push hands over: the left panel's centre. */
export const PUSH_END = { x: HALF_L, y: CARD.y + CARD.h / 2 };
export const BA_R_AT_SWAP = 11 * Z_PUSH;

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
  const ba = { pop: hitIn(f, HIT.baPop), label: lineT(f, HIT.baLabel), labelOut: lineOut(f, PUSH_FROM), halo: clamp01((f - HIT.arcLand) / 20) };
  const miami = { pop: hitIn(f, HIT.miamiPop), label: lineT(f, HIT.miamiLabel) };
  const arc = tween(f, [HIT.arcFrom, HIT.arcLand], [0, 1], EASE_IN_OUT);
  // The money dot: appears on bar 3, pulses on every beat of bar 3.
  const beats = [at(3, 1), at(3, 2), at(3, 3), at(3, 4)];
  const p = Math.max(...beats.map((b) => pulse(f, b, 10)));
  const dotR = 14 * hitIn(f, HIT.dotIn) * (1 + 0.22 * p) * k.scale;
  return (
    <AbsoluteFill>
      <MapLayer cam={cam} grid={fade} gridGlow={k.glow} arc={arc} arcOpacity={fade} miami={{ ...miami, labelOut: lineOut(f, PUSH_FROM) }} ba={ba} labels={1}>
        {f >= HIT.baPop && f < HIT.baPop + 22 ? <Ripple x={BA.x} y={BA.y} p={(f - HIT.baPop) / 22} r0={12} r1={70} color="#17201A" alpha={0.35} /> : null}
        {f >= HIT.miamiPop && f < HIT.miamiPop + 22 ? <Ripple x={MIAMI.x} y={MIAMI.y} p={(f - HIT.miamiPop) / 22} r0={12} r1={70} color="#17201A" alpha={0.35} /> : null}
        {beats.map((b) => (f >= b && f < b + 20 ? <Ripple key={b} x={MIAMI.x} y={MIAMI.y} p={(f - b) / 20} r0={16} r1={64} alpha={0.45 * fade} /> : null))}
        <MoneyDot x={MIAMI.x} y={MIAMI.y} r={dotR} opacity={fade} />
      </MapLayer>
    </AbsoluteFill>
  );
};

export const S01Map = () => <MapBody f={useF()} />;

/** Screen position of Buenos Aires at local frame f (for the match cut). */
export const baOnScreen = (f: number) => toScreen(mapCam(f), BA);
