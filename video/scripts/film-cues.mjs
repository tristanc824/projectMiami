// Builds the film's sound mix from src/film/timeline.ts (Node strips the TS types).
//   node scripts/film-cues.mjs          -> out/film-mix.wav (+ stems in out/mix/) and a level report
//   node scripts/film-cues.mjs --list   -> cue sheet only
// Mix (v4, FILM_V4.md):
//  - every narration file normalised to VO_TARGET_LUFS (static gain), placed on its beat;
//  - the music is SOFI TUKKER "Best Friend" re-cut on its own bars (timeline EDIT: film bar n plays
//    song bar EDIT[n], no stretch), a low-pass sweep opening over the intro onto the drop (bar 7);
//  - a per-bar gain curve (from the edit's own short-term loudness) holds the bed MUSIC.bedLU below
//    the voice between lines (MUSIC.introLU over the first bars) and MUSIC.duckLU below it under a
//    line, 80 ms attack / 400 ms release starting 100 ms before each line, plus a ~3 dB dip at 2-4 kHz;
//  - low-pass ~500 Hz on the music from the bar 24 downbeat (the scam), opening hard on the bar 30
//    downbeat with the undo check; the film ends on a final hit that rings out over one beat;
//  - sound effects at their frames.
// The final loudness (-14 LUFS, < -1 dBTP) is set by scripts/render-film.sh.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(path.join(root, "src", "film", "timeline.ts")).href);
const { FILM_FPS, FILM_FRAMES, VO, VO_TARGET_LUFS, SFX, MUSIC, BAR_SEC, BEAT_SEC, beatSec, FILM_BARS, barSec, EDIT, SONG, songBarSec } = T;
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
const musicFile = process.env.MUSIC || SONG.file;
const durOf = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(root, f)]).toString());

/* ------------------------------------------------------------------ v4 music: Best Friend, re-cut on its own bars */
// MUSIC_SOFTEN = B | C | off (default off). The source is assembled bar by bar from EDIT (no stretch).
const SOFTEN = (process.env.MUSIC_SOFTEN ?? "off").toUpperCase();
const softenChain = (inL, outL) => {
  const c = MUSIC.soften[SOFTEN];
  if (!c) return `[${inL}]anull[${outL}]`;
  return `[${inL}]acrossover=split=150:order=4th[lo][hi];` +
    `[lo]acompressor=threshold=${c.threshold}:ratio=${c.ratio}:attack=${c.attack}:release=${c.release},volume=${c.lowDb}dB[lo2];` +
    `[hi]highshelf=f=8000:g=${c.shelfDb}[hi2];[lo2][hi2]amix=inputs=2:normalize=0[${outL}]`;
};
const musicNotes = [];

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
  // opens hard on the bar 30 downbeat (the undo release), over lp.outSec centred on it
  wet[i] = ramp(t, lp.from, lp.from + lp.sweepSec) * (1 - ramp(t, lp.to - lp.outSec / 2, lp.to + lp.outSec / 2));
}

// 2. Duck amount 0..1 under each line (attack 80 ms starting 100 ms before the line, release 400 ms),
//    and the duck depth in dB per line, so each line can be trimmed onto the target by measurement.
const D = MUSIC.duck;
const duck = new Float32Array(N);
const depthFor = (corr) => {
  const depth = new Float32Array(N);
  for (const v of vos) {
    const lineDbAt = (t) => MUSIC.duckLU - (Math.floor(t / BAR_SEC) < MUSIC.introBars ? MUSIC.introLU : MUSIC.bedLU) - (corr[v.id] ?? 0);
    for (const [a, b] of v.speech) {
      const a0 = a - D.preRollMs / 1000;
      const a1 = a0 + D.attackMs / 1000;
      const b1 = b + D.releaseMs / 1000;
      for (let i = Math.max(0, Math.floor(a0 * ENV_RATE)); i < Math.min(N, Math.ceil(b1 * ENV_RATE)); i++) {
        const t = tAt(i);
        const x = t < a1 ? ramp(t, a0, a1) : t <= b ? 1 : 1 - ramp(t, b, b1);
        duck[i] = Math.max(duck[i], x);
        depth[i] = Math.min(depth[i], x * lineDbAt(t));
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

// Pass A: the edit. Decode the song once (f32 stereo 48 kHz), copy each film bar from its song bar
// (equal-gain crossfade of MUSIC.xfadeSec at every downbeat; contiguous bars sum back to the original),
// fade the final hit over the tail, then the intro low-pass sweep (asendcmd) and the optional soften.
const wetFile = writeEnv("env-wet", wet);
const dryFile = writeEnv("env-dry", wet.map((w) => 1 - w));
const srcFile = rel(path.join(mixDir, "music-src.wav"));
{
  const raw = path.join(mixDir, "song.f32");
  ff(["-y", "-i", musicFile, "-af", `aresample=${SR},aformat=sample_fmts=flt:channel_layouts=stereo`, "-f", "f32le", raw]);
  const song = new Float32Array(fs.readFileSync(raw).buffer.slice(0));
  fs.unlinkSync(raw);
  const songN = song.length / 2;
  const outN = Math.round(total * SR);
  const out = new Float32Array(outN * 2);
  const xf = Math.round(MUSIC.xfadeSec * SR);
  const used = [];
  for (let n = 0; n < EDIT.length; n++) {
    const m = EDIT[n];
    const d0 = Math.round(barSec(n) * SR);
    const s0 = Math.round(songBarSec(m) * SR);
    const len = n === EDIT.length - 1 ? outN - d0 : Math.round(barSec(n + 1) * SR) - d0;
    for (let i = -xf; i < len + xf; i++) {
      const di = d0 + i;
      const si = s0 + i;
      if (di < 0 || di >= outN || si < 0 || si >= songN) continue;
      let w = 1;
      if (i < xf) w = (i + xf) / (2 * xf);
      else if (i >= len - xf && n < EDIT.length - 1) w = (len + xf - i) / (2 * xf);
      if (n === 0 && i < 0) w = 0;
      out[di * 2] += song[si * 2] * w;
      out[di * 2 + 1] += song[si * 2 + 1] * w;
    }
    used.push(`${n}<-${m}`);
  }
  // The final hit: hold 80 ms, then an exponential fade to the end of the film.
  const t0 = Math.round(barSec(EDIT.length - 1) * SR) + Math.round(0.08 * SR);
  for (let i = t0; i < outN; i++) {
    const x = (i - t0) / Math.max(1, outN - t0);
    const g = Math.pow(1 - x, 2.2);
    out[i * 2] *= g;
    out[i * 2 + 1] *= g;
  }
  const raw2 = path.join(mixDir, "edit.f32");
  fs.writeFileSync(raw2, Buffer.from(out.buffer));
  // Intro sweep: the cutoff glides exponentially between the per-bar values, a command every 20 ms.
  const sw = MUSIC.introSweep;
  const cmds = [];
  for (let t = 0; t <= sw.to + 0.0001; t += 0.02) {
    const x = (t / BAR_SEC);
    const i = Math.min(sw.hz.length - 2, Math.floor(x));
    const u = Math.min(1, x - i);
    const hz = Math.exp(Math.log(sw.hz[i]) + (Math.log(sw.hz[i + 1]) - Math.log(sw.hz[i])) * u);
    cmds.push(`${t.toFixed(3)} lowpass@sw f ${Math.min(20000, hz).toFixed(1)};`);
  }
  fs.writeFileSync(path.join(mixDir, "sweep.cmd"), cmds.join("\n") + "\n");
  ff(["-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", raw2, "-filter_complex",
    `[0:a]asendcmd=f=out/mix/sweep.cmd,lowpass@sw=f=${sw.hz[0]}:p=2[p];${softenChain("p", "o")}`,
    "-map", "[o]", "-c:a", "pcm_f32le", srcFile]);
  fs.unlinkSync(raw2);
  musicNotes.push(`Best Friend (${SONG.bpm} BPM, no stretch), edit film<-song bars: ${used.join(" ")}; intro low-pass ${sw.hz.join(" > ")} Hz over bars 0-7; soften ${MUSIC.soften[SOFTEN] ? SOFTEN : "off"}`);
}

const musicLp = rel(path.join(mixDir, "music-lp.wav"));
ff([
  "-y", "-i", srcFile, "-i", dryFile, "-i", wetFile,
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
// v4: the first MUSIC.introBars ride at introLU (FILM_V4.md: the opening was too loud).
const bedTarget = (n) => VO_TARGET_LUFS + (n < MUSIC.introBars ? MUSIC.introLU : MUSIC.bedLU);
const barGain = [];
for (let n = 0; n < FILM_BARS; n++) {
  const target = bedTarget(n);
  const vals = [];
  for (let t = n * BAR_SEC; t < (n + 1) * BAR_SEC; t += 0.1) vals.push(sAt(t));
  vals.sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  barGain.push(Math.max(-30, Math.min(MUSIC.maxBoostDb, target - med)));
}
barGain.push(barGain[FILM_BARS - 1]); // the tail (final hit) keeps the last bar's gain
const pass = (corr) => {
const depth = depthFor(corr);
// Smooth: each bar's gain held, 1-beat crossfades between bars, then one more pass of smoothing.
const bed = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = tAt(i);
  const n = Math.min(FILM_BARS, Math.floor(t / BAR_SEC));
  const into = t - n * BAR_SEC;
  let g = barGain[n];
  if (n > 0 && into < BEAT_SEC / 2) g = barGain[n - 1] + (barGain[n] - barGain[n - 1]) * (0.5 + into / BEAT_SEC);
  else if (n < FILM_BARS && into > BAR_SEC - BEAT_SEC / 2) g = barGain[n] + (barGain[n + 1] - barGain[n]) * ((into - (BAR_SEC - BEAT_SEC / 2)) / BEAT_SEC);
  const duckDb = depth[i];
  const fade = 1;
  const lf = MUSIC.lift;
  const liftDb = lf.db * ramp(t, lf.from - lf.rampSec, lf.from) * (1 - ramp(t, lf.to - lf.rampSec, lf.to));
  bed[i] = dbToGain(g + liftDb + duckDb) * fade * Math.min(1, t / 0.02);
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
const lifted = new Set(vos.filter((v) => v.speech[0][0] < MUSIC.lift.to && v.speech[v.speech.length - 1][1] > MUSIC.lift.from).map((v) => v.id));
for (const [id, d] of Object.entries(res.diffs)) {
  if (lifted.has(id)) continue; // the drop lift is deliberate (H3): don't trim it back out
  const c = Math.max(-6, Math.min(6, -MUSIC.duckLU - d));
  if (Math.abs(c) > 0.75) corr[id] = c;
}
if (Object.keys(corr).length) res = pass(corr);
const report = [...musicNotes, `lift: +${MUSIC.lift.db} dB over bar 7, the drop (${[...lifted].join(", ") || "no line"} not trimmed back to the duck target)`, ...res.report];
const txt = report.join("\n");
fs.writeFileSync(path.join(root, "out", "mix-report.txt"), txt + "\n");
console.log(txt);
console.log("wrote out/film-mix.wav, out/mix/vo-stem.wav, out/mix/music-stem.wav, out/mix-report.txt");
