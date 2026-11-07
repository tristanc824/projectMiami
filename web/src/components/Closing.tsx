import { useState, type FormEvent } from "react";
import { ChevronsRight } from "lucide-react";
import { GuardMark } from "./Logo";
import { stagger } from "../lib/motion";

/**
 * Closing call to action: the brand line, one field, one button.
 * The form doesn't store emails yet (no backend in this prototype), and says so.
 */
export function Closing() {
  const [note, setNote] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setNote(/^\S+@\S+\.\S+$/.test(v) ? "Thanks. This preview doesn’t save emails yet, so check back soon." : "Enter a full email address, like name@example.com.");
  };

  return (
    <section id="join" className="relative isolate overflow-hidden bg-carbon py-28 text-center sm:py-36">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[85%] bg-[radial-gradient(50%_60%_at_50%_100%,rgba(0,82,255,0.3),rgba(0,82,255,0.06)_60%,transparent_85%)]" />
      <div className="wrap">
        <div data-reveal>
          <GuardMark className="mx-auto h-14 w-14" />
          <h2 className="headline mx-auto mt-7 max-w-[14ch] text-[clamp(40px,6.4vw,80px)] leading-[1.02]">Protect what matters.</h2>
          <p className="mx-auto mt-4 max-w-[38ch] text-[17px] text-white/60">Be one of the first to open a Guard account.</p>
        </div>
        {/* radius: form 28px = button 22px (44px pill) + 6px padding */}
        <form data-reveal style={stagger(1)} onSubmit={submit} noValidate
          className="mx-auto mt-9 flex max-w-[460px] flex-col gap-2 rounded-[28px] border border-white/15 bg-white/[0.04] p-1.5 transition-colors focus-within:border-sky/60 sm:flex-row">
          <label htmlFor="email" className="sr-only">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="Your email address"
            className="min-h-[44px] min-w-0 flex-1 bg-transparent px-4 text-left text-[16px] text-white outline-none placeholder:text-white/40" />
          <button type="submit" className="btn-primary">Get early access <ChevronsRight size={16} /></button>
        </form>
        <p role="status" className="mt-4 min-h-[20px] text-[14px] text-white/70">{note}</p>
        <p className="fine mt-1">Preview only: the waitlist doesn’t store emails yet.</p>
      </div>
    </section>
  );
}
