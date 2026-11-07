import type { CSSProperties } from "react";
import { ChevronsRight } from "lucide-react";
import { ArcGlobe } from "./ArcGlobe";
import { Vortex } from "./Vortex";

// Entrance timing for the CSS `.rise` animation (replaces framer-motion, saving ~100KB of JS).
const delay = (s: number) => ({ animationDelay: `${s}s` }) as CSSProperties;

/**
 * Hero: centered two-tone headline and two pills over a "planet horizon": the Nest globe rising
 * from the bottom edge with money arcs between cities, fed by the vortex lines.
 */
export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[max(100svh,760px)] flex-col overflow-hidden bg-carbon">
      {/* horizon glow (gradient only, no blur filter) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[75%] bg-[radial-gradient(60%_55%_at_50%_100%,rgba(0,82,255,0.38),rgba(0,82,255,0.08)_55%,transparent_80%)]" />
      <Vortex className="pointer-events-none absolute inset-0 -z-10 h-full w-full animate-breathe will-change-[opacity]" />

      {/* The centerpiece: a large globe rising from the bottom edge, bleeding off-screen. Rendered as
          a "cap" strip, so only the visible part is drawn. */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[46%] min-h-[320px]">
        <div className="rise-slow relative h-full w-full" style={delay(0.2)}>
          <div className="pointer-events-none absolute inset-x-[8%] -top-[30%] bottom-0 rounded-[50%] bg-[radial-gradient(50%_60%_at_50%_60%,rgba(0,82,255,0.45),rgba(0,82,255,0.1)_60%,transparent_80%)]" />
          <ArcGlobe className="relative h-full w-full" cap={{ radius: 0.44, top: 0.1 }} renderScale={0.7} theta={0.2} speed={0.0016} bright pulse />
        </div>
      </div>
      {/* fade the globe into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-carbon to-transparent" />

      <div className="wrap flex flex-1 flex-col items-center pt-28 text-center sm:pt-32">
        <a href="#account" className="rise inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.14em] text-white/65 transition hover:border-white/25 hover:text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_8px_2px_rgba(125,180,255,0.7)]" /> Protect what matters
        </a>
        <h1 className="rise headline mt-6 text-[clamp(40px,6.6vw,88px)] leading-[0.98]" style={delay(0.08)}>
          <span className="block text-white">Your money, in dollars.</span>{" "}
          <span className="block bg-gradient-to-b from-white/75 to-white/30 bg-clip-text text-transparent">Protected anywhere.</span>
        </h1>
        <p className="rise mt-6 max-w-[52ch] text-[clamp(16px,1.6vw,19px)] leading-relaxed text-white/65" style={delay(0.16)}>
          One account to save, spend and send digital dollars,
          <br className="hidden sm:block" /> with scam protection built into every payment.
        </p>
        <div className="rise mt-8 flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row sm:gap-5" style={delay(0.24)}>
          <a href="#join" className="btn-beam group w-full sm:w-auto">
            Get early access <ChevronsRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <a href="#account" className="link-arrow">See what’s inside</a>
        </div>
      </div>
    </section>
  );
}
