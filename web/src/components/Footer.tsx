import { Logo } from "./Logo";

const nav = [
  { href: "#account", label: "Account" },
  { href: "#save", label: "Save" },
  { href: "#send", label: "Send" },
  { href: "#faq", label: "FAQ" },
  { href: "https://github.com/tristanc824/projectMiami", label: "GitHub", ext: true },
  { href: "https://sharkbyte2026.devpost.com/", label: "SharkByte 2026", ext: true },
];

export function Footer() {
  return (
    <footer className="bg-carbon pb-[max(32px,env(safe-area-inset-bottom))]">
      <div className="wrap border-t border-white/[0.08] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <Logo className="text-[16px] text-white" />
            <p className="mt-2 text-[15px] text-white/55">Protect what matters.</p>
          </div>
          <nav aria-label="Footer" className="-my-3 flex flex-wrap gap-x-6 text-[14px] text-white/55">
            {nav.map((l) => (
              <a key={l.label} href={l.href} {...(l.ext ? { target: "_blank", rel: "noopener" } : {})} className="inline-flex min-h-[44px] items-center transition hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="fine mt-10 max-w-[80ch]">
          Nest is a hackathon prototype. The demo runs on Solana devnet with test USDC, and cash-out to local currency is simulated.
          USDC is a digital dollar, not an insured bank deposit, and completed blockchain transfers can’t be reversed. Availability will depend on each country’s rules.
        </p>
        <p className="mt-4 text-[13px] text-white/45">© 2026 Nest</p>
      </div>
    </footer>
  );
}
