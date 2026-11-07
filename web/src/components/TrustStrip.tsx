/** A quiet "built with" strip (21st.dev logo-cloud pattern), text-only and factual. */
const items = ["Built on Solana", "Dollars held as USDC", "Network fees covered", "English y español"];

export function TrustStrip() {
  return (
    <div className="border-y border-white/[0.06] bg-carbon">
      <ul className="wrap grid grid-cols-2 gap-x-6 gap-y-3 py-6 text-[14px] text-white/55 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-10">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-2.5">
            <span className="h-1 w-1 shrink-0 rounded-full bg-sky/70" /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
