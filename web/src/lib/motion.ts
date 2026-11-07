import { useEffect, type CSSProperties, type PointerEvent } from "react";

/** Stagger index for a revealed child (read by the `.rv` transition-delay in index.css). */
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Site-wide motion, set up once:
 * - Reveals: elements marked `data-reveal` that start below the fold rise in once when they first
 *   come into view (time-based, not scrubbed by scroll). Anything already on screen stays put.
 * - Nav jumps: same-page anchor links crossfade with the View Transitions API where supported,
 *   instead of a long smooth scroll.
 * Both are skipped under reduced motion.
 */
export function useSiteMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("rv-in");
        io.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -12% 0px" }
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add("rv");
      io.observe(el);
    });

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
      const id = a?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (!target || !doc.startViewTransition) return;
      e.preventDefault();
      doc.startViewTransition(() => {
        // show the destination's content immediately (no reveal mid-crossfade)
        target.querySelectorAll(".rv").forEach((el) => { el.classList.remove("rv"); io.unobserve(el); });
        const root = document.documentElement;
        root.style.scrollBehavior = "auto";
        target.scrollIntoView();
        root.style.scrollBehavior = "";
        history.pushState(null, "", `#${id}`);
      });
    };
    document.addEventListener("click", onClick);

    return () => { io.disconnect(); document.removeEventListener("click", onClick); };
  }, []);
}

/** Pointer handler for `.spotlight` elements: moves the glow to the cursor. */
export function trackSpotlight(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}
