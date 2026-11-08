import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { tween } from "../ui/anim";
import { EASE_IN_OUT } from "../ui/anim";
import { LABEL, LabelBody, mix } from "./kit";
import { B01Map, B02Pesos, B03Brand } from "./beats/Hook";
import { B05Always } from "./beats/Always";
import { B06Send, B07Claim, B08Offline } from "./beats/Send";
import { B09Scam, B10Check, B11Undo } from "./beats/Protect";
import { B12Security } from "./beats/Security";
import { B13Close } from "./beats/Close";
import { BEATS, BeatId, CHAPTERS } from "./timeline";

/*
 * The Nest film: 16:9, 1920x1080, 24 fps, ~89 s, motion graphics only.
 * Spec: FILM_PLAN.md. Timing: ./timeline.ts. Audio is mixed afterwards by scripts/render-film.sh
 * (Remotion's bundled ffprobe can't read media at this project's long Windows path).
 */

const local = (f: number, id: BeatId) => f - BEATS[id].from;

/** 0 = ink label, 1 = white label (night and dark beats). */
const toneAt = (f: number) => {
  const b5 = local(f, "b05");
  if (b5 >= 0 && b5 < BEATS.b05.dur) return tween(b5, [50, 62], [0, 1]);
  const b9 = local(f, "b09");
  if (b9 >= 0 && b9 < BEATS.b09.dur) return 1;
  const b10 = local(f, "b10");
  if (b10 >= 0 && b10 < BEATS.b10.dur) return 1 - tween(b10, [40, 52], [0, 1]);
  return 0;
};

const ChapterLabel = () => {
  const f = useCurrentFrame();
  const i = CHAPTERS.findIndex((c) => f >= c.from && f < c.to);
  if (i < 0) return null;
  const c = CHAPTERS[i];
  const prev = i === 0 ? "Nest" : CHAPTERS[i - 1].word;
  const roll = tween(f, [c.from + 2, c.from + 16], [0, 1], EASE_IN_OUT);
  const out = i === CHAPTERS.length - 1 ? tween(f, [c.to - 12, c.to - 2], [0, 1], EASE_IN_OUT) : 0;
  const tone = toneAt(f);
  return (
    <div style={{ position: "absolute", left: LABEL.left, top: LABEL.top, zIndex: 50 }}>
      <LabelBody word={c.word} prev={prev} roll={roll} out={out} color={mix(C.moss, "#E4ECDF", tone)} wordColor={mix(C.ink, "#FFFFFF", tone)} />
    </div>
  );
};

const Beat = ({ id, children, extra = 0 }: { id: BeatId; children: React.ReactNode; extra?: number }) => (
  <Sequence from={BEATS[id].from} durationInFrames={BEATS[id].dur + extra} name={id}>
    {children}
  </Sequence>
);

export const Film = () => (
  <AbsoluteFill style={{ background: C.page, fontFamily: FONT }}>
    <Beat id="b01"><B01Map dur={BEATS.b01.dur} /></Beat>
    <Beat id="b02"><B02Pesos /></Beat>
    <Beat id="b03"><B03Brand dur={BEATS.b03.dur} /></Beat>
    <Beat id="b05"><B05Always dur={BEATS.b05.dur} /></Beat>
    <Beat id="b06"><B06Send dur={BEATS.b06.dur} /></Beat>
    <Beat id="b07"><B07Claim dur={BEATS.b07.dur} /></Beat>
    <Beat id="b08"><B08Offline /></Beat>
    <Beat id="b09"><B09Scam dur={BEATS.b09.dur} /></Beat>
    <Beat id="b10"><B10Check /></Beat>
    <Beat id="b11"><B11Undo dur={BEATS.b11.dur} /></Beat>
    <Beat id="b12"><B12Security dur={BEATS.b12.dur} /></Beat>
    <Beat id="b13" extra={BEATS.b14.dur}><B13Close endAt={BEATS.b13.dur} /></Beat>
    <ChapterLabel />
  </AbsoluteFill>
);
