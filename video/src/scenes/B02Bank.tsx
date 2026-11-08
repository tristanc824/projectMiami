import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT } from "../theme";
import { EASE_IN_OUT, track, tween } from "../ui/anim";
import { Finger } from "../ui/Finger";
import { camMap, Phone, PhoneOnStage } from "../ui/Phone";
import { BankTransfer } from "../ui/screens";

const K = 2.1;
const CAM = { x: (1080 - 390 * K) / 2, y: 190, k: K };
const ROWS_Y = 280; // logical centre of the two warning rows
const SEND = { x: 195, y: 397 }; // logical centre of Send

/** Beat 2, the old way: a plain unbranded bank app. Slow push-in on the two lines; the thumb hovers and never presses. */
export const B02Bank = () => {
  const f = useCurrentFrame();
  const zoom = tween(f, [0, 130], [1, 1.5], EASE_IN_OUT);
  const oy = CAM.y + ROWS_Y * K;
  const cam = { ...CAM, zoom, ox: 540, oy };
  const send = camMap(cam, SEND.x, SEND.y);

  const fx = track(f, [[0, 1040], [22, 1040], [62, send.x + 150], [130, send.x + 120]]);
  const fy = track(f, [[0, 2150], [22, 2150], [62, send.y + 135], [130, send.y + 120]]);
  const hover = Math.sin(f / 9) * 6;

  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: "radial-gradient(90% 60% at 50% 40%, #2A2D2E 0%, #151718 70%, #0C0D0E 100%)" }}>
      <PhoneOnStage cam={cam} style={{ filter: "saturate(0.55) brightness(0.92)" }}>
        <Phone bg="#ECEDEF"><BankTransfer /></Phone>
      </PhoneOnStage>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,12,14,0.55) 0%, rgba(10,12,14,0) 22%, rgba(10,12,14,0) 70%, rgba(10,12,14,0.55) 100%)" }} />
      <Finger x={fx + hover * 0.6} y={fy + hover} opacity={tween(f, [18, 30], [0, 1])} />
    </AbsoluteFill>
  );
};
