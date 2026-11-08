import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../theme";
import { clamp01, spr, SPRING } from "../ui/anim";
import { Flock } from "../ui/Birds";
import { Meadow } from "../ui/Stage";

const LINES = [["Every", "dollar", "you"], ["send", "gets", "there."]];
const STEP = 8; // frames between words

/** Beat 11, the line: the meadow again, wider, birds crossing. The line types in word by word, centered. */
export const B11Line = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let n = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Meadow position="30% 72%" from={1.0} to={1.05} dur={170} drift={-30} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(16,26,19,0.30) 0%, rgba(16,26,19,0.12) 45%, rgba(16,26,19,0.35) 100%)" }} />
      <Flock start={160} tone="#1C2A22" scale={0.8} style={{ opacity: 0.9 }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -120 }}>
        <div style={{ textAlign: "center", color: "#fff", fontSize: 100, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.08, textShadow: "0 2px 30px rgba(10,22,14,0.35)" }}>
          {LINES.map((ws, li) => (
            <div key={li} style={{ whiteSpace: "nowrap" }}>
              {ws.map((w) => {
                const t = spr(f, fps, 14 + n++ * STEP, SPRING.soft);
                return (
                  <span key={w} style={{ display: "inline-block", marginRight: "0.24em", opacity: clamp01(t * 1.6), transform: `translateY(${(1 - t) * 26}px)`, filter: `blur(${(1 - t) * 8}px)` }}>
                    {w}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
