import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { FLOAT_SHADOW } from "../theme";
import { EASE_IN_OUT, lerp, spr, SPRING, tween } from "../ui/anim";
import { camMap, Phone, PhoneOnStage } from "../ui/Phone";
import { HeldChip, HomeScreen } from "../ui/screens";
import { PageBg } from "../ui/Stage";

const K = 1.9;
const BASE = { x: (1080 - 390 * K) / 2, y: 230, k: K };
const CARD_CY = 252; // logical centre of the balance card
const CHIP = { x: 104, y: 348 }; // logical centre of "Held in US dollars"
const BIG = 4.6; // 12.5px -> ~58px

/** Beat 4, dollars: Home. The dollars-vs-pesos line draws itself, then "Held in US dollars" lifts off and floats large. */
export const B04Home = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spr(f, fps, 0, SPRING.float);
  const zoom = tween(f, [16, 58], [1, 1.42], EASE_IN_OUT);
  const line = tween(f, [34, 84], [0, 1], EASE_IN_OUT);
  const lift = spr(f, fps, 92, SPRING.float);

  const cam = { ...BASE, y: BASE.y + (1 - rise) * 160, zoom, ox: 540, oy: BASE.y + CARD_CY * K };
  const chip = camMap(cam, CHIP.x, CHIP.y);
  const cx = lerp(chip.x, 540, lift);
  const cy = lerp(chip.y, 1090, lift);
  const ck = lerp(chip.s, BIG, lift);

  return (
    <PageBg>
      <PhoneOnStage cam={cam} style={{ opacity: Math.min(1, rise * 1.5), filter: `blur(${lift * 6}px)` }}>
        <Phone><HomeScreen line={line} chipOpacity={lift > 0.001 ? 0 : 1} showUndone={false} /></Phone>
      </PhoneOnStage>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,234,0.55)", opacity: lift }} />
      {lift > 0.001 ? (
        <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) scale(${ck})` }}>
          <HeldChip style={{ boxShadow: lift > 0.05 ? FLOAT_SHADOW.replace(/(\d+)px/g, (m, n) => `${Math.round(Number(n) / 4)}px`) : "none" }} />
        </div>
      ) : null}
    </PageBg>
  );
};
