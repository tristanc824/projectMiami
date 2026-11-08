import React from "react";
import { random } from "remotion";
import { C, FONT } from "../theme";
import { Amt, Avatar, Button, Card, Chip, Item, Kv } from "../ui/Atoms";
import { Bird } from "../ui/Birds";
import { NestMark } from "../ui/NestMark";
import { ScamCheckContent } from "../ui/screens";
import { IcBack, IcClock, IcDown, IcHome, IcLeaf, IcPlus, IcSend, IcShield, IcUser } from "./icons";
import { Check } from "./kit";
import { clamp01 } from "./motion";

/*
 * App screens for the film, ported from app-design/nest-app-screens.html (the source of truth):
 * 390x844 logical px inside <FPhone>. Home has one balance line ("Your balance · Past month"),
 * the tab bar is Home / Security / You. Ana = laugh.jpg crop, Mamá = selfie.jpg crop, everywhere.
 * "Face ID" wording becomes fingerprint wording (production bible 5.8).
 */

const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", top: 54, left: 0, right: 0, bottom: 0, padding: "10px 20px 0", display: "flex", flexDirection: "column", gap: 18, fontFamily: FONT, ...style }}>
    {children}
  </div>
);
const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div style={{ fontSize: 13, color: C.ink4, ...style }}>{children}</div>;
const H1 = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.05, ...style }}>{children}</div>
);
const Note = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div style={{ fontSize: 12, color: C.ink4, lineHeight: 1.5, ...style }}>{children}</div>;
const Stack = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto", paddingBottom: 30, width: "100%", ...style }}>{children}</div>
);
const Brand = () => (
  <span style={{ fontWeight: 600, fontSize: 19, letterSpacing: "-0.025em", display: "flex", gap: 7, alignItems: "center" }}>
    <NestMark size={26} color={C.moss} />Nest
  </span>
);

export const fmtUsd = (n: number) => {
  const cents = Math.round(n * 100);
  const d = Math.floor(cents / 100);
  return { d: "$" + d.toLocaleString("en-US"), c: String(cents % 100).padStart(2, "0") };
};

/* ------------------------------------------------------------------ Home (4) */

const ActionTile = ({ dark, icon, label }: { dark?: boolean; icon: React.ReactNode; label: string }) => (
  <div style={{ height: 76, borderRadius: 24, background: dark ? C.ink : C.white, color: dark ? "#fff" : C.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
    {icon}{label}
  </div>
);

export const TabBar = ({ on = "Home" }: { on?: "Home" | "Security" | "You" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 84, background: "rgba(243,240,234,.96)", borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "repeat(3,1fr)", paddingTop: 10, fontFamily: FONT }}>
    {([
      [<IcHome key="h" size={24} />, "Home"],
      [<IcShield key="s" size={24} />, "Security"],
      [<IcUser key="u" size={24} />, "You"],
    ] as [React.ReactNode, string][]).map(([ic, l]) => (
      <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: l === on ? C.moss : C.ink4 }}>
        {ic}{l}
      </div>
    ))}
  </div>
);

/** The app's single balance line (past month), with its end dot. `p` 0..1 draws it. */
const BalanceLine = ({ p = 1 }: { p?: number }) => (
  <svg viewBox="0 0 300 64" width="100%" height={64} style={{ marginTop: 14, overflow: "visible", display: "block" }}>
    <path d="M0 44 C30 42 50 46 80 38 S130 34 160 36 S210 24 240 26 S280 18 300 16" fill="none" stroke={C.moss} strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(p)} />
    {p >= 0.99 ? <circle cx={300} cy={16} r={4.5} fill={C.moss} stroke="#fff" strokeWidth={2} /> : null}
  </svg>
);

/** Logical centre of the balance card (for push-throughs). */
export const HOME_CARD = { x: 195, y: 230 };

export const FHome = ({ amount = 4280.12, line = 1 }: { amount?: number; line?: number }) => {
  const { d, c } = fmtUsd(amount);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.page }}>
      <Body>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          <Avatar who="ana" size={40} />
        </div>
        <Card>
          <Label>Balance</Label>
          <div style={{ marginTop: 8, fontSize: 54, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 0.95, fontVariantNumeric: "tabular-nums" }}>
            {d}<span style={{ color: C.cents }}>.{c}</span>
          </div>
          <BalanceLine p={line} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: C.ink4 }}>
            <span>Your balance</span><span>Past month</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Chip tone="green"><IcLeaf size={13} />Held in US dollars</Chip>
            <Chip tone="sky">≈ ARS 4.15M · example rate</Chip>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <ActionTile dark icon={<IcSend size={20} />} label="Send" />
          <ActionTile icon={<IcPlus size={20} />} label="Add" />
          <ActionTile icon={<IcDown size={20} />} label="Receive" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><Label>Activity</Label><Label>See all</Label></div>
          <Item left={<Avatar who="rosa" />} title="Mamá" sub="Arrived in 0.9s · No fee" right={<Amt>−$250.00</Amt>} />
          <Item left={<Avatar who="dani" />} title="Daniela" sub="Received" right={<Amt style={{ color: C.moss }}>+$120.00</Amt>} last />
        </div>
      </Body>
      <TabBar />
    </div>
  );
};

/* ------------------------------------------------------------------ Arrived (11) */

/** Logical centre of the check badge on Mamá's avatar. */
export const ARRIVED_BADGE = { x: 225, y: 228 };

export const ArrivedScreen = ({ check = 1 }: { check?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <div style={{ position: "absolute", top: 120, left: 60, opacity: 0.5 }}><Bird width={30} color={C.moss} phase={0.7} /></div>
    <div style={{ position: "absolute", top: 104, left: 300, opacity: 0.4 }}><Bird width={22} color={C.moss} phase={0.75} /></div>
    <Body style={{ alignItems: "center", textAlign: "center" }}>
      <div style={{ position: "relative", marginTop: 96 }}>
        <Avatar who="rosa" size={84} />
        <span style={{ position: "absolute", right: -6, bottom: -4, width: 36, height: 36, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", boxShadow: `0 0 0 4px ${C.page}` }}>
          <Check size={18} t={check} />
        </span>
      </div>
      <H1 style={{ marginTop: 8 }}>Mamá has your $250.</H1>
      <div style={{ fontSize: 17, color: C.ink6, marginTop: -8 }}>It got there in 0.9 seconds.</div>
      <Card tight style={{ width: "100%", textAlign: "left" }}>
        <Kv k="Amount" v="$250.00" />
        <Kv k="Fee" v="$0.00" />
        <Kv k="When" v="Sunday, 9:41 PM" last />
      </Card>
      <Stack>
        <Button>Done</Button>
        <Button kind="ghost">Share receipt</Button>
        <Note style={{ textAlign: "center" }}><u>Something wrong?</u></Note>
      </Stack>
    </Body>
  </div>
);

/* ------------------------------------------------------------------ Mamá's messages, with the claim link */

const ADDR = "7xKq2…9fLm";
const NAME = "For Mamá";
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Address -> name, character by character (the Phantom username morph). */
export const morphText = (t: number, frame: number) => {
  const n = Math.max(ADDR.length, NAME.length);
  let s = "";
  for (let i = 0; i < n; i++) {
    const at = (i / n) * 0.7;
    if (t >= at + 0.3) s += NAME[i] ?? "";
    else if (t > at) s += GLYPHS[Math.floor(random(`m${i}-${Math.floor(frame)}`) * GLYPHS.length)];
    else s += ADDR[i] ?? "";
  }
  return s.trimEnd();
};

/** Logical centre of the link card in the chat. */
export const LINK_CARD = { x: 150, y: 300 };

export const ChatScreen = ({ cardIn = 1, morph = 1, frame = 0, press = 0 }: { cardIn?: number; morph?: number; frame?: number; press?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: "#FBFAF7", fontFamily: FONT }}>
    <div style={{ position: "absolute", top: 54, left: 0, right: 0, padding: "8px 16px 12px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
      <IcBack size={24} color={C.ink4} />
      <Avatar who="ana" size={40} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Ana</div>
        <div style={{ fontSize: 12, color: C.ink4 }}>Miami</div>
      </div>
    </div>
    <div style={{ position: "absolute", top: 136, left: 0, right: 0, textAlign: "center", fontSize: 11.5, color: C.ink4 }}>Today 9:41 PM</div>
    <div style={{ position: "absolute", top: 160, left: 14, maxWidth: 270, background: "#ECE8E0", borderRadius: "20px 20px 20px 6px", padding: "10px 14px", fontSize: 17, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
      For this week, Mamá.
    </div>
    {cardIn > 0.001 ? (
      <div
        style={{
          position: "absolute", top: 214, left: 14, width: 272, borderRadius: "22px 22px 22px 6px", overflow: "hidden", background: C.white,
          boxShadow: "0 1px 0 rgba(23,32,26,.06), 0 10px 24px -14px rgba(22,48,29,.35)",
          opacity: clamp01(cardIn * 2), transform: `translateY(${(1 - cardIn) * -36}px) scale(${(0.92 + 0.08 * cardIn) * (1 - press * 0.03)})`, transformOrigin: "0 0",
        }}
      >
        <div style={{ background: C.moss, color: "#fff", padding: "16px 16px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -30, top: -34, opacity: 0.12 }}><NestMark size={130} color="#fff" strokeWidth={3} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}><NestMark size={20} color="#fff" />Nest</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 12 }}>Ana sent you $250</div>
        </div>
        <div style={{ padding: "12px 16px 14px" }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: morph >= 1 ? C.moss : C.ink4, fontVariantNumeric: "tabular-nums", height: 22 }}>
            {morphText(morph, frame)}
          </div>
          <div style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>Tap to claim · no app needed</div>
        </div>
      </div>
    ) : null}
    <div style={{ position: "absolute", bottom: 30, left: 14, right: 14, height: 40, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 15, color: C.ink4 }}>
      Message
    </div>
  </div>
);

/* ------------------------------------------------------------------ Claim (3) */

/** Logical centre of the claim button. */
export const CLAIM_BTN = { x: 195, y: 745 };

export const ClaimScreen = ({ claimed = 0, press = 0 }: { claimed?: number; press?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.moss, color: "#fff", fontFamily: FONT }}>
    <div style={{ position: "absolute", right: -120, top: -60, opacity: 0.08 }}><NestMark size={420} color="#fff" strokeWidth={5.5} /></div>
    <Body style={{ alignItems: "center", textAlign: "center", color: "#fff" }}>
      <Avatar who="ana" size={84} style={{ marginTop: 120, boxShadow: "0 0 0 4px rgba(255,255,255,.25)" }} />
      <H1 style={{ color: "#fff", fontSize: 38, marginTop: 4 }}>Ana sent you $250.</H1>
      <div style={{ color: "rgba(255,255,255,.75)", fontSize: 17, marginTop: -6 }}>You don't need a bank account to get it.</div>
      <Stack>
        <div style={{ position: "relative", transform: `scale(${1 - press * 0.03})` }}>
          <Button kind="light">{claimed < 0.5 ? "Claim with your phone number" : ""}</Button>
          {claimed > 0 ? (
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.sage1, color: C.moss, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: 16, opacity: clamp01(claimed * 2) }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", transform: `scale(${clamp01(claimed * 1.3)})` }}><Check size={14} t={clamp01(claimed * 1.5 - 0.3)} /></span>
              $250.00 is yours
            </div>
          ) : null}
        </div>
        <Note style={{ color: "rgba(255,255,255,.6)" }}>Yours to use in 24 hours, since it's Ana's first payment to you.</Note>
      </Stack>
    </Body>
  </div>
);

/* ------------------------------------------------------------------ Offline send (15) */

export const OfflineSentScreen = () => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <Body style={{ alignItems: "center", textAlign: "center" }}>
      <div style={{ marginTop: 22 }}><Chip tone="white">No Wi-Fi or data</Chip></div>
      <div style={{ position: "relative", marginTop: 12 }}>
        <Avatar who="rosa" size={84} />
        <span style={{ position: "absolute", right: -6, bottom: -4, width: 36, height: 36, borderRadius: "50%", background: C.white, display: "grid", placeItems: "center", boxShadow: `0 0 0 4px ${C.page}`, color: C.moss }}>
          <IcSend size={18} />
        </span>
      </div>
      <H1 style={{ marginTop: 6 }}>Your $250 is on its way to Mamá.</H1>
      <div style={{ fontSize: 17, color: C.ink6, marginTop: -6 }}>We sent it by text message.</div>
      <Card tight style={{ width: "100%", textAlign: "left" }}>
        <Kv k="Signed" v="On this phone, by fingerprint" />
        <Kv k="Sent by" v="Text message" />
        <Kv k="Fee" v="$0.00" last />
      </Card>
      <Stack><Button>Done</Button></Stack>
    </Body>
  </div>
);

/* ------------------------------------------------------------------ Waiting to send (16) */

/** Logical centre of the status chip inside the queued card. */
export const QUEUED_CHIP = { x: 300, y: 186 };

/**
 * The app's "waiting to send" screen. The film keeps amber for the scam check and undo only, so the
 * queued state uses the sky tone; `sent` 0..1 flips the chip to "Sent" and the card to sage.
 */
export const QueuedScreen = ({ chip = 1, sent = 0 }: { chip?: number; sent?: number }) => {
  const on = sent >= 0.5;
  const s = on ? 0.85 + 0.15 * clamp01((sent - 0.5) * 2) : chip;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.page }}>
      <Body>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          {on ? <Chip tone="green">Online</Chip> : <Chip tone="white">No signal</Chip>}
        </div>
        <Card style={{ background: on ? C.sage1 : C.white, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar who="luis" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>$80.00 to Tío Luis</div>
              <div style={{ fontSize: 13, color: on ? C.moss : C.ink4, marginTop: 2 }}>{on ? "Sent · No fee" : "Goes out when you're back online"}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", transform: `scale(${s})`, transformOrigin: "0 50%", opacity: clamp01(chip * 3) }}>
            {on ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px 0 6px", borderRadius: 999, background: C.moss, color: "#fff", fontSize: 16, fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}><Check size={14} t={clamp01((sent - 0.5) * 3)} /></span>Sent
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px 0 10px", borderRadius: 999, background: C.sky1, color: C.skyInk, fontSize: 16, fontWeight: 600 }}>
                <IcClock size={18} />Queued
              </span>
            )}
          </div>
        </Card>
        <div>
          <Label style={{ marginBottom: 2 }}>Activity</Label>
          <Item left={<Avatar who="rosa" />} title="Mamá" sub="Sent by text · No fee" right={<Amt>−$250.00</Amt>} />
          <Item left={<Avatar who="dani" />} title="Daniela" sub="Received" right={<Amt style={{ color: C.moss }}>+$120.00</Amt>} last />
        </div>
        <Note style={{ marginTop: "auto", marginBottom: 40, textAlign: "center" }}>Payments wait here and go out in order when you're back online.</Note>
      </Body>
    </div>
  );
};

/* ------------------------------------------------------------------ Scam check (12) */

/** Logical centre of the "Hold to send anyway" button. */
export const SCAM_HOLD = { x: 195, y: 545 };

export const ScamScreen = ({ reasons = 3, holdFill = 0, head = 1, tile = 1 }: { reasons?: number; holdFill?: number; head?: number; tile?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: C.page }}>
    <Body>
      <div style={{ marginTop: 40 }}>
        <ScamCheckContent width={350} reasons={reasons} holdFill={holdFill} head={head} tile={tile} />
      </div>
    </Body>
  </div>
);
