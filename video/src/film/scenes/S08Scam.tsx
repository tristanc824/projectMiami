import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../theme";
import { IcUser } from "../icons";
import { body, DotGrid, head, NIGHT, Reveal } from "../kit";
import { CX, T } from "../layout";
import { lineT, settle, tween } from "../motion";
import { Drift, measure, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";

/*
 * 8. The scam message (bars 24-25), night: the only dark scene. Everything on x = 960: the unknown
 * sender, the timestamp and the message bubble. The bubble arrives on bar 24 beat 2 with the buzz
 * (a short shake), its text types in through beat 4, then holds.
 */

const FROM = SC.scam.from;
const L = (abs: number) => abs - FROM;
const LINES = ["Ana, it's Mamá. New number.", "Send it here."];
const TEXT = LINES.join(" ");
const PADX = 44;
const PADY = 34;
const LH = T.l * 1.25;
const AV_Y = 323;
export const BUBBLE_Y = 565;
export const BUBBLE_H = 2 * LH + 2 * PADY;

export const ScamBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const at = L(HIT.buzz);
  const s = settle(f, at);
  const shake = f >= at && f < at + 12 ? Math.sin((f - at) * 2.7) * 7 * (1 - (f - at) / 12) : 0;
  const n = Math.floor(TEXT.length * tween(f, [at + 1, L(HIT.buzz) + 36], [0, 1], (t) => t));
  const w = Math.ceil(Math.max(...LINES.map((l) => measure(l, T.l, 500, -0.02)))) + 2 * PADX;
  const l1 = TEXT.slice(0, Math.min(n, LINES[0].length));
  const l2 = n > LINES[0].length + 1 ? TEXT.slice(LINES[0].length + 1, n) : "";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 75% at 50% 45%, #1C221E 0%, ${NIGHT} 70%)`, fontFamily: FONT }}>
      <Drift f={f}>
        <DotGrid color="#FFFFFF" alpha={0.06} glow={k.glow} />
        <div style={{ position: "absolute", left: CX - 36, top: AV_Y, width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(#6B736D,#454C47)", display: "grid", placeItems: "center", transform: `scale(${tween(f, [0, 8], [0.6, 1])})`, opacity: tween(f, [0, 4], [0, 1]) }}>
          <IcUser size={38} color="#DDE2DE" />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: AV_Y + 88, display: "flex", justifyContent: "center" }}>
          <Reveal t={lineT(f, 0)}><div style={{ ...head(T.l, "#E6EAE7"), fontVariantNumeric: "tabular-nums" }}>+54 9 11 5555 0142</div></Reveal>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: AV_Y + 146, display: "flex", justifyContent: "center" }}>
          <Reveal t={lineT(f, 6)}><div style={body(T.s, "#8A928C")}>Text Message · Today 9:38 PM</div></Reveal>
        </div>
        {f >= at ? (
          <div
            style={{
              position: "absolute", left: CX - w / 2 + shake, top: BUBBLE_Y, width: w, height: BUBBLE_H, borderRadius: "48px 48px 48px 14px", background: "#2B302C",
              padding: `${PADY}px ${PADX}px`, boxSizing: "border-box", color: "#F1F3F1", fontSize: T.l, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.25, whiteSpace: "nowrap",
              opacity: Math.min(1, s * 2.5), transform: `translateY(${((1 - s) * 30).toFixed(2)}px) scale(${((0.94 + 0.06 * s) * k.scale).toFixed(4)})`, transformOrigin: "0% 100%",
            }}
          >
            <div>{l1}</div>
            <div>{l2}</div>
          </div>
        ) : null}
      </Drift>
    </AbsoluteFill>
  );
};

export const S08Scam = () => <ScamBody f={useF()} />;
