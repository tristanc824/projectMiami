import { ArrowDownLeft, ArrowUpRight, Coffee, Plus, Send, ShieldCheck } from "lucide-react";
import { NestMark } from "./Logo";
import { cn } from "../lib/cn";

const vaults = [
  { name: "Emergency fund", saved: "$1,200", goal: "$2,000", pct: 60 },
  { name: "Rent · December", saved: "$640", goal: "$900", pct: 71 },
];

const activity = [
  { icon: Coffee, title: "Brew Lab", sub: "Paid by QR", amount: "−$4.50" },
  { icon: ArrowUpRight, title: "To Mom", sub: "Manila · arrived", amount: "−$250.00" },
  { icon: ArrowDownLeft, title: "Salary", sub: "Added from bank", amount: "+$1,400.00", plus: true },
];

/** Product shot: the Nest account home in the app's dark theme (balance, vaults, activity). */
export function PhoneShot({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-[min(340px,82vw)]", className)} role="img" aria-label="The Nest app home: a $4,280.12 balance held in US dollars, savings vaults, and recent activity">
      {/* titanium frame */}
      <div className="rounded-[58px] bg-[linear-gradient(145deg,#3A3F4A,#16181D_40%,#2A2E36)] p-[3px] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)]">
        <div className="rounded-[55px] bg-black p-[9px]">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[46px] bg-[linear-gradient(180deg,#0B1226_0%,#0A0B0D_40%)] text-white">
            {/* status bar + island */}
            <div className="absolute left-1/2 top-3 h-[30px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center justify-between px-7 pt-[18px] text-[12px] font-semibold">
              <span>9:41</span>
              <span className="h-2.5 w-[22px] rounded-[3px] border border-white/70" />
            </div>

            <div className="px-5 pt-7">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold"><NestMark className="h-5 w-5" /> Nest</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[12px] font-semibold">AR</span>
              </div>

              <p className="mt-6 text-[12px] text-white/50">Total balance</p>
              <p className="mt-1 text-[40px] font-semibold leading-none tracking-[-0.045em] tabular-nums">
                $4,280<span className="text-white/40">.12</span>
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-guard/15 px-2.5 py-1 text-[12px] font-medium text-sky">
                <ShieldCheck size={13} /> Held in US dollars
              </span>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <span className="flex items-center justify-center gap-1.5 rounded-2xl bg-guard py-2.5 text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"><Send size={14} /> Send</span>
                <span className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-2.5 text-[13px] font-medium"><Plus size={14} /> Add money</span>
              </div>

              {/* vaults: panel (#111318) with inner rows; radius 16 = 12 + 4 padding */}
              <p className="mt-6 text-[12px] font-medium text-white/45">Vaults</p>
              <div className="mt-2 space-y-1 rounded-2xl bg-panel p-1">
                {vaults.map((v) => (
                  <div key={v.name} className="rounded-xl px-3 py-2.5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="font-medium">{v.name}</span>
                      <span className="tabular-nums text-white/50"><span className="text-white">{v.saved}</span> / {v.goal}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-guard to-sky" style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[12px] font-medium text-white/45">Recent</p>
              <div className="mt-0.5 divide-y divide-white/[0.07]">
                {activity.map((a) => (
                  <div key={a.title} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.07]"><a.icon size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{a.title}</p>
                      <p className="text-[12px] text-white/45">{a.sub}</p>
                    </div>
                    <span className={cn("text-[13px] font-medium tabular-nums", a.plus && "text-mint")}>{a.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
