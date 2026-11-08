import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FLOAT_SHADOW, FONT } from "../theme";
import { clamp01, EASE_IN_OUT, EASE_OUT, spr, SPRING, track, tween } from "../ui/anim";
import { UnknownAvatar } from "../ui/Atoms";
import { Finger } from "../ui/Finger";
import { FaceId } from "../ui/Icons";
import { PageBg } from "../ui/Stage";
import { ScamStage } from "./B07Scam";

const BTN = { left: 80, top: 920, w: 920, h: 172 };

/**
 * Beat 8, she sends anyway: the thumb skips "Don't send", holds "Hold to send anyway" until it fills,
 * then the Confirm sheet runs Face ID for the risky send.
 */
export const B08Hold = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lift = spr(f, fps, 0, SPRING.float);
  const press = tween(f, [10, 14], [0, 1]) * (1 - tween(f, [56, 60], [0, 1]));
  const fill = tween(f, [13, 56], [0, 1], (t) => EASE_IN_OUT(t));
  const sheet = spr(f, fps, 58, SPRING.float);
  const scan = tween(f, [62, 78], [0, 1], EASE_IN_OUT);
  const done = tween(f, [78, 87], [0, 1], EASE_OUT);
  const shake = f > 13 && f < 56 ? Math.sin(f * 2.1) * 1.2 * fill : 0;

  const fx = track(f, [[0, 1040], [10, 905]]);
  const fy = track(f, [[0, 1500], [10, BTN.top + BTN.h / 2 + 34]]);

  return (
    <PageBg>
      <AbsoluteFill style={{ transform: "scale(1.03)", transformOrigin: "50% 30%", filter: `blur(${lift * 6}px)` }}>
        <ScamStage holdFill={fill} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(243,240,234,0.55)", opacity: lift }} />

      <div
        style={{
          position: "absolute", left: BTN.left + shake, top: BTN.top + (1 - lift) * 520, width: BTN.w, height: BTN.h, borderRadius: 999,
          background: C.white, overflow: "hidden", boxShadow: FLOAT_SHADOW, opacity: clamp01(lift * 2),
          transform: `scale(${1 - press * 0.025})`, fontFamily: FONT,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: C.amber1 }} />
        <div style={{ position: "relative", height: "100%", display: "grid", placeItems: "center", fontSize: 60, fontWeight: 600, letterSpacing: "-0.02em", color: C.ink }}>
          Hold to send anyway
        </div>
      </div>

      <Finger x={fx} y={fy} press={press} opacity={tween(f, [0, 8], [0, 1]) * (1 - tween(f, [58, 64], [0, 1]))} />

      {sheet > 0.001 ? (
        <>
          <AbsoluteFill style={{ background: "rgba(17,24,19,0.38)", opacity: clamp01(sheet * 1.5) }} />
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: 640 + (1 - sheet) * 1300, bottom: -40, background: C.white,
              borderRadius: "84px 84px 0 0", padding: "34px 72px", fontFamily: FONT, color: C.ink,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            <div style={{ width: 100, height: 12, borderRadius: 12, background: C.line }} />
            <div style={{ display: "flex", alignItems: "center", gap: 30, alignSelf: "stretch", marginTop: 46 }}>
              <UnknownAvatar size={120} />
              <div>
                <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.025em" }}>Send $500.00</div>
                <div style={{ fontSize: 40, color: C.ink4, marginTop: 4 }}>to +54 9 11 5555 0142</div>
              </div>
            </div>
            <div style={{ marginTop: 70, width: 250, height: 250, borderRadius: 76, background: C.page, display: "grid", placeItems: "center" }}>
              <FaceId size={150} color={C.moss} scan={scan} done={done} />
            </div>
            <div style={{ marginTop: 26, fontSize: 38, color: C.ink4, fontWeight: 500 }}>Face ID</div>
          </div>
        </>
      ) : null}
    </PageBg>
  );
};
