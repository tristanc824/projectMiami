import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { NestNode, RecipientCard, SenderCard } from "./FlowNodes";
import { useInView, useLoopClock, useMediaQuery } from "./hooks";
import { LOOP, SETTLE_SECONDS, T, easeInOutCubic, phaseAt, span, type Phase } from "./timeline";

/** Layout of the route in SVG units. HTML nodes are placed at the same points, as percentages. */
type Geo = { w: number; h: number; nodes: [number, number][]; legs: [string, string] };
const WIDE: Geo = {
  w: 960, h: 300,
  nodes: [[150, 140], [480, 140], [810, 140]],
  legs: ["M150 140 C 270 40, 370 40, 480 140", "M480 140 C 590 240, 690 240, 810 140"],
};
const TALL: Geo = {
  w: 340, h: 660,
  nodes: [[170, 92], [170, 330], [170, 568]],
  legs: ["M170 92 C 70 175, 70 247, 170 330", "M170 330 C 270 413, 270 485, 170 568"],
};

/** Comet tail: stacked dashes ending at the head, longer ones fainter, so it tapers like a gradient. */
const TAIL = [
  { len: 150, width: 2, opacity: 0.22 },
  { len: 70, width: 2.5, opacity: 0.5 },
  { len: 22, width: 3, opacity: 1 },
];

const SIG = "4vJ9xQm2Wb7nTz…Kp7Rf3";

type LegEls = { path: SVGPathElement; lit: SVGPathElement; comet: SVGGElement; head: SVGGElement; tails: SVGPathElement[]; len: number };

/**
 * The Send flow: You → Nest → Family, as one scripted transfer on a loop.
 * - one requestAnimationFrame clock (see timeline.ts) drives every moving part
 * - per-frame values (comet, timer, receipt) are written straight to the DOM; React re-renders only
 *   on the five phase changes, which drive the CSS state transitions (spring easing)
 * - pauses off-screen, and shows the finished state under reduced motion
 */
export function SendFlow() {
  const wide = useMediaQuery("(min-width: 768px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const g = wide ? WIDE : TALL;

  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const press = useRef<HTMLSpanElement>(null);
  const timer = useRef<HTMLSpanElement>(null);
  const sig = useRef<HTMLSpanElement>(null);
  const flow = useRef<SVGGElement>(null);
  const legs = useRef<LegEls[]>([]);
  const typed = useRef(-1);

  const visible = useInView(stage);
  const [phase, setPhase] = useState<Phase>("send");
  const phaseRef = useRef<Phase>("send");

  // Collect the SVG parts of each leg and set their static dash patterns (lengths are in SVG units,
  // so they don't change with the rendered size, only with the layout).
  useLayoutEffect(() => {
    const root = svg.current;
    if (!root) return;
    legs.current = [0, 1].map((i) => {
      const q = <E extends Element>(s: string) => root.querySelector<E>(`[data-leg="${i}"] ${s}`)!;
      const path = q<SVGPathElement>("[data-part=route]");
      const len = path.getTotalLength();
      const lit = q<SVGPathElement>("[data-part=lit]");
      lit.style.strokeDasharray = `${len} ${len * 2}`;
      const tails = Array.from(root.querySelectorAll<SVGPathElement>(`[data-leg="${i}"] [data-part=tail]`));
      tails.forEach((el, k) => (el.style.strokeDasharray = `${TAIL[k].len} ${len * 2}`));
      return { path, lit, tails, len, comet: q<SVGGElement>("[data-part=comet]"), head: q<SVGGElement>("[data-part=head]") };
    });
    typed.current = -1;
    if (reduced) render(LOOP * 0.8, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, reduced]);

  /** Draw one frame at time t (ms into the loop). */
  const render = useCallback((t: number, still = false) => {
    const ph = still ? "arrived" : phaseAt(t);
    if (ph !== phaseRef.current) {
      phaseRef.current = ph;
      setPhase(ph);
    }

    // comet + lit trail (the traveled part of the route) on each leg
    const windows = [T.legA, T.legB] as const;
    const litAlpha = still ? 1 : 1 - span(t, [T.fade, LOOP - 120]);
    legs.current.forEach((L, i) => {
      const raw = still ? 1 : span(t, windows[i]);
      const pos = easeInOutCubic(raw) * L.len;
      L.lit.style.strokeDashoffset = `${L.len - pos}`;
      L.lit.style.opacity = `${litAlpha}`;
      const alpha = still || raw <= 0 || raw >= 1 ? 0 : Math.min(1, raw / 0.08, (1 - raw) / 0.06);
      L.comet.style.opacity = `${alpha}`;
      if (alpha > 0) {
        L.tails.forEach((el, k) => (el.style.strokeDashoffset = `${TAIL[k].len - pos}`));
        const p = L.path.getPointAtLength(pos);
        L.head.setAttribute("transform", `translate(${p.x} ${p.y})`);
      }
    });

    // ambient "packets" drifting along the dotted route (6000ms × 0.03 = 180, a multiple of the
    // 10-unit dash period, so the loop is seamless)
    if (flow.current) flow.current.style.strokeDashoffset = `${-(t * 0.03) % 10}`;

    // tap on "Send"
    if (press.current) {
      const k = !still && t < T.press ? Math.sin((Math.PI * t) / T.press) : 0;
      press.current.style.transform = k ? `scale(${1 - 0.08 * k})` : "";
    }

    // timer and receipt
    if (timer.current) timer.current.textContent = `${(SETTLE_SECONDS * (still ? 1 : span(t, [T.legA[0], T.legB[1]]))).toFixed(2)}s`;
    const n = still ? SIG.length : Math.floor(span(t, T.type) * SIG.length);
    if (n !== typed.current && sig.current) {
      typed.current = n;
      sig.current.textContent = SIG.slice(0, n);
    }
  }, []);

  useLoopClock(visible && !reduced, LOOP, render);

  const at = ([x, y]: [number, number]) => ({ left: `${(x / g.w) * 100}%`, top: `${(y / g.h) * 100}%` });
  const settled = phase === "arrived";

  return (
    <div className="relative mx-auto mt-16 max-w-[960px] sm:mt-20">
      {/* faint dotted grid, faded out toward the edges with a gradient overlay (no mask) */}
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-10 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1.2px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-10 bg-[radial-gradient(closest-side,transparent_40%,#0A0B0D)]" />

      <div
        ref={stage}
        className={cn("relative mx-auto w-full", wide ? "max-w-[960px]" : "max-w-[340px]")}
        style={{ aspectRatio: `${g.w} / ${g.h}` }}
        role="img"
        aria-label="A $200 transfer from you in Miami is checked by Nest for scams, then lands with family abroad in about a second."
      >
        <svg ref={svg} viewBox={`0 0 ${g.w} ${g.h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="sf-lit" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={g.w} y2={g.h}>
              <stop offset="0" stopColor="#0052FF" />
              <stop offset="1" stopColor="#7DB4FF" />
            </linearGradient>
            <radialGradient id="sf-glow">
              <stop offset="0" stopColor="#DCE9FF" stopOpacity="1" />
              <stop offset="0.25" stopColor="#7DB4FF" stopOpacity="0.6" />
              <stop offset="0.55" stopColor="#2F6BFF" stopOpacity="0.18" />
              <stop offset="1" stopColor="#0052FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* the route, as drifting dots */}
          <g ref={flow} fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 10">
            {g.legs.map((d) => <path key={d} d={d} />)}
          </g>

          {g.legs.map((d, i) => (
            <g key={d} data-leg={i}>
              <path data-part="route" d={d} fill="none" stroke="none" />
              <path data-part="lit" d={d} fill="none" stroke="url(#sf-lit)" strokeWidth="1.5" strokeOpacity="0.7" style={{ strokeDashoffset: 9999 }} />
              <g data-part="comet" style={{ opacity: 0 }}>
                {TAIL.map((s) => (
                  <path key={s.len} data-part="tail" d={d} fill="none" stroke="#9CC3FF" strokeWidth={s.width} strokeOpacity={s.opacity} strokeLinecap="round" />
                ))}
                <g data-part="head">
                  <circle r="30" fill="url(#sf-glow)" />
                  <circle r="4" fill="#FFFFFF" />
                </g>
              </g>
            </g>
          ))}
        </svg>

        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={at(g.nodes[0])}>
          <SenderCard ref={press} className={wide ? "w-[214px] lg:w-[232px]" : "w-[256px]"} />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={at(g.nodes[1])}>
          <NestNode phase={phase} />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={at(g.nodes[2])}>
          <RecipientCard phase={phase} className={wide ? "w-[214px] lg:w-[232px]" : "w-[256px]"} />
        </div>
      </div>

      {/* receipt line */}
      <div
        className={cn(
          "relative mx-auto mt-12 flex w-fit max-w-full flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-[13px] text-white/60 transition-opacity duration-500 sm:mt-10 sm:flex-row sm:gap-3 sm:rounded-full sm:py-2 ",
          phase === "reset" ? "opacity-40" : "opacity-100"
        )}
        aria-hidden
      >
        <span className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-500", settled ? "bg-mint shadow-[0_0_8px_2px_rgba(48,209,88,0.6)]" : "bg-sky shadow-[0_0_8px_2px_rgba(125,180,255,0.6)]")} />
          <span className={settled ? "text-white/80" : ""}>{settled ? "Settled" : "Confirming"} on Solana devnet</span>
        </span>
        <span className="hidden text-white/20 sm:inline">·</span>
        <span className="flex items-center gap-3">
          <span>
            sig <span ref={sig} className="text-sky" />
            <span className="ml-px inline-block h-[1em] w-[0.5ch] translate-y-[2px] bg-sky/70 align-baseline sf-caret" />
          </span>
          <span className="text-white/20">·</span>
          <span ref={timer} className="tabular-nums text-white/80">0.00s</span>
        </span>
      </div>
    </div>
  );
}
