import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Match the exact photo crops used by the supplied HTML mockups.
for (const [file, name, zoom, x, y] of [
  ['selfie', 'mama', 3, .6, .46], ['shop', 'luis', 4.2, .5, .3],
  ['phone', 'daniela', 3.3, .52, .28], ['laugh', 'ana', 2.5, .42, .22],
]) {
  const source = fileURLToPath(new URL(`../assets/nest/${file}.jpg`, import.meta.url));
  const target = fileURLToPath(new URL(`../assets/nest/avatar-${name}.jpg`, import.meta.url));
  const meta = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', source], { encoding: 'utf8' });
  const width = Number(meta.match(/pixelWidth: (\d+)/)[1]);
  const height = Number(meta.match(/pixelHeight: (\d+)/)[1]);
  const scaledWidth = Math.round(256 * zoom), scaledHeight = Math.round(height / width * scaledWidth);
  execFileSync('sips', ['--resampleHeightWidth', String(scaledHeight), String(scaledWidth), source, '--out', target]);
  execFileSync('sips', ['--cropToHeightWidth', '256', '256', '--cropOffset', String(Math.round((scaledHeight - 256) * y)), String(Math.round((scaledWidth - 256) * x)), target]);
}
