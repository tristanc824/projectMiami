import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { DotGrid, FLOAT, FlipPhone, FPhone, head, mix, PhoneAt, Pill, PushScreens, Reveal, Ripple } from "../kit";
import { CX, HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, clamp01, EASE_IN_OUT, EASE_OUT, hitIn, lineOut, lineT, qpt, settle, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { FHome, OfflineSentScreen, SmsScreen } from "../screens";
import { MessageIcon } from "../icons";

/*
 * 7. Offline (bars 20-23), v4: more time and a stronger visual, under the new b08 ("Even without
 * Wi-Fi, I can send and receive money, so it's never stuck."). The scene lands on the song's drop
 * hit with a big Wi-Fi glyph between Ana's phone (left) and Mamá's (right); on "without Wi-Fi" a
 * strike draws through it and its arcs drop out (Ana's status bar loses Wi-Fi too). Bar 21: the
 * glyph sinks away and a cell tower rises; on "send" the text bubble leaves Ana's phone, hops the
 * tower and lands on Mamá's phone on "receive money"; on "never stuck" the headline "Never stuck."
 * and the chip "Sent by text" land. Bars 22-23: Mamá's "Got it" goes back by text. No queued state.
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
const HEAD_Y = 150;

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

/**
 * The text that travels. Ana's is the real text command (v4.2: Nest's server sends the money once she
 * texts her PIN, so nothing claims on-phone signing); Mamá's reply is a plain "Got it".
 */
const SmsBubble = ({ x, y, s, text, pin = false }: { x: number; y: number; s: number; text: string; pin?: boolean }) => (
  <div style={{ position: "absolute", left: x - 170, top: y - 34, width: 340, height: 68, display: "flex", justifyContent: "center", transform: `scale(${s})`, fontFamily: FONT }}>
    <div style={{ height: 68, padding: "0 26px", borderRadius: "34px 34px 34px 10px", background: C.white, boxShadow: FLOAT, display: "flex", alignItems: "center", gap: 12, fontSize: T.s, fontWeight: 600, color: C.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
      <span style={{ color: C.moss, display: "flex" }}><MessageIcon size={26} /></span>
      {text}
      {pin ? <span style={{ color: C.ink4, letterSpacing: "0.12em" }}>••••</span> : null}
    </div>
  </div>
);

/** The big Wi-Fi glyph: three arcs and a dot; `cut` 0..1 drops the arcs out (outer first), `strike` 0..1 draws the slash. */
const WifiGlyph = ({ x, y, size, cut, strike, s, o }: { x: number; y: number; size: number; cut: number; strike: number; s: number; o: number }) => {
  const grey = "#B9BDB5";
  const arc = (r: number, i: number) => {
    const gone = clamp01(cut * 3 - i);
    return (
      <path
        key={r} d={`M${-r * 0.92} ${-r * 0.39} A${r} ${r} 0 0 1 ${r * 0.92} ${-r * 0.39}`} fill="none" stroke={mix(C.moss, grey, gone)}
        strokeWidth={size * 0.075} strokeLinecap="round" transform={`translate(0 ${(gone * 10).toFixed(1)})`}
      />
    );
  };
  const a = { x: -size * 0.42, y: -size * 0.6 };
  const b = { x: size * 0.42, y: size * 0.12 };
  return (
    <div style={{ position: "absolute", left: x - size * 0.7, top: y - size * 0.7, width: size * 1.4, height: size * 1.4, transform: `scale(${s.toFixed(4)})`, opacity: o }}>
      <svg width={size * 1.4} height={size * 1.4} viewBox={`${-size * 0.7} ${-size * 0.95} ${size * 1.4} ${size * 1.4}`} style={{ overflow: "visible", display: "block" }}>
        <circle cx={0} cy={-size * 0.25} r={size * 0.66} fill={C.white} style={{ filter: "drop-shadow(0 30px 40px rgba(22,48,29,0.18))" }} />
        {[size * 0.5, size * 0.34, size * 0.18].map((r, i) => arc(r, i))}
        <circle cx={0} cy={0} r={size * 0.06} fill={mix(C.moss, grey, cut)} />
        {strike > 0 ? <path d={`M${a.x} ${a.y} L${a.x + (b.x - a.x) * strike} ${a.y + (b.y - a.y) * strike}`} stroke={C.ink} strokeWidth={size * 0.065} strokeLinecap="round" /> : null}
      </svg>
    </div>
  );
};

export const OfflineBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const angle = -90 * tween(f, [-SC.offline.swap, 0], [1, 0], CAM);
  const off = tween(f, [L(HIT.wifiOff), L(HIT.wifiOff) + 12], [0, 1], (t) => t);
  const net = { wifi: 1 - off, bars: 4, tag: "No Wi-Fi", tagT: tween(f, [L(HIT.wifiOff) + 6, L(HIT.wifiOff) + 14], [0, 1]) };
  // The glyph slams in on the drop hit, is struck out on "without Wi-Fi", sinks away on bar 21.
  const gIn = hitIn(f, 0);
  const strike = tween(f, [L(HIT.wifiOff) - 1, L(HIT.wifiOff) + 6], [0, 1], EASE_OUT);
  const cut = tween(f, [L(HIT.wifiOff) + 3, L(HIT.wifiOff) + 14], [0, 1], (t) => t);
  const sink = tween(f, [L(HIT.phonesIn) - 12, L(HIT.phonesIn)], [0, 1], EASE_IN_OUT);
  const t1 = tween(f, [L(HIT.smsOut) - 10, L(HIT.smsOut) - 1], [0, 1], EASE_IN_OUT);
  // The text: Ana's phone -> tower -> Mamá's phone; then "Got it" back.
  const h1 = tween(f, [L(HIT.smsOut) - 1, L(HIT.smsTower)], [0, 1], (t) => t * t);
  const h2 = tween(f, [L(HIT.smsTower), L(HIT.mamaGets) - 1], [0, 1], EASE_IN_OUT);
  const sms = f < L(HIT.smsTower) ? qpt(FROM_PT, C1, ANT, h1) : qpt(ANT, C2, TO_PT, h2);
  const smsS = tween(f, [L(HIT.smsOut) - 1, L(HIT.smsOut) + 5], [0.3, 1]) * (1 - 0.4 * tween(f, [L(HIT.mamaGets) - 6, L(HIT.mamaGets) - 1], [0, 1]));
  const showSms = f >= L(HIT.smsOut) - 1 && f < L(HIT.mamaGets) - 1;
  const midR = Math.round((L(HIT.replyOut) + L(HIT.replyIn)) / 2);
  const r1 = tween(f, [L(HIT.replyOut) - 1, midR], [0, 1], (t) => t * t);
  const r2 = tween(f, [midR, L(HIT.replyIn) - 1], [0, 1], EASE_IN_OUT);
  const rep = f < midR ? qpt(TO_PT, C2, ANT, r1) : qpt(ANT, C1, FROM_PT, r2);
  const repS = tween(f, [L(HIT.replyOut) - 1, L(HIT.replyOut) + 5], [0.3, 1]) * (1 - 0.4 * tween(f, [L(HIT.replyIn) - 6, L(HIT.replyIn) - 1], [0, 1]));
  const showRep = f >= L(HIT.replyOut) - 1 && f < L(HIT.replyIn) - 1;
  const got = hitIn(f, L(HIT.mamaGets));
  const pulses = [(f - L(HIT.smsTower) + 2) / 22, (f - midR + 2) / 22];
  const tIn = settle(f, L(HIT.phonesIn));
  const mIn = settle(f, 0);
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
        {f >= L(HIT.phonesIn) - 2 ? <Tower pulses={pulses} s={k.scale} inT={tIn} /> : null}
        {sink < 1 ? <WifiGlyph x={CX} y={600 + 140 * sink} size={330} cut={cut} strike={strike} s={gIn * (1 - 0.5 * sink) * k.scale} o={clamp01(gIn * 3) * (1 - sink)} /> : null}
        <PhoneAt x={PM.x} y={PM.y + (1 - mIn) * 80} style={{ opacity: clamp01(mIn * 2.5) }}>
          <FPhone><SmsScreen inT={got} /></FPhone>
        </PhoneAt>
        {showSms ? <SmsBubble x={sms.x} y={sms.y} s={smsS} text="SEND 250 to Mamá" pin /> : null}
        {showRep ? <SmsBubble x={rep.x} y={rep.y} s={repS} text="Got it" /> : null}
        {f >= L(HIT.mamaGets) && f < L(HIT.mamaGets) + 20 ? <Ripple x={TO_PT.x} y={TO_PT.y} p={(f - L(HIT.mamaGets)) / 20} r0={30} r1={130} /> : null}
        {f >= L(HIT.replyIn) && f < L(HIT.replyIn) + 20 ? <Ripple x={FROM_PT.x} y={FROM_PT.y} p={(f - L(HIT.replyIn)) / 20} r0={30} r1={130} /> : null}
        {/* top centre: "No Wi-Fi" over the glyph, then "Never stuck." + the chip */}
        <div style={{ position: "absolute", left: CX - 300, width: 600, top: HEAD_Y, display: "flex", justifyContent: "center" }}>
          <Reveal t={lineT(f, L(HIT.wifiOff))} out={lineOut(f, L(HIT.phonesIn))}><div style={head(T.xl)}>No Wi-Fi</div></Reveal>
        </div>
        <div style={{ position: "absolute", left: CX - 300, width: 600, top: HEAD_Y, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `scale(${k.scale})` }}>
          <Reveal t={lineT(f, L(HIT.stuck))}><div style={head(T.xl)}>Never stuck.</div></Reveal>
          <Reveal t={lineT(f, L(HIT.stuck), 1)}>
            <Pill size={T.m}><MessageIcon size={30} />Sent by text</Pill>
          </Reveal>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

export const S07Offline = () => <OfflineBody f={useF()} />;
