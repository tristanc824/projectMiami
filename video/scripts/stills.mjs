// Renders review stills of NestVertical in one bundle: node scripts/stills.mjs [frame ...]
// Default frames: the middle of every beat plus key moments. Output: out/review/f####.jpg
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const BROWSER = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT = [45, 150, 255, 375, 495, 585, 675, 765, 870, 975, 1095, 1230, 1365, 1515];
const frames = process.argv.slice(2).map(Number);
const list = frames.length ? frames : DEFAULT;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const out = path.join(root, "out", "review");
fs.mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "NestVertical", browserExecutable: BROWSER });
for (const frame of list) {
  const file = path.join(out, `f${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output: file, imageFormat: "jpeg", jpegQuality: 88, browserExecutable: BROWSER });
  console.log("wrote", file);
}
