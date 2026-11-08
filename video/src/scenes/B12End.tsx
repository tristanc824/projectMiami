import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../theme";
import { clamp01, spr, SPRING, tween } from "../ui/anim";
import { Flock } from "../ui/Birds";
import { Lockup } from "../ui/NestMark";
import { Meadow } from "../ui/Stage";

/** [TEAM: URL] Fill this in when the site address is final. Empty = no URL line. */
export const END_URL = "";

/** Beat 12, end: mark and wordmark on the meadow sky, the tagline under it, the URL small. Calm hold. */
export const B12End = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = tween(f, [4, 40], [0, 1], (t) => t);
  const word = spr(f, fps, 26, SPRING.soft);
  const tag = spr(f, fps, 40, SPRING.soft);
  const url = spr(f, fps, 54, SPRING.soft);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Meadow position="40% 75%" from={1.0} to={1.05} dur={170} />
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(16,26,19,0.5), rgba(16,26,19,0.08) 55%, rgba(16,26,19,0.18) 100%)" }} />
      <Flock start={300} tone="#1C2A22" scale={0.7} style={{ opacity: 0.7 }} />
      <AbsoluteFill style={{ alignItems: "center", top: 560, color: "#fff" }}>
        <Lockup size={150} color="#fff" draw={draw} wordOpacity={clamp01(word * 1.4)} wordShift={(1 - word) * -20} fontSize={136} />
        <div style={{ marginTop: 52, fontSize: 76, fontWeight: 600, letterSpacing: "-0.035em", opacity: clamp01(tag * 1.4), transform: `translateY(${(1 - tag) * 22}px)`, textShadow: "0 2px 24px rgba(10,22,14,0.3)" }}>
          Protect what matters.
        </div>
        {END_URL ? (
          <div style={{ marginTop: 28, fontSize: 38, fontWeight: 500, opacity: clamp01(url * 1.4) * 0.85, letterSpacing: "-0.01em" }}>{END_URL}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
