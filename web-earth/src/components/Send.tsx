import { Check } from "lucide-react";
import { Coin, Swallow } from "./Birds";

function Party({ initial, name, place, tone }: { initial: string; name: string; place: string; tone: string }) {
  return (
    <div className="relative z-10 flex w-[96px] flex-col items-center text-center sm:w-[120px]">
      <span className={`grid h-14 w-14 place-items-center rounded-full text-[18px] font-semibold ${tone}`}>{initial}</span>
      <p className="mt-3 text-[15px] font-medium text-ink">{name}</p>
      <p className="text-[13px] text-ink-400">{place}</p>
    </div>
  );
}

/** The send demo: a swallow carries the coin from Miami to Manila on a 5s loop, then the receipt appears. */
function SendDemo() {
  return (
    <div className="rounded-[24px] bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between border-b border-line pb-4 text-[13px]">
        <span className="font-medium text-ink">Send $200.00</span>
        <span className="text-ink-400">Fee $0.00</span>
      </div>

      <div className="relative mt-20 flex items-start justify-between" role="img" aria-label="A swallow carries $200 from Miami to Manila. It arrives in about a second.">
        <Party initial="Y" name="You" place="Miami" tone="bg-sage-100 text-moss" />

        {/* flight path and courier span the gap between the two avatars' centers */}
        <svg className="pointer-events-none absolute left-[48px] top-0 h-[60px] w-[calc(100%-96px)] -translate-y-full overflow-visible sm:left-[60px] sm:w-[calc(100%-120px)]" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C 100 -2 300 -2 400 60" fill="none" stroke="#DDD7CA" strokeWidth="1.5" strokeDasharray="3 6" />
          <path className="trail" pathLength={1} d="M0 60 C 100 -2 300 -2 400 60" fill="none" stroke="#2F5D3A" strokeWidth="1.5" />
        </svg>
        <div className="courier-fade pointer-events-none absolute left-[48px] right-[48px] top-[-50px] sm:left-[60px] sm:right-[60px]">
          <div className="courier-x w-full">
            <div className="courier-y -ml-8 flex w-16 flex-col items-center">
              <Swallow className="h-8 w-16" flap={0.34} />
              <Coin className="-mt-1.5 h-6 w-6" />
            </div>
          </div>
        </div>

        <Party initial="A" name="Ana" place="Manila" tone="bg-moss text-white" />
      </div>

      <div className="relative mt-8 h-12">
        <p className="depart absolute inset-0 flex items-center justify-center text-[14px] text-ink-400">Sending to Ana…</p>
        <p className="arrive absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-sage-100 text-[14px] font-medium text-moss">
          <Check size={16} /> Arrived in 0.9 seconds
        </p>
      </div>
    </div>
  );
}

/** Send: a solid sky panel, copy on the left, the live demo on the right. */
export function Send() {
  return (
    <section id="send" className="px-3 py-3 sm:px-5">
      <div className="grid items-center gap-10 rounded-[28px] bg-sky-100 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-[15px] font-medium text-moss">Send</p>
          <h2 className="h2 mt-3">Money home in about a second.</h2>
          <p className="lede mt-5 max-w-[42ch]">
            Pay anyone, anywhere, by name or QR code. Payments settle on Solana in about a second, and Nest covers the network fee.<sup className="fn">2</sup>
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ink/10 pt-6">
            {[
              ["~1s", "to settle"],
              ["$0", "fee to you"],
              ["24/7", "no bank hours"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="text-[28px] font-semibold tracking-[-0.03em] text-ink">{v}</dt>
                <dd className="mt-1 text-[13px] text-ink-600">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
        <SendDemo />
      </div>
    </section>
  );
}
