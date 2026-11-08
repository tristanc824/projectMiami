import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN_OUT, spr, SPRING, tween } from "../ui/anim";
import { ScamCheckContent } from "../ui/screens";
import { PageBg, Stage } from "../ui/Stage";

export const SCAM_K = 2.4;
export const SCAM_TOP = 125; // logical

/** The scam check screen, full bleed at app scale (shared by beats 7 and 8). */
export const ScamStage = (p: React.ComponentProps<typeof ScamCheckContent>) => (
  <Stage k={SCAM_K}>
    <div style={{ position: "absolute", top: SCAM_TOP, left: (1080 / SCAM_K - 380) / 2 }}>
      <ScamCheckContent {...p} />
    </div>
  </Stage>
);

/** Beat 7, Nest steps in: the headline settles first, then the three reasons arrive one by one. */
export const B07Scam = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = spr(f, fps, 2, SPRING.pop);
  const head = spr(f, fps, 6, SPRING.soft);
  const reasons = [0, 1, 2].reduce((acc, i) => acc + spr(f, fps, 30 + i * 17, SPRING.soft), 0);
  const buttons = tween(f, [84, 104], [0, 1]);
  const push = tween(f, [0, 140], [1, 1.03], EASE_IN_OUT);
  return (
    <PageBg>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 30%" }}>
        <ScamStage tile={tile} head={head} reasons={reasons} buttons={buttons} />
      </AbsoluteFill>
    </PageBg>
  );
};
