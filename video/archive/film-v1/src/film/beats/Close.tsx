import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, FONT } from "../../theme";
import { EASE_IN, EASE_IN_OUT, EASE_OUT, lerp, tween } from "../../ui/anim";
import { Flock } from "../../ui/Birds";
import { NestMark } from "../../ui/NestMark";
import { PageBg } from "../../ui/Stage";
import { CAM, MoneyDot, Reveal } from "../kit";
import { BA, MapLayer, mapToScreen } from "../map";

/** [TEAM: URL] The site address for the end card. Empty = the line is hidden. */
export const END_URL = "";

const MARK = 150;
const WORD = 136;
const GAP = 36;
const LOCK_W = MARK + GAP + 296;
const LOCK_Y = 400;
const MARK_C = { x: 960 - LOCK_W / 2 + MARK / 2, y: LOCK_Y };

/**
 * Beats 13 + 14 as one shot: pull back to the map, the meadow washes in, the money dot leaves
 * Buenos Aires and becomes the middle of the Nest mark; "Protect what matters." End card holds.
 * `endAt` = frame (local) where beat 14 starts.
 */
export const B13Close = ({ endAt }: { endAt: number }) => {
  const f = useCurrentFrame();
  // VO b13: "That's why we use Nest." (0.3-1.9 s) "Protect what matters." (2.3-3.55 s)
  const back = tween(f, [0, 30], [0, 1], CAM);
  const cam = { cx: lerp(BA.x, 960, back), cy: lerp(BA.y, 540, back), z: lerp(2.4, 1, back) };
  const wash = tween(f, [4, 44], [0, 1], EASE_IN_OUT);
  const tone = tween(f, [14, 36], [0, 1]);
  const glow = tween(f, [16, 32], [0, 1]) * (1 - tween(f, [40, 56], [0, 1]));
  const arcFrom = tween(f, [40, 60], [0, 1], EASE_IN);
  const miOut = tween(f, [38, 50], [0, 1], EASE_IN);
  const baOut = tween(f, [42, 54], [0, 1], EASE_IN);
  // the dot
  const baS = mapToScreen(cam, BA);
  const lift = tween(f, [40, 62], [0, 1], EASE_IN_OUT);
  const dot = { x: lerp(baS.x, MARK_C.x, lift), y: lerp(baS.y, MARK_C.y, lift) - Math.sin(Math.PI * lift) * 120 };
  const draw = tween(f, [54, 80], [0, 1], (t) => t);
  const egg = tween(f, [58, 74], [0, 1], EASE_OUT);
  const word = tween(f, [62, 78], [0, 1], EASE_OUT);
  const tag = tween(f, [68, 86], [0, 1], EASE_OUT);
  const url = tween(f, [endAt + 4, endAt + 20], [0, 1], EASE_OUT);
  const line = tween(f, [endAt + 8, endAt + 26], [0, 1], EASE_OUT);
  const push = tween(f, [0, endAt + 99], [1, 1.07], EASE_IN_OUT);
  const mask = `linear-gradient(to top, #000 ${wash * 140 - 40}%, rgba(0,0,0,0) ${wash * 140}%)`;
  return (
    <PageBg>
      <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, background: C.moss9, overflow: "hidden" }}>
        <Img src={staticFile("meadow.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 72%", transform: `scale(${push})`, filter: "saturate(1.05)" }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,24,16,0.30) 0%, rgba(10,24,16,0.06) 45%, rgba(10,24,16,0.10) 70%, rgba(10,24,16,0.55) 100%)" }} />
        <Flock start={240} tone="#1C2A22" height={1080} scale={0.85} style={{ opacity: 0.8 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ filter: back < 0.6 ? `blur(${(0.6 - back) * 16}px)` : undefined }}>
        <MapLayer cam={cam} grid={1 - wash} arc={1} arcFrom={arcFrom} glow={glow} tone={tone} miami={{ pop: 1, label: 1, out: miOut }} ba={{ pop: 1, label: 1, out: baOut }} />
      </AbsoluteFill>
      {draw > 0 ? (
        <div style={{ position: "absolute", left: 960 - LOCK_W / 2, top: LOCK_Y - MARK / 2, display: "flex", alignItems: "center", gap: GAP, color: "#fff", fontFamily: FONT, filter: "drop-shadow(0 6px 30px rgba(0,0,0,0.25))" }}>
          <NestMark size={MARK} color="#fff" draw={draw} />
          <Reveal t={word}><div style={{ fontSize: WORD, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.1 }}>Nest</div></Reveal>
        </div>
      ) : null}
      {egg < 1 ? <MoneyDot x={dot.x} y={dot.y} r={15 * (1 - egg)} ring={tone > 0.5} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 540, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT, color: "#fff", textShadow: "0 2px 28px rgba(10,22,14,0.35)" }}>
        <Reveal t={tag}><div style={{ fontSize: 100, fontWeight: 600, letterSpacing: "-0.045em" }}>Protect what matters.</div></Reveal>
        {END_URL ? <Reveal t={url} style={{ marginTop: 26 }}><div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.015em", opacity: 0.92 }}>{END_URL}</div></Reveal> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 976, display: "flex", justifyContent: "center", fontFamily: FONT }}>
        <Reveal t={line}><div style={{ fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.86)", letterSpacing: "-0.005em", textShadow: "0 1px 12px rgba(0,0,0,0.35)" }}>Live on Solana devnet with test USDC. Ana and her mom are an illustrative story.</div></Reveal>
      </div>
    </PageBg>
  );
};

export { EASE_IN };
