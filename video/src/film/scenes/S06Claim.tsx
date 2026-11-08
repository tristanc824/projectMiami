import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../../theme";
import { body, Check, DotGrid, FlipPhone, FPhone, head, PushScreens, Reveal, Tap } from "../kit";
import { HALF_L, HALF_R, phoneAt, T } from "../layout";
import { CAM, clamp01, EASE_IN, EASE_IN_OUT, EASE_OUT, hitIn, lineOut, lineT, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { BrowserClaimScreen, ChatScreen, KEEP_BTN, LINK_CARD, SIGNIN_BTN } from "../screens";

/*
 * 6. Claim link (bars 16-19), v4, timed to the new b07: "She doesn't need to download anything. She
 * opens the link and keeps it in dollars." Mamá's phone: Ana's chat; the link drops in on the kick
 * re-entry (bar 16 beat 2) and its address morphs into "For Mamá". She taps it on "opens the link":
 * it opens in her phone's own browser (nest.app, address bar and toolbar), she signs in with her
 * number (it types in, Continue), and on "keeps it in dollars" the claim card lands: $250.00, held
 * in US dollars; "Keep it in US dollars" -> "$250.00 is yours". Right half: "No app needed." and a
 * three-step checklist that ticks in step with the phone.
 */

const FROM = SC.claim.from;
const L = (abs: number) => abs - FROM;
const PH = phoneAt(HALF_L);
const press = (f: number, at: number) => tween(f, [at - 2, at], [0, 1]) * (1 - tween(f, [at + 2, at + 6], [0, 1]));
const STEPS = [
  { text: "Opens in her browser", at: L(HIT.browser) },
  { text: "Signs in with her number", at: L(HIT.typeFrom) },
  { text: "Keeps it in US dollars", at: L(HIT.claimIn) },
];

export const ClaimBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const inFlip = tween(f, [-SC.claim.swap, 0], [1, 0], CAM);
  const outFlip = tween(f, [SC.claim.dur - 14, SC.claim.dur - SC.offline.swap], [0, 1], EASE_IN);
  const angle = inFlip > 0 ? -90 * inFlip : 90 * outFlip;
  const cardIn = hitIn(f, L(HIT.linkIn));
  const morph = tween(f, [L(HIT.morph), L(HIT.morph) + 12], [0, 1], (t) => t);
  // Opening the link: the browser slides over the chat in the beat after the tap.
  const open = tween(f, [L(HIT.tapLink) + 3, L(HIT.browser)], [0, 1], EASE_IN_OUT);
  const load = tween(f, [L(HIT.browser) - 4, L(HIT.browser) + 6], [0, 1], EASE_OUT);
  const typed = tween(f, [L(HIT.typeFrom), L(HIT.tapSignIn) - 6], [0, 1], (t) => t);
  const signed = tween(f, [L(HIT.tapSignIn) + 3, L(HIT.claimIn)], [0, 1], EASE_IN_OUT);
  const claimed = tween(f, [L(HIT.claimed) - 1, L(HIT.claimed) + 7], [0, 1]);
  const textOut = lineOut(f, SC.claim.dur - 8);
  const lineH = T.xxl * 1.05;
  const listH = 3 * 64 + 2 * 18;
  const top = 540 - (2 * lineH + 56 + listH) / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Drift f={f}>
        <DotGrid glow={k.glow} />
        <FlipPhone ph={PH} angle={angle}>
          <FPhone>
            <PushScreens
              t={open}
              from={<><ChatScreen cardIn={cardIn} morph={morph} frame={f} press={press(f, L(HIT.tapLink))} /><Tap x={LINK_CARD.x} y={LINK_CARD.y} t={f - L(HIT.tapLink)} /></>}
              to={
                <>
                  <BrowserClaimScreen load={load} typed={typed} signed={signed} claimed={claimed} pressA={press(f, L(HIT.tapSignIn))} pressB={press(f, L(HIT.tapClaim))} frame={f} />
                  <Tap x={SIGNIN_BTN.x} y={SIGNIN_BTN.y} t={f - L(HIT.tapSignIn)} />
                  <Tap x={KEEP_BTN.x} y={KEEP_BTN.y} t={f - L(HIT.tapClaim)} color="255,255,255" />
                </>
              }
            />
          </FPhone>
        </FlipPhone>
        <div style={{ position: "absolute", left: HALF_R - 336, width: 760, top, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ transform: `scale(${k.scale})`, transformOrigin: "0 50%" }}>
            <Reveal t={lineT(f, L(HIT.noDownload))} out={textOut}><div style={head(T.xxl)}>No app</div></Reveal>
            <Reveal t={lineT(f, L(HIT.noDownload), 1)} out={textOut}><div style={head(T.xxl)}>needed.</div></Reveal>
          </div>
          <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((s, i) => {
              const c = hitIn(f, s.at);
              return (
                <div key={s.text} style={{ display: "flex", alignItems: "center", gap: 22, height: 64 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.moss, display: "grid", placeItems: "center", transform: `scale(${c * (1 - tween(f, [SC.claim.dur - 10, SC.claim.dur - 4], [0, 1], EASE_IN))})`, flex: "none" }}>
                    <Check size={28} t={tween(f, [s.at + 2, s.at + 9], [0, 1], EASE_OUT)} />
                  </div>
                  <Reveal t={lineT(f, s.at)} out={lineOut(f, SC.claim.dur - 8, i)}><div style={body(T.l, C.ink, 500)}>{s.text}</div></Reveal>
                </div>
              );
            })}
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

export const S06Claim = () => <ClaimBody f={useF()} />;
