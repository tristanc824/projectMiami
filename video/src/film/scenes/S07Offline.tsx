import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { NestMark } from "../../ui/NestMark";
import { DotGrid, FLOAT, FlipPhone, FPhone, PhoneAt, Pill, PushScreens, Reveal, Ripple } from "../kit";
import { CX, HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, clamp01, EASE_IN_OUT, hitIn, lineT, qpt, settle, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { FHome, OfflineSentScreen, SmsScreen } from "../screens";
import { MessageIcon } from "../icons";

/*
 * 7. Offline (bars 20-23), v3: matches b08 ("Without Wi-Fi, it goes by text, and Mamá still gets
 * it."). Ana's phone in the left half, Mamá's in the right half, a cell tower between them on the
 * same baseline. Wi-Fi drops on "Without Wi-Fi" (the phone keeps its signal bars: it's online by
 * text); on "goes by text" the text bubble leaves Ana's phone, hops to the tower and on to Mamá's
 * phone, which receives it right away on "Mamá still gets it", with the chip "Sent by text".
 * No queued / waiting state.
 */

const FROM = SC.offline.from;
const L = (abs: number) => abs - FROM;
const PA = phoneAt(HALF_L);
const PM = phoneAt(HALF_R);
const BASE = PA.y + 880; // 980
const TOWER_H = 330;
const TOWER_W = 220;
const ANT = { x: CX, y: BASE - TOWER_H - 20 };
const FROM_PT = onPhone(PA, 300, 300);
const TO_PT = onPhone(PM, 160, 300);
const C1 = { x: (FROM_PT.x + ANT.x) / 2, y: 330 };
const C2 = { x: (ANT.x + TO_PT.x) / 2, y: 330 };
const CHIP_Y = 196;

const Tower = ({ pulses, s, inT }: { pulses: number[]; s: number; inT: number }) => {
  const h = TOWER_H + 60;
  return (
    <div style={{ position: "absolute", left: CX - TOWER_W / 2, top: BASE - h, width: TOWER_W, height: h, transform: `translateY(${((1 - inT) * 40).toFixed(1)}px) scale(${s})`, transformOrigin: "50% 100%", opacity: clamp01(inT * 2) }}>
      <svg viewBox={`0 0 ${TOWER_W} ${h}`} width={TOWER_W} height={h} style={{ overflow: "visible" }}>
        <g fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M66 ${h} L110 76 L154 ${h}`} />
          <path d="M86 300 L134 300 M93 230 L127 230 M100 160 L120 160" />
          <path d="M86 300 L127 230 M134 300 L93 230" strokeWidth={3.5} opacity={0.6} />
          <path d={`M34 ${h - 2} L186 ${h - 2}`} />
        </g>
        <circle cx={110} cy={44} r={13} fill={C.moss} />
        {[36, 60].map((r) => (
          <g key={r} fill="none" stroke={C.moss} strokeWidth={5} strokeLinecap="round" opacity={0.6}>
            <path d={`M${110 - r} ${44 - r * 0.6} A${r} ${r} 0 0 0 ${110 - r} ${44 + r * 0.6}`} />
            <path d={`M${110 + r} ${44 - r * 0.6} A${r} ${r} 0 0 1 ${110 + r} ${44 + r * 0.6}`} />
          </g>
        ))}
        {pulses.map((p, i) => (p > 0 && p < 1 ? <circle key={i} cx={110} cy={44} r={30 + p * 120} fill="none" stroke={C.moss} strokeWidth={4} opacity={(1 - p) * 0.7} /> : null))}
      </svg>
    </div>
  );
};

/** The text bubble that travels: a small white SMS chip with the Nest mark. */
const SmsBubble = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <div style={{ position: "absolute", left: x - 70, top: y - 34, width: 140, height: 68, transform: `scale(${s})`, fontFamily: FONT }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "34px 34px 34px 10px", background: C.white, boxShadow: FLOAT, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: T.s, fontWeight: 600, color: C.moss }}>
      <NestMark size={28} color={C.moss} />$250
    </div>
  </div>
);

export const OfflineBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const angle = -90 * tween(f, [-SC.offline.swap, 0], [1, 0], CAM);
  const wifi = 1 - tween(f, [L(HIT.wifiOff), L(HIT.wifiOff) + 12], [0, 1], (t) => t);
  const net = { wifi, bars: 4, tag: "No Wi-Fi", tagT: tween(f, [L(HIT.wifiOff) + 6, L(HIT.wifiOff) + 14], [0, 1]) };
  const t1 = tween(f, [L(HIT.smsOut) - 12, L(HIT.smsOut) - 1], [0, 1], EASE_IN_OUT);
  // The text: Ana's phone -> tower (2 beats) -> Mamá's phone (2 beats).
  // The text accelerates into the tower (impact on the kick) and is flung on to Mamá.
  const h1 = tween(f, [L(HIT.smsOut) - 1, L(HIT.smsTower)], [0, 1], (t) => t * t);
  const h2 = tween(f, [L(HIT.smsTower), L(HIT.mamaGets) - 1], [0, 1], EASE_IN_OUT);
  const sms = f < L(HIT.smsTower) ? qpt(FROM_PT, C1, ANT, h1) : qpt(ANT, C2, TO_PT, h2);
  const smsS = tween(f, [L(HIT.smsOut) - 1, L(HIT.smsOut) + 5], [0.3, 1]) * (1 - 0.4 * tween(f, [L(HIT.mamaGets) - 6, L(HIT.mamaGets) - 1], [0, 1]));
  const showSms = f >= L(HIT.smsOut) - 1 && f < L(HIT.mamaGets) - 1;
  const got = hitIn(f, L(HIT.mamaGets));
  const pulses = [(f - L(HIT.smsTower) + 2) / 22];
  const mIn = settle(f, 6);
  const tIn = settle(f, 0);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Drift f={f}>
        <DotGrid glow={k.glow} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {[[FROM_PT, C1, ANT], [ANT, C2, TO_PT]].map(([a, c, b], i) => (
            <path key={i} d={`M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`} fill="none" stroke={C.ink} strokeOpacity={0.22 * clamp01(tIn)} strokeWidth={3} strokeDasharray="0.1 14" strokeLinecap="round" />
          ))}
        </svg>
        <FlipPhone ph={PA} angle={angle}>
          <FPhone net={net}>
            <PushScreens t={t1} from={<FHome />} to={<OfflineSentScreen />} />
          </FPhone>
        </FlipPhone>
        <Tower pulses={pulses} s={k.scale} inT={tIn} />
        <PhoneAt x={PM.x} y={PM.y + (1 - mIn) * 80} style={{ opacity: clamp01(mIn * 2.5) }}>
          <FPhone><SmsScreen inT={got} /></FPhone>
        </PhoneAt>
        {showSms ? <SmsBubble x={sms.x} y={sms.y} s={smsS} /> : null}
        {f >= L(HIT.mamaGets) && f < L(HIT.mamaGets) + 20 ? <Ripple x={TO_PT.x} y={TO_PT.y} p={(f - L(HIT.mamaGets)) / 20} r0={30} r1={130} /> : null}
        <div style={{ position: "absolute", left: CX - 300, width: 600, top: CHIP_Y, display: "flex", justifyContent: "center", transform: `scale(${(0.9 + 0.1 * got) * k.scale})`, opacity: clamp01(got * 3) }}>
          <Reveal t={lineT(f, L(HIT.mamaGets))}>
            <Pill size={T.m}><MessageIcon size={30} />Sent by text</Pill>
          </Reveal>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

export const S07Offline = () => <OfflineBody f={useF()} />;
