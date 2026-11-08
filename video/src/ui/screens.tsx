import React, { useId } from "react";
import { C, FONT } from "../theme";
import { Amt, Avatar, Button, Card, Chip, Item, Kv, UnknownAvatar } from "./Atoms";
import {
  FaceId, IcBack, IcChev, IcDown, IcHome, IcInfo, IcLeaf, IcPlus, IcSearch, IcSend, IcShield, IcSprout, IcUndo, IcUser,
} from "./Icons";
import { NestMark } from "./NestMark";
import { clamp01 } from "./anim";

/*
 * Real app screens ported from app-design/nest-app-screens.html (copy-deck version).
 * Every screen is 390x844 logical px and sits inside <Phone>. Animated parts take props.
 */

const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", top: 54, left: 0, right: 0, bottom: 0, padding: "10px 20px 0", display: "flex", flexDirection: "column", gap: 18, fontFamily: FONT, ...style }}>
    {children}
  </div>
);

const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ fontSize: 13, color: C.ink4, ...style }}>{children}</div>
);

const H1 = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.05, ...style }}>{children}</div>
);

export const Big = ({ children, size = 54, style }: { children: React.ReactNode; size?: number; style?: React.CSSProperties }) => (
  <div style={{ fontSize: size, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 0.95, fontVariantNumeric: "tabular-nums", ...style }}>{children}</div>
);

/* ------------------------------------------------------------------ Messages (generic, no brand) */

export const MessagesThread = ({ bubbleIn = 1, bubbleHidden = false }: { bubbleIn?: number; bubbleHidden?: boolean }) => (
  <div style={{ position: "absolute", inset: 0, background: "#0E100F", fontFamily: FONT, color: "#fff" }}>
    <div style={{ position: "absolute", top: 54, left: 0, right: 0, padding: "6px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(22,25,23,0.9)" }}>
      <div style={{ position: "absolute", left: 14, top: 22, color: "#8FB0FF" }}><IcBack size={26} color="#9AA29C" /></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(#6B736D,#4A514C)", display: "grid", placeItems: "center" }}>
          <IcUser size={26} color="#DDE2DE" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#E6EAE7" }}>+54 9 11 5555 0142</div>
      </div>
    </div>
    <div style={{ position: "absolute", top: 172, left: 0, right: 0, textAlign: "center", fontSize: 11.5, color: "#7D857F" }}>
      Text Message<br />Today 9:38 PM
    </div>
    {!bubbleHidden ? (
      <div
        style={{
          position: "absolute", top: 222, left: 14, maxWidth: 268, background: "#2A2E2B", borderRadius: "20px 20px 20px 6px",
          padding: "10px 14px", fontSize: 17, lineHeight: 1.3, letterSpacing: "-0.01em",
          opacity: clamp01(bubbleIn * 1.5), transform: `translateY(${(1 - bubbleIn) * 26}px) scale(${0.92 + 0.08 * bubbleIn})`, transformOrigin: "0 100%",
        }}
      >
        Ana, it's Mamá. New number. Send it here.
      </div>
    ) : null}
    <div style={{ position: "absolute", bottom: 30, left: 14, right: 14, height: 40, borderRadius: 20, border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", padding: "0 16px", fontSize: 15, color: "#6F7771" }}>
      Text Message
    </div>
  </div>
);

/* ------------------------------------------------------------------ Plain bank app (made up, unbranded) */

export const BankTransfer = ({ sendPress = 0 }: { sendPress?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: "#ECEDEF", fontFamily: FONT, color: "#3A3D42" }}>
    <div style={{ position: "absolute", top: 54, left: 0, right: 0, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <IcBack size={24} color="#6B6F75" />
        <div style={{ fontWeight: 600, fontSize: 20 }}>Transfer</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, padding: "4px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid #E4E5E8", fontSize: 16 }}>
          <span style={{ color: "#6B6F75" }}>To</span><span style={{ fontWeight: 600 }}>+54 9 11 5555 0142</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", fontSize: 16 }}>
          <span style={{ color: "#6B6F75" }}>Amount</span><span style={{ fontWeight: 600 }}>$500.00</span>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, padding: "16px", display: "flex", gap: 10, alignItems: "center", fontSize: 19, color: "#55595F" }}>
        <IcInfo size={22} color="#8E949C" />Arrives in a few business days
      </div>
      <div style={{ background: "#fff", borderRadius: 10, padding: "16px", display: "flex", gap: 10, alignItems: "center", fontSize: 19, color: "#55595F" }}>
        <IcInfo size={22} color="#8E949C" />Transfers are final.
      </div>
      <div style={{ marginTop: 18, height: 50, borderRadius: 8, background: "#8E949C", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 17, transform: `scale(${1 - sendPress * 0.03})` }}>
        Send
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ Home */

export const BalanceChart = ({ progress = 1, height = 64 }: { progress?: number; height?: number }) => {
  const id = useId().replace(/:/g, "");
  const p = clamp01(progress);
  return (
    <svg viewBox="0 0 300 64" width="100%" height={height} style={{ marginTop: 14, overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`wipe${id}`}><rect x={-10} y={-10} width={10 + 310 * p} height={90} /></clipPath>
      </defs>
      <g clipPath={`url(#wipe${id})`}>
        <path d="M0 10 C60 9 120 11 180 9 S260 10 300 10" fill="none" stroke="#2F5D3A" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M0 10 C40 14 70 22 110 28 S190 44 230 50 S280 56 300 58" fill="none" stroke="#5FA8D6" strokeWidth={2} strokeLinecap="round" strokeDasharray="4 4" />
      </g>
      <g opacity={p >= 0.98 ? 1 : 0}>
        <circle cx={300} cy={10} r={4.5} fill="#2F5D3A" stroke="#fff" strokeWidth={2} />
        <circle cx={300} cy={58} r={4} fill="#5FA8D6" stroke="#fff" strokeWidth={2} />
      </g>
    </svg>
  );
};

export const HeldChip = ({ style }: { style?: React.CSSProperties }) => (
  <Chip tone="green" style={style}><IcLeaf size={13} />Held in US dollars</Chip>
);

export const BalanceCard = ({ line = 1, chipOpacity = 1 }: { line?: number; chipOpacity?: number }) => (
  <Card>
    <Label>Balance</Label>
    <Big style={{ marginTop: 8 }}>$4,280<span style={{ color: C.cents }}>.12</span></Big>
    <BalanceChart progress={line} />
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: C.ink4 }}>
      <span><b style={{ color: C.moss, fontWeight: 600 }}>In dollars</b> · <span style={{ color: C.skyInk }}>same money in pesos</span></span>
      <span>Past year</span>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <HeldChip style={{ opacity: chipOpacity }} />
      <Chip tone="sky">≈ ARS 4.15M · example rate</Chip>
    </div>
  </Card>
);

const ActionTile = ({ dark, icon, label }: { dark?: boolean; icon: React.ReactNode; label: string }) => (
  <div style={{ height: 76, borderRadius: 24, background: dark ? C.ink : C.white, color: dark ? "#fff" : C.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
    {icon}{label}
  </div>
);

export const UndoneRow = ({ last, style }: { last?: boolean; style?: React.CSSProperties }) => (
  <Item
    style={style}
    left={<UnknownAvatar glyph="?" />}
    title="New number"
    sub="Undone · Money back"
    right={<Amt style={{ color: C.ink4, textDecoration: "line-through" }}>$500.00</Amt>}
    last={last}
  />
);

const TabBar = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 84, background: "rgba(243,240,234,.96)", borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)", paddingTop: 10 }}>
    {[
      [<IcHome key="h" size={24} />, "Home", true],
      [<IcSprout key="s" size={24} />, "Save", false],
      [<IcShield key="sh" size={24} />, "Security", false],
      [<IcUser key="u" size={24} />, "You", false],
    ].map(([ic, l, on]) => (
      <div key={l as string} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: on ? C.moss : C.ink4 }}>
        {ic}{l}
      </div>
    ))}
  </div>
);

/**
 * Home. `undone` (0..1) lands the "New number · Undone · Money back" row at the top of Activity.
 * Before it lands, Activity shows only Mamá and Daniela.
 */
export const HomeScreen = ({ line = 1, chipOpacity = 1, undone = 1, showUndone = true }: { line?: number; chipOpacity?: number; undone?: number; showUndone?: boolean }) => {
  const rowH = 69;
  const u = showUndone ? undone : 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.page }}>
      <Body>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 19, letterSpacing: "-0.025em", display: "flex", gap: 7, alignItems: "center" }}>
            <NestMark size={26} color={C.moss} />Nest
          </span>
          <Avatar who="ana" size={40} />
        </div>
        <BalanceCard line={line} chipOpacity={chipOpacity} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <ActionTile dark icon={<IcSend size={20} />} label="Send" />
          <ActionTile icon={<IcPlus size={20} />} label="Add" />
          <ActionTile icon={<IcDown size={20} />} label="Receive" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><Label>Activity</Label><Label>See all</Label></div>
          <div style={{ position: "relative", height: rowH * 3, overflow: "hidden" }}>
            {showUndone ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: clamp01(u * 1.4), transform: `translateY(${(1 - u) * -26}px) scale(${0.96 + 0.04 * u})` }}>
                <UndoneRow />
              </div>
            ) : null}
            <div style={{ position: "absolute", left: 0, right: 0, top: rowH * u }}>
              <Item left={<Avatar who="rosa" />} title="Mamá" sub="Arrived in 0.9s · No fee" right={<Amt>−$250.00</Amt>} />
              <Item left={<Avatar who="dani" />} title="Daniela" sub="Received" right={<Amt style={{ color: C.moss }}>+$120.00</Amt>} last />
            </div>
          </div>
        </div>
      </Body>
      <TabBar />
    </div>
  );
};

/* ------------------------------------------------------------------ Send to */

export const NewNumberRow = ({ glow = 0, last, style }: { glow?: number; last?: boolean; style?: React.CSSProperties }) => (
  <Item
    style={style}
    left={<UnknownAvatar glyph="+" />}
    title="+54 9 11 5555 0142"
    sub="New · 24 hours to undo"
    subStyle={{ color: C.amber, fontWeight: 600, opacity: 1 - glow * 0 }}
    right={<IcChev size={18} color={C.ink4} />}
    last={last}
  />
);

export const SendToScreen = ({ mamaPress = 0, rowGlow = 0 }: { mamaPress?: number; rowGlow?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <Body>
      <H1>Send to</H1>
      <div style={{ height: 52, borderRadius: 18, background: C.white, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", color: C.ink4, fontSize: 15 }}>
        <IcSearch size={18} />Name, @handle or phone
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        {[
          ["rosa", "Mamá"], ["luis", "Tío Luis"], ["dani", "Daniela"],
        ].map(([w, n], i) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, transform: i === 0 ? `scale(${1 - mamaPress * 0.08})` : undefined }}>
            <Avatar who={w as "rosa"} size={64} style={i === 0 ? { boxShadow: `0 0 0 3px ${C.page}, 0 0 0 5px ${C.sage}` } : undefined} />{n}
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.ink4 }}>
          <Avatar size={64} bg={C.white} color={C.ink4}><IcPlus size={22} /></Avatar>New
        </div>
      </div>
      <div>
        <Label style={{ marginBottom: 2 }}>Recent</Label>
        <div>
          <Item left={<Avatar who="rosa" />} title="Mamá" sub="Paid 12 times · last Sunday" right={<IcChev size={18} color={C.ink4} />} />
          <Item left={<Avatar who="luis" />} title="Tío Luis" sub="Paid 3 times · in August" right={<IcChev size={18} color={C.ink4} />} />
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "2px -10px", borderRadius: 18, background: C.amber1, opacity: rowGlow * 0.9, boxShadow: `0 0 0 ${2 * rowGlow}px rgba(138,90,16,0.25)` }} />
            <NewNumberRow last style={{ position: "relative" }} />
          </div>
        </div>
      </div>
    </Body>
  </div>
);

/* ------------------------------------------------------------------ Amount */

const Keys = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", marginTop: "auto" }}>
    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
      <span key={k} style={{ height: 60, display: "grid", placeItems: "center", fontSize: k === "⌫" ? 22 : 27, fontWeight: 500 }}>{k}</span>
    ))}
  </div>
);

const MamaHeader = () => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <IcBack size={24} />
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Avatar who="rosa" size={40} /><span style={{ fontSize: 16, fontWeight: 600 }}>Mamá</span></span>
    <span style={{ width: 24 }} />
  </div>
);

export const AmountScreen = ({ amount = "$250", chipOpacity = 1 }: { amount?: string; chipOpacity?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <Body>
      <MamaHeader />
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Big size={84}>{amount}</Big>
        <Label style={{ marginTop: 12, fontSize: 15 }}>≈ ARS 242,500 · example rate</Label>
        <Label style={{ marginTop: 4 }}>$4,280.12 available</Label>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", opacity: chipOpacity }}>
        <Chip>No fee</Chip><Chip>Arrives in a second</Chip>
      </div>
      <Keys />
      <div style={{ paddingBottom: 34 }}><Button>Review</Button></div>
    </Body>
  </div>
);

/* ------------------------------------------------------------------ Confirm (Mamá) */

export const SlideToSend = ({ progress = 0, width = 346, height = 62, fontSize = 16, complete = 0 }: { progress?: number; width?: number; height?: number; fontSize?: number; complete?: number }) => {
  const pad = height * 0.097;
  const thumb = height - pad * 2;
  const travel = width - thumb - pad * 2;
  return (
    <div style={{ width, height, borderRadius: 999, background: C.ink, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.75)", fontSize, fontWeight: 600, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: pad, top: pad, bottom: pad, width: thumb + travel * progress, borderRadius: 999, background: "rgba(255,255,255,0.10)" }} />
      <span style={{ opacity: 1 - clamp01(progress * 1.8), transform: `translateX(${progress * 40}px)`, letterSpacing: "-0.01em" }}>Slide to send</span>
      <span style={{ position: "absolute", left: pad + travel * progress, top: pad, width: thumb, height: thumb, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: C.ink, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
        <IcSend size={thumb * 0.4} />
        {complete > 0 ? (
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.moss, color: "#fff", display: "grid", placeItems: "center", opacity: complete, transform: `scale(${0.7 + 0.3 * complete})` }}>
            <svg viewBox="0 0 24 24" width={thumb * 0.42} height={thumb * 0.42}><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        ) : null}
      </span>
    </div>
  );
};

export const ConfirmScreen = ({ slide = 0 }: { slide?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <Body>
      <MamaHeader />
      <div style={{ textAlign: "center", marginTop: 40 }}><Big size={84}>$250</Big></div>
    </Body>
    <div style={{ position: "absolute", inset: 0, background: "rgba(17,24,19,.38)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: C.white, borderRadius: "34px 34px 0 0", padding: "14px 22px 40px", display: "flex", flexDirection: "column", gap: 16, fontFamily: FONT }}>
      <div style={{ width: 40, height: 5, borderRadius: 5, background: C.line, margin: "0 auto 4px" }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar who="rosa" />
        <div><div style={{ fontSize: 18, fontWeight: 600 }}>Send $250.00 to Mamá</div><Label style={{ marginTop: 2 }}>Buenos Aires</Label></div>
      </div>
      <div>
        <Kv k="Fee" v="$0.00" />
        <Kv k="Arrives" v="About a second" />
        <Kv k="She gets" v="$250.00 (≈ ARS 242,500)" />
        <Kv k="Undo" v="Off. You've paid her before." last />
      </div>
      <SlideToSend progress={slide} />
      <Label style={{ textAlign: "center", marginTop: -6 }}>Your fingerprint confirms when you let go</Label>
    </div>
  </div>
);

/* ------------------------------------------------------------------ Scam check */

export const REASONS = [
  "You've never paid this number",
  "It's using Mamá's name, but it isn't her saved number",
  "$500 is a lot for a first payment",
];

export const AmberTile = ({ size = 64 }: { size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.34, background: C.amber1, display: "grid", placeItems: "center", color: C.amber, fontSize: size * 0.5, fontWeight: 700 }}>!</div>
);

/** Scam check content laid out for a logical stage (no phone). `reasons` 0..3 reveals reasons. */
export const ScamCheckContent = ({
  head = 1, tile = 1, reasons = 3, buttons = 1, holdFill = 0, width = 380,
}: { head?: number; tile?: number; reasons?: number; buttons?: number; holdFill?: number; width?: number }) => (
  <div style={{ width, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ transform: `scale(${0.6 + 0.4 * tile})`, opacity: clamp01(tile * 2), transformOrigin: "0 50%" }}><AmberTile /></div>
    <H1 style={{ fontSize: 36, opacity: clamp01(head * 1.5), transform: `translateY(${(1 - head) * 18}px)`, filter: `blur(${(1 - clamp01(head)) * 6}px)` }}>This might be a scam.</H1>
    <div style={{ background: C.amber1, borderRadius: 28, padding: 22, opacity: clamp01(reasons * 3) }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 16, color: C.amberInk, lineHeight: 1.35 }}>
        {REASONS.map((r, i) => {
          const t = clamp01(reasons - i);
          return (
            <div key={r} style={{ display: "flex", gap: 10, alignItems: "flex-start", opacity: t, transform: `translateY(${(1 - t) * 10}px)` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flex: "none", marginTop: 7 }} />{r}
            </div>
          );
        })}
      </div>
    </div>
    <Label style={{ textAlign: "center", opacity: buttons }}>If you send it, you can still undo it for 24 hours.</Label>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: buttons, marginTop: 8 }}>
      <Button>Don't send</Button>
      <Button kind="ghost" style={{ position: "relative", overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${holdFill * 100}%`, background: C.amber1, borderRadius: 999 }} />
        <span style={{ position: "relative" }}>Hold to send anyway</span>
      </Button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ Undo */

/** Seconds left on the undo clock at the start of beat 9: 23:59:12. */
export const UNDO_START = 23 * 3600 + 59 * 60 + 12;

export const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
};

export const UndoRing = ({
  secondsLeft, draw = 1, pulse = 0, size = 200, sizeText = 34,
}: { secondsLeft: number; draw?: number; pulse?: number; size?: number; sizeText?: number }) => {
  const circ = 2 * Math.PI * 90;
  const frac = (secondsLeft / 86400) * draw;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible", display: "block" }}>
        <circle cx={100} cy={100} r={90} fill="none" stroke={C.sage1} strokeWidth={12} />
        <circle cx={100} cy={100} r={90} fill="none" stroke={C.amber} strokeOpacity={0.18 * pulse} strokeWidth={12 + 16 * pulse} />
        <circle cx={100} cy={100} r={90} fill="none" stroke={C.amber} strokeWidth={12} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: sizeText, fontWeight: 600, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{fmtClock(secondsLeft)}</div>
        <Label>left to undo</Label>
      </div>
    </div>
  );
};

export const UndoDetails = () => (
  <Card tight style={{ width: "100%" }}>
    <Kv k="To" v="+54 9 11 5555 0142" />
    <Kv k="Amount" v="$500.00" />
    <Kv k="Releases" v="Monday, 9:41 PM" />
    <Kv k="Status" v="On hold" vStyle={{ color: C.amber }} last />
  </Card>
);

export const UndoButton = ({ style, iconSize = 18 }: { style?: React.CSSProperties; iconSize?: number }) => (
  <Button style={style}><IcUndo size={iconSize} />Undo and get $500 back</Button>
);

export { FaceId };
