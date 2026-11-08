import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { GroceryIcon } from "../groceries";
import { body, DotGrid, head, MoneyDot, Reveal, Rings } from "../kit";
import { CX, CY, HALF_L, HALF_R, INFL_CARD, T } from "../layout";
import { clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, hitIn, lerp, lineT, pulse, settle, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { beat, SC } from "../timeline";
import { BA_R_AT_SWAP, PUSH_END } from "./S01Map";

/*
 * 2. Inflation (bars 4-7): the groceries $1,000 still buys, month by month, Argentina 2023 (INDEC
 * CPI) vs. US dollars (US CPI 2023). Two equal panels centred on the frame halves (480 / 1440), 12 grocery tiles
 * each. One month per beat on beats 3-14; when the count drops, a left tile drops 10 px,
 * desaturates and fades to a dashed outline. The right tiles bounce together on every beat.
 * The pickup: the left panel dims to 40%, the right tiles collapse into the money dot.
 */

const FROM = SC.inflation.from;
/** Local frame of the scene's beat j (0..15). */
const B = (j: number) => beat(SC.inflation.bars[0] * 4 + j) - FROM;

const CARD = INFL_CARD;
const LX = HALF_L - INFL_CARD.w / 2; // 208
const RX = HALF_R - INFL_CARD.w / 2; // 1168
const TILE = 102;
const PAD = 32;
const GAP = 24;
const TITLE_Y = 224;
const BUYS_Y = 750;
const VALUE_Y = 790;
const MONTH_Y = 104;
const TICKS_Y = 186;
const FOOT_Y = 984;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** INDEC CPI 2023 (Martha's numbers): share of what $1,000 bought in January, kept in local currency, and tiles left of 12. */
const PCT = [94, 89, 82, 76, 70, 66, 62, 56, 49, 46, 40, 32];
/** US CPI 2023 (BLS, NSA, vs Dec 2022): the same share kept in US dollars; Dec = 97% (inflation ~3.4%). */
const PCT_US = [99, 99, 98, 98, 98, 97, 97, 97, 96, 96, 97, 97];
const LEFT = [11, 11, 10, 9, 8, 8, 7, 7, 6, 5, 5, 4];
/** Tiles leave bottom-right first, reading backwards. */
const ORDER = [11, 10, 9, 8, 7, 6, 5, 4];
/** Local frame each tile in ORDER drops. */
const DROP_AT = ORDER.map((_, k) => {
  const m = LEFT.findIndex((n) => 12 - n > k);
  return B(3 + m);
});

const tilePos = (x0: number, i: number) => ({ x: x0 + PAD + (i % 4) * (TILE + GAP), y: CARD.y + PAD + Math.floor(i / 4) * (TILE + GAP) });

/** Month index shown at local frame f (-1 before Jan). */
const monthAt = (f: number) => {
  let m = -1;
  for (let i = 0; i < 12; i++) if (f >= B(3 + i)) m = i;
  return m;
};

/** A value that rolls up to the next text on each change (masked). */
const Roll = ({ items, f, style, h }: { items: { at: number; text: string }[]; f: number; style: React.CSSProperties; h: number }) => {
  let i = 0;
  // v3 (H4): each change rolls in over the 6 frames before its beat and is settled ON the beat.
  for (let k = 0; k < items.length; k++) if (f >= items[k].at - 6) i = k;
  const t = i === 0 ? 1 : tween(f, [items[i].at - 6, items[i].at], [0, 1], EASE_OUT);
  return (
    <div style={{ position: "relative", height: h, overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${((1 - t) * 100).toFixed(2)}%)` }}>{items[i].text}</div>
      {i > 0 && t < 1 ? <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${(-t * 100).toFixed(2)}%)` }}>{items[i - 1].text}</div> : null}
    </div>
  );
};

const Tile = ({ i, x, y, s = 1, o = 1, gone = 0, dy = 0 }: { i: number; x: number; y: number; s?: number; o?: number; gone?: number; dy?: number }) => {
  const g = clamp01(gone);
  const sat = clamp01(g * 2.4); // desaturate first
  const fade = clamp01((g - 0.25) / 0.75); // then fade to the outline
  const fill = `rgb(${Math.round(lerp(228, 236, sat))},${Math.round(lerp(236, 233, sat))},${Math.round(lerp(223, 228, sat))})`;
  const ink = sat > 0 ? `rgb(${Math.round(lerp(47, 170, sat))},${Math.round(lerp(93, 174, sat))},${Math.round(lerp(58, 168, sat))})` : C.moss;
  return (
    <>
      {g > 0 ? (
        <div style={{ position: "absolute", left: x, top: y, width: TILE, height: TILE, borderRadius: 26, border: "2px dashed #C9C3B6", boxSizing: "border-box", opacity: clamp01((g - 0.3) / 0.5) }} />
      ) : null}
      {fade < 1 ? (
        <div
          style={{
            position: "absolute", left: x, top: y + dy, width: TILE, height: TILE, borderRadius: 26, background: fill, display: "grid", placeItems: "center",
            transform: `scale(${s})`, opacity: o * (1 - fade),
          }}
        >
          <GroceryIcon i={i} size={58} color={ink} strokeWidth={1.55} />
        </div>
      ) : null}
    </>
  );
};

const pct = (n: number) => `${n}%`;

export const InflationBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const m = monthAt(f);
  const pick = B(15);
  const dim = 1 - 0.6 * tween(f, [pick, pick + 6], [0, 1], EASE_IN_OUT);
  const rightOut = tween(f, [pick, pick + 7], [0, 1], EASE_IN);
  const collapse = tween(f, [pick, B(16)], [0, 1], EASE_IN);
  // Incoming match cut: the Buenos Aires dot opens into the left card.
  const iris = tween(f, [-SC.inflation.swap, 0], [0, 1], EASE_OUT);
  const irisR = lerp(BA_R_AT_SWAP * 0.6, 380, iris);
  const disc = lerp(BA_R_AT_SWAP, 420, iris);
  const gridIn = tween(f, [-SC.inflation.swap, B(1)], [0, 1], EASE_IN_OUT);
  // Build-in (beats 1-2, 8th staggers).
  const lTitle = lineT(f, B(1));
  const rTitle = lineT(f, B(1.5));
  const lBuys = lineT(f, B(1), 1);
  const rBuys = lineT(f, B(1.5), 1);
  const rCard = settle(f, B(1));
  const lTiles = tween(f, [-SC.inflation.swap, 2], [0, 1], EASE_OUT);
  const rTiles = hitIn(f, B(1)); // v4.1: the right tiles arrive with their card (never an empty white card)
  const ticks = lineT(f, B(2));
  const foot = lineT(f, B(2));
  const month = lineT(f, B(3));
  // The right grid's synchronized bounce on every month beat.
  let bounce = 0;
  for (let j = 3; j <= 14; j++) bounce = Math.max(bounce, pulse(f, B(j), 9));
  const leftItems = [{ at: -999, text: pct(100) }, ...PCT.map((v, i) => ({ at: B(3 + i), text: pct(v) }))];
  const rightItems = [{ at: -999, text: pct(100) }, ...PCT_US.map((v, i) => ({ at: B(3 + i), text: pct(v) })).filter((x, i) => i === 0 || PCT_US[i] !== PCT_US[i - 1])];
  const monthItems = MONTHS.map((mo, i) => ({ at: B(3 + i), text: `${mo} 2023` }));
  const dotR = 14 * tween(f, [pick + 4, B(16)], [0, 1], EASE_OUT);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink }}>
      <Drift f={f}>
        <DotGrid opacity={gridIn} glow={k.glow} />

        {/* month label and the 12-beat timeline, top centre */}
        <div style={{ position: "absolute", left: 0, right: 0, top: MONTH_Y, display: "flex", justifyContent: "center", opacity: dim, transform: `scale(${k.scale})`, transformOrigin: "960px 30px" }}>
          <Reveal t={month}>
            <Roll f={f} items={monthItems} h={T.l * 1.12} style={{ ...head(T.l), textAlign: "center", width: 360, fontVariantNumeric: "tabular-nums" }} />
          </Reveal>
        </div>
        <div style={{ position: "absolute", left: CX - 136, top: TICKS_Y - 4, width: 272, height: 8, display: "flex", justifyContent: "space-between", opacity: ticks * dim }}>
          {MONTHS.map((_, i) => {
            const on = f >= B(3 + i) - 1;
            const p = on ? tween(f, [B(3 + i) - 1, B(3 + i) + 5], [0, 1], EASE_OUT) : 0;
            return <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: p > 0 ? C.ink : "#CFC9BD", transform: `scale(${1 + 0.5 * pulse(f, B(3 + i), 8)})` }} />;
          })}
        </div>

        {/* LEFT: local currency */}
        <div style={{ opacity: dim }}>
          <div style={{ position: "absolute", left: LX, top: TITLE_Y }}>
            <Reveal t={lTitle}><div style={{ ...head(T.l), height: 50, display: "flex", alignItems: "center" }}>Kept in local currency</div></Reveal>
          </div>
          {f < 0 ? <div style={{ position: "absolute", left: PUSH_END.x - disc, top: PUSH_END.y - disc, width: disc * 2, height: disc * 2, borderRadius: "50%", background: C.moss, opacity: 1 - iris }} /> : null}
          {/* v4.1: the card opens with its 12 tiles already inside (no empty white card during the match cut). */}
          <div style={{ position: "absolute", inset: 0, clipPath: f < 0 ? `circle(${irisR.toFixed(1)}px at ${PUSH_END.x}px ${PUSH_END.y}px)` : undefined }}>
            <div style={{ position: "absolute", left: LX, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD.r, background: C.white, boxShadow: f < 0 ? "0 1px 0 rgba(23,32,26,.04)" : "0 1px 0 rgba(23,32,26,.04), 0 24px 48px -28px rgba(22,48,29,0.28)" }} />
            {Array.from({ length: 12 }, (_, i) => {
              const p = tilePos(LX, i);
              const k2 = ORDER.indexOf(i);
              const d = k2 >= 0 ? DROP_AT[k2] : Infinity;
              const g = f >= d - 1 ? tween(f, [d - 1, d + 9], [0, 1], (t) => t) : 0;
              const dy = f >= d - 1 ? 10 * tween(f, [d - 1, d + 5], [0, 1], EASE_OUT) : 0;
              return <Tile key={i} i={i} x={p.x} y={p.y} s={0.9 + 0.1 * lTiles} o={1} gone={g} dy={dy} />;
            })}
          </div>
          <div style={{ position: "absolute", left: LX, top: BUYS_Y }}>
            <Reveal t={lBuys}><div style={body(T.m)}>Groceries it still buys</div></Reveal>
          </div>
          <div style={{ position: "absolute", left: LX, top: VALUE_Y }}>
            <Reveal t={lBuys}>
              <Roll f={f} items={leftItems} h={T.xl * 1.1} style={{ ...head(T.xl), width: 400, fontVariantNumeric: "tabular-nums" }} />
            </Reveal>
          </div>
        </div>

        {/* RIGHT: Nest, US dollars */}
        <div style={{ opacity: 1 - rightOut }}>
          <div style={{ position: "absolute", left: RX, top: TITLE_Y }}>
            <Reveal t={rTitle}>
              <div style={{ ...head(T.l), height: 50, display: "flex", alignItems: "center", gap: 14 }}>
                <Rings size={44} color={C.moss} />Kept in US dollars
              </div>
            </Reveal>
          </div>
          <div
            style={{
              position: "absolute", left: RX, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD.r, background: C.white,
              boxShadow: "0 1px 0 rgba(23,32,26,.04), 0 24px 48px -28px rgba(22,48,29,0.28)",
              transform: `translateY(${((1 - rCard) * 40).toFixed(2)}px)`, opacity: clamp01(rCard * 2.5),
            }}
          />
          <div style={{ position: "absolute", left: RX, top: BUYS_Y }}>
            <Reveal t={rBuys}><div style={body(T.m)}>Groceries it still buys</div></Reveal>
          </div>
          <div style={{ position: "absolute", left: RX, top: VALUE_Y }}>
            <Reveal t={rBuys}>
              <Roll f={f} items={rightItems} h={T.xl * 1.1} style={{ ...head(T.xl, C.moss), width: 400, fontVariantNumeric: "tabular-nums" }} />
            </Reveal>
          </div>
        </div>
        {Array.from({ length: 12 }, (_, i) => {
          const p = tilePos(RX, i);
          if (collapse <= 0) return <Tile key={i} i={i} x={p.x} y={p.y + (1 - rCard) * 40 - 5 * bounce} s={0.55 + 0.45 * rTiles} o={clamp01(rTiles * 3)} />;
          const cx = lerp(p.x + TILE / 2, CX, collapse);
          const cy = lerp(p.y + TILE / 2, CY, collapse) - Math.sin(Math.PI * collapse) * 40 * ((i % 4) - 1.5) * 0.3;
          return <Tile key={i} i={i} x={cx - TILE / 2} y={cy - TILE / 2} s={lerp(1, 0.12, collapse)} o={1 - tween(collapse, [0.6, 1], [0, 1], (t) => t)} />;
        })}
        {dotR > 0.05 ? <MoneyDot x={CX} y={CY} r={dotR} /> : null}

        {/* footnote, bottom centre */}
        <div style={{ position: "absolute", left: 0, right: 0, top: FOOT_Y, display: "flex", justifyContent: "center" }}>
          <Reveal t={foot}>
            <div style={body(26, C.ink6)}>Share of what $1,000 bought in January · Argentina 2023 (INDEC)</div>
          </Reveal>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

export const S02Inflation = () => <InflationBody f={useF()} />;
