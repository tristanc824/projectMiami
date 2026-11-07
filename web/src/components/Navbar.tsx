import { useEffect, useState } from "react";
import { ChevronsRight } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "../lib/cn";

const links = [
  { id: "account", label: "Account" },
  { id: "save", label: "Save" },
  { id: "send", label: "Send" },
  { id: "faq", label: "FAQ" },
];

/** Scroll-aware nav: glass background once scrolled, and an underline that marks the section in view. */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    // the section crossing the middle band of the viewport is "active"
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ["top", ...links.map((l) => l.id), "join"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => { window.removeEventListener("scroll", on); io.disconnect(); };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300",
        scrolled ? "border-b border-white/[0.06] bg-carbon/75 backdrop-blur-md" : "border-b border-transparent"
      )}
    >
      <nav className="wrap grid h-16 grid-cols-[1fr_auto_1fr] items-center" aria-label="Main">
        <a href="#top" aria-label="Nest home" className="-ml-1 justify-self-start rounded-lg px-1 py-2.5"><Logo /></a>
        <div className="hidden gap-8 text-[14px] sm:flex">
          {links.map((l) => (
            <a key={l.id} href={`#${l.id}`} aria-current={active === l.id ? "true" : undefined}
              className={cn("group relative py-3 transition", active === l.id ? "text-white" : "text-white/60 hover:text-white")}>
              {l.label}
              <span className={cn("absolute inset-x-0 bottom-2 h-px origin-left bg-sky transition-transform duration-300",
                active === l.id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
            </a>
          ))}
        </div>
        <a href="#join" className="btn-secondary col-start-3 justify-self-end !px-4 !text-[14px]">
          Get early access <ChevronsRight size={15} />
        </a>
      </nav>
    </header>
  );
}
