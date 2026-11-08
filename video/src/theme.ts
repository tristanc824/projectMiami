import { loadFont } from "@remotion/google-fonts/Figtree";

/** Brand tokens, copied from app-design/nest-app-screens.html (:root) and APP_HANDOFF.md. */
export const C = {
  page: "#F3F0EA",
  white: "#FFFFFF",
  ink: "#17201A",
  ink6: "#4A544D",
  ink4: "#646C66",
  line: "#E3DED3",
  moss: "#2F5D3A",
  moss9: "#16301D",
  sage: "#A9C4A1",
  sage1: "#E4ECDF",
  skyLine: "#5FA8D6",
  sky1: "#DCEEF8",
  skyInk: "#235C7D",
  sand: "#E9E1D1",
  amber: "#8A5A10",
  amber1: "#F6EBD3",
  amberInk: "#4B3507",
  cents: "#A3AAA4",
} as const;

export const { fontFamily: FONT } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** 9:16 safe zone from VIDEO_SCRIPT.md: top 14%, bottom 35%, 6% each side. */
export const SAFE = { top: Math.round(H * 0.14), bottom: Math.round(H * 0.65), side: Math.round(W * 0.06) };

/** Soft, layered "floated" shadow for isolated UI pieces. */
export const FLOAT_SHADOW =
  "0 2px 4px rgba(22,48,29,0.06), 0 18px 36px -12px rgba(22,48,29,0.22), 0 60px 120px -40px rgba(22,48,29,0.45)";
