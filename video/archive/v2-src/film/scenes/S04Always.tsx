import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { IcClock } from "../icons";
import { Cam, DotGrid, FPhone, head, PhoneAt, Pill, Reveal } from "../kit";
import { HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, EASE_IN_OUT, EASE_OUT, lerp, lineT, PUSH, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { beat, SC } from "../timeline";
import { FHome, HOME_CARD } from "../screens";

/*
 * 4. 24/7 (bars 11-12). 2-up: the clock block centred in the left half, the phone in the right.
 * A day-to-night sweep across both bars: the terminator is a line through a pivot under the clock,
 * rotating 180°, so night rises from the left and covers the frame; the sun sets behind the phone
 * and the moon rises to rest above the clock, fully in frame. The minutes tick on every beat
 * (8:34 -> 8:41 PM), in step with the phone's status bar. Text and label flip colour exactly along
 * the terminator (each is drawn twice, clipped to its half-plane).
 */

const FROM = SC.always.from;
const B = (j: number) => beat(44 + j) - FROM;
const PIVOT = { x: HALF_L, y: 1420 };
const R = 1200;
export const NIGHT_SKY = "#16231C";
const PH = phoneAt(HALF_R);

/** Sweep angle in degrees at local frame f. */
const theta = (f: number) => 180 * tween(f, [B(0) + 4, B(7)], [0, 1], EASE_IN_OUT);

type V = [number, number];
const clip = (poly: V[], n: V, sign: number): V[] => {
  const s = (p: V) => sign * ((p[0] - PIVOT.x) * n[0] + (p[1] - PIVOT.y) * n[1]);
  const out: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = s(a);
    const sb = s(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};

/** CSS clip-path polygons (screen px) for the night and the day half-planes at local frame f. */
export const halves = (f: number) => {
  const th = (theta(f) * Math.PI) / 180;
  const n: V = [Math.sin(th), -Math.cos(th)]; // day side normal
  const rect: V[] = [[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]];
  const css = (p: V[]) => (p.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${p.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`);
  return { night: css(clip(rect, n, -1)), day: css(clip(rect, n, 1)), th };
};

const STARS: [number, number, number][] = [
  [180, 300, 2.2], [330, 470, 1.6], [760, 150, 2], [880, 330, 1.4], [1040, 190, 1.8], [1650, 120, 2.2], [1840, 280, 1.5],
  [1580, 980, 1.4], [70, 620, 1.6], [250, 860, 1.3], [1860, 700, 1.8], [820, 960, 1.4], [120, 1000, 2], [1010, 1030, 1.5],
  [640, 60, 1.4], [460, 620, 1.2], [980, 700, 1.3], [1130, 80, 1.6],
];

const Clock = ({ f, night }: { f: number; night: boolean }) => {
  const minuteItems = Array.from({ length: 8 }, (_, j) => ({ at: B(j), text: String(34 + j) }));
  let i = 0;
  for (let k = 0; k < minuteItems.length; k++) if (f >= minuteItems[k].at - 1) i = k;
  const t = i === 0 ? 1 : tween(f, [minuteItems[i].at - 1, minuteItems[i].at + 5], [0, 1], EASE_OUT);
  const ink = night ? "#FFFFFF" : C.ink;
  const sub = night ? "#AEB9B1" : C.ink4;
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
        <Pill size={T.m} bg={night ? "rgba(255,255,255,0.12)" : C.sage1} color={night ? "#E4ECDF" : C.moss}><IcClock size={30} />Open 24/7</Pill>
      </Reveal>
    </div>
  );
};

export const AlwaysBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const { night, day, th } = halves(f);
  const sun = { x: PIVOT.x + R * Math.sin(th), y: PIVOT.y - R * Math.cos(th) };
  const moon = { x: PIVOT.x - R * Math.sin(th), y: PIVOT.y + R * Math.cos(th) };
  const minute = Math.min(7, Math.max(0, [0, 1, 2, 3, 4, 5, 6, 7].filter((j) => f >= B(j)).length - 1));
  // Incoming: the push-through from the drop lands here. Outgoing: push into the phone's balance card.
  const inT = tween(f, [-SC.always.swap, 0], [0, 1], CAM);
  const outT = tween(f, [SC.always.dur - 12, SC.always.dur - SC.send.swap], [0, 1], PUSH);
  const card = onPhone(PH, HOME_CARD.x, HOME_CARD.y);
  const group = (n: boolean) => (
    <div style={{ position: "absolute", left: 0, width: HALF_L * 2, top: 0, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${k.scale})` }}><Clock f={f} night={n} /></div>
    </div>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Cam z={lerp(0.86, 1, inT) * (1 + 3 * outT)} ox={outT > 0 ? card.x : 960} oy={outT > 0 ? card.y : 540} blur={(1 - inT) * 10 + outT * 12}>
        <Drift f={f}>
          {/* day half */}
          <AbsoluteFill style={{ clipPath: day }}>
            <DotGrid glow={k.glow} />
            <div style={{ position: "absolute", left: sun.x - 48, top: sun.y - 48, width: 96, height: 96, borderRadius: "50%", background: "#EBC47A", boxShadow: "0 0 0 18px rgba(235,196,122,0.18), 0 0 90px rgba(235,196,122,0.55)" }} />
            {group(false)}
          </AbsoluteFill>
          {/* night half */}
          <AbsoluteFill style={{ clipPath: night, background: NIGHT_SKY }}>
            <DotGrid color="#FFFFFF" alpha={0.07} glow={k.glow} />
            {STARS.map(([x, y, r], i) => (
              <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "#fff", opacity: 0.4 + 0.35 * Math.sin(f / 5 + i * 1.3) }} />
            ))}
            <div style={{ position: "absolute", left: moon.x - 42, top: moon.y - 42, width: 84, height: 84, borderRadius: "50%", background: "#EDE6D3", overflow: "hidden", boxShadow: "0 0 70px rgba(237,230,211,0.28)" }}>
              <div style={{ position: "absolute", left: 30, top: -16, width: 84, height: 84, borderRadius: "50%", background: NIGHT_SKY }} />
            </div>
            {group(true)}
          </AbsoluteFill>
          <PhoneAt x={PH.x} y={PH.y}>
            <FPhone time={`8:${34 + minute}`}><FHome /></FPhone>
          </PhoneAt>
        </Drift>
      </Cam>
    </AbsoluteFill>
  );
};

export const S04Always = () => <AlwaysBody f={useF()} />;
