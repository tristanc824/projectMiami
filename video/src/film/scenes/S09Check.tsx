import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { Cam, DotGrid, FPhone, head, PhoneAt, Reveal } from "../kit";
import { CX, HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { EASE_IN_OUT, hitIn, lerp, lineT, PUSH, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { SCAM_HOLD, ScamScreen } from "../screens";
import { BUBBLE_H, BUBBLE_Y, ScamBody } from "./S08Scam";

/*
 * 9. Scam check (bars 26-28). The amber wash opens from the message and lands on the bar 26
 * downbeat. 2-up: the app's scam check on the phone (left), the three reasons large (right),
 * revealed on beats 2, 3 and 4 of bar 26 together with the phone's own list. Hold. Bar 28: she
 * holds "Hold to send anyway" (the fill runs the whole bar), and the camera pushes into it.
 */

const FROM = SC.check.from;
const L = (abs: number) => abs - FROM;
const PH = phoneAt(HALF_L);
export const WASH_C = { x: CX, y: BUBBLE_Y + BUBBLE_H / 2 };
/** Wash radius at local frame f (full at the downbeat). */
export const washR = (f: number) => lerp(0, 1500, tween(f, [-SC.check.swap, 0], [0, 1], EASE_IN_OUT));
const REASONS = ["New number", "First payment", "$500 is a lot"];
const R_AT = [L(HIT.reason1), L(HIT.reason2), L(HIT.reason3)];
export const AMBER_BG = "radial-gradient(110% 90% at 35% 30%, #FAF2E2 0%, #F5E9CF 58%, #ECDDBD 100%)";

export const CheckBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const reasons = R_AT.reduce((a, r) => a + tween(f, [r, r + 8], [0, 1]), 0);
  const hold = tween(f, [L(HIT.holdFrom), SC.check.dur - 12], [0, 1], (t) => t);
  const btn = onPhone(PH, SCAM_HOLD.x, SCAM_HOLD.y);
  const go = tween(f, [SC.check.dur - 12, SC.check.dur - SC.undo.swap], [0, 1], PUSH);
  const r = washR(f);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {f < 0 ? <ScamBody f={SC.scam.dur + f} /> : null}
      <AbsoluteFill style={{ clipPath: f < 0 ? `circle(${r.toFixed(1)}px at ${WASH_C.x}px ${WASH_C.y}px)` : undefined, background: AMBER_BG }}>
        <Cam z={1 + 4 * go} ox={btn.x} oy={btn.y} blur={go * 8}>
          <Drift f={Math.max(0, f)}>
            <DotGrid color="#8A5A10" alpha={0.1} glow={k.glow} />
            <PhoneAt x={PH.x} y={PH.y}>
              <FPhone time="9:38">
                <ScamScreen reasons={reasons} holdFill={hold} />
                {hold > 0 && hold < 1 ? <div style={{ position: "absolute", left: SCAM_HOLD.x - 34, top: SCAM_HOLD.y - 34, width: 68, height: 68, borderRadius: "50%", background: "rgba(138,90,16,0.16)", transform: `scale(${1 + 0.06 * Math.sin(f / 3)})` }} /> : null}
              </FPhone>
            </PhoneAt>
            <div style={{ position: "absolute", left: HALF_R - 414, width: 828, top: 0, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", transform: `scale(${k.scale})` }}>
                <Reveal t={lineT(f, 0)}>
                  <div style={{ ...head(T.l, C.amber), display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 22, background: C.amber, color: C.amber1, display: "grid", placeItems: "center", fontSize: 40, fontWeight: 700 }}>!</div>
                    Scam check
                  </div>
                </Reveal>
                {REASONS.map((t, i) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 28, marginTop: i === 0 ? 48 : 24 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.amber, transform: `scale(${hitIn(f, R_AT[i])})`, flex: "none" }} />
                    <Reveal t={lineT(f, R_AT[i])}><div style={head(T.xl)}>{t}</div></Reveal>
                  </div>
                ))}
              </div>
            </div>
          </Drift>
        </Cam>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const S09Check = () => <CheckBody f={useF()} />;
