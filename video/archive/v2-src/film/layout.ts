/*
 * The film's design system (FILM_V2_SPEC.md section 3): a 12-column grid on 1920x1080 with 120 px
 * outer margins and 24 px gutters (column = 118 px), one phone size, one type scale.
 * Columns here are 0-based (col 0 = the spec's "column 1").
 */

export const W = 1920;
export const H = 1080;
export const CX = 960;
export const CY = 540;

export const MARGIN = 120;
export const GUTTER = 24;
export const COL = 118;
export const STEP = COL + GUTTER; // 142

/** Left edge of column i (0-based): 120, 262, 404 ... 1682. */
export const colX = (i: number) => MARGIN + i * STEP;
/** Right edge of column i: 238, 380 ... 1800. */
export const colR = (i: number) => colX(i) + COL;
/** Centre of column i: 179, 321, 463, 605 ... 1741. */
export const colC = (i: number) => colX(i) + COL / 2;
/** Width of a span of n columns. */
export const span = (n: number) => n * COL + (n - 1) * GUTTER;

/**
 * 2-up layouts split at x = 960; each element is centred in its half of the 12-column grid
 * (cols 0-5 = 120..948 and cols 6-11 = 972..1800), so both centres are symmetric about 960.
 */
export const HALF_L = (colX(0) + colR(5)) / 2; // 534
export const HALF_R = (colX(6) + colR(11)) / 2; // 1386

/** Type scale (px). Headlines 600 weight, -0.035em; display line-height 1.05, body 1.35. */
export const T = { xxl: 112, xl: 72, l: 48, m: 32, s: 24 } as const;
export const TRACK = "-0.035em";

/** One phone size everywhere: 390x844 logical screen scaled so the screen is 880 px tall. */
export const PHONE_LW = 390;
export const PHONE_LH = 844;
export const PHONE_K = 880 / PHONE_LH; // 1.0427
export const PHONE_SW = PHONE_LW * PHONE_K; // 406.6
export const PHONE_SH = 880;
/** Top-left of the phone screen for a phone centred at (cx, cy). */
export const phoneAt = (cx: number, cy = CY) => ({ x: cx - PHONE_SW / 2, y: cy - PHONE_SH / 2, k: PHONE_K });
/** Logical point on a phone -> screen point. */
export const onPhone = (p: { x: number; y: number; k: number }, lx: number, ly: number) => ({ x: p.x + lx * p.k, y: p.y + ly * p.k });

/** Chapter label: top-left on the margin, the same size in every scene. */
export const LABEL = { x: MARGIN, y: 96, mark: 40, font: T.m, gap: 12 } as const;

/** The inflation scene's two grocery cards (scene 1 pushes into the left one). */
export const INFL_CARD = { y: 312, w: 544, h: 418, r: 40 };
