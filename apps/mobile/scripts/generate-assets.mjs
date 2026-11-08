import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const mark = await readFile(new URL('../../../web-earth/public/nest-mark.svg', import.meta.url), 'utf8');
for (const [name, color] of [['mark', '#2F5D3A'], ['mark-white', '#FFFFFF']]) {
  const svg = mark.replaceAll('#2F5D3A', color);
  await writeFile(new URL(`../assets/nest/${name}.png`, import.meta.url), new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng());
}
const inner = mark.replace(/<svg[^>]*>/, '').replace('</svg>', '');
const logo = color => `<g transform="translate(192 192) scale(10)">${inner.replaceAll('#2F5D3A', color)}</g>`;
const svg = content => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${content}</svg>`;
// iOS applies its own corner mask. Keep the source square, opaque and RGB.
const icon = svg(`<rect width="1024" height="1024" fill="#2F5D3A"/>${logo('#FFFFFF')}`);
await writeFile(new URL('../assets/nest-icon.svg', import.meta.url), icon);
async function render(name, source, width, opaque = false) {
  const rendered = new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng();
  const png = opaque ? PNG.sync.write(PNG.sync.read(rendered), { colorType: 2 }) : rendered;
  await writeFile(new URL(`../assets/${name}`, import.meta.url), png);
}
await render('icon.png', icon, 1024, true);
await render('favicon.png', icon, 64, true);
await render('splash-icon.png', icon, 256, true);
// Adaptive layers let Android apply circle, squircle and themed launcher masks.
await render('android-icon-foreground.png', svg(logo('#FFFFFF')), 1024);
await render('android-icon-background.png', svg('<rect width="1024" height="1024" fill="#2F5D3A"/>'), 1024, true);
await render('android-icon-monochrome.png', svg(logo('#000000')), 1024);

// Keep the already-generated local iOS project in sync, when it exists.
const catalog = new URL('../ios/Guard/Images.xcassets/AppIcon.appiconset/', import.meta.url);
try {
  const contents = JSON.parse(await readFile(new URL('Contents.json', catalog), 'utf8'));
  for (const image of contents.images) {
    if (image.size === '1024x1024' && image.filename?.endsWith('.png')) {
      await copyFile(new URL('../assets/icon.png', import.meta.url), new URL(image.filename, catalog));
    }
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log('Generated Nest app icon, Android adaptive/themed layers and favicon.');
