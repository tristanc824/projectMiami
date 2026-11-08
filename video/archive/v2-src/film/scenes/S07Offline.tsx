import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { NestMark } from "../../ui/NestMark";
import { DotGrid, FLOAT, FlipPhone, FPhone, head, MoneyDot, PushScreens, Reveal, Ripple } from "../kit";
import { HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, EASE_IN, EASE_IN_OUT, hitIn, lineOut, lineT, qpt, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { FHome, OfflineSentScreen, QUEUED_CHIP, QueuedScreen } from "../screens";

/*
 * 7. Offline (bars 20-23). Phone left, tower right, both centred in their halves and standing on
 * the same baseline (y 980, the phone screen's bottom). Wi-Fi drops on "Without Wi-Fi"; the SMS
 * bubble hops phone -> tower -> away in 3 beats; the bars drop; bar 22 the "Queued" chip appears
 * inside the app's waiting screen; bar 23 beat 1 the bars return, it flips to "Sent" and the
 * money hops out the same way.
 */

const FROM = SC.offline.from;
const L = (abs: number) => abs - FROM;
const PH = phoneAt(HALF_L);
const BASE = PH.y + 880; // 980
const TOWER_H = 400;
const ANT = { x: HALF_R, y: BASE - TOWER_H - 16 };
const HOP_C = { x: 960, y: 250 };
const AWAY = { x: 2000, y: 160 };

const Tower = ({ live, pulses, s }: { live: number; pulses: number[]; s: number }) => (
  <div style={{ position: "absolute", left: HALF_R - 130, top: BASE - TOWER_H - 60, width: 260, height: TOWER_H + 60, opacity: 0.3 + 0.7 * live, transform: `scale(${s})`, transformOrigin: "50% 100%" }}>
    <svg viewBox={`0 0 260 ${TOWER_H + 60}`} width={260} height={TOWER_H + 60} style={{ overflow: "visible" }}>
      <g fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M80 ${TOWER_H + 60} L130 76 L180 ${TOWER_H + 60}`} />
        <path d="M100 330 L160 330 M92 400 L168 400 M110 250 L150 250 M118 170 L142 170" />
        <path d="M100 330 L150 250 M160 330 L110 250 M92 400 L160 330 M168 400 L100 330" strokeWidth={3.5} opacity={0.6} />
        <path d={`M40 ${TOWER_H + 58} L220 ${TOWER_H + 58}`} />
      </g>
      <circle cx={130} cy={44} r={13} fill={live > 0.5 ? C.moss : C.ink4} />
      {[40, 66].map((r) => (
        <g key={r} fill="none" stroke={C.moss} strokeWidth={5} strokeLinecap="round" opacity={live * 0.6}>
          <path d={`M${130 - r} ${44 - r * 0.6} A${r} ${r} 0 0 0 ${130 - r} ${44 + r * 0.6}`} />
          <path d={`M${130 + r} ${44 - r * 0.6} A${r} ${r} 0 0 1 ${130 + r} ${44 + r * 0.6}`} />
        </g>
      ))}
      {pulses.map((p, i) => (p > 0 && p < 1 ? <circle key={i} cx={130} cy={44} r={30 + p * 130} fill="none" stroke={C.moss} strokeWidth={4} opacity={(1 - p) * 0.7} /> : null))}
    </svg>
  </div>
);

const SmsBubble = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <div style={{ position: "absolute", left: x - 76, top: y - 38, width: 152, height: 76, transform: `scale(${s})`, fontFamily: FONT }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 38, background: C.white, boxShadow: FLOAT, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: T.m, fontWeight: 600, color: C.moss }}>
      <NestMark size={30} color={C.moss} />SMS
    </div>
  </div>
);

export const OfflineBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const angle = -90 * tween(f, [-SC.offline.swap, 0], [1, 0], CAM);
  // Network state on the phone.
  const wifi = 1 - tween(f, [L(HIT.wifiOff), L(HIT.wifiOff) + 12], [0, 1], (t) => t);
  const down = tween(f, [L(HIT.signalOff), L(HIT.signalOff) + 6], [0, 1], (t) => t);
  const up = tween(f, [L(HIT.sent), L(HIT.sent) + 12], [0, 1], (t) => t);
  const net =
    f < L(HIT.signalOff)
      ? { wifi, bars: 4, tag: "No data", tagT: tween(f, [L(HIT.wifiOff) + 6, L(HIT.wifiOff) + 14], [0, 1]) }
      : { wifi: 0, bars: f >= L(HIT.sent) ? 4 * up : 4 * (1 - down), tag: "No service", tagT: tween(f, [L(HIT.signalOff), L(HIT.signalOff) + 8], [0, 1]) * (1 - up), tagColor: C.ink4 };
  const live = f < L(HIT.signalOff) ? 1 : f < L(HIT.sent) ? 1 - down : up;
  // Screens: Home -> sent by text -> waiting to send.
  const t1 = tween(f, [L(HIT.wifiOff) + 12, L(HIT.wifiOff) + 24], [0, 1], EASE_IN_OUT);
  const t2 = tween(f, [L(HIT.signalOff), L(HIT.queued)], [0, 1], EASE_IN_OUT);
  const chip = hitIn(f, L(HIT.queued));
  const sent = tween(f, [L(HIT.sent) - 1, L(HIT.sent) + 7], [0, 1], (t) => t);
  // The SMS bubble: phone -> tower -> away in 3 beats.
  const from = onPhone(PH, 195, 330);
  const h1 = tween(f, [L(HIT.smsOut) - 1, L(HIT.smsTower)], [0, 1], EASE_IN_OUT);
  const h2 = tween(f, [L(HIT.smsTower), L(HIT.smsAway)], [0, 1], EASE_IN);
  const sms = f < L(HIT.smsTower) ? qpt(from, HOP_C, ANT, h1) : qpt(ANT, { x: 1700, y: 200 }, AWAY, h2);
  const smsS = tween(f, [L(HIT.smsOut), L(HIT.smsOut) + 6], [0.3, 1]) * (f < L(HIT.smsTower) - 2 ? 1 : 0.85);
  // The queued money, once back online.
  const chipPt = onPhone(PH, QUEUED_CHIP.x, QUEUED_CHIP.y);
  const d1 = tween(f, [L(HIT.sent) - 1, L(HIT.sent) + 12], [0, 1], EASE_IN_OUT);
  const d2 = tween(f, [L(HIT.sent) + 12, L(HIT.sent) + 25], [0, 1], EASE_IN);
  const dot = d2 <= 0 ? qpt(chipPt, HOP_C, ANT, d1) : qpt(ANT, { x: 1700, y: 200 }, AWAY, d2);
  const pulses = [(f - L(HIT.smsTower)) / 22, (f - L(HIT.sent) - 12) / 22];
  const cap1 = lineT(f, L(HIT.smsOut));
  const cap1Out = lineOut(f, L(HIT.signalOff));
  const capTop = 214;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Drift f={f}>
        <DotGrid glow={k.glow} />
        <FlipPhone ph={PH} angle={angle}>
          <FPhone net={net}>
            {t2 > 0 ? (
              <PushScreens t={t2} from={<OfflineSentScreen />} to={<QueuedScreen chip={chip} sent={sent} />} />
            ) : (
              <PushScreens t={t1} from={<FHome />} to={<OfflineSentScreen />} />
            )}
          </FPhone>
        </FlipPhone>
        <Tower live={live} pulses={pulses} s={k.scale} />
        <div style={{ position: "absolute", left: HALF_R - 420, width: 840, top: capTop, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Reveal t={cap1} out={cap1Out}><div style={head(T.xl)}>Sends by text.</div></Reveal>
        </div>
        <div style={{ position: "absolute", left: HALF_R - 420, width: 840, top: capTop, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Reveal t={lineT(f, L(HIT.queued))}><div style={head(T.xl)}>No signal.</div></Reveal>
          <Reveal t={lineT(f, L(HIT.queued), 1)}><div style={head(T.xl)}>It waits, then sends.</div></Reveal>
        </div>
        {h1 > 0 && h2 < 1 ? <SmsBubble x={sms.x} y={sms.y} s={smsS} /> : null}
        {d1 > 0 && d2 < 1 ? <MoneyDot x={dot.x} y={dot.y} r={14} /> : null}
        {f >= L(HIT.sent) && f < L(HIT.sent) + 18 ? <Ripple x={chipPt.x} y={chipPt.y} p={(f - L(HIT.sent)) / 18} r0={20} r1={80} /> : null}
      </Drift>
    </AbsoluteFill>
  );
};

export const S07Offline = () => <OfflineBody f={useF()} />;

