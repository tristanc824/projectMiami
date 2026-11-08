import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../../theme";
import { clamp01, EASE_IN_OUT, EASE_OUT, spr, SPRING, track, tween } from "../../ui/anim";
import { Avatar } from "../../ui/Atoms";
import { NestMark } from "../../ui/NestMark";
import { PageBg } from "../../ui/Stage";
import { Check, FLOAT, Fingerprint, MBlur, PUSH, Reveal, Zoom } from "../kit";
import { IcKey, IcLock } from "../icons";

/*
 * Beat 12: four security cards on the beat. Card 1 holds through the narration
 * ("Only I can move my money, with my fingerprint or my pin."); 2-4 follow on the music.
 */

const CW = 1240;
const CHH = 760;
const STRIDE = 1360;
/** Frames (beat-local) at which each card is centred. */
export const CARD_AT = [6, 104, 152, 200];
const PAN = [[0, -1.0], [14, 0], [99, 0], [111, 1], [147, 1], [159, 2], [195, 2], [207, 3]] as [number, number][];

const CARDS = [
  { title: "Only you can approve.", sub: "With your fingerprint or PIN, on your phone." },
  { title: "Family safe word.", sub: "Releases a held payment early." },
  { title: "Lock Nest.", sub: "Stops all sends until you unlock." },
  { title: "Trusted contact.", sub: "Mamá can help you get back in." },
];

const MiniPhone = ({ w, h, children, style }: { w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ width: w, height: h, borderRadius: w * 0.17, background: C.page, position: "relative", overflow: "hidden", boxShadow: "0 0 0 7px #0F1511, 0 0 0 8px #2B3530, 0 30px 60px -24px rgba(10,22,14,0.5)", ...style }}>
    <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: w * 0.3, height: w * 0.085, borderRadius: 20, background: "#0B0F0C" }} />
    {children}
  </div>
);

const FingerprintVisual = ({ t }: { t: number }) => {
  const { fps } = useVideoConfig();
  const badge = spr(t, fps, 44, SPRING.pop);
  return (
    <div style={{ position: "relative", width: 380, height: 380, borderRadius: 112, background: C.sage1, display: "grid", placeItems: "center" }}>
      <Fingerprint size={250} draw={tween(t, [6, 40], [0, 1], (x) => x)} />
      <div style={{ position: "absolute", right: -18, bottom: -18, width: 116, height: 116, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", boxShadow: "0 0 0 10px #fff", transform: `scale(${badge})` }}>
        <Check size={60} t={tween(t, [48, 58], [0, 1])} />
      </div>
    </div>
  );
};

const SafeWordVisual = ({ t }: { t: number }) => {
  const light = tween(t, [10, 20], [0, 1], EASE_OUT);
  const Pill = () => (
    <div style={{ position: "relative", width: 196, height: 74, borderRadius: 37, background: light > 0.5 ? C.moss : C.white, display: "grid", placeItems: "center", boxShadow: `0 0 0 ${light * 10}px rgba(47,93,58,${0.16 * light}), 0 0 ${light * 50}px rgba(47,93,58,${0.35 * light})` }}>
      <span style={{ position: "absolute", fontSize: 30, letterSpacing: "0.1em", color: C.ink4, opacity: 1 - clamp01(light * 2) }}>•••••••</span>
      <span style={{ position: "absolute", fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", opacity: clamp01(light * 2 - 1) }}>girasol</span>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 44 }}>
      {(["ana", "rosa"] as const).map((who) => (
        <div key={who} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <MiniPhone w={236} h={470}>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 92, gap: 46 }}>
              <Avatar who={who} size={96} />
              <Pill />
            </div>
          </MiniPhone>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.ink4, letterSpacing: "-0.02em" }}>{who === "ana" ? "Ana" : "Mamá"}</div>
        </div>
      ))}
    </div>
  );
};

const LockVisual = ({ t }: { t: number }) => {
  const { fps } = useVideoConfig();
  const on = spr(t, fps, 8, SPRING.pop);
  const wash = tween(t, [12, 24], [0, 1], EASE_IN_OUT);
  return (
    <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ height: 104, borderRadius: 32, background: C.page, display: "flex", alignItems: "center", gap: 18, padding: "0 24px" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.sage1, color: C.moss, display: "grid", placeItems: "center" }}><IcKey size={32} /></div>
        <div style={{ flex: 1, fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em" }}>Lock Nest</div>
        <div style={{ width: 88, height: 54, borderRadius: 54, background: on > 0.5 ? C.moss : "#D9D4C8", position: "relative" }}>
          <div style={{ position: "absolute", top: 4, left: 4 + 34 * on, width: 46, height: 46, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }} />
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18, marginTop: 10 }}>
        {["Send", "Send $250", "Slide to send"].map((l) => (
          <div key={l} style={{ height: 90, borderRadius: 999, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", opacity: 1 - 0.72 * wash }}>
            {wash > 0.5 ? <IcLock size={32} /> : null}{l}
          </div>
        ))}
        <div style={{ position: "absolute", left: -20, right: -20, top: -10, height: `${wash * 104}%`, background: "linear-gradient(180deg, rgba(228,236,223,0.55), rgba(228,236,223,0.35))", borderRadius: 40 }} />
      </div>
    </div>
  );
};

const TrustedVisual = ({ t }: { t: number }) => {
  const { fps } = useVideoConfig();
  const n = spr(t, fps, 6, SPRING.float);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <MiniPhone w={290} h={560} style={{ background: "linear-gradient(180deg, #E4ECDF 0%, #F3F0EA 70%)" }}>
        <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontSize: 80, fontWeight: 600, letterSpacing: "-0.05em", color: C.moss9 }}>9:41</div>
        <div style={{ position: "absolute", left: 16, right: 16, top: 190 + (1 - n) * -120, opacity: clamp01(n * 1.6), background: "rgba(255,255,255,0.96)", borderRadius: 26, padding: "16px 18px", boxShadow: "0 14px 30px -16px rgba(22,48,29,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 600, color: C.ink4 }}><NestMark size={22} color={C.moss} />Nest</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            <Avatar who="ana" size={44} />
            <div style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.015em" }}>Ana made you her trusted contact.</div>
          </div>
        </div>
      </MiniPhone>
      <div style={{ fontSize: 32, fontWeight: 600, color: C.ink4, letterSpacing: "-0.02em" }}>Mamá's phone</div>
    </div>
  );
};

const VISUALS = [FingerprintVisual, SafeWordVisual, LockVisual, TrustedVisual];

export const B12Security = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  const pos = track(f, PAN, EASE_IN_OUT);
  const speed = Math.abs(track(f + 1, PAN, EASE_IN_OUT) - pos) * STRIDE;
  const exit = tween(f, [dur - 12, dur], [0, 1], PUSH);
  return (
    <PageBg>
      <Zoom z={1 - 0.45 * exit} blur={exit * 14}>
        <MBlur x={Math.min(40, speed * 0.22)}>
          {CARDS.map((c, i) => {
            const cx = 960 + (i - pos) * STRIDE;
            if (cx < -800 || cx > 2720) return null;
            const V = VISUALS[i];
            const lt = f - CARD_AT[i];
            const left = cx - CW / 2;
            return (
              <div key={i} style={{ position: "absolute", left, top: 160, width: CW, height: CHH, borderRadius: 64, background: C.white, boxShadow: FLOAT, fontFamily: FONT, color: C.ink, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 640, height: CHH, display: "grid", placeItems: "center" }}>
                  <V t={lt} />
                </div>
                <div style={{ position: "absolute", left: 690, top: 0, width: 500, height: CHH, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Reveal t={tween(lt, [2, 18], [0, 1])}><div style={{ fontSize: 68, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.04 }}>{c.title}</div></Reveal>
                  <Reveal t={tween(lt, [8, 24], [0, 1])} style={{ marginTop: 24 }}><div style={{ fontSize: 36, fontWeight: 500, color: C.ink4, lineHeight: 1.25, letterSpacing: "-0.015em" }}>{c.sub}</div></Reveal>
                </div>
              </div>
            );
          })}
        </MBlur>
      </Zoom>
    </PageBg>
  );
};

export { AbsoluteFill };
