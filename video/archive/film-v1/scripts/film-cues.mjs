// Builds the ffmpeg audio mix for the Film from src/film/timeline.ts (Node 22.6+ strips the TS types).
// Writes out/film-mix.txt (filter graph) and prints the extra ffmpeg inputs, one per line.
// Input 0 is the picture (out/film-picture.mp4); the graph outputs [aout].
// Usage: node scripts/film-cues.mjs            -> inputs on stdout, graph in out/film-mix.txt
//        node scripts/film-cues.mjs --list     -> human-readable cue sheet
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(path.join(root, "src", "film", "timeline.ts")).href);
const { BEATS, BEAT_IDS, FILM_FPS, FILM_FRAMES, VO, VO_OFFSET_S, SFX, MUSIC } = T;

const total = FILM_FRAMES / FILM_FPS;
const sec = (frames) => frames / FILM_FPS;
const ms = (s) => Math.max(0, Math.round(s * 1000));

if (process.argv.includes("--list")) {
  console.log(`Film: ${FILM_FRAMES} frames = ${total.toFixed(2)} s at ${FILM_FPS} fps`);
  for (const id of BEAT_IDS) {
    const b = BEATS[id];
    const vo = VO[id] && fs.existsSync(path.join(root, VO[id])) ? VO[id] : "(no file)";
    console.log(`${id}  from ${String(b.from).padStart(4)} (${sec(b.from).toFixed(2)} s)  dur ${String(b.dur).padStart(3)} (${sec(b.dur).toFixed(2)} s)  VO ${vo}`);
  }
  for (const c of SFX) console.log(`sfx ${c.file.split("/").pop().padEnd(11)} @ ${String(c.frame).padStart(4)} (${sec(c.frame).toFixed(2)} s) vol ${c.vol}  ${c.note}`);
  process.exit(0);
}

const inputs = [];
const graph = [];
const mixIn = [];
let n = 1; // input 0 = picture

// Narration
for (const id of BEAT_IDS) {
  const f = VO[id];
  if (!f || !fs.existsSync(path.join(root, f))) continue;
  inputs.push("-i", f);
  const d = ms(sec(BEATS[id].from) + VO_OFFSET_S);
  graph.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${d}|${d},volume=1.0[vo${n}]`);
  mixIn.push(`[vo${n}]`);
  n++;
}

// Music: one constant (MUSIC_FILE in timeline.ts, or MUSIC=path in the environment).
// Long enough -> plays straight through; shorter -> two copies cross-faded inside the ducked stretch.
const musicFile = process.env.MUSIC || MUSIC.file;
const musicLen = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(root, musicFile)]).toString().trim());
const d0 = sec(MUSIC.duck.from);
const d1 = sec(MUSIC.duck.to);
const lvl = MUSIC.duck.level;
const duck = `volume='${MUSIC.volume}*(1-${(1 - lvl).toFixed(3)}*clip((t-${d0.toFixed(3)})/0.6,0,1)*clip((${(d1 + 0.8).toFixed(3)}-t)/0.8,0,1))':eval=frame`;
const fades = `afade=t=in:st=0:d=0.25,afade=t=out:st=${(total - 3).toFixed(3)}:d=3`;
const fmt = "aformat=sample_rates=48000:channel_layouts=stereo";
if (musicLen >= total) {
  inputs.push("-i", musicFile);
  graph.push(`[${n}:a]${fmt},atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,${duck},${fades}[mu]`);
  n += 1;
} else {
  const seam = Math.min(d0 + 1.5, musicLen - 4);
  const restart = 14;
  inputs.push("-i", musicFile, "-i", musicFile);
  graph.push(`[${n}:a]${fmt},atrim=0:${(seam + 1.5).toFixed(3)},asetpts=PTS-STARTPTS[ma]`);
  graph.push(`[${n + 1}:a]${fmt},atrim=start=${restart},asetpts=PTS-STARTPTS[mb]`);
  graph.push(`[ma][mb]acrossfade=d=3:c1=tri:c2=tri,atrim=0:${total.toFixed(3)},${duck},${fades}[mu]`);
  n += 2;
}
mixIn.push("[mu]");
process.stderr.write(`music: ${musicFile} (${musicLen.toFixed(1)} s, ${musicLen >= total ? "straight through" : "looped once"})
`);

// Sound effects
for (const c of SFX) {
  if (!fs.existsSync(path.join(root, c.file))) continue;
  inputs.push("-i", c.file);
  const d = ms(sec(c.frame));
  graph.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${c.vol},adelay=${d}|${d}[s${n}]`);
  mixIn.push(`[s${n}]`);
  n++;
}

graph.push(`${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)},alimiter=limit=0.89:level=false[aout]`);

fs.mkdirSync(path.join(root, "out"), { recursive: true });
fs.writeFileSync(path.join(root, "out", "film-mix.txt"), graph.join(";\n") + "\n");
process.stdout.write(inputs.join("\n") + "\n");
