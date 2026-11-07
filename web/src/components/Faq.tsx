import { Plus } from "lucide-react";
import { stagger } from "../lib/motion";

// Honest answers; see PITCH_RESEARCH.md for the sources behind the caveats.
const qa = [
  {
    q: "What can I do with a Nest account?",
    a: "Hold your money in digital dollars, save toward goals in vaults, pay people by @handle or QR, and send money anywhere in about a second. Scam protection is built into every payment.",
  },
  {
    q: "Is my money really held in dollars?",
    a: "Yes. Your balance is held as USDC, a digital dollar issued by Circle and backed one to one by dollar reserves. It is not an insured bank deposit, and it has briefly lost its peg before (March 2023).",
  },
  {
    q: "How fast does money arrive?",
    a: "Transfers settle on Solana in about a second, any day of the week. Turning dollars into local currency depends on a licensed payout partner in each country; in this demo that step is simulated.",
  },
  {
    q: "What if I get scammed into sending money?",
    a: "The first payment to someone new is held in an on-chain escrow with an undo window, so you can cancel it. Nest also flags requests that look like impersonation before anything moves.",
  },
  {
    q: "Is Nest live?",
    a: "Not yet. Nest is a prototype built for SharkByte 2026. The demo runs on Solana devnet with test USDC, so no real money moves.",
  },
];

/** FAQ: heading on the left, answers on the right, hairlines only. Native <details> for a11y. */
export function Faq() {
  return (
    <section id="faq" className="bg-carbon py-24 sm:py-32">
      <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <div data-reveal>
          <p className="kicker">FAQ</p>
          <h2 className="headline mt-3 text-[clamp(32px,4.2vw,52px)] leading-[1.05]">Questions, answered.</h2>
          <p className="mt-4 max-w-[34ch] text-[16px] leading-relaxed text-white/55">The honest version, including what this prototype doesn’t do yet.</p>
        </div>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {qa.map(({ q, a }, i) => (
            <details key={q} data-reveal style={stagger(i)} className="faq group">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-6 py-5 text-[17px] font-medium text-white/90 transition-colors hover:text-white">
                {q}
                <Plus size={18} className="faq-icon shrink-0 text-white/50" />
              </summary>
              <p className="max-w-[62ch] pb-6 pr-10 text-[16px] leading-relaxed text-white/60">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
