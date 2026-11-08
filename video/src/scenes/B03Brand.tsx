import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { tween, EASE_IN_OUT } from "../ui/anim";
import { Flock } from "../ui/Birds";
import { Lockup } from "../ui/NestMark";
import { Meadow } from "../ui/Stage";

/** Beat 3, the turn: the meadow, birds crossing, the three-ring mark draws itself in moss. */
export const B03Brand = () => {
  const f = useCurrentFrame();
  const draw = tween(f, [6, 54], [0, 1], (t) => t);
  const word = tween(f, [40, 62], [0, 1]);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Meadow position="46% 70%" from={1.0} to={1.06} dur={110} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%)" }} />
      <Flock start={70} tone="#1C2A22" />
      <AbsoluteFill style={{ alignItems: "center", top: 520, height: 200, justifyContent: "center" }}>
        <div style={{ transform: `scale(${tween(f, [0, 90], [0.97, 1.0], EASE_IN_OUT)})` }}>
          <Lockup size={128} color={C.moss} draw={draw} wordOpacity={word} wordShift={(1 - word) * -18} fontSize={112} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
