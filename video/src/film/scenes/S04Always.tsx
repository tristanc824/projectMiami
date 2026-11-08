import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { IcClock } from "../icons";
import { Cam, DotGrid, FPhone, head, mix, PhoneAt, Pill, Reveal } from "../kit";
import { HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, EASE_IN_OUT, EASE_OUT, lerp, lineT, PUSH, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { beat, SC } from "../timeline";
import { FHome, HOME_CARD } from "../screens";

/*
 * 4. 24/7 (bars 11-12), v3 (design review M2): 2-up, the clock block centred in the left half, the
 * phone in the right half. Day turns to DUSK across both bars: the whole frame crossfades to a
 * dusk tint (slate blue to a warm horizon, not black), the sun sinks out of its slot above the
 * clock as the crescent moon settles into it, stars come up. No wipe crosses the phone. The
 * minutes tick on every beat (8:34 -> 8:41 PM), in step with the phone's status bar.
 */

const FROM = SC.always.from;
const B = (j: number) => beat(SC.always.bars[0] * 4 + j) - FROM;
const PH = phoneAt(HALF_R);
const SLOT = { x: HALF_L, y: 236 };

/** Dusk amount 0..1 at local frame f (the background). */
export const skyAt = (f: number) => tween(f, [B(0) + 4, B(7)], [0, 1], EASE_IN_OUT);
/** Text / label tone 0 (ink) .. 1 (white): flips in 6 frames landing on beat 4, when the sky is half dark, so text never goes grey-on-grey. */
export const duskAt = (f: number) => tween(f, [B(4) - 6, B(4)], [0, 1], EASE_IN_OUT);

const DUSK_BG = "linear-gradient(180deg, #27324A 0%, #3A4562 48%, #6E5E72 82%, #94767A 100%)";

const STARS: [number, number, number][] = [
  [180, 300, 2.2], [330, 470, 1.6], [760, 150, 2], [880, 330, 1.4], [1040, 190, 1.8], [1650, 120, 2.2], [1840, 280, 1.5],
  [70, 620, 1.6], [250, 860, 1.3], [1860, 700, 1.8], [820, 960, 1.4], [120, 1000, 2], [1010, 1030, 1.5],
  [640, 60, 1.4], [980, 700, 1.3], [1130, 80, 1.6], [560, 900, 1.2], [1100, 420, 1.3],
];

const Clock = ({ f, d }: { f: number; d: number }) => {
  const minuteItems = Array.from({ length: 8 }, (_, j) => ({ at: B(j), text: String(34 + j) }));
  let i = 0;
  for (let k = 0; k < minuteItems.length; k++) if (f >= minuteItems[k].at - 6) i = k;
  const t = i === 0 ? 1 : tween(f, [minuteItems[i].at - 6, minuteItems[i].at], [0, 1], EASE_OUT);
  const ink = mix(C.ink, "#FFFFFF", d);
  const sub = mix(C.ink4, "#C3CAD6", d);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", fontFamily: FONT }}>
      <Reveal t={lineT(f, -SC.always.swap)}><div style={head(T.l, sub)}>Sunday</div></Reveal>
      <Reveal t={lineT(f, -SC.always.swap, 0, 7)} style={{ marginTop: 8 }}>
        <div style={{ ...head(T.xxl, ink), display: "flex", alignItems: "baseline", fontVariantNumeric: "tabular-nums" }}>
          <span>8:</span>
          <span style={{ position: "relative", display: "inline-block", overflow: "hidden", height: "1.08em", verticalAlign: "bottom" }}>
            <span style={{ display: "block", transform: `translateY(${((1 - t) * 100).toFixed(2)}%)` }}>{minuteItems[i].text}</span>
            {i > 0 && t < 1 ? <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${(-t * 100).toFixed(2)}%)` }}>{minuteItems[i - 1].text}</span> : null}
          </span>
          <span style={{ fontSize: T.l, marginLeft: 18, letterSpacing: "-0.02em" }}>PM</span>
        </div>
      </Reveal>
      <Reveal t={lineT(f, -SC.always.swap, 0, 7)} style={{ marginTop: 32 }}>
        <Pill size={T.m} bg={mix(C.sage1, "#4C5772", d)} color={mix(C.moss, "#E4ECDF", d)}><IcClock size={30} />Open 24/7</Pill>
      </Reveal>
    </div>
  );
};

/** A crescent moon (SVG mask, so it works on any background). */
const Moon = ({ x, y, r, o }: { x: number; y: number; r: number; o: number }) => (
  <svg width={r * 4} height={r * 4} style={{ position: "absolute", left: x - r * 2, top: y - r * 2, opacity: o, overflow: "visible" }}>
    <defs>
      <mask id="crescent">
        <rect width={r * 4} height={r * 4} fill="#fff" />
        <circle cx={r * 2 + r * 0.72} cy={r * 2 - r * 0.38} r={r * 0.98} fill="#000" />
      </mask>
    </defs>
    <circle cx={r * 2} cy={r * 2} r={r * 1.9} fill="rgba(237,230,211,0.10)" />
    <circle cx={r * 2} cy={r * 2} r={r} fill="#EDE6D3" mask="url(#crescent)" />
  </svg>
);

export const AlwaysBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const d = skyAt(f);
  const ink = duskAt(f);
  const minute = Math.min(7, Math.max(0, [0, 1, 2, 3, 4, 5, 6, 7].filter((j) => f >= B(j)).length - 1));
  // The sun sinks out of the slot above the clock; the moon settles into it.
  const sunT = tween(f, [B(0) + 4, B(5)], [0, 1], EASE_IN_OUT);
  const moonT = tween(f, [B(3), B(7)], [0, 1], EASE_OUT);
  // Incoming: the push from Mamá's phone lands on this phone. Outgoing: push into the balance card.
  const inT = tween(f, [-SC.always.swap, 0], [0, 1], CAM);
  const outT = tween(f, [SC.always.dur - 12, SC.always.dur - SC.send.swap], [0, 1], PUSH);
  const card = onPhone(PH, HOME_CARD.x, HOME_CARD.y);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Cam z={lerp(0.86, 1, inT) * (1 + 3 * outT)} ox={outT > 0 ? card.x : HALF_R} oy={outT > 0 ? card.y : 540} blur={(1 - inT) * 10 + outT * 12}>
        <AbsoluteFill style={{ background: DUSK_BG, opacity: d }} />
        <Drift f={f}>
          <DotGrid glow={k.glow} opacity={1 - d} />
          <DotGrid color="#FFFFFF" alpha={0.07} opacity={d} />
          {STARS.map(([x, y, r], i) => (
            <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "#fff", opacity: d * d * (0.35 + 0.3 * Math.sin(f / 5 + i * 1.3)) }} />
          ))}
          <div
            style={{
              position: "absolute", left: SLOT.x - 48, top: SLOT.y - 48 + 150 * sunT, width: 96, height: 96, borderRadius: "50%", background: mix("#EBC47A", "#E79A6A", sunT),
              boxShadow: "0 0 0 18px rgba(235,196,122,0.18), 0 0 90px rgba(235,196,122,0.55)", opacity: 1 - sunT, transform: `scale(${1 - 0.25 * sunT})`,
            }}
          />
          <Moon x={SLOT.x} y={SLOT.y - 70 * (1 - moonT)} r={42} o={moonT} />
          <div style={{ position: "absolute", left: 0, width: HALF_L * 2, top: 0, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: `scale(${k.scale})` }}><Clock f={f} d={ink} /></div>
          </div>
          <PhoneAt x={PH.x} y={PH.y}>
            <FPhone time={`8:${34 + minute}`}><FHome /></FPhone>
          </PhoneAt>
        </Drift>
      </Cam>
    </AbsoluteFill>
  );
};

export const S04Always = () => <AlwaysBody f={useF()} />;
