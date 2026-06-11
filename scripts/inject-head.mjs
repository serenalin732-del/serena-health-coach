// Injects PWA/home-screen head tags into the exported dist/index.html.
// Runs as part of `npm run build:web` (the Expo single-output build does not
// consume app/+html.tsx, so we add the tags post-export).
import { readFileSync, writeFileSync } from 'fs';

const p = 'dist/index.html';
let html = readFileSync(p, 'utf8');

const tags = [
  '<meta name="theme-color" content="#D4715A"/>',
  '<link rel="manifest" href="/manifest.webmanifest"/>',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"/>',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Health Coach"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
].join('');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('<head>', '<head>' + tags);
  writeFileSync(p, html);
  console.log('head tags injected into dist/index.html');
} else {
  console.log('head tags already present');
}
