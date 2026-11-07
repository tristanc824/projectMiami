import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "../lib/cn";
import { NestMark } from "./Logo";
import { Flock } from "./Birds";

/*
 * Nest's own visual language:
 *  - photos cropped as eggs and pebbles (a nest egg, organic, earthy), never perfect circles
 *  - "orbits": tilted ellipse outlines taken from the logo's rings
 *  - labels in sentence case beside a tiny Nest mark
 */

const SHAPES = {
  egg: "aspect-[4/5] [border-radius:50%_50%_46%_46%/58%_58%_42%_42%]",
  pebble: "aspect-[5/4] [border-radius:46%_54%_50%_50%/56%_48%_52%_44%]",
};

function Label({ children, light }: { children: string; light?: boolean }) {
  return (
    <p className={cn("flex items-center gap-2 text-[15px] font-medium", light ? "text-white" : "text-moss")}>
      <NestMark className="h-4 w-4" color={light ? "#FFFFFF" : "#2F5D3A"} /> {children}
    </p>
  );
}

/** A tilted ring from the logo, drawn behind a photo. */
function Orbit({ className, rotate = -18 }: { className?: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="none" className={cn("pointer-events-none absolute overflow-visible", className)} aria-hidden="true">
      <ellipse cx="100" cy="70" rx="98" ry="58" transform={`rotate(${rotate} 100 70)`} fill="none" stroke="#2F5D3A" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- Stories: a row of tall cards you can swipe ---------- */

const STORIES = [
  { img: "/photos/selfie.jpg", tag: "Send home", title: "Mom gets it in about a second.", pos: "50% 35%" },
  { img: "/photos/market-pair.jpg", tag: "Dollar savings", title: "Your savings stay in US dollars.", pos: "35% 30%" },
  { img: "/photos/kitchen.jpg", tag: "Undo", title: "Undo a scam payment within 24 hours.", pos: "60% 30%" },
  { img: "/photos/friends.jpg", tag: "No fees", title: "Split dinner without paying a fee.", pos: "50% 55%" },
  { img: "/photos/phone.jpg", tag: "Independent", title: "Take your account with you when you move.", pos: "45% 40%" },
  { img: "/photos/market.jpg", tag: "No Wi-Fi", title: "Send money with no Wi-Fi.", pos: "50% 30%" },
];

export function Stories() {
  const row = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => row.current?.scrollBy({ left: dir * (row.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <section id="stories" className="py-20 sm:py-28">
      <div className="wrap flex items-end justify-between gap-6">
        <h2 className="text-[clamp(36px,4.6vw,64px)] font-medium leading-[1.02] tracking-[-0.035em] text-ink">Everyday money, held in dollars.</h2>
        <div className="flex gap-2">
          <button onClick={() => nudge(-1)} aria-label="Previous stories" className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink transition-colors hover:bg-sage-100"><ArrowLeft size={18} /></button>
          <button onClick={() => nudge(1)} aria-label="More stories" className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white transition-colors hover:bg-moss-900"><ArrowRight size={18} /></button>
        </div>
      </div>
      <div ref={row} className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-4 [scrollbar-width:none] sm:gap-5 sm:px-[max(32px,calc((100vw-1200px)/2+32px))] [&::-webkit-scrollbar]:hidden">
        {STORIES.map((s) => (
          <article key={s.title} className="relative aspect-[3/4] w-[78vw] shrink-0 snap-start overflow-hidden rounded-[36px] sm:w-[360px]">
            <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" style={{ objectPosition: s.pos }} />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,20,16,0.6),rgba(14,20,16,0)_45%)]" />
            <span className="absolute left-5 top-5 rounded-full bg-white/85 px-3.5 py-1.5 text-[13px] font-medium text-ink backdrop-blur">{s.tag}</span>
            <p className="absolute inset-x-6 bottom-6 text-[28px] font-medium leading-[1.1] tracking-[-0.025em] text-white">{s.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Moments: eggs and pebbles, one feature each ---------- */

type Moment = { img: string; alt: string; tag: string; title: string; shape: keyof typeof SHAPES; pos: string; orbit?: "left" | "right" };

const MOMENTS: Moment[] = [
  { img: "/photos/hero.jpg", alt: "A couple laughing together in a sunlit field.", tag: "24/7", title: "Send money on a Sunday night.", shape: "egg", pos: "50% 30%", orbit: "left" },
  { img: "/photos/market.jpg", alt: "A woman at a market stall holding bananas.", tag: "No transaction fees", title: "Every dollar you send gets there.", shape: "pebble", pos: "50% 30%" },
  { img: "/photos/laugh.jpg", alt: "A woman laughing with friends outdoors.", tag: "Independent", title: "Your savings aren't tied to one country's banks.", shape: "pebble", pos: "50% 25%" },
  { img: "/photos/dinner.jpg", alt: "Friends laughing over dinner.", tag: "Undo", title: "Pay someone new and you have a day to undo it.", shape: "egg", pos: "55% 50%", orbit: "right" },
];

function MomentCard({ m, className }: { m: Moment; className?: string }) {
  return (
    <figure className={cn("relative", className)}>
      <div className="relative">
        {m.orbit && <Orbit className={cn("top-[-6%] h-[112%] w-[130%]", m.orbit === "left" ? "-left-[22%]" : "-right-[22%]")} rotate={m.orbit === "left" ? -18 : 18} />}
        <div className={cn("relative overflow-hidden", SHAPES[m.shape])}>
          <img src={m.img} alt={m.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" style={{ objectPosition: m.pos }} />
        </div>
      </div>
      <figcaption className="mt-7 max-w-[26ch]">
        <Label>{m.tag}</Label>
        <p className="mt-2 text-[clamp(26px,2.6vw,36px)] font-medium leading-[1.1] tracking-[-0.025em] text-ink">{m.title}</p>
      </figcaption>
    </figure>
  );
}

export function Moments() {
  return (
    <section id="moments" className="wrap py-16 sm:py-24">
      <h2 className="max-w-[14ch] text-[clamp(48px,8vw,120px)] font-medium leading-[0.98] tracking-[-0.04em] text-ink">
        A better place to keep your money.
      </h2>
      <div className="mt-20 grid gap-x-16 gap-y-24 md:grid-cols-2">
        <MomentCard m={MOMENTS[0]} className="md:w-[76%]" />
        <MomentCard m={MOMENTS[1]} className="md:ml-auto md:mt-40 md:w-[88%]" />
        <MomentCard m={MOMENTS[2]} className="md:-mt-16 md:w-[88%]" />
        <MomentCard m={MOMENTS[3]} className="md:ml-auto md:mt-24 md:w-[72%]" />
      </div>
    </section>
  );
}

/* ---------- Trust: one sentence, birds crossing ---------- */

export function Trust() {
  return (
    <section id="trust" className="relative overflow-hidden py-32 sm:py-44">
      <Flock tone="#2F5D3A" />
      <div className="wrap relative text-center">
        <NestMark className="mx-auto h-12 w-12" />
        <p className="mx-auto mt-8 max-w-[18ch] text-[clamp(38px,5.6vw,80px)] font-medium leading-[1.04] tracking-[-0.035em] text-ink">
          Only you can move your money.
        </p>
      </div>
    </section>
  );
}

/* ---------- A wide photograph moment ---------- */

export function Keep() {
  return (
    <section className="px-3 sm:px-6">
      <div className="relative isolate overflow-hidden rounded-[32px] sm:rounded-[48px]">
        <img src="/photos/together.jpg" alt="A father and his daughter laughing among autumn leaves." loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_30%]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(14,20,16,0.6),rgba(14,20,16,0.1)_60%)]" />
        <div className="flex min-h-[min(80svh,760px)] flex-col justify-center px-7 py-24 sm:px-16">
          <Label light>Dollar savings</Label>
          <h2 className="mt-5 max-w-[12ch] text-[clamp(44px,6.4vw,96px)] font-medium leading-[1] tracking-[-0.035em] text-white">
            Keep her college fund in dollars.
          </h2>
          <a href="#join" className="mt-10 inline-flex h-14 w-fit items-center gap-2 rounded-full bg-white px-7 text-[16px] font-medium text-ink transition-colors hover:bg-page">
            Start saving <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stories from the Nest ---------- */

const CARDS = [
  { img: "/photos/market.jpg", tag: "Independent", title: "How to save outside your country's banks", pos: "50% 30%" },
  { img: "/photos/shop.jpg", tag: "No fees", title: "How to pay your team with no fees", pos: "50% 30%" },
  { img: "/photos/phone.jpg", tag: "Undo", title: "What to do if you paid a scammer", pos: "50% 40%" },
];

export function Cards() {
  return (
    <section className="wrap py-24 sm:py-32">
      <div className="flex items-end justify-between gap-6">
        <h2 className="text-[clamp(36px,4.6vw,64px)] font-medium leading-[1.02] tracking-[-0.035em] text-ink">Money guides</h2>
        <a href="#join" className="link hidden text-[16px] sm:inline-flex">All guides <ArrowRight size={16} /></a>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.title} className="group">
            <div className="aspect-[4/3] overflow-hidden rounded-[28px]">
              <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" style={{ objectPosition: c.pos }} />
            </div>
            <div className="mt-5">
              <Label>{c.tag}</Label>
              <h3 className="mt-2 text-[22px] font-medium leading-[1.25] tracking-[-0.015em] text-ink">{c.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing and footer ---------- */

export function Closing() {
  return (
    <section id="join" className="px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="relative overflow-hidden rounded-[32px] bg-moss px-7 py-24 text-center sm:rounded-[48px] sm:py-32">
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] opacity-[0.08]" aria-hidden="true">
          <g fill="none" stroke="#FFFFFF" strokeWidth="1.2">
            <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)" />
            <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)" />
            <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)" />
          </g>
        </svg>
        <h2 className="relative mx-auto max-w-[14ch] text-[clamp(44px,6.4vw,96px)] font-medium leading-[1] tracking-[-0.035em] text-white">Protect what matters.</h2>
        <p className="relative mx-auto mt-5 max-w-[40ch] text-[18px] text-white/75">All you need is your phone.</p>
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="#top" className="inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 text-[16px] font-medium text-ink transition-colors hover:bg-page">
            Open an account <ArrowRight size={18} />
          </a>
          <a href="#top" className="inline-flex h-14 items-center rounded-full border border-white/50 px-7 text-[16px] font-medium text-white transition-colors hover:bg-white/10">Talk to our team</a>
        </div>
      </div>
    </section>
  );
}

const COLUMNS: [string, string[]][] = [
  ["For you", ["Personal", "Family", "Saving"]],
  ["For business", ["Small business", "Payouts", "Partners"]],
  ["Company", ["About Nest", "Careers", "Newsroom"]],
  ["Legal", ["Privacy", "Terms", "Disclosures"]],
];

export function Footer() {
  return (
    <footer className="wrap pb-12 pt-20">
      <div className="grid gap-12 border-b border-line pb-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <span className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink"><NestMark className="h-7 w-7" /> Nest</span>
          <p className="mt-3 text-[15px] text-ink-600">Protect what matters.</p>
        </div>
        {COLUMNS.map(([head, items]) => (
          <div key={head}>
            <p className="text-[14px] font-semibold text-ink">{head}</p>
            <ul className="mt-4 space-y-3 text-[15px] text-ink-600">
              {items.map((x) => <li key={x}><a href="#top" className="hover:text-ink">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-[96ch] text-[12px] leading-[1.7] text-ink-400">
        Balances are held as USDC, a US dollar stablecoin issued by Circle. USDC is not a bank deposit and is not FDIC insured. Circle can freeze tokens in some cases. Undo covers the first payment to a new recipient, for 24 hours. The US dollar also loses value to inflation, usually far less than many local currencies.
      </p>
      <p className="mt-4 max-w-[96ch] text-[12px] leading-[1.7] text-ink-400">
        Nest is a financial technology company, not a bank. Licensed partners handle cash-out to local currency where available.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[13px] text-ink-400">
        <span>© 2026 Nest</span>
        <span>Made in Miami</span>
      </div>
    </footer>
  );
}
