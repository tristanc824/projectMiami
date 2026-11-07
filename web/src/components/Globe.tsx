import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export const CITIES: { name: string; loc: [number, number] }[] = [
  { name: "Miami", loc: [25.76, -80.19] },
  { name: "New York", loc: [40.71, -74.0] },
  { name: "Mexico City", loc: [19.43, -99.13] },
  { name: "Bogotá", loc: [4.71, -74.07] },
  { name: "São Paulo", loc: [-23.55, -46.63] },
  { name: "London", loc: [51.5, -0.12] },
  { name: "Madrid", loc: [40.4, -3.7] },
  { name: "Lagos", loc: [6.52, 3.38] },
  { name: "Nairobi", loc: [-1.29, 36.82] },
  { name: "Dubai", loc: [25.2, 55.27] },
  { name: "Mumbai", loc: [19.07, 72.88] },
  { name: "Manila", loc: [14.6, 120.98] },
  { name: "Ho Chi Minh City", loc: [10.82, 106.63] },
  { name: "Seoul", loc: [37.56, 126.97] },
];

/**
 * "Cap" layout: the canvas is a wide, short strip and only the top of a large sphere shows in it.
 * `radius` is the sphere radius as a fraction of the strip's width, `top` is where the sphere's top
 * edge sits as a fraction of the strip's height. Nothing is drawn for the hidden part of the
 * sphere, so a huge globe costs no more than a small one. Omit for a normal, square globe.
 */
export type Cap = { radius: number; top: number };

/** cobe's zoom (scale) and vertical offset, in CSS px, for a cap layout in a W x H box. */
export function capGeometry(W: number, H: number, cap?: Cap) {
  if (!cap) return { scale: 1, offsetY: 0 };
  const R = cap.radius * W;
  const scale = (2.5 * R) / H; // cobe draws the sphere at 0.8 x half the canvas height, times scale
  const offsetY = (2 * cap.top * H + 2 * R - H) / scale;
  return { scale, offsetY };
}

type GlobeProps = {
  className?: string;
  /** Fraction of CSS size to render at. Below 1 trades a little sharpness for a lot of GPU time. */
  renderScale?: number;
  /** Camera tilt. Higher looks more from above. */
  theta?: number;
  /** Auto-rotation speed per frame. */
  speed?: number;
  cap?: Cap;
  /** Brighter, denser dots and a stronger atmosphere, for the hero. */
  bright?: boolean;
  /** City markers gently pulse. */
  pulse?: boolean;
  /** Called every rendered frame with the current rotation, for overlays that track the globe. */
  onFrame?: (phi: number, theta: number) => void;
};

/**
 * WebGL globe (cobe). Created shortly before it scrolls into view, drawn only while it is actually
 * on screen (cobe redraws every frame, so an unseen globe would still saturate the GPU), and
 * destroyed when far away.
 */
export function Globe({ className, renderScale = 1, theta = 0.28, speed = 0.0032, cap, bright, pulse, onFrame }: GlobeProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const drag = useRef(0);
  const phi = useRef(4.4); // kept across pauses so the globe resumes where it stopped
  const frameCb = useRef(onFrame);
  frameCb.current = onFrame;
  const capRef = useRef(cap);
  capRef.current = cap;

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Backing-store scale. cobe's devicePixelRatio must equal the factor applied to width/height,
    // or it renders zoomed in. Kept at or below ~1 for integrated GPUs.
    const dpr = renderScale;
    let W = el.offsetWidth, H = el.offsetHeight;
    let geo = capGeometry(W, H, capRef.current);
    let globe: ReturnType<typeof createGlobe> | null = null;
    let onScreen = false;
    const t0 = performance.now();

    const markers = (t: number) =>
      CITIES.map((c, i) => {
        const base = c.name === "Miami" ? 0.075 : 0.05;
        const k = pulse && !reduce ? 1 + 0.45 * Math.max(0, Math.sin(t * 1.6 + i * 1.7)) : 1;
        return { location: c.loc, size: base * k };
      });

    const start = () => {
      if (globe) return;
      W = el.offsetWidth; H = el.offsetHeight;
      geo = capGeometry(W, H, capRef.current);
      globe = createGlobe(el, {
        devicePixelRatio: dpr,
        width: W * dpr,
        height: H * dpr,
        phi: phi.current,
        theta,
        dark: 1,
        diffuse: bright ? 1.9 : 1.4,
        scale: geo.scale,
        offset: [0, geo.offsetY * dpr],
        mapSamples: 10000,
        mapBrightness: bright ? 9 : 5.5,
        baseColor: bright ? [0.24, 0.32, 0.56] : [0.16, 0.2, 0.32],
        markerColor: bright ? [0.55, 0.78, 1] : [0.35, 0.6, 1],
        glowColor: bright ? [0.1, 0.3, 1] : [0.06, 0.18, 0.55],
        markers: markers(0),
        onRender: (state) => {
          if (pointer.current === null && !reduce) phi.current += speed;
          state.phi = phi.current + drag.current;
          if (pulse) state.markers = markers((performance.now() - t0) / 1000);
          frameCb.current?.(phi.current + drag.current, theta);
          state.width = W * dpr;
          state.height = H * dpr;
        },
      });
      if (!onScreen) globe.toggle(false);
      requestAnimationFrame(() => (el.style.opacity = "1"));
    };
    const stop = () => {
      globe?.destroy();
      globe = null;
    };

    // `warm` creates the globe 400px before it arrives (shader setup never hitches the scroll) and
    // destroys it when far away; `seen` pauses drawing whenever it is not actually on screen.
    const warm = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "400px" });
    const seen = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      globe?.toggle(onScreen);
    });
    warm.observe(box);
    seen.observe(box);
    const onResize = () => { stop(); start(); };
    window.addEventListener("resize", onResize);
    return () => {
      warm.disconnect();
      seen.disconnect();
      window.removeEventListener("resize", onResize);
      stop();
    };
  }, [renderScale, theta, speed, bright, pulse]);

  return (
    <div ref={wrap} className={className}>
      <canvas
        ref={canvas}
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-1000 [contain:layout_paint_size] active:cursor-grabbing"
        onPointerDown={(e) => { pointer.current = e.clientX - drag.current * 200; }}
        onPointerUp={() => { pointer.current = null; }}
        onPointerOut={() => { pointer.current = null; }}
        onPointerMove={(e) => { if (pointer.current !== null) drag.current = (e.clientX - pointer.current) / 200; }}
        aria-label="Rotating globe showing cities where families send money"
        role="img"
      />
    </div>
  );
}
