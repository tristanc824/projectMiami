import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const app = path.resolve(root, process.env.NEST_WEB_APP_DIR || '../apps/mobile/dist-website');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function nestApp(): Plugin {
  let building = false;
  const configure = (server: Pick<ViteDevServer, 'middlewares'>) => {
    server.middlewares.use((req, res, next) => {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (pathname !== '/app' && !pathname.startsWith('/app/')) return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
      let relative: string;
      try { relative = decodeURIComponent(pathname.slice(4)); } catch { res.statusCode = 400; res.end(); return; }
      let file = path.resolve(app, `.${relative || '/'}`);
      if (file !== app && !file.startsWith(`${app}${path.sep}`)) { res.statusCode = 404; res.end(); return; }
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (path.extname(relative)) { res.statusCode = 404; res.end(); return; }
        file = path.join(app, 'index.html');
      }
      if (!existsSync(file)) { res.statusCode = 503; res.setHeader('Content-Type', 'text/plain'); res.end('The Nest web app is starting. Please try again shortly.'); return; }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    });
  };
  return {
    name: 'nest-app',
    configResolved(config) { building = config.command === 'build'; },
    configureServer: configure,
    configurePreviewServer: configure,
    closeBundle() {
      if (!building) return;
      if (app !== path.resolve(root, '../apps/mobile/dist-website')) throw new Error('Refusing to package a test wallet export in the website.');
      if (existsSync(app)) cpSync(app, path.join(root, 'dist/app'), { recursive: true });
    },
  };
}
const proxy = { '/api': { target: 'http://127.0.0.1:5184', changeOrigin: true } };
export default defineConfig({ plugins: [react(), nestApp()], server: { proxy }, preview: { proxy } });
