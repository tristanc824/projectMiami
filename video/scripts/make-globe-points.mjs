// Land points for the film's globe (src/film/globe-points.json), from the app's Natural Earth 1:110m
// land geometry (public domain; apps/mobile/assets/globe/land.geojson on origin/main).
//   node scripts/make-globe-points.mjs path/to/land.geojson
// Output: flat [lat, lon, lat, lon, ...] for land cells on a STEP-degree equal-area-ish grid.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STEP = 1.6;
const land = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const polys = land.features.flatMap(({ geometry: g }) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates));
const boxes = polys.map((rings) => {
  const p = rings[0];
  return { rings, minX: Math.min(...p.map((q) => q[0])), maxX: Math.max(...p.map((q) => q[0])), minY: Math.min(...p.map((q) => q[1])), maxY: Math.max(...p.map((q) => q[1])) };
});
const inRing = (x, y, r) => {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
};
const isLand = (lon, lat) => boxes.some((b) => lon >= b.minX && lon <= b.maxX && lat >= b.minY && lat <= b.maxY && inRing(lon, lat, b.rings[0]) && !b.rings.slice(1).some((r) => inRing(lon, lat, r)));
const out = [];
for (let lat = -84 + STEP / 2; lat <= 84; lat += STEP) {
  const n = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < n; i++) {
    const lon = -180 + (i + 0.5) * (360 / n);
    if (isLand(lon, lat)) out.push(Number(lat.toFixed(2)), Number(lon.toFixed(2)));
  }
}
fs.writeFileSync(path.join(root, "src", "film", "globe-points.json"), JSON.stringify(out));
console.log(`${out.length / 2} land points`);
