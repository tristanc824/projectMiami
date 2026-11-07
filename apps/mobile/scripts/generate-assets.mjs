import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const source = await readFile(new URL('../assets/guard-icon.svg', import.meta.url), 'utf8');
for (const [name, width] of [['icon.png', 1024], ['favicon.png', 64]]) {
  const rendered = new Resvg(source, { fitTo: { mode: 'width', value: width } }).render();
  await writeFile(new URL(`../assets/${name}`, import.meta.url), rendered.asPng());
}
console.log('Generated original Guard icon and favicon.');
