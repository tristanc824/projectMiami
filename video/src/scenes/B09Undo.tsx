import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { clamp01, EASE_IN_OUT, spr, SPRING, tween } from "../ui/anim";
import { UNDO_START, UndoButton, UndoDetails, UndoRing } from "../ui/screens";
import { PageBg, Stage } from "../ui/Stage";

export const UNDO_K = 2.35;
const LW = 1080 / UNDO_K;

/** The Undo screen at app scale (shared by beats 9 and 10). */
export const UndoStage = ({
  secondsLeft, ring = 1, pulse = 0, head = 1, details = 1, button = 1,
}: { secondsLeft: number; ring?: number; pulse?: number; head?: number; details?: number; button?: number }) => (
  <Stage k={UNDO_K}>
    <div style={{ position: "absolute", top: 150, left: 0, width: LW, textAlign: "center", fontSize: 32, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.08, opacity: clamp01(head * 1.4), transform: `translateY(${(1 - head) * 14}px)` }}>
      You have 24 hours<br />to undo this.
    </div>
    <div style={{ position: "absolute", top: 238, left: (LW - 200) / 2, transform: `scale(${1 + pulse * 0.012})` }}>
      <UndoRing secondsLeft={secondsLeft} draw={ring} pulse={pulse} />
    </div>
    <div style={{ position: "absolute", top: 462, left: (LW - 380) / 2, width: 380, opacity: clamp01(details * 1.4), transform: `translateY(${(1 - details) * 16}px)` }}>
      <UndoDetails />
    </div>
    <div style={{ position: "absolute", top: 684, left: (LW - 380) / 2, width: 380, opacity: button }}>
      <UndoButton />
    </div>
  </Stage>
);

/** Beat 9, the undo window: the amber ring nearly full, 23:59:12 ticking down, one soft pulse per second. */
export const B09Undo = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const secondsLeft = UNDO_START - Math.floor(f / fps);
  const pulse = f >= 30 ? clamp01(1 - (f % 30) / 16) ** 2 : 0;
  const ring = tween(f, [6, 42], [0, 1], EASE_IN_OUT);
  const head = spr(f, fps, 0, SPRING.soft);
  const details = spr(f, fps, 26, SPRING.soft);
  const push = tween(f, [0, 170], [1, 1.06], EASE_IN_OUT);
  return (
    <PageBg>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 38%" }}>
        <UndoStage secondsLeft={secondsLeft} ring={ring} pulse={pulse} head={head} details={details} button={tween(f, [40, 60], [0, 1])} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(40% 25% at 50% 38%, rgba(246,235,211,${0.35 * pulse}), rgba(246,235,211,0))`, pointerEvents: "none", mixBlendMode: "multiply" }} />
    </PageBg>
  );
};
