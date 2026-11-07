import { PiggyBank, Send, ShieldCheck, Wallet } from "lucide-react";
import { stagger, trackSpotlight } from "../lib/motion";

const pillars = [
  { icon: PiggyBank, title: "Save", text: "Vaults and goals in dollars, filled by auto-save rules like round-ups." },
  { icon: Wallet, title: "Spend", text: "Pay anyone by @handle or QR, and set money aside for rent or school." },
  { icon: Send, title: "Send", text: "Move money anywhere in about a second, to a friend or to family abroad." },
  { icon: ShieldCheck, title: "Protect", text: "An undo window for new recipients, a scam check and a personal safe word." },
];

/** The account in four pillars. No boxes: a hairline, spacing, and a cursor spotlight on hover. */
export function Pillars() {
  return (
    <section id="account" className="bg-carbon py-24 sm:py-32">
      <div className="wrap">
        <div data-reveal className="max-w-[640px]">
          <p className="kicker">One account</p>
          <h2 className="headline mt-3 text-[clamp(34px,4.8vw,60px)] leading-[1.04]">
            Everything your money needs.{" "}
            <span className="text-white/40">Nothing it doesn’t.</span>
          </h2>
          <p className="body-lg mt-5 max-w-[48ch]">
            Nest holds your money in digital dollars and gives you the tools to grow it, use it and keep it safe.
          </p>
        </div>

        <ul className="mt-14 grid gap-x-4 gap-y-2 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, text }, i) => (
            <li key={title} data-reveal style={stagger(i)} onPointerMove={trackSpotlight}
              className="spotlight -mx-4 rounded-2xl px-4 py-6">
              <Icon size={22} strokeWidth={1.75} className="relative text-sky" />
              <h3 className="relative mt-5 text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="relative mt-2 text-[15px] leading-relaxed text-white/55">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
