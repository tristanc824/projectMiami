import { Flock } from "./Birds";

/** Inset photo hero, the way Mastercard, Deere and Amex do it: rounded media on a warm page, type on the image. */
export function Hero() {
  return (
    <section id="top" className="px-3 pt-[76px] sm:px-5">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-sky-100">
        <img
          src="/hero.jpg"
          alt="A wide green meadow under a pale blue sky, with hills in the distance."
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_72%] [filter:saturate(1.12)_brightness(1.06)]"
          fetchPriority="high"
        />
        {/* a single, quiet scrim so white type always reads */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(16,26,19,0.62),rgba(16,26,19,0.08)_55%,rgba(16,26,19,0)_75%)]" />
        <Flock tone="#1C2A22" />

        <div className="flex min-h-[min(86svh,820px)] flex-col justify-end px-6 pb-10 pt-40 sm:px-12 sm:pb-14">
          <div className="max-w-[760px]">
            <h1 className="display text-[clamp(52px,8.4vw,112px)] text-white">Protect what matters.</h1>
            <p className="mt-5 max-w-[46ch] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-white/85">
              One account to save, spend and send digital dollars, with scam protection built into every payment.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#join" className="btn-light">Get early access</a>
              <a href="#account" className="btn border border-white/60 text-white hover:bg-white/10">See how it works</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
