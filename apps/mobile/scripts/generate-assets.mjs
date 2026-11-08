import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
const mark = await readFile(new URL('../../../web-earth/public/nest-mark.svg', import.meta.url), 'utf8');
for (const [name, color] of [['mark', '#2F5D3A'], ['mark-white', '#FFFFFF']]) {
  const svg = mark.replaceAll('#2F5D3A', color);
  await writeFile(new URL(`../assets/nest/${name}.png`, import.meta.url), new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng());
}
const inner = mark.replace(/<svg[^>]*>/, '').replace('</svg>', '').replaceAll('#2F5D3A', '#FFFFFF');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="228" fill="#2F5D3A"/><g transform="translate(192 192) scale(10)">${inner}</g></svg>`;
await writeFile(new URL('../assets/nest-icon.svg', import.meta.url), icon);
for (const [name, width] of [['icon.png', 1024], ['favicon.png', 64], ['splash-icon.png', 256], ['android-icon-foreground.png', 432]]) {
  await writeFile(new URL(`../assets/${name}`, import.meta.url), new Resvg(icon, { fitTo: { mode: 'width', value: width } }).render().asPng());
}
console.log('Generated Nest rings, app icon and favicon.');
