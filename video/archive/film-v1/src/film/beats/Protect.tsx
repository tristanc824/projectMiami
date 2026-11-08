import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../../theme";
import { clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, lerp, spr, SPRING, tween } from "../../ui/anim";
import { PageBg } from "../../ui/Stage";
import { fmtClock, SendToScreen } from "../../ui/screens";
import { BigChip, Check, FPhone, MBlur, mix, MoneyDot, NIGHT, onPhone, PhoneAt, PUSH, pushIn, PushScreens, qpath, qpt, Reveal, Ripple, Zoom } from "../kit";
import { IcUndo } from "../icons";
import { ScamScreen, SCAM_HOLD, SCAM_TILE } from "../screens";
import { fmtUsd } from "../screens";
import { BEATS } from "../timeline";

const PY0 = (1080 - 844 * 1.12) / 2;

/* ================================================================== beat 9: the plain grey message */

const BUBBLE = { x: 430, y: 430 };

const ScamBubble = ({ f }: { f: number }) => {
  const { fps } = useVideoConfig();
  const s = spr(f, fps, 44, SPRING.ui);
  const buzz = f >= 44 && f < 56 ? Math.sin(f * 2.7) * 7 * (1 - (f - 44) / 12) : 0;
  return (
    <div
      style={{
        position: "absolute", left: BUBBLE.x + buzz, top: BUBBLE.y, maxWidth: 1060, background: "#2A2E2B", color: "#F1F3F1",
        borderRadius: "56px 56px 56px 16px", padding: "34px 48px", fontSize: 62, lineHeight: 1.2, letterSpacing: "-0.02em", fontWeight: 500,
        opacity: clamp01(s * 1.6), transform: `translateY(${(1 - s) * 40}px) scale(${0.94 + 0.06 * s})`, transformOrigin: "0 100%",
      }}
    >
      Ana, it's Mamá. New number.<br />Send it here.
    </div>
  );
};

const ScamHeader = ({ f }: { f: number }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 268, textAlign: "center" }}>
    <Reveal t={tween(f, [4, 20], [0, 1])} style={{ display: "flex", justifyContent: "center" }}><div style={{ fontSize: 40, fontWeight: 600, color: "#B4BBB6", letterSpacing: "-0.01em" }}>+54 9 11 5555 0142</div></Reveal>
    <Reveal t={tween(f, [8, 24], [0, 1])} style={{ display: "flex", justifyContent: "center", marginTop: 10 }}><div style={{ fontSize: 30, fontWeight: 500, color: "#7D857F" }}>Text Message · Today 9:38 PM</div></Reveal>
  </div>
);

export const B09Scam = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  // VO: "Then one night," (0.5-1.5 s) "I got this." (1.8-2.65 s)
  const typing = f >= 14 && f < 44 ? spr(f, 24, 14, SPRING.ui) : 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 40%, #1B201D 0%, ${NIGHT} 70%)`, fontFamily: FONT }}>
      <Zoom z={tween(f, [0, dur], [1, 1.05], EASE_IN_OUT)}>
        <ScamHeader f={f} />
        {typing > 0 ? (
          <div style={{ position: "absolute", left: BUBBLE.x, top: BUBBLE.y, width: 170, height: 92, borderRadius: "46px 46px 46px 14px", background: "#2A2E2B", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, opacity: typing, transform: `scale(${0.8 + 0.2 * typing})`, transformOrigin: "0 100%" }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: "#8B938D", opacity: 0.4 + 0.6 * Math.max(0, Math.sin(f / 3 - i * 0.9)) }} />)}
          </div>
        ) : null}
        <ScamBubble f={f} />
      </Zoom>
    </AbsoluteFill>
  );
};

/* ================================================================== beat 10: the scam check */

export const PH10 = { x: 600 - 195 * 1.12, y: PY0, k: 1.12 };
const NEWROW = { x: 195, y: 480 };
const FACTS = ["New number", "First payment", "$500 is a lot"];

/** The whole beat-10 picture at frame f (beat 11 opens on its final state). */
const CheckScene = ({ f, holdFill = 0 }: { f: number; holdFill?: number }) => {
  const { fps } = useVideoConfig();
  const rise = spr(f, fps, 2, SPRING.float);
  const ph = { ...PH10, y: PH10.y + (1 - rise) * 1000 };
  const rowGlow = tween(f, [20, 28], [0, 1]);
  const push = tween(f, [32, 44], [0, 1], EASE_IN_OUT);
  const reasons = tween(f, [52, 62], [0, 1]) + tween(f, [66, 76], [0, 1]) + tween(f, [80, 90], [0, 1]);
  const tile = spr(f, fps, 40, SPRING.pop);
  const head = tween(f, [42, 56], [0, 1]);
  const tileS = onPhone(PH10, SCAM_TILE.x, SCAM_TILE.y);
  const wash = tween(f, [40, 72], [0, 2400], EASE_IN_OUT);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <AbsoluteFill style={{ background: "radial-gradient(110% 85% at 30% 25%, #F9F0DE 0%, #F4E7CC 60%, #EADAB8 100%)", clipPath: `circle(${wash}px at ${tileS.x}px ${tileS.y}px)` }} />
      <PhoneAt {...ph}>
        <FPhone>
          <PushScreens
            t={push}
            from={<><SendToScreen rowGlow={rowGlow} /><Ripple x={NEWROW.x} y={NEWROW.y} t={f - 26} color="138,90,16" /></>}
            to={<ScamScreen reasons={reasons} tile={tile} head={head} holdFill={holdFill} />}
          />
        </FPhone>
      </PhoneAt>
      <div style={{ position: "absolute", left: 1060, top: 300 }}>
        <Reveal t={tween(f, [44, 60], [0, 1])}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 44, fontWeight: 600, color: C.amber, letterSpacing: "-0.025em" }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: C.amber, color: C.amber1, display: "grid", placeItems: "center", fontSize: 38, fontWeight: 700 }}>!</div>
            Scam check
          </div>
        </Reveal>
        {FACTS.map((t, i) => {
          const a = 52 + i * 14;
          const dot = spr(f, fps, a, SPRING.pop);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 26, marginTop: i === 0 ? 50 : 30 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.amber, transform: `scale(${dot})`, flex: "none" }} />
              <Reveal t={tween(f, [a, a + 16], [0, 1])}><div style={{ fontSize: 72, fontWeight: 600, letterSpacing: "-0.04em", color: C.ink }}>{t}</div></Reveal>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const B10Check = () => {
  const f = useCurrentFrame();
  // VO: "Before I paid," (0.3-1.4 s) "Nest showed me why it looked wrong." (1.65-3.7 s)
  const out = tween(f, [0, 14], [0, 1], EASE_IN);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 40%, #1B201D 0%, ${NIGHT} 70%)` }}>
      {out < 1 ? (
        <MBlur y={out * 30}>
          <AbsoluteFill style={{ transform: `translateY(${-out * 900}px) scale(1.05)` }}>
            <ScamHeader f={60} />
            <ScamBubble f={60} />
          </AbsoluteFill>
        </MBlur>
      ) : null}
      <CheckScene f={f} />
    </AbsoluteFill>
  );
};

/* ================================================================== beat 11: send anyway, then undo */

const YOU = { x: 1500, y: 270 };
const NEWN = { x: 1500, y: 800 };
const UC = { x: 1790, y: 535 };
const RING = { x: 620, y: 530, r: 222, w: 26 };
const B = 38; // frame the undo screen takes over

const UndoView = ({ g, exit }: { g: number; exit: number }) => {
  const { fps } = useVideoConfig();
  const enter = pushIn(g, 16);
  // outbound dot, hold, undo, return
  const outT = tween(g, [2, 20], [0, 1], EASE_IN_OUT);
  const backT = tween(g, [72, 90], [0, 1], EASE_IN_OUT);
  const atNew = g >= 20 && g < 72;
  const dot = g < 20 ? qpt(YOU, UC, NEWN, outT) : g < 72 ? NEWN : qpt(NEWN, UC, YOU, backT);
  const balance = g < 2 ? 4280.12 : g < 90 ? 3780.12 : lerp(3780.12, 4280.12, tween(g, [90, 102], [0, 1], EASE_OUT));
  const { d, c } = fmtUsd(balance);
  const draw = tween(g, [-8, 24], [0, 1], EASE_IN_OUT);
  const drain = 1 - 0.07 * tween(g, [34, 72], [0, 1], EASE_IN_OUT);
  const close = tween(g, [86, 100], [0, 1], EASE_IN_OUT);
  const frac = lerp(draw * drain, 1, close);
  const ringColor = mix(C.amber, C.moss, close);
  const circ = 2 * Math.PI * RING.r;
  const secs = 86399 - Math.floor(Math.max(0, g - 4) / 24);
  const btn = spr(g, fps, 28, SPRING.float);
  const press = tween(g, [67, 70], [0, 1]) * (1 - tween(g, [72, 76], [0, 1]));
  const btnOut = tween(g, [96, 108], [0, 1], EASE_IN);
  const hold = spr(g, fps, 20, SPRING.pop) * (1 - tween(g, [72, 80], [0, 1]));
  const youPulse = tween(g, [90, 112], [0, 1]);
  const pulse = atNew ? 0.5 + 0.5 * Math.sin(g / 4) : 0;
  return (
    <PageBg>
      <MBlur x={Math.sin(Math.PI * exit) * 34 + exit * 10}>
        <AbsoluteFill style={{ transform: `translateX(${-exit * 1920}px)` }}>
          <Zoom z={enter.z} blur={enter.blur}>
            <div style={{ position: "absolute", left: RING.x - 520, width: 1040, top: 104, textAlign: "center", fontFamily: FONT }}>
              <Reveal t={tween(g, [-8, 10], [0, 1])} out={tween(g, [88, 98], [0, 1], EASE_IN)} style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-0.04em" }}>You have 24 hours to undo this.</div>
              </Reveal>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center" }}>
                <Reveal t={tween(g, [96, 112], [0, 1])}><div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-0.04em", color: C.moss }}>Undone. Your $500 is back.</div></Reveal>
              </div>
            </div>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={C.sage1} strokeWidth={RING.w} opacity={draw > 0 ? 1 : 0} />
              <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={ringColor} strokeOpacity={0.16 * (1 - close)} strokeWidth={RING.w + 22 * clamp01(0.5 + 0.5 * Math.sin(g / 6))} opacity={draw} />
              <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={ringColor} strokeWidth={RING.w} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} transform={`rotate(-90 ${RING.x} ${RING.y})`} opacity={draw > 0.001 ? 1 : 0} />
              <path d={qpath(YOU, UC, NEWN)} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 14" />
              {g >= 72 && g < 110 ? <path d={qpath(NEWN, UC, YOU)} fill="none" stroke={C.moss} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={`${backT} 2`} opacity={1 - tween(g, [92, 110], [0, 1])} /> : null}
              {g < 30 ? <path d={qpath(YOU, UC, NEWN)} fill="none" stroke={C.amber} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${outT} 2`} opacity={1 - tween(g, [20, 30], [0, 1])} /> : null}
              <circle cx={NEWN.x} cy={NEWN.y} r={46} fill={C.amber1} stroke={C.amber} strokeWidth={4} strokeDasharray="10 9" opacity={hold} transform={`rotate(${g * 2} ${NEWN.x} ${NEWN.y})`} />
              <circle cx={YOU.x} cy={YOU.y} r={16 + youPulse * 60} fill="none" stroke={C.moss} strokeWidth={4} opacity={youPulse > 0 && youPulse < 1 ? (1 - youPulse) * 0.6 : 0} />
              <circle cx={YOU.x} cy={YOU.y} r={12} fill={C.ink} />
            </svg>
            <div style={{ position: "absolute", left: RING.x - 260, width: 520, top: RING.y - 80, textAlign: "center", fontFamily: FONT }}>
              <Reveal t={tween(g, [-4, 12], [0, 1])} out={tween(g, [84, 94], [0, 1], EASE_IN)}>
                <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>{fmtClock(secs)}</div>
              </Reveal>
              <Reveal t={tween(g, [-2, 14], [0, 1])} out={tween(g, [84, 94], [0, 1], EASE_IN)}>
                <div style={{ fontSize: 36, fontWeight: 500, color: C.ink4 }}>left to undo</div>
              </Reveal>
            </div>
            {g >= 90 ? (
              <div style={{ position: "absolute", left: RING.x - 80, top: RING.y - 80, transform: `scale(${spr(g, fps, 90, SPRING.pop)})` }}>
                <Check size={160} color={C.moss} t={tween(g, [92, 104], [0, 1])} strokeWidth={2.6} />
              </div>
            ) : null}
            {btn > 0.001 && btnOut < 1 ? (
              <div
                style={{
                  position: "absolute", left: RING.x - 320, top: 836 + (1 - btn) * 120 + btnOut * 200, width: 640, height: 108, borderRadius: 999,
                  background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontFamily: FONT,
                  fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", opacity: clamp01(btn * 1.6) * (1 - btnOut), transform: `scale(${1 - press * 0.03})`,
                  boxShadow: "0 18px 40px -18px rgba(22,48,29,0.6)",
                }}
              >
                <IcUndo size={40} />Undo and get $500 back
                <Ripple x={320} y={54} t={g - 70} size={90} color="255,255,255" />
              </div>
            ) : null}
            <div style={{ position: "absolute", right: 1920 - (YOU.x - 44), top: YOU.y - 74, textAlign: "right", fontFamily: FONT }}>
              <Reveal t={tween(g, [-8, 8], [0, 1])}><div style={{ fontSize: 32, fontWeight: 500, color: C.ink4 }}>Your balance</div></Reveal>
              <Reveal t={tween(g, [-6, 10], [0, 1])}><div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums" }}>{d}<span style={{ color: C.cents }}>.{c}</span></div></Reveal>
            </div>
            <div style={{ position: "absolute", right: 1920 - (NEWN.x - 76), top: NEWN.y - 52, textAlign: "right", fontFamily: FONT }}>
              <Reveal t={tween(g, [-6, 10], [0, 1])}><div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em" }}>New number</div></Reveal>
              <Reveal t={tween(g, [-4, 12], [0, 1])}><div style={{ fontSize: 30, fontWeight: 500, color: C.ink4 }}>+54 9 11 5555 0142</div></Reveal>
            </div>
            <div style={{ position: "absolute", left: NEWN.x - 150, width: 300, top: NEWN.y + 70, display: "flex", justifyContent: "center", transform: `scale(${hold})` }}>
              <BigChip size={32} bg={C.amber1} color={C.amber}>On hold</BigChip>
            </div>
            {g >= 2 && g < 92 ? <MoneyDot x={dot.x + (atNew ? 0 : 0)} y={dot.y} r={16} glow={1 + pulse * 0.3} /> : null}
          </Zoom>
        </AbsoluteFill>
      </MBlur>
    </PageBg>
  );
};

export const B11Undo = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  // VO: "I sent it anyway." (0.4-1.45 s) "Paying someone new," (1.95-3 s) "I had twenty-four hours to take it back." (3.15-5.4 s)
  if (f >= B) return <UndoView g={f - B} exit={tween(f, [dur - 12, dur], [0, 1], PUSH)} />;
  const btn = onPhone(PH10, SCAM_HOLD.x, SCAM_HOLD.y);
  const lean = tween(f, [0, 28], [0, 1], EASE_IN_OUT);
  const go = tween(f, [B - 12, B], [0, 1], PUSH);
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Zoom z={(1 + 0.35 * lean) * (1 + go * 3)} ox={btn.x} oy={btn.y} tx={lerp(btn.x, 960, lean * 0.6 + go * 0.4)} ty={lerp(btn.y, 540, lean * 0.6 + go * 0.4)} blur={go * 16}>
        <CheckScene f={BEATS.b10.dur + f} holdFill={tween(f, [4, 30], [0, 1], EASE_IN_OUT)} />
      </Zoom>
    </AbsoluteFill>
  );
};

export { EASE_OUT };
