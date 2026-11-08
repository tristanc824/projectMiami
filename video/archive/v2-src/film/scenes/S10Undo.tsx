import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { fmtClock } from "../../ui/screens";
import { IcUndo } from "../icons";
import { body, Cam, Check, DotGrid, head, mix, MoneyDot, Pill, Reveal, Ripple, Tap } from "../kit";
import { colC, CX, T } from "../layout";
import { CAM, clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, hitIn, lerp, lineOut, lineT, PUSH, qpath, qpt, tAtLength, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { at, HIT, SC } from "../timeline";
import { fmtUsd } from "../screens";

/*
 * 10. Undo (bars 29-32). Symmetric: the amber ring at the centre, "New number" left and "Your
 * balance" right at equal distances on the same line, one clean arc between them over the ring.
 * "I sent it anyway": the dot flies to the new number and is held; the ring drains a step on every
 * beat of bar 30. Bar 31 beat 1: the Undo tap; beats 2-4 the dot flies home; on the 65.165
 * downbeat it lands, the ring closes into a check, the balance counts back up and the music filter
 * opens. The resolved state holds through bar 32 (see report: the cards start on bar 33).
 */

const FROM = SC.undo.from;
const L = (abs: number) => abs - FROM;
const RING = { x: CX, y: 560, r: 176, w: 24 };
const NEW = { x: colC(2), y: 560 }; // 463
const YOU = { x: colC(9), y: 560 }; // 1457
const ARC_C = { x: CX, y: -60 };
const BTN_Y = 836;
const DRAIN_BEATS = [at(30, 1), at(30, 2), at(30, 3), at(30, 4)].map(L);

export const UndoBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const out1 = tween(f, [L(HIT.sendAnyway), L(HIT.heldAt)], [0, 1], EASE_IN_OUT);
  const back = tween(f, [L(HIT.flyBack), L(HIT.undone)], [0, 1], EASE_IN_OUT);
  const held = f >= L(HIT.heldAt) && f < L(HIT.flyBack);
  const dot =
    f < L(HIT.heldAt) ? qpt(YOU, ARC_C, NEW, tAtLength(YOU, ARC_C, NEW, out1)) : f < L(HIT.flyBack) ? NEW : qpt(NEW, ARC_C, YOU, tAtLength(NEW, ARC_C, YOU, back));
  const done = f >= L(HIT.undone) - 1;
  const balance = !done
    ? lerp(4280.12, 3780.12, tween(f, [L(HIT.sendAnyway), L(HIT.sendAnyway) + 8], [0, 1], EASE_OUT))
    : lerp(3780.12, 4280.12, tween(f, [L(HIT.undone), L(HIT.undone) + 10], [0, 1], EASE_OUT));
  const { d, c } = fmtUsd(balance);
  // The ring: draws as the dot is held, drains a step per beat of bar 30, closes as the dot flies home.
  const draw = tween(f, [L(HIT.heldAt), L(HIT.heldAt) + 12], [0, 1], EASE_OUT);
  const steps = DRAIN_BEATS.reduce((a, b) => a + tween(f, [b - 1, b + 4], [0, 1], EASE_OUT), 0);
  const drained = draw * (1 - 0.035 * steps);
  const close = tween(f, [L(HIT.flyBack), L(HIT.undone)], [0, 1], EASE_IN_OUT);
  const frac = lerp(drained, 1, close);
  const ringColor = mix(C.amber, C.moss, tween(f, [L(HIT.undone) - 4, L(HIT.undone)], [0, 1], (t) => t));
  const circ = 2 * Math.PI * RING.r;
  const secs = 86399 - Math.max(0, Math.floor(f - L(HIT.heldAt)));
  const check = hitIn(f, L(HIT.undone));
  const btn = hitIn(f, L(at(30, 1)));
  const btnOut = tween(f, [L(HIT.flyBack), L(HIT.flyBack) + 8], [0, 1], EASE_IN);
  const press = tween(f, [L(HIT.undoTap) - 2, L(HIT.undoTap)], [0, 1]) * (1 - tween(f, [L(HIT.undoTap) + 2, L(HIT.undoTap) + 7], [0, 1]));
  const hold = hitIn(f, L(HIT.heldAt)) * (1 - tween(f, [L(HIT.flyBack), L(HIT.flyBack) + 6], [0, 1], EASE_IN));
  const inT = tween(f, [-SC.undo.swap, 0], [0, 1], CAM);
  const go = tween(f, [SC.undo.dur - 12, SC.undo.dur - SC.security.swap], [0, 1], PUSH);
  const lblIn = (i: number) => lineT(f, -SC.undo.swap, i);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Cam z={lerp(0.8, 1, inT) * (1 + 4 * go)} ox={RING.x} oy={RING.y} blur={(1 - inT) * 10 + go * 8}>
        <Drift f={f}>
          <DotGrid glow={k.glow} />
          {/* headline */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center" }}>
            <Reveal t={lineT(f, -SC.undo.swap)} out={lineOut(f, L(HIT.undone) - 8)}><div style={head(T.l)}>You have 24 hours to undo this.</div></Reveal>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center" }}>
            <Reveal t={lineT(f, L(HIT.undone))}><div style={head(T.l, C.moss)}>Undone. Your $500 is back.</div></Reveal>
          </div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path d={qpath(NEW, ARC_C, YOU)} fill="none" stroke={C.ink} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 16" opacity={lblIn(0)} />
            {f >= L(HIT.sendAnyway) && f < L(HIT.heldAt) + 14 ? (
              <path d={qpath(YOU, ARC_C, NEW)} fill="none" stroke={C.amber} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${out1} 2`} opacity={1 - tween(f, [L(HIT.heldAt), L(HIT.heldAt) + 14], [0, 1], (t) => t)} />
            ) : null}
            {f >= L(HIT.flyBack) && f < L(HIT.undone) + 24 ? (
              <path d={qpath(NEW, ARC_C, YOU)} fill="none" stroke={C.moss} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={`${back} 2`} opacity={1 - tween(f, [L(HIT.undone), L(HIT.undone) + 24], [0, 1], (t) => t)} />
            ) : null}
            <g transform={`translate(${RING.x} ${RING.y}) scale(${k.scale}) translate(${-RING.x} ${-RING.y})`}>
              <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={C.sage1} strokeWidth={RING.w} opacity={lblIn(0)} />
              {draw > 0 ? <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={ringColor} strokeWidth={RING.w} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} transform={`rotate(-90 ${RING.x} ${RING.y})`} /> : null}
            </g>
            <circle cx={NEW.x} cy={NEW.y} r={12} fill={C.ink} opacity={lblIn(0)} />
            <circle cx={YOU.x} cy={YOU.y} r={12} fill={C.ink} opacity={lblIn(0)} />
            {held ? <circle cx={NEW.x} cy={NEW.y} r={40} fill="none" stroke={C.amber} strokeWidth={3} strokeDasharray="8 8" transform={`rotate(${f * 3} ${NEW.x} ${NEW.y})`} opacity={hold} /> : null}
          </svg>
          {/* inside the ring: the countdown, then the check */}
          <div style={{ position: "absolute", left: RING.x - 150, width: 300, top: RING.y - 62, display: "flex", flexDirection: "column", alignItems: "center", opacity: draw }}>
            <Reveal t={draw} out={lineOut(f, L(HIT.undone) - 14)}><div style={{ ...head(T.xl), fontVariantNumeric: "tabular-nums" }}>{fmtClock(secs)}</div></Reveal>
            <Reveal t={draw} out={lineOut(f, L(HIT.undone) - 14, 1)}><div style={body(T.m)}>left to undo</div></Reveal>
          </div>
          {check > 0 ? (
            <div style={{ position: "absolute", left: RING.x - 80, top: RING.y - 80, transform: `scale(${check})` }}>
              <Check size={160} color={C.moss} t={tween(f, [L(HIT.undone) - 1, L(HIT.undone) + 8], [0, 1], EASE_OUT)} strokeWidth={2.6} />
            </div>
          ) : null}
          {f >= L(HIT.undone) && f < L(HIT.undone) + 22 ? <Ripple x={RING.x} y={RING.y} p={(f - L(HIT.undone)) / 22} r0={RING.r} r1={RING.r + 120} width={4} alpha={0.5} /> : null}
          {/* node labels */}
          <div style={{ position: "absolute", left: NEW.x - 300, width: 600, top: NEW.y + 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Reveal t={lblIn(1)}><div style={body(T.m)}>New number</div></Reveal>
            <Reveal t={lblIn(2)}><div style={{ ...head(T.l), fontVariantNumeric: "tabular-nums" }}>+54 9 11 5555 0142</div></Reveal>
            <div style={{ marginTop: 20, transform: `scale(${hold})`, opacity: clamp01(hold * 3) }}><Pill bg={C.amber1} color={C.amber}>On hold</Pill></div>
          </div>
          <div style={{ position: "absolute", left: YOU.x - 300, width: 600, top: YOU.y + 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Reveal t={lblIn(1)}><div style={body(T.m)}>Your balance</div></Reveal>
            <Reveal t={lblIn(2)}><div style={{ ...head(T.l, done ? C.moss : C.ink), fontVariantNumeric: "tabular-nums" }}>{d}<span style={{ color: C.cents }}>.{c}</span></div></Reveal>
          </div>
          {/* the undo button */}
          {btn > 0.001 && btnOut < 1 ? (
            <div style={{ position: "absolute", left: CX - 320, top: BTN_Y, width: 640, height: 96, transform: `translateY(${(btnOut * 40).toFixed(1)}px) scale(${(0.9 + 0.1 * btn) * (1 - press * 0.04)})`, opacity: clamp01(btn * 3) * (1 - btnOut) }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: T.m, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: "0 18px 40px -18px rgba(22,48,29,0.6)" }}>
                <IcUndo size={36} />Undo and get $500 back
              </div>
              <Tap x={320} y={48} t={f - L(HIT.undoTap)} size={110} color="255,255,255" />
            </div>
          ) : null}
          <MoneyDot x={dot.x} y={dot.y} r={16 * (held ? 1 + 0.08 * Math.sin(f / 4) : 1)} />
        </Drift>
      </Cam>
    </AbsoluteFill>
  );
};

export const S10Undo = () => <UndoBody f={useF()} />;
