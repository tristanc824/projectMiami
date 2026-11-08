import React from "react";
import { C, FONT } from "../theme";
import { Avatar } from "./Atoms";

/**
 * An activity/recipient row pulled out of the app and floated large. Authored in px at final size
 * (the in-app row is 16/13px, far too small to read on a phone-sized video).
 */
export const FloatRow = ({
  glyph, title, sub, subColor, right, style,
}: { glyph: string; title: string; sub: string; subColor: string; right?: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      width: 950, background: C.white, borderRadius: 56, padding: "38px 44px", display: "flex", alignItems: "center", gap: 34,
      fontFamily: FONT, color: C.ink,
      boxShadow: "0 2px 4px rgba(22,48,29,0.06), 0 24px 48px -16px rgba(22,48,29,0.25), 0 70px 130px -40px rgba(22,48,29,0.45)",
      ...style,
    }}
  >
    <Avatar size={128} bg={C.amber1} color={C.amber} style={{ fontSize: 60 }}>{glyph}</Avatar>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
        <span style={{ fontSize: 50, fontWeight: 600, letterSpacing: "-0.025em", whiteSpace: "nowrap" }}>{title}</span>
        {right}
      </div>
      <div style={{ fontSize: 56, fontWeight: 600, color: subColor, letterSpacing: "-0.02em", marginTop: 6, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  </div>
);
