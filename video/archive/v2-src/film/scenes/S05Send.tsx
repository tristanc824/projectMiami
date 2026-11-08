import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { BankGlyph, body, Cam, Check, DotGrid, FlipPhone, FPhone, head, MoneyDot, Pill, Reveal, Rings } from "../kit";
import { colR, colX, HALF_L, HALF_R, onPhone, phoneAt, T } from "../layout";
import { CAM, clamp01, EASE_IN, EASE_IN_OUT, evenDots, hitIn, lerp, lineOut, lineT, Pt, PUSH, qpath, qpt, tAtLength, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { ARRIVED_BADGE, ArrivedScreen } from "../screens";

/*
 * 5. Send (bars 13-16). Two identical panel structures on the grid (cols 1-4 and 7-10), row for
 * row: title, route, node labels, "Arrives in"/"Arrived in", one big value, one chip. Old way: the
 * coin hops through three banks that pop on beats 2-4 of bar 13, each taking a slice on its kick;
 * $231 and "3-5 days" land on bar 14. Nest: the dot flies one arc in a beat while the timer counts
 * to 0.9 s, landing on bar 14 beat 3, whole. Bar 16: push into the coin, match cut to Mamá's
 * Arrived screen (the moss check badge), "No fee." on the word "fee".
 */

const FROM = SC.send.from;
const L = (abs: number) => abs - FROM;
const ARRIVE_SWAP = L(HIT.arrived) - 6;

const LX = colX(1); // 262
const LR = colR(4); // 806
const RX = colX(7); // 1114
const RR = colR(10); // 1658
const TITLE_Y = 244;
const ROUTE_Y = 420;
const NODE_LBL_Y = 482;
const ARR_Y = 576;
const VAL_Y = 620;
const CHIP_Y = 776;

const OLD_X = [0, 1, 2, 3, 4].map((i) => LX + ((LR - LX) * i) / 4);
const HOP_AT = [L(SC.send.from), L(HIT.bank1), L(HIT.bank2), L(HIT.bank3), L(HIT.oldArrives)];
const FEES = [6, 6, 7];
const hopC = (i: number): Pt => ({ x: (OLD_X[i] + OLD_X[i + 1]) / 2, y: ROUTE_Y - 70 });
const NM = { x: RX, y: ROUTE_Y };
const NB = { x: RR, y: ROUTE_Y };
const NC = { x: (RX + RR) / 2, y: ROUTE_Y - 250 };
const OLD_DOTS = [0, 1, 2, 3].flatMap((i) => evenDots({ x: OLD_X[i], y: ROUTE_Y }, hopC(i), { x: OLD_X[i + 1], y: ROUTE_Y }, 17).pts.slice(1, -1));
const NEST_DOTS = evenDots(NM, NC, NB, 17).pts.slice(1, -1);
const PH = phoneAt(HALF_L);

const oldCoin = (f: number) => {
  for (let i = 0; i < 4; i++) {
    const a = HOP_AT[i];
    const b = HOP_AT[i + 1];
    if (f < b) {
      const t = tween(f, [a + 1, b], [0, 1], EASE_IN_OUT);
      return { p: qpt({ x: OLD_X[i], y: ROUTE_Y }, hopC(i), { x: OLD_X[i + 1], y: ROUTE_Y }, t), paid: i };
    }
  }
  return { p: { x: OLD_X[4], y: ROUTE_Y }, paid: 3 };
};

const Coin = ({ x, y, value, paid, tone, s = 1 }: { x: number; y: number; value: string; paid: number; tone: "old" | "nest"; s?: number }) => {
  const size = 96;
  const missing = paid * 0.085;
  const bg = tone === "old" ? "#CEC6B6" : C.moss;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, transform: `scale(${s})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: missing > 0 ? `conic-gradient(from 0deg, transparent 0turn ${missing}turn, ${bg} ${missing}turn 1turn)` : bg, boxShadow: tone === "nest" ? "0 12px 28px -10px rgba(22,48,29,0.5)" : "0 10px 22px -12px rgba(40,40,30,0.35)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT, fontSize: T.m, fontWeight: 600, letterSpacing: "-0.03em", color: tone === "old" ? C.ink : "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
};

const Split = ({ f }: { f: number }) => {
  const k = useKick(f);
  const coin = oldCoin(f);
  const value = 250 - [0, 6, 12, 19][coin.paid];
  const fly = tween(f, [L(HIT.nestLaunch) - 1, L(HIT.nestLands)], [0, 1], EASE_IN_OUT);
  const dot = qpt(NM, NC, NB, tAtLength(NM, NC, NB, fly));
  const landed = hitIn(f, L(HIT.nestLands));
  const secs = Math.min(0.9, Math.floor(10 * 0.9 * fly + 1e-6) / 10);
  const rightD = qpath(NM, NC, NB);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080, background: "rgba(23,32,26,0.035)" }} />
      <div style={{ position: "absolute", left: 959, top: 0, width: 2, height: 1080, background: "#DDD7CB" }} />
      <DotGrid glow={k.glow} />
      {/* titles */}
      <div style={{ position: "absolute", left: LX, top: TITLE_Y }}><Reveal t={lineT(f, 0)}><div style={head(T.l, C.ink4)}>The old way</div></Reveal></div>
      <div style={{ position: "absolute", left: RX, top: TITLE_Y }}>
        <Reveal t={lineT(f, 6)}><div style={{ ...head(T.l), display: "flex", alignItems: "center", gap: 14 }}><Rings size={44} color={C.moss} />Nest</div></Reveal>
      </div>
      {/* routes */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {OLD_DOTS.map((p, i) => <circle key={`o${i}`} cx={p.x} cy={p.y} r={2.6} fill={C.ink4} opacity={0.45} />)}
        {NEST_DOTS.map((p, i) => <circle key={`n${i}`} cx={p.x} cy={p.y} r={2.6} fill={C.ink} opacity={0.35} />)}
        {fly > 0 ? <path d={rightD} fill="none" stroke={C.moss} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${fly} 2`} opacity={1 - tween(f, [L(HIT.nestLands) + 6, L(HIT.nestLands) + 30], [0, 0.7], (t) => t)} /> : null}
        {[OLD_X[0], OLD_X[4], RX, RR].map((x) => <circle key={x} cx={x} cy={ROUTE_Y} r={10} fill={x < 960 ? C.ink4 : C.ink} />)}
      </svg>
      {/* banks pop on beats 2-4 of bar 13 */}
      {[1, 2, 3].map((n) => {
        const s = hitIn(f, HOP_AT[n]);
        return (
          <React.Fragment key={n}>
            <div style={{ position: "absolute", left: OLD_X[n] - 6, top: ROUTE_Y - 6, width: 12, height: 12, borderRadius: 6, background: C.ink4, opacity: 0.35 * (1 - clamp01(s * 3)) }} />
            <div style={{ position: "absolute", left: OLD_X[n] - 44, top: ROUTE_Y - 44, width: 88, height: 88, borderRadius: "50%", background: "#FBFAF7", display: "grid", placeItems: "center", boxShadow: "0 8px 18px -10px rgba(40,40,30,0.45)", transform: `scale(${s})`, opacity: clamp01(s * 4) }}>
              <BankGlyph size={46} />
            </div>
            <div style={{ position: "absolute", left: OLD_X[n] - 60, width: 120, top: NODE_LBL_Y, display: "flex", justifyContent: "center", transform: `scale(${hitIn(f, HOP_AT[n])})`, opacity: clamp01(s * 4) }}>
              <div style={body(T.m, C.ink4, 600)}>−${FEES[n - 1]}</div>
            </div>
            {f >= HOP_AT[n] && f < HOP_AT[n] + 16 ? (
              <div style={{ position: "absolute", left: OLD_X[n] - 20 + (f - HOP_AT[n]) * 1.6, top: ROUTE_Y - 46 + 0.5 * 3.4 * (f - HOP_AT[n]) ** 2, width: 40, height: 40, opacity: 1 - tween(f, [HOP_AT[n] + 8, HOP_AT[n] + 16], [0, 1], (t) => t), transform: `rotate(${(f - HOP_AT[n]) * 9}deg)` }}>
                <svg viewBox="0 0 40 40" width={40} height={40}><path d="M20 20 L20 0 A20 20 0 0 1 36.2 8.2 Z" fill="#CEC6B6" /></svg>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <Coin x={coin.p.x} y={coin.p.y} value={`$${value}`} paid={coin.paid} tone="old" />
      {/* node labels: left-aligned under the start, right-aligned under the end */}
      {[[LX, "Miami", 0], [LR, "Buenos Aires", 0], [RX, "Miami", 6], [RR, "Buenos Aires", 6]].map(([x, name, d]) => (
        <div key={`${x}`} style={{ position: "absolute", left: (x as number) - 150, width: 300, top: NODE_LBL_Y + 6, display: "flex", justifyContent: "center" }}>
          <Reveal t={lineT(f, d as number, 1)}><div style={body(T.s)}>{name}</div></Reveal>
        </div>
      ))}
      {/* Nest: the dot flies, lands whole as the $250 coin */}
      {f < L(HIT.nestLands) - 1 ? <MoneyDot x={dot.x} y={dot.y} r={15 * k.scale} /> : <Coin x={NB.x} y={NB.y} value="$250" paid={0} tone="nest" s={landed * k.scale} />}
      {/* arrives in / arrived in */}
      <div style={{ position: "absolute", left: LX, top: ARR_Y }}><Reveal t={lineT(f, 0, 2)}><div style={body(T.m)}>Arrives in</div></Reveal></div>
      <div style={{ position: "absolute", left: RX, top: ARR_Y }}><Reveal t={lineT(f, 6, 2)}><div style={body(T.m)}>Arrived in</div></Reveal></div>
      <div style={{ position: "absolute", left: LX, top: VAL_Y }}><Reveal t={lineT(f, L(HIT.oldArrives))}><div style={head(T.xxl)}>3–5 days</div></Reveal></div>
      <div style={{ position: "absolute", left: RX, top: VAL_Y }}>
        <Reveal t={lineT(f, L(HIT.nestLaunch))}><div style={{ ...head(T.xxl, f >= L(HIT.nestLands) ? C.moss : C.ink), fontVariantNumeric: "tabular-nums" }}>{secs.toFixed(1)} s</div></Reveal>
      </div>
      {/* chips */}
      <div style={{ position: "absolute", left: LX, top: CHIP_Y, transform: `scale(${hitIn(f, L(HIT.feesChip))})`, transformOrigin: "0 50%" }}>
        <Pill bg="#E4DED2" color={C.ink}>−$19 in fees</Pill>
      </div>
      <div style={{ position: "absolute", left: RX, top: CHIP_Y, transform: `scale(${hitIn(f, L(HIT.zeroFee))})`, transformOrigin: "0 50%" }}>
        <Pill><span style={{ width: 34, height: 34, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center" }}><Check size={20} t={tween(f, [L(HIT.zeroFee) + 2, L(HIT.zeroFee) + 9], [0, 1])} /></span>$0 fee</Pill>
      </div>
    </AbsoluteFill>
  );
};

const Arrived = ({ f }: { f: number }) => {
  const k = useKick(f);
  const badge = onPhone(PH, ARRIVED_BADGE.x, ARRIVED_BADGE.y);
  const inT = tween(f, [ARRIVE_SWAP, L(HIT.arrived)], [0, 1], CAM);
  const flip = tween(f, [SC.send.dur - 12, SC.send.dur - SC.claim.swap], [0, 1], EASE_IN);
  return (
    <AbsoluteFill>
      <DotGrid glow={k.glow} />
      <Cam z={lerp(5, 1, inT)} ox={badge.x} oy={badge.y} blur={(1 - inT) * 8}>
        <FlipPhone ph={PH} angle={flip * 90}>
          <FPhone><ArrivedScreen check={tween(f, [L(HIT.arrived), L(HIT.arrived) + 8], [0, 1])} /></FPhone>
        </FlipPhone>
        <div style={{ position: "absolute", left: HALF_R - 400, width: 800, top: 540 - (T.xxl * 1.05) / 2, display: "flex", justifyContent: "center" }}>
          <Reveal t={lineT(f, L(HIT.arrived))} out={lineOut(f, SC.send.dur - 12)}>
            <div style={{ ...head(T.xxl), transform: `scale(${k.scale})` }}>No fee.</div>
          </Reveal>
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

export const SendBody = ({ f }: { f: number }) => {
  if (f >= ARRIVE_SWAP) return <Arrived f={f} />;
  const inT = tween(f, [-SC.send.swap, 0], [0, 1], CAM);
  const go = tween(f, [L(HIT.arrived) - 12, ARRIVE_SWAP], [0, 1], PUSH);
  return (
    <AbsoluteFill>
      <Cam z={lerp(1.5, 1, inT) * (1 + 4 * go)} ox={go > 0 ? NB.x : 960} oy={go > 0 ? NB.y : 540} blur={(1 - inT) * 10 + go * 8}>
        <Drift f={f}>
          <Split f={f} />
        </Drift>
      </Cam>
    </AbsoluteFill>
  );
};

export const S05Send = () => <SendBody f={useF()} />;

