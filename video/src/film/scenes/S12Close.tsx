import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { body, Cam, head, LabelBody, MoneyDot, Reveal, Ripple } from "../kit";
import { CX, CY, T } from "../layout";
import { BIG, LABEL_H, lockCentred, markCentred } from "../lockup";
import { ARC_C, arcAt, BA, MapLayer, MIAMI } from "../map";
import { CAM, clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, kick, lerp, lineOut, lineT, pulse, Pt, springAt, tAtLength, tween } from "../motion";
import { useF } from "../scene";
import { at, HIT, SC } from "../timeline";

/*
 * 12. Close (bars 36-39) and 13. End card (bars 40-41) as one shot, v3 (Caleb: "you could do way
 * better than that weird logo animation"). The brand is built from the film's own story:
 *  - bar 36: pull back to the map; the money dot waits in Miami, pulsing.
 *  - bar 37: it flies the Miami -> Buenos Aires arc one last time.
 *  - bar 38 beat 3: the arc turns solid and two more arcs draw in, rotated 120° apart about the
 *    centre (the cities fade back to their ghost dots: frame 0's composition).
 *  - bar 39: the three arcs sweep and close into the three interlocking rings of the Nest mark,
 *    landing on the bar 40 downbeat (81.456 s, on "...use Nest") with a spring, a ripple and the
 *    music's phrase downbeat. The wordmark masks in on the next beat with the disclaimer;
 *    "Protect what matters." lands on its spoken words; bar 41: "US dollars, in your own account."
 *  - the last 12 frames ease everything out to frame 0 (page, dot grid, the two ghost cities).
 * No photographic meadow (it fought the flat style).
 */

/** [TEAM: URL] The site address for the end card. Empty = the line (and its space) is hidden. */
export const END_URL = "";

const FROM = SC.close.from;
const L = (abs: number) => abs - FROM;
const END = SC.close.dur + SC.end.dur; // 294
const LOCK_CY = 430;
const BEATS36 = [at(36, 1), at(36, 2), at(36, 3), at(36, 4)].map(L);
const N = 120;
/** Mark units -> screen px at the film's big lockup scale. */
const U = (BIG * 40) / 64; // 2.5
const RINGS = [
  { cx: 23, cy: 32, rot: 90 },
  { cx: 36.5, cy: 24.206, rot: 210 },
  { cx: 36.5, cy: 39.794, rot: 330 },
];
/** Arc k (the map arc rotated by k*120° about the centre) closes into ring ARC_TO_RING[k]. */
const ARC_TO_RING = [1, 2, 0];

const rot = (p: Pt, a: number, c: Pt = { x: CX, y: CY }): Pt => {
  const r = (a * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
};
/** Arc k at arc-length fraction s (even spacing, so the morph doesn't bunch). */
const ARC_PTS = Array.from({ length: N + 1 }, (_, j) => arcAt(tAtLength(MIAMI, ARC_C, BA, j / N)));
const arcPt = (k: number, j: number) => rot(ARC_PTS[j], k * 120);
/** Bulge direction of arc k (unit vector from the centre to its midpoint). */
const bulge = (k: number) => {
  const m = arcPt(k, N / 2);
  const d = Math.hypot(m.x - CX, m.y - CY);
  return { x: (m.x - CX) / d, y: (m.y - CY) / d };
};
/** Ring i's point at angle th, in mark units. */
const ringU = (i: number, th: number): Pt => {
  const R = RINGS[i];
  const r = (R.rot * Math.PI) / 180;
  const ex = 18 * Math.cos(th);
  const ey = 14 * Math.sin(th);
  return { x: R.cx + ex * Math.cos(r) - ey * Math.sin(r), y: R.cy + ex * Math.sin(r) + ey * Math.cos(r) };
};
/** For each arc: the ring angle whose point is furthest along the arc's bulge (the arc's midpoint maps there). */
const TH_OUT = [0, 1, 2].map((k) => {
  const i = ARC_TO_RING[k];
  const b = bulge(k);
  let best = 0;
  let bv = -1e9;
  for (let a = 0; a < 360; a += 1) {
    const th = (a * Math.PI) / 180;
    const p = ringU(i, th);
    const v = (p.x - 32) * b.x + (p.y - 32) * b.y;
    if (v > bv) {
      bv = v;
      best = th;
    }
  }
  return best;
});

export const CloseBody = ({ f }: { f: number }) => {
  const k = kick(FROM + f, FROM, FROM + END);
  const inT = tween(f, [-SC.close.swap, 0], [0, 1], CAM);
  const out = tween(f, [L(HIT.loopFrom), END - 1], [0, 1], EASE_IN_OUT);
  const beatP = Math.max(...BEATS36.map((b) => pulse(f, b, 12)));
  // Cities: full until the arcs come in, then back to frame 0's ghost dots.
  const ghost = tween(f, [L(HIT.arcsIn), L(HIT.arcsIn) + 12], [0, 1], EASE_IN_OUT);
  // The ghost cities hide while the end card holds (no stray dots, M3) and return for the loop.
  const cityO = 1 - tween(f, [L(HIT.sweep), L(HIT.rings)], [0, 1], EASE_IN_OUT) + tween(f, [L(HIT.loopFrom), END - 1], [0, 1], EASE_IN_OUT);
  const city = { pop: 1 - ghost, label: 1, labelOut: lineOut(f, L(HIT.arcsIn) + 4), o: cityO };
  // The money dot: Miami -> Buenos Aires once more, then rides arc 0's end into the ring.
  const fly = tween(f, [L(HIT.dotGo2) - 1, L(HIT.dotLands2)], [0, 1], EASE_IN_OUT);
  // The morph: 0 = three map-size arcs, 1 = the mark (landing exactly on the bar 40 downbeat).
  const u = tween(f, [L(HIT.sweep), L(HIT.rings)], [0, 1], EASE_IN_OUT);
  const arcsIn = tween(f, [L(HIT.arcsIn) - 1, L(HIT.arcsIn) + 14], [0, 1], EASE_OUT);
  // Lockup position (mark centred, then slides left as the wordmark masks in) and the landing spring.
  const slide = tween(f, [L(HIT.word2) - 1, L(HIT.word2) + 10], [0, 1], EASE_OUT);
  const a = markCentred(CX, LOCK_CY);
  const b = lockCentred(CX, LOCK_CY);
  const pos = { x: lerp(a.x, b.x, slide), y: a.y };
  const markC = { x: pos.x + BIG * 20, y: pos.y + BIG * (LABEL_H / 2) };
  const spring = f < L(HIT.rings) - 1 ? 0.9 : 0.9 + 0.1 * springAt(f - L(HIT.rings) + 2, 9, 260);
  const scl = spring * (f >= L(HIT.rings) + 12 ? k.scale : 1);
  const ringPt = (i: number, th: number): Pt => {
    const p = ringU(i, th);
    return { x: markC.x + (p.x - 32) * U * scl, y: markC.y + (p.y - 32) * U * scl };
  };
  const shapes = [0, 1, 2].map((kk) => {
    const i = ARC_TO_RING[kk];
    const pts: Pt[] = [];
    for (let j = 0; j <= N; j++) {
      const A = arcPt(kk, j);
      const E = ringPt(i, TH_OUT[kk] + (j / N - 0.5) * 2 * Math.PI);
      pts.push({ x: lerp(A.x, E.x, u), y: lerp(A.y, E.y, u) });
    }
    return pts;
  });
  const sw = lerp(5, 5.5 * U * scl, u);
  const showArcs = f >= L(HIT.arcsIn) - 1;
  const dotAt = f < L(HIT.sweep) ? arcAt(tAtLength(MIAMI, ARC_C, BA, fly)) : shapes[0][N];
  const dotR = 14 * (1 + 0.2 * beatP) * (f < L(HIT.sweep) ? 1 : 1 - tween(f, [L(HIT.sweep), L(HIT.rings) - 2], [0, 1], EASE_IN));
  const wordT = tween(f, [L(HIT.word2) - 1, L(HIT.word2) + 8], [0, 1], EASE_OUT);
  const textIn = (at: number, i = 0) => lineT(f, at, i);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Cam z={lerp(1.25, 1, inT)} blur={(1 - inT) * 10}>
        <MapLayer
          arc={1} arcOpacity={1 - arcsIn} glow={f < L(HIT.arcsIn) ? 0.35 + 0.5 * beatP : 0} gridGlow={k.glow}
          miami={city} ba={{ ...city, halo: f >= L(HIT.dotLands2) ? clamp01((f - L(HIT.dotLands2)) / 20) : 0 }}
        >
          {f < L(HIT.dotGo2) ? BEATS36.map((bb) => (f >= bb && f < bb + 20 ? <Ripple key={bb} x={MIAMI.x} y={MIAMI.y} p={(f - bb) / 20} r0={16} r1={64} alpha={0.45} /> : null)) : null}
        </MapLayer>
      </Cam>
      {showArcs ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - out }}>
          <g fill="none" stroke={C.moss} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            {shapes.map((pts, kk) => {
              const d = "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L");
              // Arc 0 is the map arc turning solid; arcs 1 and 2 draw in.
              return <path key={kk} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={kk === 0 ? 0 : 1 - arcsIn} opacity={kk === 0 ? arcsIn : 1} />;
            })}
          </g>
        </svg>
      ) : null}
      {f < L(HIT.rings) && dotR > 0.05 ? <MoneyDot x={dotAt.x} y={dotAt.y} r={dotR} /> : null}
      {f >= L(HIT.rings) && f < L(HIT.rings) + 22 ? <Ripple x={markC.x} y={markC.y} p={(f - L(HIT.rings)) / 22} r0={100} r1={340} width={4} alpha={0.4} /> : null}
      {f >= L(HIT.rings) - 1 ? (
        <AbsoluteFill style={{ opacity: 1 - out }}>
          <div style={{ position: "absolute", left: pos.x, top: pos.y, transformOrigin: "0 0", transform: `scale(${BIG})` }}>
            <LabelBody word="Nest" p={[0, 0, 0]} wordT={wordT} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: LOCK_CY + (BIG * LABEL_H) / 2 + 44, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Reveal t={textIn(L(HIT.tagline))}><div style={head(T.xl)}>Protect what matters.</div></Reveal>
            <Reveal t={textIn(L(HIT.position))} style={{ marginTop: 22 }}><div style={body(T.m, C.ink6)}>US dollars, in your own account.</div></Reveal>
            {END_URL ? <Reveal t={textIn(L(HIT.position), 1)} style={{ marginTop: 18 }}><div style={head(T.m, C.moss)}>{END_URL}</div></Reveal> : null}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 958, display: "flex", justifyContent: "center" }}>
            <Reveal t={textIn(L(HIT.word2), 1)}>
              <div style={body(26, C.ink4)}>Live on Solana devnet with test USDC. Ana and her mom are an illustrative story.</div>
            </Reveal>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const S12Close = () => <CloseBody f={useF()} />;
export const S13End = () => <CloseBody f={useF() + SC.close.dur} />;
