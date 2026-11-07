import { useCallback, useEffect, useRef } from "react";
import { CITIES, Globe, capGeometry, type Cap } from "./Globe";

type V3 = [number, number, number];

// Same world-space conversion cobe uses for its markers.
const toWorld = ([lat, lon]: [number, number]): V3 => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180 - Math.PI;
  const a = Math.cos(la);
  return [-a * Math.cos(lo), Math.sin(la), a * Math.sin(lo)];
};

// cobe's shader maps view -> world with g = f * L(theta, phi); this is the inverse (world -> view).
const toView = ([x, y, z]: V3, phi: number, theta: number): V3 => {
  const c = Math.cos(theta), e = Math.sin(theta), d = Math.cos(phi), f = Math.sin(phi);
  return [d * x + f * z, f * e * x + c * y - d * e * z, -f * c * x + e * y + d * c * z];
};

const slerp = (a: V3, b: V3, t: number): V3 => {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(dot);
  if (w < 1e-4) return a;
  const s = Math.sin(w);
  const k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
};

const city = (name: string) => CITIES.find((c) => c.name === name)!.loc;

// Medium-length hops, so most of each arc is on the visible side of the globe as it turns.
const ROUTES: { from: string; to: string }[] = [
  { from: "New York", to: "Lagos" },
  { from: "Miami", to: "Bogotá" },
  { from: "London", to: "Mumbai" },
  { from: "Madrid", to: "São Paulo" },
  { from: "Dubai", to: "Nairobi" },
  { from: "Seoul", to: "Manila" },
  { from: "Mexico City", to: "Madrid" },
];

const SEGMENTS = 48;
const PERIOD = 3400; // ms for one transfer to travel its arc

type Props = { className?: string; cap?: Cap; renderScale?: number; theta?: number; speed?: number; bright?: boolean; pulse?: boolean };

/**
 * Globe with live transfer arcs ("money moving"). Arcs are drawn on a 2D canvas overlay every globe
 * frame, projected with exactly the rotation, zoom and offset the WebGL globe uses, so they stay
 * pinned to the cities. Works for both square and cap layouts.
 */
export function ArcGlobe({ className, cap, renderScale = 0.8, theta = 0.3, speed = 0.0018, bright, pulse }: Props) {
  const overlay = useRef<HTMLCanvasElement>(null);
  const capRef = useRef(cap);
  capRef.current = cap;
  const routes = useRef(
    ROUTES.map((r, i) => {
      const a = toWorld(city(r.from)), b = toWorld(city(r.to));
      const dist = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      return { a, b, lift: Math.min(0.2, 0.05 + dist * 0.09), offset: i / ROUTES.length };
    })
  );
  const ratio = useRef(1);

  // keep the overlay's backing store matched to its CSS size (1x is plenty for thin glowing lines)
  useEffect(() => {
    const cv = overlay.current;
    if (!cv) return;
    const fit = () => {
      ratio.current = Math.min(window.devicePixelRatio || 1, 1.25);
      cv.width = Math.round(cv.offsetWidth * ratio.current);
      cv.height = Math.round(cv.offsetHeight * ratio.current);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const draw = useCallback((phi: number, theta: number) => {
    const cv = overlay.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const k = ratio.current;
    const W = cv.width / k, H = cv.height / k; // CSS px
    const { scale: C, offsetY: oy } = capGeometry(W, H, capRef.current);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const project = (p: V3, r = 1) => {
      const v = toView(p, phi, theta);
      const bx = v[0] * r * 0.8, by = v[1] * r * 0.8;
      const b0x = (bx * H) / W; // cobe stretches x by the aspect ratio
      const fx = (W * (b0x * C + 1)) / 2;
      const fy = (H * ((by - oy / H) * C + 1)) / 2; // from the bottom, like gl_FragCoord
      return { x: fx, y: H - fy, visible: v[2] > 0 };
    };
    ctx.clearRect(0, 0, W, H);
    const now = performance.now();
    const px = Math.max(1, (C * Math.min(W, H)) / 600); // stroke scale follows the drawn sphere size

    for (const rt of routes.current) {
      const pts = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
        const t = i / SEGMENTS;
        return project(slerp(rt.a, rt.b, t), 1 + rt.lift * Math.sin(Math.PI * t));
      });
      ctx.lineWidth = 1.2 * px;
      ctx.strokeStyle = "rgba(125,180,255,0.2)";
      ctx.beginPath();
      pts.forEach((p, i) => (p.visible && i > 0 && pts[i - 1].visible ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();

      const prog = ((now / PERIOD + rt.offset) % 1) * 1.25; // last 20% is a pause on arrival
      const head = Math.min(1, prog);
      const tail = Math.max(0, head - 0.28);
      const hi = Math.round(head * SEGMENTS), lo = Math.round(tail * SEGMENTS);
      for (let i = lo + 1; i <= hi; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        if (!p0.visible || !p1.visible) continue;
        const q = (i - lo) / Math.max(1, hi - lo);
        ctx.strokeStyle = `rgba(200,222,255,${0.15 + 0.85 * q})`;
        ctx.lineWidth = (1.2 + 1.8 * q) * px;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      const to = pts[SEGMENTS];
      if (to.visible && prog >= 1) {
        const ring = (prog - 1) / 0.25;
        ctx.strokeStyle = `rgba(48,209,88,${0.9 * (1 - ring)})`;
        ctx.lineWidth = 1.5 * px;
        ctx.beginPath(); ctx.arc(to.x, to.y, (4 + 14 * ring) * px, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }, []);

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <Globe className="absolute inset-0" renderScale={renderScale} theta={theta} speed={speed} cap={cap} bright={bright} pulse={pulse} onFrame={draw} />
        <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      </div>
    </div>
  );
}
