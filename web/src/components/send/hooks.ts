import { useEffect, useRef, useState, type RefObject } from "react";

/** Live result of a CSS media query. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** True while the element is on screen (a margin keeps edge-touching sections from counting). */
export function useInView(ref: RefObject<Element>, rootMargin = "-8% 0px -8% 0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/**
 * A looping requestAnimationFrame clock. Calls `onFrame(t)` with t in [0, duration) while `active`,
 * and resumes from where it stopped when re-activated.
 */
export function useLoopClock(active: boolean, duration: number, onFrame: (t: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  const elapsed = useRef(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now() - elapsed.current;
    const tick = (now: number) => {
      elapsed.current = (now - start) % duration;
      cb.current(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration]);
}
