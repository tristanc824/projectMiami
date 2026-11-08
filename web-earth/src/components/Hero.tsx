import { Flock } from "./Birds";

/** Inset photo hero: a wide meadow, swallows crossing the sky, the line and two buttons. */
export function Hero() {
  return (
    <section id="top" className="px-3 pt-3 sm:px-6 sm:pt-6">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-sky-100 sm:rounded-[48px]">
        <img
          src="/photos/meadow.jpg"
          alt="A wide green meadow under a pale blue sky, with hills in the distance."
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_72%] [filter:saturate(1.12)_brightness(1.06)]"
          fetchPriority="high"
        />
        {/* a single, quiet scrim so white type always reads */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(16,26,19,0.62),rgba(16,26,19,0.08)_55%,rgba(16,26,19,0)_75%)]" />
        <Flock tone="#1C2A22" />

        <div className="flex min-h-[min(92svh,900px)] flex-col justify-end px-7 pb-12 pt-40 sm:px-16 sm:pb-20">
          <div className="max-w-[760px]">
            <h1 className="text-[clamp(52px,8.4vw,112px)] font-semibold leading-[1.02] tracking-[-0.045em] text-white">Protect what matters.</h1>
            <p className="mt-5 max-w-[46ch] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-white/85">
              Save and send, secured.
            </p>
            <p className="mt-3 text-sm text-white/85">A Solana devnet demo. Test USDC only, with network fees covered by Nest.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/app/sign-in" className="btn-light">Open an account</a>
              <a href="#stories" className="btn border border-white/60 text-white hover:bg-white/10">See how it works</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
