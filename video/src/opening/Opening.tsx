import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";
import { EASE_IN_OUT, EASE_OUT, clamp01, spr, SPRING, tween } from "../ui/anim";
import { Flock } from "../ui/Birds";
import { Lockup } from "../ui/NestMark";
import { Phone, PhoneOnStage } from "../ui/Phone";
import { HomeScreen } from "../ui/screens";
import { Meadow, PageBg } from "../ui/Stage";

/*
 * The first 15 s of the 16:9 film (1920x1080, 24 fps, 360 frames).
 * Frames 0-93 are transparent except the place labels: the AI shots (Rosa, then Ana) sit
 * underneath and are composited in ffmpeg (scripts/render-opening.sh), because Remotion's
 * bundled ffprobe can't read media at this project's long Windows path.
 * Narration (Gia, ElevenLabs v4) starts at 0.5 s; cuts are timed to its pauses.
 */
export const OPENING_FPS = 24;
export const OPENING_FRAMES = 360;

export const CUTS = {
  rosa: [0, 53],
  ana: [53, 94],
  prices: [94, 144],
  home: [144, 197],
  brand: [197, 240],
  value: [240, 300],
  goals: [300, 360],
} as const;

const span = (k: keyof typeof CUTS) => ({ from: CUTS[k][0], durationInFrames: CUTS[k][1] - CUTS[k][0] });

/** Short soft entrance: blur + slight scale settle over `len` frames. */
const Enter = ({ children, len = 7 }: { children: React.ReactNode; len?: number }) => {
  const f = useCurrentFrame();
  const t = tween(f, [0, len], [0, 1], EASE_OUT);
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, t * 1.5), filter: t < 1 ? `blur(${(1 - t) * 12}px)` : undefined, transform: `scale(${1.04 - 0.04 * t})` }}>
      {children}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- place labels */

const Place = ({ name, inF, outF }: { name: string; inF: number; outF: number }) => {
  const f = useCurrentFrame();
  const a = tween(f, [inF, inF + 8], [0, 1]) * tween(f, [outF - 6, outF], [1, 0]);
  return (
    <div style={{ position: "absolute", left: 96, bottom: 84, display: "flex", alignItems: "center", gap: 14, opacity: a, transform: `translateY(${(1 - a) * 10}px)`, fontFamily: FONT, color: "#fff", fontWeight: 500, fontSize: 34, letterSpacing: "-0.01em", textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 10, background: "#fff" }} />
      {name}
    </div>
  );
};

/* ---------------------------------------------------------------- prices */

const MONTHS = ["January", "February", "March", "April", "May"];
const PRICES = [18400, 22900, 27100, 31800, 36500];
const fmtArs = (n: number) => "ARS " + Math.round(n).toLocaleString("es-AR");

const Prices = () => {
  const f = useCurrentFrame();
  const step = 9;
  const i = Math.min(MONTHS.length - 1, Math.floor(Math.max(0, f - 4) / step));
  const within = clamp01((f - 4 - i * step) / 5);
  const prev = i === 0 ? PRICES[0] : PRICES[i - 1];
  const value = prev + (PRICES[i] - prev) * EASE_OUT(within);
  return (
    <PageBg>
      <Enter>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
          <div style={{ fontSize: 40, fontWeight: 500, color: C.ink4, height: 52, overflow: "hidden" }}>
            <div key={i} style={{ transform: `translateY(${(1 - EASE_OUT(within)) * 30}px)`, opacity: 0.4 + 0.6 * within }}>{MONTHS[i]}</div>
          </div>
          <div style={{ fontSize: 210, fontWeight: 600, letterSpacing: "-0.045em", color: C.amber, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {fmtArs(value)}
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: C.ink4, marginTop: 10 }}>The same groceries, every month</div>
        </AbsoluteFill>
        <div style={{ position: "absolute", right: 64, bottom: 48, fontSize: 22, color: C.ink4, fontWeight: 500 }}>Example prices</div>
      </Enter>
    </PageBg>
  );
};

/* ---------------------------------------------------------------- home */

const Home = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const K = 1.06;
  const rise = spr(f, fps, 0, SPRING.float);
  const line = tween(f, [10, 40], [0, 1], EASE_IN_OUT);
  const zoom = tween(f, [6, 53], [1, 1.32], EASE_IN_OUT);
  const x = (1920 - 390 * K) / 2;
  const y = 96 + (1 - rise) * 140;
  const cam = { x, y, k: K, zoom, ox: 960, oy: 96 + 250 * K };
  return (
    <PageBg>
      <PhoneOnStage cam={cam} style={{ opacity: Math.min(1, rise * 1.6) }}>
        <Phone><HomeScreen line={line} showUndone={false} /></Phone>
      </PhoneOnStage>
    </PageBg>
  );
};

/* ---------------------------------------------------------------- brand */

const Brand = () => {
  const f = useCurrentFrame();
  const draw = tween(f, [1, 26], [0, 1], (t) => t);
  const word = tween(f, [11, 24], [0, 1]);
  return (
    <Enter len={6}>
      <Meadow position="46% 62%" from={1.0} to={1.05} dur={60}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,24,16,0.18) 0%, rgba(10,24,16,0) 45%, rgba(10,24,16,0.25) 100%)" }} />
        <Flock start={120} tone="#1C2A22" height={1080} scale={0.9} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
          <div style={{ transform: `scale(${tween(f, [0, 43], [0.97, 1], EASE_IN_OUT)})`, filter: "drop-shadow(0 6px 30px rgba(0,0,0,0.25))" }}>
            <Lockup size={132} color="#fff" draw={draw} wordOpacity={word} wordShift={(1 - word) * -18} fontSize={124} />
          </div>
        </AbsoluteFill>
      </Meadow>
    </Enter>
  );
};

/* ---------------------------------------------------------------- value */

const BAR_W = 1080;

const Value = () => {
  const f = useCurrentFrame();
  const grow = tween(f, [4, 18], [0, 1], EASE_OUT);
  const fall = tween(f, [18, 46], [0, 1], EASE_IN_OUT);
  const pesos = 1000 - (1000 - 321) * fall;
  const Row = ({ label, color, w, value, ink }: { label: string; color: string; w: number; value: number; ink: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: BAR_W, fontSize: 36, fontWeight: 500, color: C.ink4 }}>
        <span>{label}</span>
        <span style={{ color: ink, fontWeight: 600, fontSize: 56, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>${Math.round(value).toLocaleString("en-US")}</span>
      </div>
      <div style={{ width: BAR_W, height: 30, borderRadius: 30, background: "rgba(23,32,26,0.06)" }}>
        <div style={{ width: BAR_W * w, height: 30, borderRadius: 30, background: color }} />
      </div>
    </div>
  );
  return (
    <PageBg>
      <Enter>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 64 }}>
          <Row label="In Nest" color={C.moss} w={grow} value={1000 * grow} ink={C.moss} />
          <Row label="In pesos" color={C.skyLine} w={grow * (pesos / 1000)} value={1000 * grow - (1000 - pesos) * (grow >= 1 ? 1 : 0)} ink={C.skyInk} />
          <div style={{ fontSize: 26, color: C.ink4, fontWeight: 500, marginTop: -10 }}>What $1,000 was worth a year later · Argentina, 2023</div>
        </AbsoluteFill>
      </Enter>
    </PageBg>
  );
};

/* ---------------------------------------------------------------- goals */

const GOALS = [
  { name: "Rainy day", amt: "$620", of: "of $1,000", p: 0.62 },
  { name: "School fees", amt: "$430", of: "of $1,000", p: 0.43 },
  { name: "First home", amt: "$1,090", of: "of $5,000", p: 0.22 },
];

const Ring = ({ p, size = 170 }: { p: number; size?: number }) => {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.sage1} strokeWidth={16} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.moss} strokeWidth={16} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
    </svg>
  );
};

const Goals = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <PageBg>
      <Enter>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 48 }}>
          {GOALS.map((g, i) => {
            const s = spr(f, fps, i * 5, SPRING.ui);
            const fill = tween(f, [6 + i * 5, 34 + i * 5], [0, g.p], EASE_IN_OUT);
            return (
              <div key={g.name} style={{ width: 400, padding: "44px 40px", borderRadius: 40, background: C.white, boxShadow: "0 2px 4px rgba(22,48,29,0.05), 0 30px 60px -30px rgba(22,48,29,0.35)", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 60}px)` }}>
                <Ring p={fill} />
                <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>{g.name}</div>
                <div style={{ fontSize: 26, color: C.ink4, fontWeight: 500 }}><b style={{ color: C.ink, fontWeight: 600 }}>{g.amt}</b> {g.of}</div>
              </div>
            );
          })}
        </AbsoluteFill>
      </Enter>
    </PageBg>
  );
};

/* ---------------------------------------------------------------- timeline */

export const Opening = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Place name="Buenos Aires" inF={8} outF={CUTS.rosa[1]} />
    <Place name="Miami" inF={CUTS.ana[0] + 3} outF={CUTS.ana[1]} />
    <Sequence {...span("prices")}><Prices /></Sequence>
    <Sequence {...span("home")}><Home /></Sequence>
    <Sequence {...span("brand")}><Brand /></Sequence>
    <Sequence {...span("value")}><Value /></Sequence>
    <Sequence {...span("goals")}><Goals /></Sequence>
  </AbsoluteFill>
);
