import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../theme";
import { body, DotGrid, FlipPhone, FPhone, head, PushScreens, Reveal, Tap } from "../kit";
import { HALF_L, HALF_R, phoneAt, T } from "../layout";
import { CAM, EASE_IN, EASE_IN_OUT, hitIn, lineOut, lineT, tween } from "../motion";
import { Drift, useF, useKick } from "../scene";
import { HIT, SC } from "../timeline";
import { ChatScreen, CLAIM_BTN, ClaimScreen, LINK_CARD } from "../screens";

/*
 * 6. Claim link (bars 17-19), timed to b07 ("She doesn't need the app. She taps the link and keeps
 * it in dollars."). The phone turns to Mamá's: Ana's chat; the link (nest.app/c/...) drops in on
 * bar 17 beat 2, its address morphs into "For Mamá" on beat 3; she taps it on "taps"; the claim
 * screen (Ana's avatar) lands on "keeps it in dollars", the claim tap and "$250.00 is yours" on the
 * next kicks. Right half: "No app needed." then "She keeps it in US dollars."
 */

const FROM = SC.claim.from;
const L = (abs: number) => abs - FROM;
const PH = phoneAt(HALF_L);
const press = (f: number, at: number) => tween(f, [at - 2, at], [0, 1]) * (1 - tween(f, [at + 2, at + 6], [0, 1]));

export const ClaimBody = ({ f }: { f: number }) => {
  const k = useKick(f);
  const inFlip = tween(f, [-SC.claim.swap, 0], [1, 0], CAM);
  const outFlip = tween(f, [SC.claim.dur - 12, SC.claim.dur - SC.offline.swap], [0, 1], EASE_IN);
  const angle = inFlip > 0 ? -90 * inFlip : 90 * outFlip;
  const cardIn = hitIn(f, L(HIT.linkIn));
  const morph = tween(f, [L(HIT.morph), L(HIT.morph) + 12], [0, 1], (t) => t);
  const push = tween(f, [L(HIT.tapLink) + 8, L(HIT.claimIn)], [0, 1], EASE_IN_OUT);
  const claimed = tween(f, [L(HIT.claimed) - 1, L(HIT.claimed) + 7], [0, 1]);
  const textOut = lineOut(f, SC.claim.dur - 12);
  const lineH = T.xxl * 1.05;
  const top = 540 - (2 * lineH + 28 + T.l * 1.35) / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Drift f={f}>
        <DotGrid glow={k.glow} />
        <FlipPhone ph={PH} angle={angle}>
          <FPhone light={push > 0.5}>
            <PushScreens
              t={push}
              from={<><ChatScreen cardIn={cardIn} morph={morph} frame={f} press={press(f, L(HIT.tapLink))} /><Tap x={LINK_CARD.x} y={LINK_CARD.y} t={f - L(HIT.tapLink)} /></>}
              to={<><ClaimScreen claimed={claimed} press={press(f, L(HIT.tapClaim))} /><Tap x={CLAIM_BTN.x} y={CLAIM_BTN.y} t={f - L(HIT.tapClaim)} color="255,255,255" /></>}
            />
          </FPhone>
        </FlipPhone>
        <div style={{ position: "absolute", left: HALF_R - 420, width: 840, top, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${k.scale})`, transformOrigin: `420px ${lineH}px` }}>
          <Reveal t={lineT(f, L(HIT.linkIn))} out={textOut}><div style={head(T.xxl)}>No app</div></Reveal>
          <Reveal t={lineT(f, L(HIT.linkIn), 1)} out={textOut}><div style={head(T.xxl)}>needed.</div></Reveal>
          <Reveal t={lineT(f, L(HIT.claimIn))} out={textOut} style={{ marginTop: 28 }}><div style={body(T.l)}>She keeps it in US dollars.</div></Reveal>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

export const S06Claim = () => <ClaimBody f={useF()} />;

