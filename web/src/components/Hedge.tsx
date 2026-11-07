import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PhoneShot } from "./PhoneShot";
import { stagger } from "../lib/motion";

const points = ["Vaults for goals and an emergency fund", "Auto-save rules like round-ups", "Spend or send it any time, no lock-up"];

/**
 * Save: text on the left, the app on the right. The phone floats gently and the glow behind it
 * breathes (CSS transform/opacity only, paused off-screen).
 */
export function Hedge() {
  const ref = useRef<HTMLElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { rootMargin: "-8% 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const play = { animationPlayState: running ? "running" : "paused" } as const;

  return (
    <section id="save" ref={ref} className="relative overflow-hidden bg-carbon py-24 sm:py-32">
      <div className="wrap grid items-center gap-16 lg:grid-cols-[1fr_auto] lg:gap-20">
        <div className="max-w-[560px]">
          <div data-reveal>
            <p className="kicker">Save</p>
            <h2 className="headline mt-3 text-[clamp(40px,5.6vw,76px)] leading-[1]">
              Inflation can’t touch{" "}
              <span className="bg-gradient-to-r from-sky to-guard-400 bg-clip-text text-transparent">your savings.</span>
            </h2>
            <p className="body-lg mt-6 max-w-[44ch]">
              Your balance is held in US dollars, so it keeps its value when your local currency doesn’t.
            </p>
          </div>
          <ul className="mt-8 space-y-3">
            {points.map((p, i) => (
              <li key={p} data-reveal style={stagger(i + 1)} className="flex items-center gap-3 text-[16px] text-white/80">
                <Check size={18} className="shrink-0 text-sky" /> {p}
              </li>
            ))}
          </ul>
          <p data-reveal style={stagger(4)} className="fine mt-10 max-w-[56ch]">
            The dollar has inflation too, usually far lower than the currencies it protects against.
            USDC is a digital dollar, not an insured bank deposit.
          </p>
        </div>

        <div data-reveal style={stagger(1)} className="relative flex justify-center">
          {/* soft blue light behind the phone: outer div positions, inner div breathes */}
          <div className="pointer-events-none absolute left-1/2 top-[6%] h-[88%] w-[min(760px,140vw)] -translate-x-1/2">
            <div className="h-full w-full animate-orb-breathe rounded-full bg-[radial-gradient(closest-side,rgba(0,82,255,0.4),rgba(0,82,255,0.1)_55%,transparent_75%)]" style={play} />
          </div>
          <div className="relative animate-phone-float" style={play}>
            <PhoneShot />
          </div>
        </div>
      </div>
    </section>
  );
}
