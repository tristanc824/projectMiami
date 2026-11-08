import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { Avatar } from "../../ui/Atoms";
import { NestMark } from "../../ui/NestMark";
import { IcKey, IcLock, IcSend } from "../icons";
import { body, Cam, Check, DotGrid, FLOAT, Fingerprint, head, Reveal } from "../kit";
import { colX, span, T } from "../layout";
import { CAM, clamp01, EASE_OUT, hitIn, lerp, lineT, pulse, PUSH, settle, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { at, HIT, SC } from "../timeline";

/*
 * 11. Security (bars 33-35). Three equal cards in one even row (cols 1-4, 5-8, 9-12: the full
 * content width, 24 px gutters), no scrolling. Each card lands on its bar's kick; its inner
 * animation fires on beat 3 (fingerprint check, the Lock toggle, the card arriving on Mamá's
 * phone). The landed cards breathe on the beats of bar 35, then the camera pulls back to the map.
 */

const FROM = SC.security.from;
const L = (abs: number) => abs - FROM;
const CW = span(4); // 544
const CH = 688;
const CY0 = 540 - CH / 2;
const XS = [colX(0), colX(4), colX(8)];
const LAND = [L(HIT.card1), L(HIT.card2), L(HIT.card3)];
const FX = [L(HIT.card1Fx), L(HIT.card2Fx), L(HIT.card3Fx)];
const BREATHE = [at(35, 1), at(35, 2), at(35, 3), at(35, 4)].map(L);
const CARDS = [
  { title: "Only you can approve", sub: "With your fingerprint or PIN." },
  { title: "Lock Nest", sub: "Stops all sends until you unlock." },
  { title: "Trusted contact", sub: "Mamá can help you get back in." },
];

const FingerprintVisual = ({ t, fx }: { t: number; fx: number }) => {
  const b = hitIn(fx, 0);
  return (
    <div style={{ position: "relative", width: 236, height: 236, borderRadius: 68, background: C.sage1, display: "grid", placeItems: "center" }}>
      <Fingerprint size={150} draw={tween(t, [0, 20], [0, 1], (x) => x)} />
      <div style={{ position: "absolute", right: -16, bottom: -16, width: 84, height: 84, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", boxShadow: "0 0 0 8px #fff", transform: `scale(${b})` }}>
        <Check size={44} t={tween(fx, [2, 10], [0, 1], EASE_OUT)} />
      </div>
    </div>
  );
};

const LockVisual = ({ fx }: { fx: number }) => {
  const on = clamp01(hitIn(fx, 0));
  const dimT = tween(fx, [2, 10], [0, 1], EASE_OUT);
  return (
    <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ height: 96, borderRadius: 30, background: C.page, display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: C.sage1, color: C.moss, display: "grid", placeItems: "center" }}><IcKey size={30} /></div>
        <div style={{ flex: 1, fontSize: T.m, fontWeight: 600, letterSpacing: "-0.025em" }}>Lock Nest</div>
        <div style={{ width: 78, height: 46, borderRadius: 46, background: on > 0.5 ? C.moss : "#D9D4C8", position: "relative" }}>
          <div style={{ position: "absolute", top: 4, left: 4 + 32 * Math.min(1.08, hitIn(fx, 0)), width: 38, height: 38, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }} />
        </div>
      </div>
      <div style={{ height: 84, borderRadius: 999, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontSize: T.m, fontWeight: 600, letterSpacing: "-0.02em", opacity: 1 - 0.7 * dimT }}>
        {dimT > 0.5 ? <IcLock size={30} /> : <IcSend size={30} />}Send
      </div>
    </div>
  );
};

const TrustedVisual = ({ fx }: { fx: number }) => {
  const n = settle(fx, 0);
  return (
    <div style={{ width: 210, height: 392, borderRadius: 40, position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #E4ECDF 0%, #F3F0EA 75%)", boxShadow: "0 0 0 7px #0F1511, 0 0 0 8px #2B3530, 0 24px 48px -22px rgba(10,22,14,0.5)" }}>
      <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 66, height: 20, borderRadius: 12, background: "#0B0F0C" }} />
      <div style={{ position: "absolute", top: 54, left: 0, right: 0, textAlign: "center", fontSize: 58, fontWeight: 600, letterSpacing: "-0.05em", color: C.moss9 }}>9:41</div>
      <div style={{ position: "absolute", top: 124, left: 0, right: 0, textAlign: "center", fontSize: 14, fontWeight: 500, color: C.ink4 }}>Mamá's phone</div>
      <div style={{ position: "absolute", left: 10, right: 10, top: lerp(70, 168, n), opacity: clamp01(n * 2.5), background: "rgba(255,255,255,0.97)", borderRadius: 18, padding: "11px 12px", boxShadow: "0 12px 26px -14px rgba(22,48,29,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C.ink4 }}><NestMark size={15} color={C.moss} />Nest</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7 }}>
          <Avatar who="ana" size={30} />
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}>Ana made you her trusted contact.</div>
        </div>
      </div>
    </div>
  );
};

export const SecurityBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const inT = tween(f, [-SC.security.swap, 0], [0, 1], CAM);
  const back = tween(f, [SC.security.dur - 12, SC.security.dur - SC.close.swap], [0, 1], PUSH);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink }}>
      <Cam z={lerp(1.35, 1, inT) * lerp(1, 0.7, back)} blur={(1 - inT) * 10 + back * 10}>
        <Drift f={f}>
          <DotGrid glow={k.glow} />
          {CARDS.map((c, i) => {
            const s = hitIn(f, LAND[i]);
            if (f < LAND[i]) return null;
            const fx = f - FX[i];
            const breathe = i < 2 ? 1 + 0.012 * Math.max(...BREATHE.map((b) => pulse(f, b, 10))) : 1;
            const ks = f >= LAND[i] + 10 ? k.scale : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute", left: XS[i], top: CY0, width: CW, height: CH, borderRadius: 48, background: C.white, boxShadow: FLOAT,
                  transform: `translateY(${((1 - s) * 70).toFixed(2)}px) scale(${((0.92 + 0.08 * s) * breathe * ks).toFixed(4)})`, opacity: clamp01(s * 3),
                }}
              >
                <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 400, display: "grid", placeItems: "center" }}>
                  {i === 0 ? <FingerprintVisual t={f - LAND[i]} fx={fx} /> : i === 1 ? <LockVisual fx={fx} /> : <TrustedVisual fx={fx} />}
                </div>
                <div style={{ position: "absolute", left: 40, right: 40, top: 476, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <Reveal t={lineT(f, LAND[i])}><div style={head(T.l)}>{c.title}</div></Reveal>
                  <Reveal t={lineT(f, LAND[i], 1)} style={{ marginTop: 14 }}><div style={{ ...body(T.m), whiteSpace: "normal" }}>{c.sub}</div></Reveal>
                </div>
              </div>
            );
          })}
        </Drift>
      </Cam>
    </AbsoluteFill>
  );
};

export const S11Security = () => <SecurityBody f={useF()} />;
