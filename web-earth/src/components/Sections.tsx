import { useEffect, useState } from "react";
import { ChevronDown, KeyRound, Leaf, Plus, Send as SendIcon, ShieldCheck, Undo2 } from "lucide-react";
import { cn } from "../lib/cn";
import { Logo, NestMark } from "./Logo";

/* ---------- Navbar: plain and full width, like an established bank ---------- */

const NAV = [
  ["Save", "#save"],
  ["Send", "#send"],
  ["Security", "#protect"],
  ["Help", "#faq"],
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 bg-page transition-shadow duration-200", scrolled && "shadow-[0_1px_0_#DDD7CA]")}>
      <nav className="wrap flex h-[64px] items-center justify-between">
        <div className="flex items-center gap-10">
          <a href="#top" aria-label="Nest home" className="text-ink"><Logo /></a>
          <ul className="hidden items-center gap-7 text-[15px] text-ink-600 md:flex">
            {NAV.map(([label, href]) => (
              <li key={label}><a href={href} className="transition-colors hover:text-ink">{label}</a></li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-5">
          <a href="#join" className="hidden text-[15px] text-ink-600 transition-colors hover:text-ink sm:block">Sign in</a>
          <a href="#join" className="btn-dark min-h-[40px] px-5 text-[14px]">Get early access</a>
        </div>
      </nav>
    </header>
  );
}

/* ---------- Statement, Apple Card style ---------- */

export function Statement() {
  return (
    <section id="account" className="wrap py-24 sm:py-32">
      <p className="mx-auto max-w-[30ch] text-center text-[clamp(26px,3.2vw,40px)] font-semibold leading-[1.22] tracking-[-0.03em] text-ink">
        Nest is a dollar account for anyone with a phone. Save in digital dollars,<sup className="fn">1</sup> pay anyone in about a second, and get an undo window on every new payment.<sup className="fn">3</sup>
      </p>
    </section>
  );
}

/* ---------- Save: solid moss panel with the app ---------- */

const VAULTS = [
  { name: "Rainy day", amount: "$1,240.00", pct: 62 },
  { name: "School fees", amount: "$860.00", pct: 43 },
  { name: "First home", amount: "$2,180.00", pct: 22 },
];

function Phone() {
  return (
    <div className="mx-auto w-[min(300px,78vw)]" role="img" aria-label="The Nest app showing a $4,280.12 balance held in US dollars and three savings vaults.">
      <div className="rounded-[46px] bg-[#0E1510] p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
        <div className="overflow-hidden rounded-[38px] bg-white px-5 pb-7 pt-3 text-left">
          <div className="flex items-center justify-between px-1 text-[12px] font-semibold text-ink">
            <span>9:41</span>
            <span className="h-[22px] w-[84px] rounded-full bg-[#0E1510]" />
            <span className="w-8" />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.02em] text-ink"><NestMark className="h-5 w-5" /> Nest</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-100 text-[12px] font-semibold text-moss">AM</span>
          </div>
          <p className="mt-7 text-[13px] text-ink-400">Balance</p>
          <p className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">$4,280<span className="text-ink-400">.12</span></p>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-moss"><Leaf size={12} /> Held in US dollars</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <span className="flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-white"><SendIcon size={14} /> Send</span>
            <span className="flex items-center justify-center gap-1.5 rounded-xl bg-page py-2.5 text-[13px] font-medium text-ink"><Plus size={14} /> Add money</span>
          </div>
          <p className="mt-7 text-[13px] font-medium text-ink">Vaults</p>
          <div className="mt-3 space-y-4">
            {VAULTS.map((v) => (
              <div key={v.name}>
                <div className="flex justify-between text-[14px]"><span className="text-ink-600">{v.name}</span><span className="font-medium tabular-nums text-ink">{v.amount}</span></div>
                <div className="mt-1.5 h-1 rounded-full bg-page"><div className="h-full rounded-full bg-moss" style={{ width: `${v.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Save() {
  return (
    <section id="save" className="px-3 py-3 sm:px-5">
      <div className="grid items-center gap-14 overflow-hidden rounded-[28px] bg-moss px-6 pt-14 sm:px-12 sm:pt-20 lg:grid-cols-2 lg:pb-0">
        <div className="pb-0 text-white lg:pb-20">
          <p className="text-[15px] font-medium text-sage">Save</p>
          <h2 className="h2 mt-3 text-white">Inflation can't touch it.</h2>
          <p className="mt-5 max-w-[42ch] text-[clamp(17px,1.5vw,19px)] leading-[1.55] text-white/80">
            When your local currency loses value, your savings shouldn't. Nest holds your money in digital dollars, so a dollar saved stays a dollar.<sup className="fn">1</sup>
          </p>
          <ul className="mt-8 space-y-3 border-t border-white/15 pt-6 text-[15px] text-white/85">
            <li>No minimum balance and no monthly fee</li>
            <li>Vaults for every goal, with round-up saving</li>
            <li>Your local value shown next to every dollar</li>
          </ul>
        </div>
        <div className="self-end lg:pt-10"><div className="translate-y-6"><Phone /></div></div>
      </div>
    </section>
  );
}

/* ---------- Protect: solid sand panel ---------- */

const PROTECT = [
  { icon: Undo2, title: "Undo window", text: "Your first payment to someone new is held in escrow. If something is wrong, pull it back." },
  { icon: ShieldCheck, title: "Scam check", text: "Nest checks each request for patterns scammers use, like a sudden new number, before money moves." },
  { icon: KeyRound, title: "Safe word", text: "Large transfers to family can require a word only you and they know." },
];

export function Protect() {
  return (
    <section id="protect" className="px-3 py-3 sm:px-5">
      <div className="grid gap-12 rounded-[28px] bg-sand px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-[15px] font-medium text-moss">Security</p>
          <h2 className="h2 mt-3">Fast money, kept safe.</h2>
          <p className="lede mt-5 max-w-[42ch]">
            Instant, irreversible payments are a scammer's favorite feature. Nest gives every new payment a moment to breathe.<sup className="fn">3</sup>
          </p>
          <div className="mt-10 flex max-w-md items-center gap-4 rounded-2xl bg-white p-4">
            <div className="relative h-12 w-12 shrink-0">
              <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#E4ECDF" strokeWidth="4" />
                <circle className="countdown" pathLength={1} cx="24" cy="24" r="20" fill="none" stroke="#2F5D3A" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <Undo2 size={16} className="absolute inset-0 m-auto text-moss" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">$500.00 to a new number</p>
              <p className="text-[13px] text-ink-400">Held in escrow · 23h 59m left to undo</p>
            </div>
            <span className="rounded-full border border-ink/15 px-3 py-1.5 text-[13px] font-medium text-ink">Undo</span>
          </div>
        </div>
        <ul className="divide-y divide-ink/10 self-center border-y border-ink/10">
          {PROTECT.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-5 py-7">
              <Icon size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-moss" />
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQ = [
  { q: "What can I do with a Nest account?", a: "Hold your money in digital dollars, save toward goals in vaults, pay people by name or QR code, and send money anywhere in about a second." },
  { q: "What are digital dollars?", a: "Stablecoins such as USDC: dollars you can hold on your phone, each backed one to one by reserves held in cash and short-term US Treasuries. Nest shows them simply as dollars." },
  { q: "Does Nest pay interest?", a: "No. Nest does not pay interest on your balance. Vaults are a way to set money aside, not an investment." },
  { q: "Is Nest available today?", a: "Not yet. Nest is a prototype built for SharkByte 2026. The demo runs on Solana devnet with test USDC, so no real money moves." },
];

export function Faq() {
  return (
    <section id="faq" className="wrap grid gap-10 py-24 sm:py-32 lg:grid-cols-[1fr_1.6fr]">
      <h2 className="h2">Questions</h2>
      <div className="border-t border-line">
        {FAQ.map((f) => (
          <details key={f.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium tracking-[-0.01em] text-ink">
              {f.q}
              <ChevronDown size={20} className="shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="-mt-2 max-w-[62ch] pb-6 text-[16px] leading-[1.6] text-ink-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing CTA ---------- */

export function Closing() {
  const [sent, setSent] = useState(false);
  return (
    <section id="join" className="px-3 pb-3 sm:px-5">
      <div className="rounded-[28px] bg-ink px-6 py-20 text-center sm:py-28">
        <h2 className="display mx-auto max-w-[16ch] text-[clamp(40px,6vw,80px)] text-white">Protect what matters.</h2>
        <p className="mx-auto mt-5 max-w-[40ch] text-[18px] text-white/70">Be one of the first to open a Nest account.</p>
        <form className="mx-auto mt-10 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <label htmlFor="email" className="sr-only">Email address</label>
          <input id="email" type="email" required placeholder="Email address" className="min-h-[48px] flex-1 rounded-full bg-white/10 px-5 text-[15px] text-white outline-none ring-1 ring-white/20 placeholder:text-white/45 focus:ring-white/60" />
          <button className="btn-light">{sent ? "You're on the list" : "Join the waitlist"}</button>
        </form>
        <p className="mt-4 text-[13px] text-white/45">Preview only: the waitlist doesn't store emails yet.</p>
      </div>
    </section>
  );
}

/* ---------- Footer with columns and numbered disclosures ---------- */

const COLUMNS: [string, string[]][] = [
  ["Product", ["Save", "Send", "Security", "Help"]],
  ["Company", ["About", "Careers", "Press"]],
  ["Legal", ["Privacy", "Terms", "Disclosures"]],
];

export function Footer() {
  return (
    <footer className="wrap pb-12 pt-16">
      <div className="grid gap-10 border-b border-line pb-12 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <span className="text-ink"><Logo /></span>
          <p className="mt-3 text-[15px] text-ink-600">Protect what matters.</p>
        </div>
        {COLUMNS.map(([head, items]) => (
          <div key={head}>
            <p className="text-[13px] font-semibold text-ink">{head}</p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-ink-600">
              {items.map((i) => <li key={i}><a href="#top" className="hover:text-ink">{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <ol className="mt-8 max-w-[90ch] list-decimal space-y-2 pl-4 text-[12px] leading-[1.6] text-ink-400">
        <li>Nest balances are held as USDC, a dollar stablecoin issued by Circle. Stablecoins are not bank deposits and are not FDIC insured. The issuer can freeze tokens in some cases.</li>
        <li>Settlement time refers to Solana network confirmation and can vary. Converting to local currency uses third-party providers; in this prototype, cash-out is simulated.</li>
        <li>The undo window applies to the first payment to a new recipient and is held in an on-chain escrow. Nest is a hackathon prototype running on Solana devnet with test funds.</li>
      </ol>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[12px] text-ink-400">
        <span>© 2026 Nest. Built at SharkByte 2026.</span>
        <span className="flex items-center gap-1.5"><NestMark className="h-4 w-4" color="#7C857E" /> Made in Miami</span>
      </div>
    </footer>
  );
}
