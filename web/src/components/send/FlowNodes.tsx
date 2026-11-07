import { forwardRef, type ReactNode } from "react";
import { Check, House, ShieldCheck, Smartphone } from "lucide-react";
import { NestMark } from "../Logo";
import { cn } from "../../lib/cn";
import { RollingNumber } from "./RollingNumber";
import { SPRING, type Phase } from "./timeline";

const spring = { transitionTimingFunction: SPRING };
const passed = (p: Phase) => p === "passed" || p === "arrived";

/** Glass card shell: dark gradient fill, hairline border, top highlight. No backdrop blur (cost). */
const Card = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(function Card({ className, children }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#151922,#0C0F15)] p-4 text-left",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_-24px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      {children}
    </div>
  );
});

function Who({ icon, name, place }: { icon: ReactNode; name: string; place: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#1B3A8C,#0F1A3A)] text-sky ring-1 ring-white/10">{icon}</span>
      <span className="leading-tight">
        <span className="block text-[13px] font-medium text-white">{name}</span>
        <span className="block text-[12px] text-white/50">{place}</span>
      </span>
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">{children}</div>
);

/** You: the amount being sent. `pressRef` gets a tiny per-frame press on "Send". */
export const SenderCard = forwardRef<HTMLSpanElement, { className?: string }>(function SenderCard({ className }, pressRef) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3">
        <Who icon={<Smartphone size={14} />} name="You" place="Miami" />
        <span ref={pressRef} className="rounded-full bg-guard px-3 py-1 text-[12px] font-medium text-white shadow-[0_6px_16px_-6px_rgba(0,82,255,0.9)]">
          Send
        </span>
      </div>
      <Label>Amount</Label>
      <div className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums lg:text-[28px]">$200.00</div>
    </Card>
  );
});

/** Nest: a scan ring while checking, then a green tick and status. */
export function NestNode({ phase }: { phase: Phase }) {
  const ok = passed(phase);
  return (
    <div className="relative grid h-24 w-24 place-items-center lg:h-28 lg:w-28">
      {/* one-shot ripples, remounted per phase so the CSS animation replays */}
      {phase === "check" && <span key="in" className="sf-ripple absolute inset-0 rounded-full border border-sky/70" />}
      {phase === "passed" && <span key="ok" className="sf-ripple absolute inset-0 rounded-full border border-mint/80" />}

      <div className="absolute inset-0 rounded-full border border-guard/45 bg-[radial-gradient(circle_at_50%_35%,#14275A,#0A0B0D_72%)] shadow-[0_0_48px_-8px_rgba(0,82,255,0.75)]" />

      {/* scan ring: a bright arc rotating around the node (transform only) */}
      <svg viewBox="0 0 120 120" className={cn("absolute -inset-3 transition-opacity duration-300", phase === "check" ? "opacity-100" : "opacity-0")} aria-hidden>
        <defs>
          <linearGradient id="sf-scan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7DB4FF" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="rgba(125,180,255,0.14)" strokeWidth="1" />
        <g className={cn("origin-center", phase === "check" && "animate-[spin_0.9s_linear_infinite]")} style={{ transformBox: "fill-box" }}>
          <circle cx="60" cy="60" r="57" fill="none" stroke="url(#sf-scan)" strokeWidth="2" strokeLinecap="round" strokeDasharray="80 280" />
        </g>
      </svg>

      {/* passed: ring turns green */}
      <div className={cn("absolute inset-0 rounded-full border border-mint/60 transition-opacity duration-500", ok ? "opacity-100" : "opacity-0")} />

      <NestMark className="relative h-10 w-10 lg:h-11 lg:w-11" />

      <span
        className={cn("absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full bg-mint text-carbon ring-4 ring-carbon transition duration-500", ok ? "scale-100 opacity-100" : "scale-50 opacity-0")}
        style={spring}
      >
        <Check size={15} strokeWidth={3} />
      </span>

      {/* status under the node, absolutely placed so the circle stays centered on the path */}
      <div className="absolute left-1/2 top-full mt-4 h-7 w-[200px] -translate-x-1/2 text-center text-[13px] font-medium">
        <Status show={phase === "send" || phase === "reset"} className="text-white/45">Nest is watching</Status>
        <Status show={phase === "check"} className="text-sky">Checking for scams…</Status>
        <Status show={ok} className="text-mint"><ShieldCheck size={14} /> Scam check passed</Status>
      </div>
    </div>
  );
}

function Status({ show, className, children }: { show: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn("absolute inset-0 flex items-center justify-center gap-1.5 whitespace-nowrap transition duration-500", show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0", className)}
      style={spring}
      aria-hidden={!show}
    >
      {children}
    </span>
  );
}

/** Family: a dimmed +$000.00 rolls to +$200.00 when the money lands. */
export function RecipientCard({ phase, className }: { phase: Phase; className?: string }) {
  const landed = phase === "arrived";
  return (
    <Card className={cn("transition-colors duration-700", landed ? "border-mint/40" : "", className)}>
      {/* arrival glow: a pre-built shadow layer, faded with opacity */}
      <div className={cn("pointer-events-none absolute -inset-px rounded-2xl shadow-[0_0_44px_-8px_rgba(48,209,88,0.6)] transition-opacity duration-700", landed ? "opacity-100" : "opacity-0")} />
      {phase === "arrived" && <span className="sf-ripple pointer-events-none absolute inset-0 rounded-2xl border border-mint/60" />}
      <div className="flex items-center justify-between gap-3">
        <Who icon={<House size={14} />} name="Family" place="Abroad" />
        <span
          className={cn("rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[12px] font-medium text-mint transition duration-500", landed ? "scale-100 opacity-100" : "scale-75 opacity-0")}
          style={spring}
        >
          Received
        </span>
      </div>
      <Label>Balance</Label>
      <div className={cn("mt-1 flex items-center text-[26px] font-semibold leading-none tracking-[-0.03em] transition-colors duration-700 lg:text-[28px]", landed ? "text-white" : "text-white/30")}>
        +$
        <RollingNumber value={landed ? 200 : 0} />
        .00
      </div>
    </Card>
  );
}
