import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

// Natural Earth 1:110m land is public domain. No network or 3D runtime is
// needed to generate the static texture and the animated globe's point buffer.
const root = new URL('../assets/globe/', import.meta.url);
const land = JSON.parse(await readFile(new URL('land.geojson', root), 'utf8'));
const polygons = land.features.flatMap(({ geometry }) => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates);
const bounds = polygons.map(rings => {
  const points = rings[0];
  return { rings, minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])), minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) };
});
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function isLand(lon, lat) {
  return bounds.some(p => lon >= p.minX && lon <= p.maxX && lat >= p.minY && lat <= p.maxY && inRing(lon, lat, p.rings[0]) && !p.rings.slice(1).some(ring => inRing(lon, lat, ring)));
}
const rad = Math.PI / 180, centerLat = 15 * rad, centerLon = 18;
const dots = [];
const vertices = [];
for (let lat = -86; lat <= 86; lat += 2) {
  const phi = lat * rad;
  const count = Math.round(180 * Math.cos(phi));
  for (let i = 0; i < count; i++) {
    const lon = -180 + i * 360 / count, lambda = (lon - centerLon) * rad;
    const onLand = isLand(lon, lat);
    vertices.push(...[Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda), onLand ? 1 : 0].map(value => Number(value.toFixed(5))));
    const z = Math.sin(centerLat) * Math.sin(phi) + Math.cos(centerLat) * Math.cos(phi) * Math.cos(lambda);
    if (z < 0) continue;
    const x = Math.cos(phi) * Math.sin(lambda);
    const y = Math.cos(centerLat) * Math.sin(phi) - Math.sin(centerLat) * Math.cos(phi) * Math.cos(lambda);
    dots.push(`<circle cx="${(500 + 454 * x).toFixed(2)}" cy="${(500 - 454 * y).toFixed(2)}" r="${(onLand ? 1.45 + 1.05 * z : 0.85 + .5 * z).toFixed(2)}" fill="${onLand ? '#FFFFFF' : '#555962'}" opacity="${(onLand ? .48 + .5 * z : .13 + .15 * z).toFixed(2)}"/>`);
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs><radialGradient id="sphere" cx="38%" cy="25%" r="76%"><stop stop-color="#1A1B20"/><stop offset=".65" stop-color="#090A0C"/><stop offset="1" stop-color="#020203"/></radialGradient></defs><circle cx="500" cy="500" r="455" fill="url(#sphere)"/><g transform="rotate(-17 500 500)">${dots.join('')}</g></svg>`;
await writeFile(new URL('dotted-globe.svg', root), svg);
await writeFile(new URL('dotted-globe.png', root), new Resvg(svg).render().asPng());
await writeFile(new URL('sphere.png', root), new Resvg(svg.replace(/<g transform=.*<\/g>/, '')).render().asPng());
await writeFile(new URL('points.json', root), JSON.stringify(vertices));
console.log(`Generated globe with ${dots.length} dots.`);
