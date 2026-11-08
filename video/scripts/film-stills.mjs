// Review stills of the Film composition from one bundle, plus labelled contact sheets.
//   node scripts/film-stills.mjs 391 403 415      -> out/film-review/f0391.jpg ...
//   node scripts/film-stills.mjs --grid            -> every bar downbeat and every bar's beat 3 (FILM_V2_SPEC.md 6)
//   SHEET=out/film-v2-sheet.jpg node scripts/film-stills.mjs --grid   -> also one contact sheet of all of them
// Env: OUTDIR (default film-review), CHROME (browser), COLS (sheet columns, default 6).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const BROWSER = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(path.join(root, "src", "film", "timeline.ts")).href);

const args = process.argv.slice(2);
let list = [];
if (args.includes("--grid")) {
  for (let n = 0; n < T.FILM_BARS; n++) list.push(T.at(n, 1), T.at(n, 3));
  list.push(T.FILM_FRAMES - 1);
} else list = args.map(Number).filter((n) => Number.isFinite(n));
if (!list.length && !args.includes("--sheet-only")) list = [0, 98, 195, 391];

const out = path.join(root, "out", process.env.OUTDIR ?? "film-review");
fs.mkdirSync(out, { recursive: true });
const files = [];
if (args.includes("--sheet-only")) {
  for (const n of fs.readdirSync(out).filter((x) => /^f\d{4}\.jpg$/.test(x)).sort()) files.push({ frame: Number(n.slice(1, 5)), file: path.join(out, n) });
  list = [];
}
const serveUrl = list.length ? await bundle({ entryPoint: path.join(root, "src", "index.ts") }) : "";
const composition = list.length ? await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", browserExecutable: BROWSER }) : null;
for (const frame of list) {
  const file = path.join(out, `f${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output: file, imageFormat: "jpeg", jpegQuality: 90, browserExecutable: BROWSER });
  files.push({ frame, file });
  process.stdout.write(`${frame} `);
}
console.log(`\nwrote ${files.length} stills to ${out}`);

const makeSheet = (files, sheetPath, cols) => {
  const w = 480;
  const h = 270;
  const inputs = files.flatMap((f) => ["-i", f.file]);
  const label = (fr) => `f${fr} bar ${Math.floor(Math.round((fr / T.BEAT_F) * 1000) / 1000 / 4)}`;
  const chains = files.map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=fontfile=out/sheet-font.ttf:text='${label(f.frame)}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=4[v${i}]`);
  const rows = Math.ceil(files.length / cols);
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
  const graph = files.length > 1 ? `${chains.join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black[o]` : chains[0].replace("[v0]", "[o]");
  fs.mkdirSync(path.dirname(sheetPath), { recursive: true });
  if (!fs.existsSync(path.join(root, "out", "sheet-font.ttf"))) fs.copyFileSync("C:\Windows\Fonts\arial.ttf", path.join(root, "out", "sheet-font.ttf"));
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[o]", "-q:v", "3", sheetPath], { cwd: root, stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    console.error("sheet failed:", String(e.stderr ?? e).slice(0, 300));
    process.exit(1);
  }
  console.log(`sheet ${path.relative(root, sheetPath)} (${cols}x${rows})`);
};

if (process.env.SHEET) {
  const cols = Number(process.env.COLS ?? 6);
  const sheet = path.resolve(root, process.env.SHEET);
  const split = Number(process.env.SPLIT ?? 0);
  if (split > 0) {
    for (let i = 0; i * split < files.length; i++) makeSheet(files.slice(i * split, (i + 1) * split), sheet.replace(/\.jpg$/, `-${i + 1}.jpg`), cols);
  } else if (files.length > 24) {
    // Many stills: label each into a numbered sequence, then tile it (a long xstack command line is too long on Windows).
    const tmp = path.join(path.dirname(sheet), "_tiles");
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    if (!fs.existsSync(path.join(root, "out", "sheet-font.ttf"))) fs.copyFileSync("C:\Windows\Fonts\arial.ttf", path.join(root, "out", "sheet-font.ttf"));
    files.forEach((f, i) => {
      const bar = Math.floor(Math.round((f.frame / T.BEAT_F) * 1000) / 1000 / 4);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f.file, "-vf", `scale=384:216,drawtext=fontfile=out/sheet-font.ttf:text='f${f.frame} bar ${bar}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=3`, "-q:v", "2", path.join(tmp, `${String(i).padStart(3, "0")}.jpg`)], { cwd: root });
    });
    const rows = Math.ceil(files.length / cols);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(tmp, "%03d.jpg"), "-vf", `tile=${cols}x${rows}:padding=4:margin=4:color=black`, "-frames:v", "1", "-q:v", "2", sheet], { cwd: root });
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`sheet ${path.relative(root, sheet)} (${cols}x${rows})`);
  } else makeSheet(files, sheet, cols);
}
