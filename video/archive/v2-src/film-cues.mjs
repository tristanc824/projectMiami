// Builds the film's sound mix from src/film/timeline.ts (Node strips the TS types).
//   node scripts/film-cues.mjs          -> out/film-mix.wav (+ stems in out/mix/) and a level report
//   node scripts/film-cues.mjs --list   -> cue sheet only
// Mix (Caleb's targets, Nov 7):
//  - every narration file normalised to VO_TARGET_LUFS (static gain), placed on its beat;
//  - the song trimmed from 0.9336 s; a per-bar gain curve (from the song's own short-term loudness)
//    holds the bed MUSIC.bedLU below the voice between lines and MUSIC.duckLU below it under a line,
//    with 80 ms attack / 400 ms release starting 100 ms before each line, plus a ~3 dB dip at
//    2-4 kHz under each line (the bandoneón sits in the voice's range);
//  - low-pass ~500 Hz on the music from the bar 24 downbeat, 1-beat sweeps in and out, full open
//    on the bar 32 downbeat (65.165 s) with the undo check; fade over the last 2 bars;
//  - sound effects at their frames.
// The final loudness (-14 LUFS, < -1 dBTP) is set by scripts/render-film.sh.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(path.join(root, "src", "film", "timeline.ts")).href);
const { FILM_FPS, FILM_FRAMES, VO, VO_TARGET_LUFS, SFX, MUSIC, BAR_SEC, BEAT_SEC, beatSec, FILM_BARS } = T;
const total = FILM_FRAMES / FILM_FPS;
const SR = 48000;
const ENV_RATE = 1000; // envelope samples per second
const mixDir = path.join(root, "out", "mix");
fs.mkdirSync(mixDir, { recursive: true });
const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...args], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${(r.stderr || "").slice(-600)}`);
  return r.stderr || "";
};
const loudness = (file, extra = []) => {
  const out = ff([...extra, "-i", file, "-af", "ebur128", "-f", "null", "-"]);
  const sum = out.slice(out.lastIndexOf("Summary:"));
  const m = sum.match(/I:\s+(-?[\d.]+) LUFS/);
  return m ? Number(m[1]) : -70;
};
const dbToGain = (db) => Math.pow(10, db / 20);
const musicFile = process.env.MUSIC || MUSIC.file;

/* ------------------------------------------------------------------ narration analysis */

const vos = VO.filter((v) => fs.existsSync(path.join(root, v.file))).map((v) => {
  const I = loudness(v.file);
  const gainDb = VO_TARGET_LUFS - I;
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(root, v.file)]).toString());
  // speech segments: silencedetect, gaps under 0.6 s merged (the duck breathes, it doesn't pump)
  const sd = ff(["-i", v.file, "-af", "silencedetect=noise=-38dB:d=0.15", "-f", "null", "-"]);
  const starts = [...sd.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  let segs = [];
  let cur = 0;
  const sil = starts.map((s, i) => [s, ends[i] ?? dur]).sort((a, b) => a[0] - b[0]);
  for (const [s, e] of sil) {
    if (s > cur + 0.02) segs.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < dur - 0.02) segs.push([cur, dur]);
  const merged = [];
  for (const sg of segs) {
    const last = merged[merged.length - 1];
    if (last && sg[0] - last[1] < 0.6) last[1] = sg[1];
    else merged.push([...sg]);
  }
  const at = beatSec(v.k);
  return { ...v, I, gainDb, dur, at, speech: merged.map(([a, b]) => [at + a, at + b]) };
});

if (process.argv.includes("--list")) {
  console.log(`Film: ${FILM_FRAMES} frames = ${total.toFixed(3)} s at ${FILM_FPS} fps`);
  for (const v of vos) console.log(`${v.id}  @ ${v.at.toFixed(3)} s (frame ${(v.at * FILM_FPS).toFixed(1)})  ${v.dur.toFixed(2)} s -> ends ${(v.at + v.dur).toFixed(2)}  I ${v.I.toFixed(1)} -> gain ${v.gainDb.toFixed(1)} dB  "${v.line}"`);
  for (const c of SFX) console.log(`sfx ${c.file.split("/").pop().padEnd(11)} @ frame ${c.f} (${(c.f / FILM_FPS).toFixed(3)} s) ${c.db} dB  ${c.note}`);
  process.exit(0);
}

/* ------------------------------------------------------------------ envelopes */

const N = Math.ceil(total * ENV_RATE) + 1;
const tAt = (i) => i / ENV_RATE;
/** Smoothstep ramp 0..1 across [a, b]. */
const ramp = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : ((x) => x * x * (3 - 2 * x))((t - a) / (b - a)));

// 1. Low-pass wet amount: sweep in over the beat after the bar-24 downbeat, out over the beat before bar 32.
const lp = MUSIC.lowpass;
const wet = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = tAt(i);
  wet[i] = ramp(t, lp.from, lp.from + lp.sweepSec) * (1 - ramp(t, lp.to - lp.sweepSec, lp.to));
}

// 2. Duck amount 0..1 under each line (attack 80 ms starting 100 ms before the line, release 400 ms),
//    and the duck depth in dB per line, so each line can be trimmed onto the target by measurement.
const D = MUSIC.duck;
const duck = new Float32Array(N);
const depthFor = (corr) => {
  const depth = new Float32Array(N);
  for (const v of vos) {
    const lineDb = MUSIC.duckLU - MUSIC.bedLU - (corr[v.id] ?? 0);
    for (const [a, b] of v.speech) {
      const a0 = a - D.preRollMs / 1000;
      const a1 = a0 + D.attackMs / 1000;
      const b1 = b + D.releaseMs / 1000;
      for (let i = Math.max(0, Math.floor(a0 * ENV_RATE)); i < Math.min(N, Math.ceil(b1 * ENV_RATE)); i++) {
        const t = tAt(i);
        const x = t < a1 ? ramp(t, a0, a1) : t <= b ? 1 : 1 - ramp(t, b, b1);
        duck[i] = Math.max(duck[i], x);
        depth[i] = Math.min(depth[i], x * lineDb);
      }
    }
  }
  return depth;
};
depthFor({});

const writeEnv = (file, data) => {
  const raw = path.join(mixDir, file + ".f32");
  fs.writeFileSync(raw, Buffer.from(data.buffer));
  ff(["-y", "-f", "f32le", "-ar", String(ENV_RATE), "-ac", "1", "-i", raw, "-af", `aresample=${SR}:filter_type=kaiser,pan=stereo|c0=c0|c1=c0`, "-c:a", "pcm_f32le", path.join(mixDir, file + ".wav")]);
  fs.unlinkSync(raw);
  return rel(path.join(mixDir, file + ".wav"));
};

// Pass A: the song, trimmed, with the low-pass crossfade (dry * (1-wet) + lowpassed * wet).
const wetFile = writeEnv("env-wet", wet);
const dryFile = writeEnv("env-dry", wet.map((w) => 1 - w));
const musicLp = rel(path.join(mixDir, "music-lp.wav"));
ff([
  "-y", "-ss", String(MUSIC.offsetSec), "-t", total.toFixed(4), "-i", musicFile, "-i", dryFile, "-i", wetFile,
  "-filter_complex",
  `[0:a]aresample=${SR},aformat=sample_fmts=flt:channel_layouts=stereo,asplit=2[d][w];` +
    `[w]lowpass=f=${lp.hz}:p=2,lowpass=f=${lp.hz}:p=2,volume=${lp.makeupDb}dB[wl];` +
    `[d][1:a]amultiply[d2];[wl][2:a]amultiply[w2];[d2][w2]amix=inputs=2:normalize=0:duration=first[o]`,
  "-map", "[o]", "-c:a", "pcm_f32le", musicLp,
]);

// Measure the song's short-term loudness (3 s) over time, after the low-pass.
const st = ff(["-v", "verbose", "-i", musicLp, "-af", "ebur128", "-f", "null", "-"]);
const S = [...st.matchAll(/t:\s*([\d.]+)\s+TARGET.*?S:\s*(-?[\d.]+|-inf)/g)].map((m) => [Number(m[1]), m[2] === "-inf" ? -70 : Number(m[2])]);
// ebur128's S at time t covers [t-3, t]; centre it (and never read a window that starts before 0).
const sAt = (t0) => {
  const t = Math.max(1.5, t0);
  let best = -70;
  let d = 1e9;
  for (const [tt, v] of S) {
    const dd = Math.abs(tt - 1.5 - t);
    if (dd < d) {
      d = dd;
      best = v;
    }
  }
  return best;
};
// Per-bar bed gain: the bar's median short-term loudness -> target (voice + bedLU), clamped.
const target = VO_TARGET_LUFS + MUSIC.bedLU;
const barGain = [];
for (let n = 0; n < FILM_BARS; n++) {
  const vals = [];
  for (let t = n * BAR_SEC; t < (n + 1) * BAR_SEC; t += 0.1) vals.push(sAt(t));
  vals.sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  barGain.push(Math.max(-30, Math.min(MUSIC.maxBoostDb, target - med)));
}
const pass = (corr) => {
const depth = depthFor(corr);
// Smooth: each bar's gain held, 1-beat crossfades between bars, then one more pass of smoothing.
const bed = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = tAt(i);
  const n = Math.min(FILM_BARS - 1, Math.floor(t / BAR_SEC));
  const into = t - n * BAR_SEC;
  let g = barGain[n];
  if (n > 0 && into < BEAT_SEC / 2) g = barGain[n - 1] + (barGain[n] - barGain[n - 1]) * (0.5 + into / BEAT_SEC);
  else if (n < FILM_BARS - 1 && into > BAR_SEC - BEAT_SEC / 2) g = barGain[n] + (barGain[n + 1] - barGain[n]) * ((into - (BAR_SEC - BEAT_SEC / 2)) / BEAT_SEC);
  const duckDb = depth[i];
  const fade = 1 - ramp(t, MUSIC.fadeOut.from, MUSIC.fadeOut.to);
  bed[i] = dbToGain(g + duckDb) * fade * Math.min(1, t / 0.02);
}
const bedFile = writeEnv("env-bed", bed);
// EQ dip: subtract a band-passed copy around 3 kHz, scaled so the band drops ~3 dB under a line.
const dip = 1 - dbToGain(D.eq.db);
const eqFile = writeEnv("env-eq", duck.map((x) => -dip * x));

/* ------------------------------------------------------------------ the mix */

const inputs = [];
const graph = [];
const voLabels = [];
const add = (f) => (inputs.push("-i", f), inputs.length / 2 - 1);
for (const v of vos) {
  const i = add(v.file);
  const d = Math.round(v.at * 1000);
  graph.push(`[${i}:a]aresample=${SR},aformat=sample_fmts=flt:channel_layouts=stereo,volume=${v.gainDb.toFixed(2)}dB,adelay=${d}|${d},apad=whole_dur=${total.toFixed(3)}[vo${i}]`);
  voLabels.push(`[vo${i}]`);
}
graph.push(`${voLabels.join("")}amix=inputs=${voLabels.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(4)}[vostem]`);
const im = add(musicLp);
const ib = add(bedFile);
const ie = add(eqFile);
graph.push(`[${im}:a]asplit=2[mm][mb];[mb]bandpass=f=${D.eq.hz}:width_type=o:w=${D.eq.widthOct}[band];[band][${ie}:a]amultiply[bneg];[mm][bneg]amix=inputs=2:normalize=0:duration=first[meq];[meq][${ib}:a]amultiply,atrim=0:${total.toFixed(4)}[mstem]`);
const sfxLabels = [];
for (const c of SFX) {
  if (!fs.existsSync(path.join(root, c.file))) continue;
  const i = add(c.file);
  const d = Math.max(0, Math.round((c.f / FILM_FPS - (c.alignSec ?? 0)) * 1000));
  graph.push(`[${i}:a]aresample=${SR},aformat=sample_fmts=flt:channel_layouts=stereo,volume=${c.db}dB,adelay=${d}|${d}[s${i}]`);
  sfxLabels.push(`[s${i}]`);
}
graph.push(`${sfxLabels.join("")}amix=inputs=${sfxLabels.length}:normalize=0:duration=longest,apad=whole_dur=${total.toFixed(3)},atrim=0:${total.toFixed(4)}[sfx]`);
graph.push(`[vostem]asplit=2[vo1][vo2];[mstem]asplit=2[mu1][mu2];[vo1][mu1][sfx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false[aout]`);
fs.writeFileSync(path.join(root, "out", "film-mix.txt"), graph.join(";\n") + "\n");
ff([
  "-y", ...inputs, "-/filter_complex", "out/film-mix.txt",
  "-map", "[aout]", "-c:a", "pcm_s24le", "-ar", String(SR), "out/film-mix.wav",
  "-map", "[vo2]", "-c:a", "pcm_f32le", rel(path.join(mixDir, "vo-stem.wav")),
  "-map", "[mu2]", "-c:a", "pcm_f32le", rel(path.join(mixDir, "music-stem.wav")),
]);

/* ------------------------------------------------------------------ level report */

const segLoud = (file, a, b) => loudness(file, ["-ss", a.toFixed(3), "-t", Math.max(0.4, b - a).toFixed(3)]);
const report = [];
const diffs = {};
report.push(`bar gains (dB): ${barGain.map((g) => g.toFixed(1)).join(" ")}`);
report.push("line  voice LUFS  music under  diff (LU)   music after line  (vs voice)");
for (const v of vos) {
  const a = v.speech[0][0];
  const b = v.speech[v.speech.length - 1][1];
  const vl = segLoud("out/mix/vo-stem.wav", a, b);
  const ml = segLoud("out/mix/music-stem.wav", a, b);
  const next = vos.find((w) => w.at > v.at);
  const gapA = b + 0.6;
  const gapB = Math.min(next ? next.speech[0][0] - 0.2 : total - 3, gapA + 3);
  const gl = gapB - gapA > 0.5 ? segLoud("out/mix/music-stem.wav", gapA, gapB) : NaN;
  diffs[v.id] = vl - ml;
  report.push(`${v.id}   ${vl.toFixed(1).padStart(6)}     ${ml.toFixed(1).padStart(6)}     ${(vl - ml).toFixed(1).padStart(5)}      ${Number.isNaN(gl) ? "   (no gap)" : gl.toFixed(1).padStart(6)}  ${Number.isNaN(gl) ? "" : (gl - vl).toFixed(1)}`);
}
return { report, diffs };
};

// Pass 1 at the nominal depth; pass 2 trims any line that measured outside +-0.75 LU of duckLU.
let res = pass({});
const corr = {};
for (const [id, d] of Object.entries(res.diffs)) {
  const c = Math.max(-6, Math.min(6, -MUSIC.duckLU - d));
  if (Math.abs(c) > 0.75) corr[id] = c;
}
if (Object.keys(corr).length) res = pass(corr);
const report = res.report;
const txt = report.join("\n");
fs.writeFileSync(path.join(root, "out", "mix-report.txt"), txt + "\n");
console.log(txt);
console.log("wrote out/film-mix.wav, out/mix/vo-stem.wav, out/mix/music-stem.wav, out/mix-report.txt");
