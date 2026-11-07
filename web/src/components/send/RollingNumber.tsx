import { SPRING } from "./timeline";

// Two turns of digits, so rolling up spins through a full cycle before landing.
const STRIP = Array.from({ length: 20 }, (_, i) => i % 10);

/**
 * Odometer digits. Each column is a strip of numbers moved with translateY only. Rolling up uses a
 * staggered spring, and resetting to zero snaps back instantly.
 */
export function RollingNumber({ value, digits = 3 }: { value: number; digits?: number }) {
  const ds = String(value).padStart(digits, "0").slice(-digits).split("").map(Number);
  const rolling = value > 0;
  return (
    <span className="inline-flex tabular-nums">
      {ds.map((d, i) => (
        <span key={i} className="relative block h-[1em] overflow-hidden leading-none">
          <span className="invisible">0</span>
          <span
            className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
            style={{
              transform: `translateY(${-(rolling ? 10 + d : d)}em)`,
              transition: rolling ? `transform 1150ms ${SPRING} ${i * 90}ms` : "none",
            }}
          >
            {STRIP.map((n, k) => (
              <span key={k} className="block h-[1em] text-center leading-none">{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
