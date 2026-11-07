import { cn } from "../lib/cn";

/** Nest mark: three identical rings at 120 degrees, in moss green for the earth edition. */
export function NestMark({ className, color = "#2F5D3A" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-6 w-6", className)} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="5.5">
        <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)" />
        <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)" />
        <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)" />
      </g>
    </svg>
  );
}

export function Logo({ className, color }: { className?: string; color?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[20px] font-semibold tracking-[-0.03em]", className)}>
      <NestMark className="h-[26px] w-[26px]" color={color} />
      Nest
    </span>
  );
}
