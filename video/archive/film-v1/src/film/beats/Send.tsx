import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../../theme";
import { clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, lerp, spr, SPRING, track, tween } from "../../ui/anim";
import { NestMark } from "../../ui/NestMark";
import { PageBg } from "../../ui/Stage";
import { ConfirmScreen, SlideToSend } from "../../ui/screens";
import {
  BankGlyph, BigChip, CAM, Caption, Check, FLOAT, FPhone, MBlur, MoneyDot, onPhone, PhoneAt, PUSH, pushIn, PushScreens, qpath, qpt, Reveal, Ripple, Zoom,
} from "../kit";
import { IcClock } from "../icons";
import {
  FHome, ARRIVED_BADGE, ArrivedScreen, ChatScreen, CLAIM_BTN, ClaimScreen, LINK_CARD, OfflineSentScreen, QUEUED_CARD, QueuedScreen,
} from "../screens";

const PY0 = (1080 - 844 * 1.12) / 2;

/** A big value that rolls to the next text at each `at` frame (masked). */
const Roller = ({ items, f, size, color, style }: { items: { at: number; text: string; color?: string }[]; f: number; size: number; color: string; style?: React.CSSProperties }) => {
  let i = -1;
  for (let k = 0; k < items.length; k++) if (f >= items[k].at) i = k;
  if (i < 0) return <div style={{ height: size * 1.12, ...style }} />;
  const t = tween(f, [items[i].at, items[i].at + 10], [0, 1], EASE_OUT);
  return (
    <div style={{ position: "relative", height: size * 1.12, overflow: "hidden", fontSize: size, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.12, fontVariantNumeric: "tabular-nums", ...style }}>
      <div style={{ transform: `translateY(${(1 - t) * 100}%)`, color: items[i].color ?? color }}>{items[i].text}</div>
      {i > 0 && t < 1 ? <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-t * 100}%)`, color: items[i - 1].color ?? color }}>{items[i - 1].text}</div> : null}
    </div>
  );
};

/* ================================================================== beat 6: the old way vs Nest, then Arrived */

const RY = 540;
const LX = [110, 290, 480, 670, 850];
const HOPS = [[12, 30], [40, 58], [68, 86], [96, 114]];
const FEES = [6, 6, 7];
const RM = { x: 1070, y: RY };
const RB = { x: 1810, y: RY };
const RC = { x: 1440, y: RY - 270 };
const LAUNCH = 78;
const LAND = 100;
const ARRIVE_AT = 196;
const PHA = { x: 960 - 195 * 1.3, y: 40, k: 1.3 };

const hopCtrl = (i: number) => ({ x: (LX[i] + LX[i + 1]) / 2, y: RY - 80 });

const oldCoin = (f: number) => {
  let at = { x: LX[0], y: RY };
  let paid = 0;
  for (let i = 0; i < HOPS.length; i++) {
    const [a, b] = HOPS[i];
    if (f >= b) {
      at = { x: LX[i + 1], y: RY };
      if (i < 3) paid = i + 1;
    } else if (f > a) {
      at = qpt({ x: LX[i], y: RY }, hopCtrl(i), { x: LX[i + 1], y: RY }, (f - a) / (b - a));
      break;
    } else break;
  }
  return { ...at, paid };
};

const Coin = ({ x, y, value, paid, tone }: { x: number; y: number; value: string; paid: number; tone: "old" | "nest" }) => {
  const size = 104;
  const missing = paid * 0.09;
  const bg = tone === "old" ? "#CFC8BB" : C.moss;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: missing > 0 ? `conic-gradient(from 0deg, transparent 0turn ${missing}turn, ${bg} ${missing}turn 1turn)` : bg, boxShadow: tone === "nest" ? "0 12px 30px -10px rgba(22,48,29,0.55)" : "0 10px 24px -12px rgba(40,40,30,0.4)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: tone === "old" ? C.ink : "#fff" }}>{value}</div>
    </div>
  );
};

const RouteDots = ({ d, color, opacity = 0.45 }: { d: string; color: string; opacity?: number }) => (
  <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 14" />
);

const EndNode = ({ x, y, name, color = C.ink }: { x: number; y: number; name: string; color?: string }) => (
  <>
    <div style={{ position: "absolute", left: x - 10, top: y - 10, width: 20, height: 20, borderRadius: "50%", background: color }} />
    <div style={{ position: "absolute", left: x - 150, width: 300, top: y + 64, textAlign: "center", fontSize: 30, fontWeight: 600, color: C.ink4, letterSpacing: "-0.02em" }}>{name}</div>
  </>
);

const Split = ({ f }: { f: number }) => {
  const { fps } = useVideoConfig();
  const coin = oldCoin(f);
  const value = 250 - FEES.slice(0, coin.paid).reduce((a, b) => a + b, 0);
  const arrivals = [30, 58, 86];
  const dotPop = spr(f, fps, 20, SPRING.pop);
  const pill = spr(f, fps, 28, SPRING.float);
  const slide = tween(f, [50, 72], [0, 1], EASE_IN_OUT);
  const pillOut = tween(f, [74, 86], [0, 1], EASE_IN);
  const fly = tween(f, [LAUNCH, LAND], [0, 1], EASE_IN_OUT);
  const dot = qpt(RM, RC, RB, fly);
  const landed = spr(f, fps, LAND, SPRING.pop);
  const secs = Math.min(0.9, Math.max(0, (f - LAUNCH) / 24));
  const leftD = LX.slice(0, -1).map((x, i) => qpath({ x, y: RY }, hopCtrl(i), { x: LX[i + 1], y: RY })).join(" ");
  const rightD = qpath(RM, RC, RB);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080, background: "#E6E3DC" }} />
      <div style={{ position: "absolute", left: 959, top: 0, width: 2, height: 1080, background: "#D9D3C6" }} />
      <div style={{ position: "absolute", left: 0, width: 960, top: 118, display: "flex", justifyContent: "center" }}>
        <Reveal t={tween(f, [6, 22], [0, 1])}><div style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.035em", color: C.ink4 }}>The old way</div></Reveal>
      </div>
      <div style={{ position: "absolute", left: 960, width: 960, top: 118, display: "flex", justifyContent: "center" }}>
        <Reveal t={tween(f, [10, 26], [0, 1])}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 48, fontWeight: 600, letterSpacing: "-0.035em" }}><NestMark size={50} color={C.moss} />Nest</div>
        </Reveal>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <RouteDots d={leftD} color={C.ink4} />
        <RouteDots d={rightD} color={C.ink} opacity={0.4} />
        <path d={rightD} fill="none" stroke={C.moss} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={`${fly} 2`} opacity={1 - tween(f, [LAND + 20, LAND + 60], [0, 0.75])} />
      </svg>

      {/* old way */}
      <EndNode x={LX[0]} y={RY} name="Miami" color={C.ink4} />
      <EndNode x={LX[4]} y={RY} name="Buenos Aires" color={C.ink4} />
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ position: "absolute", left: LX[n] - 46, top: RY - 46, width: 92, height: 92, borderRadius: "50%", background: "#F5F3EF", display: "grid", placeItems: "center", boxShadow: "0 6px 16px -10px rgba(40,40,30,0.4)" }}>
          <BankGlyph size={50} />
        </div>
      ))}
      {arrivals.map((a, i) => {
        if (f < a) return null;
        const t = f - a;
        const tag = spr(f, fps, a, SPRING.pop);
        return (
          <React.Fragment key={a}>
            <div style={{ position: "absolute", left: LX[i + 1] - 22 + t * 1.5, top: RY - 52 + 0.5 * 3.2 * t * t, width: 44, height: 44, opacity: 1 - tween(t, [14, 22], [0, 1]), transform: `rotate(${t * 9}deg)` }}>
              <svg viewBox="0 0 44 44" width={44} height={44}><path d="M22 22 L22 0 A22 22 0 0 1 40 10 Z" fill="#CFC8BB" /></svg>
            </div>
            <div style={{ position: "absolute", left: LX[i + 1] - 60, width: 120, top: RY + 62, textAlign: "center", fontSize: 30, fontWeight: 600, color: C.ink4, transform: `scale(${tag})` }}>−${FEES[i]}</div>
          </React.Fragment>
        );
      })}
      {f >= 10 ? <Coin x={coin.x} y={coin.y} value={`$${value}`} paid={coin.paid} tone="old" /> : null}
      <div style={{ position: "absolute", left: 0, width: 960, top: 682, textAlign: "center" }}>
        <Reveal t={tween(f, [12, 26], [0, 1])}><div style={{ fontSize: 34, fontWeight: 500, color: C.ink4 }}>Arrives in</div></Reveal>
        <Roller f={f} size={110} color={C.ink4} items={[{ at: 14, text: "Day 1" }, { at: 44, text: "Day 2" }, { at: 72, text: "Day 3" }, { at: 116, text: "3–5 days", color: C.ink }]} />
      </div>
      <div style={{ position: "absolute", left: 0, width: 960, top: 900, display: "flex", justifyContent: "center", transform: `scale(${spr(f, fps, 118, SPRING.pop)})` }}>
        <BigChip size={40} bg="#D9D3C6" color={C.ink}>−$19 in fees</BigChip>
      </div>

      {/* Nest */}
      <EndNode x={RM.x} y={RM.y} name="Miami" />
      <EndNode x={RB.x} y={RB.y} name="Buenos Aires" />
      {f < LAND ? <MoneyDot x={dot.x} y={dot.y} r={15 * dotPop} /> : null}
      {f >= LAND ? (
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${landed})`, transformOrigin: `${RB.x}px ${RB.y}px` }}>
          <Coin x={RB.x} y={RB.y} value="$250" paid={0} tone="nest" />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 960, width: 960, top: 682, textAlign: "center", opacity: f >= LAUNCH - 4 ? 1 : 0 }}>
        <Reveal t={tween(f, [LAUNCH - 4, LAUNCH + 8], [0, 1])}><div style={{ fontSize: 34, fontWeight: 500, color: C.ink4 }}>Arrived in</div></Reveal>
        <div style={{ fontSize: 110, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.12, fontVariantNumeric: "tabular-nums", color: f >= LAND ? C.moss : C.ink }}>{secs.toFixed(1)} s</div>
      </div>
      <div style={{ position: "absolute", left: 960, width: 960, top: 900, display: "flex", justifyContent: "center", transform: `scale(${spr(f, fps, 136, SPRING.pop)})` }}>
        <BigChip size={40}>$0 fee</BigChip>
      </div>
      {pill > 0.001 && pillOut < 1 ? (
        <div style={{ position: "absolute", left: 1440 - 320, top: 900 + (1 - pill) * 120 + pillOut * 260, opacity: clamp01(pill * 1.6) * (1 - pillOut), borderRadius: 999, boxShadow: FLOAT }}>
          <SlideToSend progress={slide} width={640} height={104} fontSize={36} complete={tween(f, [70, 76], [0, 1])} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Arrived = ({ a, exit }: { a: number; exit: number }) => {
  const { fps } = useVideoConfig();
  const t = tween(a, [0, 20], [0, 1], CAM);
  const badge = onPhone(PHA, ARRIVED_BADGE.x, ARRIVED_BADGE.y);
  return (
    <PageBg>
      <MBlur x={Math.sin(Math.PI * exit) * 36 + exit * 10}>
        <AbsoluteFill style={{ transform: `translateX(${-exit * 1920}px)` }}>
          <Zoom z={lerp(2.6, 1, t)} ox={badge.x} oy={badge.y} blur={(1 - t) * 10}>
            <PhoneAt {...PHA}>
              <FPhone><ArrivedScreen badge={1} check={tween(a, [6, 16], [0, 1])} /></FPhone>
            </PhoneAt>
            <Caption lines={["No fee."]} at={14} x={1300} y={420} size={104} sub="Sunday, 9:41 PM" width={600} />
          </Zoom>
        </AbsoluteFill>
      </MBlur>
    </PageBg>
  );
};

export const B06Send = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  // VO: "My bank took days." (0.45-2.1 s) "Now she has it in about a second," (2.5-4.4 s) "and neither of us pays a fee." (4.6-6.2 s)
  if (f >= ARRIVE_AT) return <Arrived a={f - ARRIVE_AT} exit={tween(f, [dur - 13, dur], [0, 1], PUSH)} />;
  const enter = pushIn(f, 16);
  const go = tween(f, [ARRIVE_AT - 14, ARRIVE_AT], [0, 1], PUSH);
  return (
    <PageBg>
      <Zoom z={enter.z * (1 + go * 6)} ox={RB.x} oy={RB.y} tx={lerp(RB.x, 960, go)} ty={lerp(RB.y, 540, go)} blur={enter.blur + go * 14}>
        <Split f={f} />
      </Zoom>
    </PageBg>
  );
};

/* ================================================================== beat 7: the claim link */

const PH7 = { x: 700 - 195 * 1.12, y: PY0, k: 1.12 };

export const B07Claim = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // VO: "She doesn't even need the app." (0.5-2 s) "She just taps the link." (2.3-3.55 s)
  const enter = tween(f, [0, 14], [0, 1], CAM);
  const exit = tween(f, [dur - 12, dur], [0, 1], PUSH);
  const cardIn = spr(f, fps, 6, SPRING.ui);
  const morph = tween(f, [22, 46], [0, 1], (t) => t);
  const press = tween(f, [63, 66], [0, 1]) * (1 - tween(f, [68, 72], [0, 1]));
  const push = tween(f, [70, 84], [0, 1], EASE_IN_OUT);
  const press2 = tween(f, [89, 92], [0, 1]) * (1 - tween(f, [94, 98], [0, 1]));
  const drop = tween(f, [92, 102], [0, 1], EASE_IN);
  const claimed = tween(f, [101, 110], [0, 1], EASE_OUT);
  return (
    <PageBg>
      <MBlur x={(1 - enter) * 34} y={exit * 30}>
        <AbsoluteFill style={{ transform: `translate(${(1 - enter) * 1920}px, ${-exit * 700}px)` }}>
          <PhoneAt {...PH7}>
            <FPhone light={push > 0.5}>
              <PushScreens
                t={push}
                from={<><ChatScreen cardIn={cardIn} morph={morph} frame={f} press={press} /><Ripple x={LINK_CARD.x} y={LINK_CARD.y} t={f - 66} /></>}
                to={<><ClaimScreen claimed={claimed} press={press2} /><Ripple x={CLAIM_BTN.x} y={CLAIM_BTN.y} t={f - 92} color="255,255,255" /></>}
              />
              {drop > 0 && drop < 1 ? <MoneyDot x={CLAIM_BTN.x} y={lerp(70, CLAIM_BTN.y, drop)} r={11} ring /> : null}
            </FPhone>
          </PhoneAt>
          <Caption lines={["No app", "needed."]} at={12} x={1140} y={370} size={112} sub="She just taps the link." subAt={56} subSize={42} />
        </AbsoluteFill>
      </MBlur>
    </PageBg>
  );
};

/* ================================================================== beat 8: offline */

const PH8 = { x: 640 - 195 * 1.12, y: PY0, k: 1.12 };
const ICONS = onPhone(PH8, 318, 30);
const TOWER = { x: 1490, top: 470, base: 900 };

const Tower = ({ live, pulse }: { live: number; pulse: number }) => (
  <div style={{ position: "absolute", left: TOWER.x - 120, top: TOWER.top - 40, width: 240, height: TOWER.base - TOWER.top + 60, opacity: 0.32 + 0.68 * live }}>
    <svg viewBox="0 0 240 490" width={240} height={490} style={{ overflow: "visible" }}>
      <g fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 470 L120 60 L170 470" />
        <path d="M89 316 L151 316 M80 390 L160 390 M98 240 L142 240 M106 170 L134 170" />
        <path d="M89 316 L142 240 M151 316 L98 240 M80 390 L151 316 M160 390 L89 316" strokeWidth={3.5} opacity={0.6} />
        <path d="M40 470 L200 470" />
      </g>
      <circle cx={120} cy={40} r={12} fill={C.moss} opacity={0.4 + 0.6 * live} />
      {[0, 1, 2].map((i) => {
        const p = clamp01((pulse - i * 0.18) / 0.64);
        if (p <= 0 || p >= 1) return null;
        const r = 30 + p * 120;
        return <circle key={i} cx={120} cy={40} r={r} fill="none" stroke={C.moss} strokeWidth={4} opacity={(1 - p) * 0.7} />;
      })}
      {[38, 62].map((r) => (
        <g key={r} fill="none" stroke={C.moss} strokeWidth={5} strokeLinecap="round" opacity={live * 0.55}>
          <path d={`M${120 - r} ${40 - r * 0.6} A${r} ${r} 0 0 0 ${120 - r} ${40 + r * 0.6}`} />
          <path d={`M${120 + r} ${40 - r * 0.6} A${r} ${r} 0 0 1 ${120 + r} ${40 + r * 0.6}`} />
        </g>
      ))}
    </svg>
  </div>
);

const SmsBubble = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <div style={{ position: "absolute", left: x - 74, top: y - 36, width: 148, height: 72, transform: `scale(${s})`, fontFamily: FONT }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 36, background: C.white, boxShadow: FLOAT, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 32, fontWeight: 600, color: C.moss }}>
      <NestMark size={30} color={C.moss} />SMS
    </div>
    <div style={{ position: "absolute", left: 22, bottom: -9, width: 22, height: 22, background: C.white, transform: "rotate(45deg)", borderRadius: 4 }} />
  </div>
);

export const B08Offline = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // VO: "Without Wi-Fi, it sends by text." (0.3-2.7 s) "With no signal at all," (3-4.3 s) "it waits and sends when I'm back online." (4.5-6.9 s)
  const enter = tween(f, [0, 14], [0, 1], CAM);
  const c = tween(f, [22, 46], [0, 1], EASE_IN_OUT);
  const z = lerp(3.2, 1, c);
  const wifi = 1 - tween(f, [8, 20], [0, 1]);
  const bars = f < 120 ? 4 * (1 - tween(f, [76, 86], [0, 1])) : 4 * tween(f, [136, 150], [0, 1]);
  const net =
    f < 84
      ? { wifi, bars, tag: "No data", tagT: tween(f, [16, 26], [0, 1]) }
      : { wifi: 0, bars, tag: "No service", tagT: tween(f, [84, 92], [0, 1]) * (1 - tween(f, [136, 142], [0, 1])), tagColor: C.ink4 };
  const slide = tween(f, [46, 58], [0, 1], EASE_IN_OUT);
  const t0 = tween(f, [28, 40], [0, 1], EASE_IN_OUT);
  const t1 = tween(f, [68, 80], [0, 1], EASE_IN_OUT);
  const t2 = tween(f, [88, 100], [0, 1], EASE_IN_OUT);
  const sent = tween(f, [164, 170], [0, 1]);
  // SMS hop, then (later) the queued money hops once the bars are back.
  const from = onPhone(PH8, 195, 690);
  const ant = { x: TOWER.x, y: TOWER.top };
  const hopC = { x: 1100, y: 240 };
  const h1 = tween(f, [56, 72], [0, 1], EASE_IN_OUT);
  const h2 = tween(f, [150, 164], [0, 1], EASE_IN_OUT);
  const live = f < 76 ? 1 : f < 136 ? 1 - tween(f, [76, 86], [0, 1]) : tween(f, [136, 150], [0, 1]);
  const pulse = f < 120 ? tween(f, [72, 96], [0, 1]) : tween(f, [164, 188], [0, 1]);
  const chip = spr(f, fps, 98, SPRING.pop);
  const flip = spr(f, fps, 164, SPRING.pop);
  const card = onPhone(PH8, QUEUED_CARD.x, QUEUED_CARD.y);

  return (
    <PageBg>
      <MBlur y={(1 - enter) * 26}>
        <AbsoluteFill style={{ transform: `translateY(${(1 - enter) * 650}px)` }}>
          <Zoom z={z} ox={ICONS.x} oy={ICONS.y} tx={lerp(960, ICONS.x, c)} ty={lerp(540, ICONS.y, c)}>
            <Tower live={live} pulse={pulse} />
            <PhoneAt {...PH8}>
              <FPhone net={net}>
                {t2 > 0 ? (
                  <PushScreens t={t2} from={<OfflineSentScreen />} to={<QueuedScreen sent={sent} />} />
                ) : (
                  t1 > 0 ? <PushScreens t={t1} from={<ConfirmScreen slide={slide} />} to={<OfflineSentScreen />} /> : <PushScreens t={t0} from={<FHome />} to={<ConfirmScreen slide={slide} />} />
                )}
              </FPhone>
            </PhoneAt>
            {h1 > 0 && h1 < 1 ? (() => { const p = qpt(from, hopC, ant, h1); return <SmsBubble x={p.x} y={p.y} s={tween(h1, [0, 0.15], [0.3, 1]) * (1 - tween(h1, [0.85, 1], [0, 0.6]))} />; })() : null}
            {h2 > 0 && h2 < 1 ? (() => { const p = qpt(onPhone(PH8, 195, 150), hopC, ant, h2); return <MoneyDot x={p.x} y={p.y} r={15} />; })() : null}
            {chip > 0.001 ? (
              <div style={{ position: "absolute", left: card.x + 36, top: card.y - 34, transform: `scale(${chip * (f >= 164 ? 0.9 + 0.1 * flip : 1)})`, transformOrigin: "0 50%" }}>
                {f < 164 ? (
                  <BigChip size={36} bg={C.amber1} color={C.amber} style={{ boxShadow: FLOAT }}><IcClock size={34} />Queued</BigChip>
                ) : (
                  <BigChip size={36} style={{ boxShadow: FLOAT }}><span style={{ width: 36, height: 36, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center" }}><Check size={22} t={tween(f, [166, 174], [0, 1])} /></span>Sent</BigChip>
                )}
              </div>
            ) : null}
            <Caption lines={["Sends by text."]} at={40} out={78} x={1110} y={150} size={88} width={780} />
            <Caption lines={["No signal?", "It waits."]} at={92} x={1110} y={150} size={88} width={780} />
          </Zoom>
        </AbsoluteFill>
      </MBlur>
    </PageBg>
  );
};

export { track };
