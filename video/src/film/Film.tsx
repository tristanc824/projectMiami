import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { LabelBody, MoBlur, Paper } from "./kit";
import { LABEL } from "./layout";
import { BIG, lockCentred } from "./lockup";
import { EASE_IN, EASE_IN_OUT, EASE_OUT, lerp, tween } from "./motion";
import { SceneCtx } from "./scene";
import { CHAPTERS, FILM_FRAMES, HIT, SC, Scene, SCENES, SceneId } from "./timeline";
import { S01Map } from "./scenes/S01Map";
import { S02Inflation } from "./scenes/S02Inflation";
import { S03Drop } from "./scenes/S03Drop";
import { halves, S04Always } from "./scenes/S04Always";
import { S05Send } from "./scenes/S05Send";
import { S06Claim } from "./scenes/S06Claim";
import { S07Offline } from "./scenes/S07Offline";
import { S08Scam } from "./scenes/S08Scam";
import { S09Check, washR, WASH_C } from "./scenes/S09Check";
import { S10Undo } from "./scenes/S10Undo";
import { S11Security } from "./scenes/S11Security";
import { S12Close, S13End } from "./scenes/S12Close";

/*
 * The Nest film v2: 16:9, 1920x1080, 24 fps, 42 bars of "Santa María" (85.5 s), motion graphics
 * only. Spec: FILM_V2_SPEC.md. Every frame comes from ./timeline.ts. Audio is mixed afterwards by
 * scripts/render-film.sh (Remotion's bundled ffprobe can't read media at this long Windows path).
 */

const COMPONENTS: Record<SceneId, React.FC> = {
  map: S01Map,
  inflation: S02Inflation,
  drop: S03Drop,
  always: S04Always,
  send: S05Send,
  claim: S06Claim,
  offline: S07Offline,
  scam: S08Scam,
  check: S09Check,
  undo: S10Undo,
  security: S11Security,
  close: S12Close,
  end: S13End,
};

/** Motion blur only during fast moves: the one-beat transitions in and out, plus a few in-scene moves. */
const EXTRA_BLUR: Partial<Record<SceneId, [number, number][]>> = {
  inflation: [[SC.inflation.dur - 12, SC.inflation.dur]],
  send: [[HIT.arrived - 12 - SC.send.from, HIT.arrived - SC.send.from]],
};

const blurAt = (s: Scene, f: number, nextSwap: number) => {
  if (f < 0) return true;
  if (f >= s.dur - 12 && f < s.dur - nextSwap && nextSwap > 0) return true;
  return (EXTRA_BLUR[s.id] ?? []).some(([a, b]) => f >= a && f < b);
};

const SceneFrame = ({ s, nextSwap }: { s: Scene; nextSwap: number }) => {
  const f = useCurrentFrame() - s.swap;
  const Comp = COMPONENTS[s.id];
  return (
    <SceneCtx.Provider value={s}>
      <MoBlur on={blurAt(s, f, nextSwap)}>
        <Comp />
      </MoBlur>
    </SceneCtx.Provider>
  );
};

/* ------------------------------------------------------------------ the chapter label */

const LabelLayer = ({ word, prev, roll, tone, p = [1, 1, 1] }: { word: string; prev?: string; roll: number; tone: "ink" | "white"; p?: number[] }) => (
  <LabelBody word={word} prev={prev} roll={roll} p={p} color={tone === "white" ? "#E4ECDF" : C.moss} wordColor={tone === "white" ? "#FFFFFF" : C.ink} />
);

const ChapterLabel = () => {
  const f = useCurrentFrame();
  if (f < HIT.fly || f >= SC.close.from) return null;
  // Bar 10: the big lockup flies from the centre to the label's spot (the drop scene drew it until now).
  const fly = tween(f, [HIT.fly, HIT.fly + 36], [0, 1], EASE_IN_OUT);
  const big = lockCentred(960, 540);
  const s = lerp(BIG, 1, fly);
  const x = lerp(big.x, LABEL.x, fly);
  const y = lerp(big.y, LABEL.y, fly);
  // Words: Nest -> Send on the 24/7 downbeat, Send -> Protect on the scam downbeat.
  const ci = CHAPTERS.findIndex((c) => f >= c.from && f < c.to);
  const word = ci < 0 ? "Nest" : CHAPTERS[ci].word;
  const prev = ci <= 0 ? "Nest" : CHAPTERS[ci - 1].word;
  const roll = ci < 0 ? 1 : tween(f, [CHAPTERS[ci].from, CHAPTERS[ci].from + 9], [0, 1], EASE_OUT);
  // Leaves with the security pull-back.
  const out = tween(f, [SC.close.from - 12, SC.close.from - 4], [0, 1], EASE_IN);
  const style: React.CSSProperties = { position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: `scale(${s})`, zIndex: 50, opacity: 1 - out };
  // Night: 24/7's sweep (exact, clipped to the terminator) and the scam message until the amber wash covers the label.
  const inAlways = f >= SC.always.from - SC.always.swap && f < SC.send.from - SC.send.swap;
  const inScam = f >= SC.scam.from && f < SC.check.from;
  if (inAlways) {
    const h = halves(f - SC.always.from);
    return (
      <>
        <div style={style}>
          <div style={{ clipPath: shift(h.day, -x, -y, s) }}><LabelLayer word={word} prev={prev} roll={roll} tone="ink" /></div>
        </div>
        <div style={style}>
          <div style={{ clipPath: shift(h.night, -x, -y, s) }}><LabelLayer word={word} prev={prev} roll={roll} tone="white" /></div>
        </div>
      </>
    );
  }
  let white = false;
  if (inScam) {
    const r = washR(f - SC.check.from);
    white = Math.hypot(LABEL.x + 60 - WASH_C.x, LABEL.y + 20 - WASH_C.y) > r;
  }
  return (
    <div style={style}>
      <LabelLayer word={word} prev={prev} roll={roll} tone={white ? "white" : "ink"} />
    </div>
  );
};

/** Re-express a screen-space polygon clip-path in the label's local (scaled, translated) space. */
const shift = (poly: string, dx: number, dy: number, s: number) =>
  poly.replace(/(-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px/g, (_, a, b) => `${((+a + dx) / s).toFixed(1)}px ${((+b + dy) / s).toFixed(1)}px`);

/* ------------------------------------------------------------------ the film */

export const Film = () => (
  <AbsoluteFill style={{ background: C.page, fontFamily: FONT }}>
    <Paper />
    {SCENES.map((s, i) => {
      const next = SCENES[i + 1];
      const start = s.from - s.swap;
      const end = next ? next.from - next.swap : FILM_FRAMES;
      return (
        <Sequence key={s.id} from={start} durationInFrames={end - start} name={s.id}>
          <SceneFrame s={s} nextSwap={next ? next.swap : 0} />
        </Sequence>
      );
    })}
    <ChapterLabel />
  </AbsoluteFill>
);

