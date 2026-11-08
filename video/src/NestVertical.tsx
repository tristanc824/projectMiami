import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";
import { BEATS } from "./timeline";
import { Shot, PrototypePill } from "./ui/Stage";
import { Soundtrack } from "./Soundtrack";
import { B01Hook } from "./scenes/B01Hook";
import { B02Bank } from "./scenes/B02Bank";
import { B03Brand } from "./scenes/B03Brand";
import { B04Home } from "./scenes/B04Home";
import { B05Send } from "./scenes/B05Send";
import { B06NewNumber } from "./scenes/B06NewNumber";
import { B07Scam } from "./scenes/B07Scam";
import { B08Hold } from "./scenes/B08Hold";
import { B09Undo } from "./scenes/B09Undo";
import { B10Undone } from "./scenes/B10Undone";
import { B11Line } from "./scenes/B11Line";
import { B12End } from "./scenes/B12End";

/** "Prototype" stays on for the whole run of app shots (beats 4-10), so it never flashes. */
const PROTO_FROM = BEATS.home.from + 6;
const PROTO_TO = BEATS.line.from + 4;

const Honesty = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [PROTO_FROM, PROTO_FROM + 12, PROTO_TO - 12, PROTO_TO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <PrototypePill opacity={o} />;
};

/** The vertical cut: 1080x1920, 53 s, captions only (VIDEO_SCRIPT.md section 1). */
export const NestVertical = () => (
  <AbsoluteFill style={{ backgroundColor: C.ink, fontFamily: FONT }}>
    <Shot name="1 Hook" {...BEATS.hook} tail={14}><B01Hook /></Shot>
    <Shot name="2 Bank" {...BEATS.bank} tail={4} enter="blur" enterLen={14}><B02Bank /></Shot>
    <Shot name="3 Nest" {...BEATS.brand} tail={16} enter="fade" enterLen={4}><B03Brand /></Shot>
    <Shot name="4 Home" {...BEATS.home} tail={16} enter="zoom" enterLen={16}><B04Home /></Shot>
    <Shot name="5 Send" {...BEATS.send} tail={14} enter="push" enterLen={16}><B05Send /></Shot>
    <Shot name="6 New number" {...BEATS.newNumber} tail={14} enter="fade" enterLen={10}><B06NewNumber /></Shot>
    <Shot name="7 Scam check" {...BEATS.scam} tail={12} enter="zoom" enterLen={14}><B07Scam /></Shot>
    <Shot name="8 Hold" {...BEATS.hold} tail={14} enter="fade" enterLen={8}><B08Hold /></Shot>
    <Shot name="9 Undo" {...BEATS.undo} tail={14} enter="pushUp" enterLen={16}><B09Undo /></Shot>
    <Shot name="10 Undone" {...BEATS.undone} tail={22} enter="fade" enterLen={10}><B10Undone /></Shot>
    <Shot name="11 Line" {...BEATS.line} tail={26} enter="blur" enterLen={22}><B11Line /></Shot>
    <Shot name="12 End" {...BEATS.end} enter="fade" enterLen={26}><B12End /></Shot>
    <Honesty />
    <Soundtrack />
  </AbsoluteFill>
);
