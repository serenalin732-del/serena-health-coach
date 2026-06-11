// Generates the app icons (PWA + apple-touch-icon + expo icon) from an inline
// SVG: full-bleed terracotta background, white heart, terracotta pulse line.
// Full-bleed (no rounded corners) because iOS/Android launchers apply their
// own mask. Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#D4715A"/>
  <path d="M256 421
           C 140 340 88 263 88 196
           C 88 144 130 104 180 104
           C 211 104 239 119 256 144
           C 273 119 301 104 332 104
           C 382 104 424 144 424 196
           C 424 263 372 340 256 421 Z"
        fill="#FFFFFF"/>
  <polyline points="128,256 196,256 220,200 262,312 298,228 318,256 384,256"
            fill="none" stroke="#D4715A" stroke-width="22"
            stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

mkdirSync('public', { recursive: true });

const buf = Buffer.from(svg);
await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(buf).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// Expo native icon (referenced by app.json)
await sharp(buf).resize(1024, 1024).png().toFile('assets/images/icon.png');
// Favicon (32px PNG keeps it simple)
await sharp(buf).resize(64, 64).png().toFile('assets/images/favicon.png');
console.log('icons generated');
