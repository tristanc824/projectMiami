import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { NestMark } from "./Logo";

const LINKS = [
  ["For you", "#stories"],
  ["For family", "#moments"],
  ["For business", "#moments"],
  ["About Nest", "#trust"],
];

/**
 * Floating pill navigation, Lululemon style: it slides away while you scroll down
 * and comes straight back the moment you scroll up.
 */
export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last.current;
      setOverHero(y < window.innerHeight * 0.8);
      if (y < 80) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      last.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-6 pt-6 transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] sm:pt-10",
        hidden ? "-translate-y-[160%]" : "translate-y-0",
      )}
    >
      {/* compact frosted pill: lets the photo show through over the hero, turns page-colored below it */}
      <nav
        className={cn(
          "mx-auto flex h-[52px] max-w-[760px] items-center justify-between rounded-full pl-5 pr-1.5 ring-1 backdrop-blur-xl transition-colors duration-500",
          overHero ? "bg-white/55 ring-white/50" : "bg-page/85 ring-ink/[0.06]",
        )}
      >
        <a href="#top" aria-label="Nest home" className="flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.02em] text-ink">
          <NestMark className="h-[22px] w-[22px]" /> Nest
        </a>
        <ul className="hidden items-center gap-7 text-[14px] text-ink/80 md:flex">
          {LINKS.map(([label, href]) => (
            <li key={label}><a href={href} className="transition-colors hover:text-ink">{label}</a></li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <a href="/app/sign-in" className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium text-ink transition-colors hover:bg-white/60">Log in</a>
          <a href="/app/sign-in" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-moss-900">
            Open an account
          </a>
        </div>
      </nav>
    </header>
  );
}
