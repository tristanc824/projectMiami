import { SendFlow } from "./send/SendFlow";
import { stagger } from "../lib/motion";

const stats = [
  ["~1s", "to arrive, any day"],
  ["$0", "network fee"],
  ["@handle", "or QR to pay anyone"],
  ["Undo", "window for new recipients"],
];

/** Send: headline, the animated transfer (see send/SendFlow), and one quiet row of facts. */
export function Send() {
  return (
    <section id="send" className="relative overflow-hidden bg-carbon py-24 sm:py-32">
      <div className="wrap">
        <div data-reveal className="relative z-10 max-w-[640px]">
          <p className="kicker">Send</p>
          <h2 className="headline mt-3 text-[clamp(36px,5.2vw,68px)] leading-[1.02]">Send money anywhere in a second.</h2>
          <p className="body-lg mt-5 max-w-[50ch]">
            Pay a friend by @handle or send to family abroad. Every transfer is checked first, and payments to someone new can be undone.
          </p>
        </div>

        <div data-reveal style={stagger(1)}>
          <SendFlow />
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 sm:mt-20 sm:grid-cols-4">
          {stats.map(([n, l], i) => (
            <div key={l} data-reveal style={stagger(i)}>
              <dt className="text-[26px] font-semibold tracking-[-0.03em]">{n}</dt>
              <dd className="mt-1 text-[14px] text-white/50">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
