import { cn } from "../lib/cn";

/** Guard mark: two overlapping shields. Swap this component and /public/guard-mark.svg to rebrand. */
export function GuardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-6 w-6", className)} aria-hidden="true">
      <path d="M25 6c-7 0-14 2.4-19.5 5.6C4.6 12.1 4 13.1 4 14.2V30c0 14 9.4 24.4 20.2 28.4.5.2 1.1.2 1.6 0C36.6 54.4 46 44 46 30V14.2c0-1.1-.6-2.1-1.5-2.6C39 8.4 32 6 25 6z" fill="#0052FF" />
      <path d="M39 10c-6.4 0-12.8 2.2-17.8 5.1-.8.5-1.2 1.4-1.2 2.4V32c0 12.8 8.6 22.3 18.4 25.9.4.2 1 .2 1.4 0C49.6 54.3 58 44.8 58 32V17.5c0-1-.5-1.9-1.3-2.4C51.8 12.2 45.4 10 39 10z" fill="#7DB4FF" fillOpacity=".72" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.02em]", className)}>
      <GuardMark />
      Guard
    </span>
  );
}
