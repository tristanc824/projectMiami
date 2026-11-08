import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../../theme";
import { EASE_IN_OUT, lerp, spr, SPRING, tween } from "../../ui/anim";
import { BigChip, FPhone, mix, MoneyDot, onPhone, PhoneAt, pushOut, Reveal, Zoom } from "../kit";
import { FHome, HOME_BALANCE, HOME_SEND } from "../screens";
import { DOT_HANDOFF } from "./Hook";

/* ================================================================== beat 5: any time, day or night */

const K = 1.12;
const PY0 = (1080 - 844 * K) / 2;

const DAY = "#F2EEE6";
const NIGHT_SKY = "#13201A";
const PIVOT = { x: 520, y: 1400 };
const R = 3200;
const HOURS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const STARS = [
  [120, 120, 2.2], [300, 210, 1.6], [640, 90, 2], [820, 260, 1.4], [980, 120, 1.8], [1650, 110, 2.2], [1820, 300, 1.5],
  [1560, 260, 1.4], [90, 420, 1.6], [240, 620, 1.3], [1880, 640, 1.8], [700, 960, 1.4], [150, 900, 2], [1000, 1000, 1.5],
];
const PH5 = { x: 1090, y: PY0, k: K };

export const B05Always = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  // VO: "It works any time," (0.45-1.65 s) "day or night." (1.8-2.95 s)
  const { fps } = useVideoConfig();
  // The phone rises; Ana's money (the dot, from the Nest mark in beat 3) drops into the balance.
  const rise = spr(f, fps, 0, SPRING.float);
  const ph = { ...PH5, y: PH5.y + (1 - rise) * 1000 };
  const bal = onPhone(ph, HOME_BALANCE.x, HOME_BALANCE.y);
  const q = tween(f, [2, 20], [0, 1], EASE_IN_OUT);
  const dot = { x: lerp(DOT_HANDOFF.x, bal.x, q), y: lerp(DOT_HANDOFF.y, bal.y, q) - Math.sin(Math.PI * q) * 70 };
  const dotR = 14 * (1 - tween(f, [18, 24], [0, 1]));
  const amount = 4280.12 * tween(f, [20, 36], [0, 1]);
  const rot = 180 * tween(f, [34, 72], [0, 1], EASE_IN_OUT);
  const N = tween(f, [50, 66], [0, 1]);
  const pos = 12 * tween(f, [36, 68], [0, 1], EASE_IN_OUT);
  const speed = Math.abs(12 * (tween(f + 1, [36, 68], [0, 1], EASE_IN_OUT) - tween(f, [36, 68], [0, 1], EASE_IN_OUT)));
  const pm = tween(pos, [2.5, 3.5], [0, 1], EASE_IN_OUT);
  const ink = mix(C.ink, "#FFFFFF", N);
  const send = onPhone(PH5, HOME_SEND.x, HOME_SEND.y);
  const out = pushOut(f, dur, 12, 5);
  return (
    <AbsoluteFill style={{ background: NIGHT_SKY, overflow: "hidden" }}>
        <Zoom z={out.z} ox={send.x} oy={send.y} blur={out.blur}>
          <AbsoluteFill>
            <div style={{ position: "absolute", left: PIVOT.x - R, top: PIVOT.y - R, width: R * 2, height: R * 2, transform: `rotate(${rot}deg)`, background: `linear-gradient(180deg, ${DAY} 0%, ${DAY} 49.4%, ${NIGHT_SKY} 50.6%, ${NIGHT_SKY} 100%)` }}>
              <div style={{ position: "absolute", left: R - 48, top: R - 1160 - 48, width: 96, height: 96, borderRadius: "50%", background: "#EBC47A", boxShadow: "0 0 0 18px rgba(235,196,122,0.18), 0 0 80px rgba(235,196,122,0.5)" }} />
              <div style={{ position: "absolute", left: R - 42, top: R + 1160 - 42, width: 84, height: 84, borderRadius: "50%", background: "#EDE6D3", overflow: "hidden", transform: "rotate(180deg)", boxShadow: "0 0 60px rgba(237,230,211,0.25)" }}>
                <div style={{ position: "absolute", left: 26, top: -12, width: 84, height: 84, borderRadius: "50%", background: NIGHT_SKY }} />
              </div>
            </div>
            {STARS.map(([x, y, r], i) => (
              <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "#fff", opacity: N * (0.45 + 0.35 * Math.sin(f / 5 + i * 1.3)) }} />
            ))}
            <div style={{ position: "absolute", right: 1920 - 960, top: 300, textAlign: "right", fontFamily: FONT }}>
              <Reveal t={tween(f, [4, 20], [0, 1])}><div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", color: mix(C.ink4, "#C7D2CA", N) }}>Sunday</div></Reveal>
              <Reveal t={tween(f, [8, 26], [0, 1])} style={{ marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", fontSize: 180, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, color: ink, fontVariantNumeric: "tabular-nums" }}>
                  <div style={{ height: "1.04em", overflow: "hidden", width: "1.2em", textAlign: "right", filter: speed > 0.05 ? `blur(${Math.min(8, speed * 9)}px)` : undefined }}>
                    <div style={{ transform: `translateY(${-pos * 1.04}em)` }}>
                      {HOURS.map((h, i) => <div key={i} style={{ height: "1.04em" }}>{h}</div>)}
                    </div>
                  </div>
                  <div style={{ height: "1.04em" }}>:41</div>
                  <div style={{ height: "1.04em", overflow: "hidden", marginLeft: "0.25em", marginBottom: "0.22em", fontSize: "0.42em", letterSpacing: "-0.02em" }}>
                    <div style={{ transform: `translateY(${-pm * 1.04}em)` }}>
                      <div style={{ height: "1.04em" }}>AM</div>
                      <div style={{ height: "1.04em" }}>PM</div>
                    </div>
                  </div>
                </div>
              </Reveal>
              <Reveal t={tween(f, [18, 34], [0, 1])} style={{ marginTop: 34, display: "flex", justifyContent: "flex-end" }}>
                <BigChip size={44} bg={N > 0.5 ? "rgba(255,255,255,0.12)" : C.sage1} color={N > 0.5 ? "#E4ECDF" : C.moss}>Open 24/7</BigChip>
              </Reveal>
            </div>
            <PhoneAt {...ph}>
              <FPhone><FHome amount={amount} /></FPhone>
            </PhoneAt>
            {dotR > 0.05 ? <MoneyDot x={dot.x} y={dot.y} r={dotR} /> : null}
          </AbsoluteFill>
        </Zoom>
    </AbsoluteFill>
  );
};

