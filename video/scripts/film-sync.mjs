// Sync check (FILM_V2_SPEC.md 6): for every primary hit in src/film/timeline.ts (HITS), find the
// frame where the hit first shows in the rendered picture (motion onset: the first frame whose rise in
// frame-to-frame change reaches 40% of the biggest rise within ±3 frames of the cue) and its distance to the nearest kick in the grid json.
//   node scripts/film-sync.mjs [out/film-picture.mp4]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(path.join(root, "src", "film", "timeline.ts")).href);
// v4: T.KICKS = Best Friend's kick pattern laid out from the bar edit (song bars 8-16 are
// four-on-the-floor except the break bars 11 and 16 and bar 12's beat-1 gap).
const kicks = T.KICKS.map(([f]) => f);
const video = process.argv[2] ?? "out/film-picture.mp4";

const r = spawnSync("ffmpeg", ["-hide_banner", "-i", video, "-vf", "scale=480:270,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
const vals = [...(r.stderr + r.stdout).matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
// tblend output i compares frames i and i+1: change INTO frame i+1.
const diff = (f) => (f >= 1 && f - 1 < vals.length ? vals[f - 1] : 0);
const nearest = (f) => kicks.reduce((b, k) => (Math.abs(k - f) < Math.abs(b - f) ? k : b), kicks[0]);

let ok = 0;
let n = 0;
const rows = [];
for (const h of T.HITS) {
  // Onset: the first frame (within ±3 of the cue) whose rise in frame-to-frame change reaches 40% of
  // the largest rise in that window, i.e. the frame the hit first shows, not its fastest frame.
  let jump = 0;
  for (let j = h.f - 3; j <= h.f + 3; j++) jump = Math.max(jump, diff(j) - diff(j - 1));
  let best = h.f;
  for (let j = h.f - 3; j <= h.f + 3; j++) {
    if (diff(j) - diff(j - 1) >= 0.4 * jump && jump > 0) {
      best = j;
      break;
    }
  }
  const k = nearest(best);
  const dk = best - k;
  const pass = h.beatOnly ? "beat" : Math.abs(dk) <= 1 ? "ok" : "OFF";
  if (!h.beatOnly) {
    n++;
    if (pass === "ok") ok++;
  }
  rows.push(`${h.id.padEnd(12)} cue ${String(h.f).padStart(4)}  lands ${String(best).padStart(4)}  kick ${String(k).padStart(4)}  ${dk >= 0 ? "+" : ""}${dk}  ${pass.padEnd(4)} ${h.note}`);
}
const out = [`${ok}/${n} primary hits land within 1 frame of a kick (beat-only hits listed for reference)`, ...rows].join("\n");
fs.writeFileSync(path.join(root, "out", "film-sync.txt"), out + "\n");
console.log(out);
