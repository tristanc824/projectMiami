import { cn } from "../lib/cn";

/** Nest mark: three woven rings, 120-degree rotational symmetry, one flat brand blue. Swap this component and /public/nest-mark.svg to rebrand. */
export function NestMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-6 w-6", className)} aria-hidden="true">
      <g fill="none" stroke="#0052FF" strokeWidth="5.5">
        <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)" />
        <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)" />
        <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.02em]", className)}>
      <NestMark />
      Nest
    </span>
  );
}
