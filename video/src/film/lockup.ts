import { LABEL } from "./layout";
import { measure } from "./scene";

/*
 * The Nest lockup is the chapter label scaled up (BIG), so the bar-10 fly to the corner is a pure
 * scale + translate and lands exactly on the label.
 */
export const BIG = 4;
export const LABEL_H = LABEL.font * 1.3;
export const wordW = () => measure("Nest", LABEL.font, 600, -0.025);
export const lockW = () => LABEL.mark + LABEL.gap + wordW();

/** Top-left of the big lockup when the whole lockup is centred on (cx, cy). */
export const lockCentred = (cx: number, cy: number) => ({ x: cx - (BIG * lockW()) / 2, y: cy - (BIG * LABEL_H) / 2 });
/** Top-left of the big lockup when its mark is centred on (cx, cy) (before the word arrives). */
export const markCentred = (cx: number, cy: number) => ({ x: cx - (BIG * LABEL.mark) / 2, y: cy - (BIG * LABEL_H) / 2 });
