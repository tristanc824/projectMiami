import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../../theme";
import { Flock } from "../../ui/Birds";
import { body, Cam, head, LabelBody, mix, MoneyDot, Reveal, Ripple } from "../kit";
import { CX, CY, MARGIN, T } from "../layout";
import { BIG, LABEL_H, lockCentred, markCentred } from "../lockup";
import { ARC_C, arcAt, BA, GLOBE, MapLayer, MIAMI } from "../map";
import { CAM, clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, kick, lerp, lineOut, lineT, pulse, Pt, springAt, tAtLength, tween } from "../motion";
import { useF } from "../scene";
import { at, FILM_FRAMES, HIT, SC } from "../timeline";

/*
 * 12. Close (bars 34-36 + the final beat), v4. Caleb on v3: the arc-to-logo was "really good, just a
 * little slow"; finish on the website's hero; never sit on a still for ~3 s; end crisply.
 *  - bar 34: pull back to the globe; the money dot flies Miami -> Buenos Aires one last time
 *    ("No bank holds or lends our money").
 *  - bar 35 beat 1 ("That's why..."): the globe sinks away and the arc plus two more (the map arc
 *    rotated 120° apart) sweep straight into the three rings, landing on beat 3 ("...use Nest") with
 *    a spring and a ripple; the wordmark masks in on beat 4. No pause between the moves.
 *  - beat 4 -> bar 36: the website hero opens from the mark (iris): the meadow photo, the birds,
 *    "Protect what matters." (on the spoken words), the lockup flying into the hero's top-left in
 *    white. The photo keeps pushing and the birds keep crossing, so nothing is still; the film ends
 *    on the next drop hit, one beat later. The disclaimer sits on the hero from its first frame.
 */

/** [TEAM: URL] The site address for the end card. Empty = the line (and its space) is hidden. */
export const END_URL = "";

const FROM = SC.close.from;
const L = (abs: number) => abs - FROM;
const END = FILM_FRAMES - FROM;
const LOCK_CY = CY;
const N = 120;
/** Mark units -> screen px at the film's big lockup scale. */
const U = (BIG * 40) / 64; // 2.5
const RINGS = [
  { cx: 23, cy: 32, rot: 90 },
  { cx: 36.5, cy: 24.206, rot: 210 },
  { cx: 36.5, cy: 39.794, rot: 330 },
];
/** Arc k (the map arc rotated by k*120° about the chord's midpoint) closes into ring ARC_TO_RING[k]. */
const ARC_TO_RING = [1, 2, 0];
const PIVOT: Pt = { x: (MIAMI.x + BA.x) / 2 + 40, y: (MIAMI.y + BA.y) / 2 };

const rot = (p: Pt, a: number, c: Pt = PIVOT): Pt => {
  const r = (a * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
};
const ARC_PTS = Array.from({ length: N + 1 }, (_, j) => arcAt(tAtLength(MIAMI, ARC_C, BA, j / N)));
const arcPt = (k: number, j: number) => rot(ARC_PTS[j], k * 120);
const bulge = (k: number) => {
  const m = arcPt(k, N / 2);
  const d = Math.hypot(m.x - PIVOT.x, m.y - PIVOT.y);
  return { x: (m.x - PIVOT.x) / d, y: (m.y - PIVOT.y) / d };
};
const ringU = (i: number, th: number): Pt => {
  const R = RINGS[i];
  const r = (R.rot * Math.PI) / 180;
  const ex = 18 * Math.cos(th);
  const ey = 14 * Math.sin(th);
  return { x: R.cx + ex * Math.cos(r) - ey * Math.sin(r), y: R.cy + ex * Math.sin(r) + ey * Math.cos(r) };
};
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

/** The hero's lockup: top-left, white, on the 120 px margin. */
const HERO_LOCK = { x: MARGIN, y: 92, s: 1.6 };

export const CloseBody = ({ f }: { f: number }) => {
  const k = kick(FROM + f, FROM, FROM + END);
  const inT = tween(f, [-SC.close.swap, 0], [0, 1], CAM);
  const beatP = Math.max(pulse(f, 0, 12), pulse(f, L(at(34, 2)) - 14, 12));
  // The globe sinks away as the arcs take over (no pause: the sweep starts as the new arcs draw).
  const away = tween(f, [L(HIT.arcsIn) - 2, L(HIT.arcsIn) + 16], [0, 1], EASE_IN_OUT);
  const city = { pop: 1, label: 1, labelOut: lineOut(f, L(HIT.arcsIn) + 2), o: 1 - away };
  const fly = tween(f, [L(HIT.dotGo2) - 1, L(HIT.dotLands2)], [0, 1], EASE_IN_OUT);
  const arcsIn = tween(f, [L(HIT.arcsIn) - 1, L(HIT.arcsIn) + 10], [0, 1], EASE_OUT);
  const u = tween(f, [L(HIT.arcsIn) + 2, L(HIT.rings)], [0, 1], EASE_IN_OUT);
  // Lockup: mark centred, slides left as the word masks in, then flies into the hero's corner in white.
  const slide = tween(f, [L(HIT.word2) - 1, L(HIT.word2) + 9], [0, 1], EASE_OUT);
  const heroT = tween(f, [L(HIT.word2) + 2, L(HIT.hero)], [0, 1], EASE_IN_OUT);
  const a = markCentred(CX, LOCK_CY);
  const b = lockCentred(CX, LOCK_CY);
  const lockScale = lerp(BIG, HERO_LOCK.s, heroT);
  const pos0 = { x: lerp(a.x, b.x, slide), y: a.y };
  const pos = { x: lerp(pos0.x, HERO_LOCK.x, heroT), y: lerp(pos0.y, HERO_LOCK.y, heroT) };
  const markC = { x: pos.x + lockScale * 20, y: pos.y + lockScale * (LABEL_H / 2) };
  const spring = f < L(HIT.rings) - 1 ? 0.9 : 0.9 + 0.1 * springAt(f - L(HIT.rings) + 2, 9, 260);
  const scl = spring;
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
  const handOff = L(HIT.word2) + 2; // the morph draws the rings until the lockup takes them into the hero
  const showArcs = f >= L(HIT.arcsIn) - 1 && f < handOff;
  const dotAt = f < L(HIT.arcsIn) ? arcAt(tAtLength(MIAMI, ARC_C, BA, fly)) : shapes[0][N];
  const dotR = 14 * (1 + 0.2 * beatP) * (f < L(HIT.arcsIn) ? 1 : 1 - tween(f, [L(HIT.arcsIn), L(HIT.rings) - 4], [0, 1], EASE_IN));
  const wordT = tween(f, [L(HIT.word2) - 1, L(HIT.word2) + 8], [0, 1], EASE_OUT);
  // The hero: an iris from the mark, a slow push and the birds; white type bottom-left.
  const iris = tween(f, [L(HIT.word2) + 2, L(HIT.hero)], [0, 1], EASE_IN);
  const irisR = lerp(0, 2300, iris);
  const push = tween(f, [L(HIT.word2), END], [1.12, 1.0], (t) => 1 - Math.pow(1 - t, 1.6));
  const endHit = f >= L(HIT.end) ? Math.max(0, 1 - (f - L(HIT.end)) / 10) : 0;
  const white = heroT;
  const showHero = f >= L(HIT.word2) + 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {f < L(HIT.hero) ? (
        <Cam z={lerp(1.25, 1, inT)} blur={(1 - inT) * 10}>
          <AbsoluteFill style={{ transformOrigin: `${GLOBE.cx}px ${GLOBE.cy}px`, transform: `scale(${lerp(1, 0.82, away)})`, opacity: 1 - away }}>
            <MapLayer arc={1} arcOpacity={0} glow={0.45 + 0.4 * beatP} gridGlow={k.glow} miami={city} ba={{ ...city, halo: f >= L(HIT.dotLands2) ? clamp01((f - L(HIT.dotLands2)) / 20) : 0 }} />
          </AbsoluteFill>
        </Cam>
      ) : null}
      {showArcs ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g fill="none" stroke={C.moss} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            {shapes.map((pts, kk) => {
              const d = "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L");
              return <path key={kk} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={kk === 0 ? 0 : 1 - arcsIn} />;
            })}
          </g>
        </svg>
      ) : null}
      {f < L(HIT.rings) && dotR > 0.05 ? <MoneyDot x={dotAt.x} y={dotAt.y} r={dotR} /> : null}
      {f >= L(HIT.rings) && f < L(HIT.rings) + 20 ? <Ripple x={markC.x} y={markC.y} p={(f - L(HIT.rings)) / 20} r0={100} r1={360} width={4} alpha={0.45} /> : null}
      {showHero ? (
        <AbsoluteFill style={{ clipPath: iris < 1 ? `circle(${irisR.toFixed(1)}px at ${CX}px ${LOCK_CY}px)` : undefined }}>
          <AbsoluteFill style={{ background: C.page }} />
          <div style={{ position: "absolute", left: 20, top: 20, right: 20, bottom: 20, borderRadius: 44, overflow: "hidden", background: "#C9DCE6" }}>
            <Img src={staticFile("meadow.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 72%", filter: `saturate(1.12) brightness(${(1.06 + 0.05 * endHit).toFixed(3)})`, transform: `scale(${push.toFixed(4)})`, transformOrigin: "50% 60%" }} />
            <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(16,26,19,0.62), rgba(16,26,19,0.08) 55%, rgba(16,26,19,0) 75%)" }} />
            <Flock tone="#1C2A22" start={330 - (L(HIT.word2) + SC.close.swap)} height={1040} />
            <div style={{ position: "absolute", left: MARGIN - 20, bottom: 168, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <Reveal t={lineT(f, L(HIT.hero))}><div style={{ ...head(T.xxl, "#FFFFFF"), letterSpacing: "-0.045em", transform: `scale(${1 + 0.012 * endHit})`, transformOrigin: "0 100%" }}>Protect what matters.</div></Reveal>
              <Reveal t={lineT(f, L(HIT.hero), 1)} style={{ marginTop: 22 }}><div style={body(T.m, "rgba(255,255,255,0.88)")}>US dollars, in your own account.</div></Reveal>
              {END_URL ? <Reveal t={lineT(f, L(HIT.hero), 2)} style={{ marginTop: 14 }}><div style={head(T.m, "#FFFFFF")}>{END_URL}</div></Reveal> : null}
            </div>
            <div style={{ position: "absolute", left: MARGIN - 20, right: MARGIN - 20, bottom: 64, display: "flex", justifyContent: "flex-start" }}>
              <Reveal t={lineT(f, L(HIT.hero), 2)}>
                <div style={body(T.s, "rgba(255,255,255,0.78)")}>Live on Solana devnet with test USDC. Ana and her mom are an illustrative story.</div>
              </Reveal>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
      {f >= L(HIT.rings) - 1 ? (
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transformOrigin: "0 0", transform: `scale(${lockScale.toFixed(4)})` }}>
          <LabelBody word="Nest" p={f < handOff ? [0, 0, 0] : [1, 1, 1]} wordT={wordT} color={mix(C.moss, "#FFFFFF", white)} wordColor={mix(C.ink, "#FFFFFF", white)} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const S12Close = () => <CloseBody f={useF()} />;
