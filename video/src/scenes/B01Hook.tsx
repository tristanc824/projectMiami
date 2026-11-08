import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../theme";
import { lerp, spr, SPRING, tween, EASE_IN_OUT } from "../ui/anim";
import { NightBg } from "../ui/NightBg";
import { Phone, PhoneOnStage } from "../ui/Phone";
import { MessagesThread } from "../ui/screens";

const K = 2.1;
const PX = (1080 - 390 * K) / 2;
const PY = 210;
/** Bubble's logical position inside the thread screen (see MessagesThread). */
const BUB = { x: 14, y: 222 };
const BIG_K = 3.45; // 17px logical -> ~59px on screen

/** Beat 1, hook: the scam text lands on a lit phone at night, then floats forward large. */
export const B01Hook = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubbleIn = spr(f, fps, 3, SPRING.ui);
  const lift = spr(f, fps, 24, SPRING.float);
  const drift = tween(f, [0, 110], [0, -24], EASE_IN_OUT);

  const startX = PX + BUB.x * K;
  const startY = PY + drift + BUB.y * K;
  const x = lerp(startX, 76, lift);
  const y = lerp(startY, 800, lift);
  const k = lerp(K, BIG_K, lift);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <NightBg />
      <PhoneOnStage cam={{ x: PX, y: PY + drift, k: K, zoom: lerp(1, 1.035, lift) }} style={{ filter: `brightness(${lerp(1, 0.5, lift)}) blur(${lift * 5}px)` }}>
        <Phone dark bg="#0E100F">
          <MessagesThread bubbleIn={bubbleIn} bubbleHidden={lift > 0.001} />
        </Phone>
      </PhoneOnStage>
      {/* lamp light grazing the phone */}
      <AbsoluteFill style={{ background: "radial-gradient(60% 40% at 10% 0%, rgba(255,190,120,0.16), rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />
      {lift > 0.001 ? (
        <>
          <div style={{ position: "absolute", left: 76 + 6, top: 800 - 66, fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.62)", opacity: tween(f, [34, 50], [0, 1]), letterSpacing: "-0.01em" }}>
            +54 9 11 5555 0142
          </div>
          <div style={{ position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: `scale(${k})` }}>
            <div
              style={{
                width: 268, background: "#2A2E2B", borderRadius: "20px 20px 20px 6px", padding: "10px 14px", fontSize: 17,
                lineHeight: 1.3, letterSpacing: "-0.01em", color: "#fff",
                boxShadow: `0 ${10 * lift}px ${30 * lift}px rgba(0,0,0,${0.5 * lift})`,
              }}
            >
              Ana, it's Mamá. New number. Send it here.
            </div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
