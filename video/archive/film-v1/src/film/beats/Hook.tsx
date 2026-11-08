import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../../theme";
import { clamp01, EASE_IN_OUT, EASE_OUT, lerp, spr, SPRING, tween } from "../../ui/anim";
import { NestMark } from "../../ui/NestMark";
import { PageBg } from "../../ui/Stage";
import { CAM, LABEL, LabelBody, MoneyDot, PUSH, Reveal, Zoom } from "../kit";
import { BA, MapLayer } from "../map";
import { BEATS } from "../timeline";

/* ================================================================== beat 1: the map */

export const B01Map = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // VO: "My mom lives in Buenos Aires." (0.45-2.1 s)  "I live in Miami." (2.5-3.4 s)
  const baPop = spr(f, fps, 20, SPRING.pop);
  const baLabel = tween(f, [25, 43], [0, 1]);
  const miPop = spr(f, fps, 58, SPRING.pop);
  const miLabel = tween(f, [62, 80], [0, 1]);
  const arc = tween(f, [74, 104], [0, 1], EASE_IN_OUT);
  // Camera: a slow settle, then a push into Buenos Aires that accelerates into the cut.
  const settle = tween(f, [0, 100], [1.12, 1], EASE_OUT);
  const push = tween(f, [dur - 28, dur], [0, 1], PUSH);
  const aim = tween(f, [dur - 34, dur - 6], [0, 1], EASE_IN_OUT);
  const cam = { cx: lerp(960, BA.x, aim), cy: lerp(540, BA.y, aim), z: settle * (1 + push * 6) };
  return (
    <PageBg>
      <AbsoluteFill style={{ filter: push > 0.4 ? `blur(${(push - 0.4) * 22}px)` : undefined }}>
        <MapLayer cam={cam} arc={arc} miami={{ pop: miPop, label: miLabel }} ba={{ pop: baPop, label: baLabel }} />
      </AbsoluteFill>
    </PageBg>
  );
};

/* ================================================================== beat 2: $1,000 in pesos shrinks to $321 */

/** Argentina 2023, monthly CPI (INDEC): what $1,000 held in pesos on Jan 1 could buy at each month's end. */
const VALUES = [1000, 943, 885, 822, 758, 703, 663, 624, 555, 493, 455, 403, 321];
const MONTHS = ["January 2023", "February 2023", "March 2023", "April 2023", "May 2023", "June 2023", "July 2023", "August 2023", "September 2023", "October 2023", "November 2023", "December 2023", "January 2024"];
const STEP0 = 66;
const STEP = 5;

/** Peso value at a frame of beat 2: harsh linear steps, one per month. */
const pesoAt = (f: number) => {
  const i = Math.floor((f - STEP0) / STEP);
  if (i < 0) return { v: 1000, m: 0 };
  if (i >= 12) return { v: 321, m: 12 };
  const within = clamp01((f - STEP0 - i * STEP) / 4);
  return { v: lerp(VALUES[i], VALUES[i + 1], within), m: i + 1 };
};

const NOTE_W = 600;
const NOTE_H = 340;
export const NOTE_L = { x: 560, y: 590 };
export const NOTE_R = { x: 1360, y: 590 };

const Note = ({ kind, value, scale = 1, textOpacity = 1, w = NOTE_W, h = NOTE_H, radius = 36 }: { kind: "usd" | "ars"; value: number; scale?: number; textOpacity?: number; w?: number; h?: number; radius?: number }) => {
  const usd = kind === "usd";
  return (
    <div
      style={{
        width: w, height: h, borderRadius: radius, position: "relative", overflow: "hidden", transform: `scale(${scale})`, transformOrigin: "0 0",
        background: usd ? "linear-gradient(140deg, #3B6C46 0%, #2F5D3A 55%, #26502F 100%)" : "linear-gradient(140deg, #74B5DD 0%, #5FA8D6 50%, #4C93C2 100%)",
        boxShadow: "0 2px 4px rgba(22,48,29,0.08), 0 24px 50px -20px rgba(22,48,29,0.45)", fontFamily: FONT, color: "#fff",
      }}
    >
      <div style={{ opacity: textOpacity }}>
        <div style={{ position: "absolute", inset: 14, borderRadius: radius - 12, border: "1.5px solid rgba(255,255,255,0.22)" }} />
        <div style={{ position: "absolute", right: -70, top: -80, opacity: 0.14 }}><NestMark size={300} color="#fff" strokeWidth={3} /></div>
        <div style={{ position: "absolute", left: 44, top: 36, fontSize: 30, fontWeight: 600, letterSpacing: "0.02em", opacity: 0.85 }}>{usd ? "US$" : "ARS"}</div>
        <div style={{ position: "absolute", left: 44, bottom: 30, fontSize: 132, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          ${Math.round(value).toLocaleString("en-US")}
        </div>
      </div>
    </div>
  );
};

/** Everything in beat 2 apart from the camera, so beat 3 can start from the identical frame. */
export const PesoScene = ({ f, exit = 0, fall = 0, hideUsd = false }: { f: number; exit?: number; fall?: number; hideUsd?: boolean }) => {
  const { fps } = useVideoConfig();
  const { v, m } = pesoAt(f);
  const inL = spr(f, fps, 0, SPRING.float);
  const inR = spr(f, fps, 3, SPRING.float);
  const head = tween(f, [2, 18], [0, 1]);
  const labL = tween(f, [10, 26], [0, 1]);
  const labR = tween(f, [14, 30], [0, 1]);
  const foot = tween(f, [34, 52], [0, 1]);
  const prevM = pesoAt(f - 3).m;
  const roll = m !== prevM ? tween(f - 3, [STEP0 + (m - 1) * STEP, STEP0 + (m - 1) * STEP + 3], [0, 1], (t) => t) : 1;
  // Falling peso note (beat 3): gravity, a little spin.
  const fy = 0.5 * 5.2 * fall * fall;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 128, display: "flex", justifyContent: "center" }}>
        <Reveal t={head} out={exit} style={{ height: 66 }}>
          <div style={{ position: "relative", height: 66, width: 600, overflow: "hidden", textAlign: "center", fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: C.ink4 }}>
            <div style={{ transform: `translateY(${(1 - roll) * 100}%)` }}>{MONTHS[m]}</div>
            {roll < 1 ? <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-roll * 100}%)` }}>{MONTHS[Math.max(0, m - 1)]}</div> : null}
          </div>
        </Reveal>
      </div>
      <div style={{ position: "absolute", left: NOTE_L.x - NOTE_W / 2, top: 318, width: NOTE_W }}>
        <Reveal t={labL} out={exit}><div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: C.moss }}>In dollars</div></Reveal>
      </div>
      <div style={{ position: "absolute", left: NOTE_R.x - NOTE_W / 2, top: 318, width: NOTE_W }}>
        <Reveal t={labR} out={exit}><div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: C.skyInk }}>In pesos</div></Reveal>
      </div>
      {!hideUsd ? (
        <div style={{ position: "absolute", left: NOTE_L.x - NOTE_W / 2, top: NOTE_L.y - NOTE_H / 2 + (1 - inL) * 90, opacity: clamp01(inL * 1.6) }}>
          <Note kind="usd" value={1000} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute", left: NOTE_R.x - NOTE_W / 2, top: NOTE_R.y - NOTE_H / 2 + (1 - inR) * 90 + fy, opacity: clamp01(inR * 1.6),
          transform: `rotate(${fall * 0.45}deg)`, transformOrigin: "50% 50%",
        }}
      >
        <Note kind="ars" value={v} scale={Math.sqrt(v / 1000)} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 940, display: "flex", justifyContent: "center" }}>
        <Reveal t={foot} out={exit}>
          <div style={{ fontSize: 30, fontWeight: 500, color: C.ink4, letterSpacing: "-0.01em" }}>What $1,000 kept in pesos could buy · Argentina, 2023 inflation (INDEC)</div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

export const B02Pesos = () => {
  const f = useCurrentFrame();
  const t = tween(f, [0, 18], [0, 1], CAM);
  return (
    <PageBg>
      <Zoom z={0.8 + 0.2 * t} blur={(1 - t) * 14}>
        <PesoScene f={f} />
      </Zoom>
    </PageBg>
  );
};

/* ================================================================== beat 3: the note folds into the dot; Nest */

/** Big lockup geometry: the chapter label scaled up (so the hand-off to the corner is exact). */
const BIG = 4.0;
const LOCK_W = 128; // label width at scale 1 (mark 42 + gap 12 + "Nest" at 34px)
const BIG_POS = { x: 960 - (LOCK_W * BIG) / 2, y: 540 - (LABEL.mark * BIG) / 2 };
export const MARK_CENTER = { x: BIG_POS.x + (LABEL.mark * BIG) / 2, y: 540 };
/** Where the money dot waits for beat 4. */
export const DOT_HANDOFF = { x: 960, y: 560 };

export const B03Brand = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  const exit = tween(f, [0, 12], [0, 1], EASE_IN_OUT);
  const fall = Math.max(0, f - 2);
  // Dollar note: slides to centre and folds into the dot.
  const p = tween(f, [4, 26], [0, 1], EASE_IN_OUT);
  const w = lerp(600, 28, EASE_IN_OUT(p));
  const h = lerp(340, 28, Math.pow(p, 0.55));
  const nx = lerp(560, 960, p);
  const ny = lerp(590, 540, p);
  // Dot rises into the middle of the mark; rings draw around it; it settles small, like an egg.
  const rise = tween(f, [24, 36], [0, 1], EASE_OUT);
  const draw = tween(f, [28, 54], [0, 1], (t) => t);
  const word = tween(f, [38, 54], [0, 1], EASE_OUT);
  const egg = tween(f, [32, 48], [0, 1], EASE_OUT);
  // Exit: the lockup becomes the chapter label; the dot drops to wait for the phone.
  const fly = tween(f, [dur - 24, dur - 2], [0, 1], EASE_IN_OUT);
  const s = lerp(BIG, 1, fly);
  const lx = lerp(BIG_POS.x, LABEL.left, fly);
  const ly = lerp(BIG_POS.y, LABEL.top, fly);
  const drop = tween(f, [dur - 20, dur], [0, 1], EASE_IN_OUT);
  const dotX = lerp(lerp(960, MARK_CENTER.x, rise), DOT_HANDOFF.x, drop);
  const dotY = lerp(lerp(540, MARK_CENTER.y, rise), DOT_HANDOFF.y, drop);
  const dotR = lerp(14 * (1 - egg), 14, drop);
  return (
    <PageBg>
      {f < 30 ? <PesoScene f={BEATS.b02.dur + f} exit={exit} fall={fall} hideUsd /> : null}
      {p < 1 ? (
        <div style={{ position: "absolute", left: nx - w / 2, top: ny - h / 2, width: w, height: h, borderRadius: lerp(36, 14, p), overflow: "hidden" }}>
          <div style={{ position: "absolute", left: (w - 600) / 2, top: (h - 340) / 2, transform: `scaleY(${h / 340})` }}>
            <Note kind="usd" value={1000} textOpacity={1 - clamp01(p * 3)} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.25 * Math.sin(Math.PI * p)}) 50%, rgba(0,0,0,0) 60%)` }} />
        </div>
      ) : null}
      {draw > 0 ? (
        <div style={{ position: "absolute", left: lx, top: ly, transformOrigin: "0 0", transform: `scale(${s})` }}>
          <LabelBody word="Nest" roll={word} draw={draw} wordColor={C.ink} />
        </div>
      ) : null}
      {p >= 1 && dotR > 0.3 ? <MoneyDot x={dotX} y={dotY} r={dotR} /> : null}
    </PageBg>
  );
};
