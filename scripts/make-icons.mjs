// Draws the app icons (PWA manifest, apple-touch-icon, favicon) from one SVG mark.
//
// The mark is Lucide's "book-open" (ISC licence, https://lucide.dev) in zinc-50 on a zinc-950
// tile — monochrome zinc per docs/design_direction.md. PNGs are rendered by a headless
// Chromium (Edge or Chrome): `node scripts/make-icons.mjs` (set BROWSER=<path> if not found).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BG = '#09090b'; // zinc-950 = manifest background_color / theme_color
const FG = '#fafafa'; // zinc-50

// lucide book-open, 24×24 grid, stroke 2, round caps / joins
const MARK = `<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`;

/**
 * The tile with the mark centred. `markSize` = share of the tile the 24-unit grid takes;
 * `radius` = corner radius as a share of the tile (0 = full bleed, for maskable / iOS).
 */
function svg(size, { markSize, radius }) {
	const grid = size * markSize;
	const offset = (size - grid) / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${size * radius}" fill="${BG}"/>
<g transform="translate(${offset} ${offset}) scale(${grid / 24})" fill="none" stroke="${FG}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MARK}</g>
</svg>`;
}

// "any": rounded tile, large mark. Maskable / iOS: full bleed, the mark inside the safe-zone
// circle (radius 40% of the tile; the book's corners sit at ~13.5 of 24 units from the centre).
const ANY = { markSize: 0.68, radius: 0.22 };
const BLEED = { markSize: 0.56, radius: 0 };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browser = [
	process.env.BROWSER,
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium'
].find((p) => p && existsSync(p));
if (!browser) throw new Error('No Chromium found — set BROWSER=<path to chrome/edge>');

// One headless browser, driven over the DevTools protocol (exact size, transparent background)
const port = 9300 + Math.floor(Math.random() * 600);
const proc = spawn(browser, [
	'--headless=new',
	'--disable-gpu',
	`--remote-debugging-port=${port}`,
	`--user-data-dir=${mkdtempSync(join(tmpdir(), 'librarian-icons-'))}`,
	'about:blank'
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 80 && !target; i++) {
	await sleep(250);
	try {
		const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
		target = tabs.find((t) => t.type === 'page');
	} catch {
		// not up yet
	}
}
if (!target) throw new Error('Browser did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
	const msg = JSON.parse(e.data);
	pending.get(msg.id)?.(msg);
});
const send = (method, params = {}) =>
	new Promise((ok, fail) => {
		const id = ++seq;
		pending.set(id, (msg) => (msg.error ? fail(new Error(msg.error.message)) : ok(msg.result)));
		ws.send(JSON.stringify({ id, method, params }));
	});
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });

async function png(out, size, style) {
	await send('Emulation.setDeviceMetricsOverride', {
		width: size,
		height: size,
		deviceScaleFactor: 1,
		mobile: false
	});
	const html = `<!doctype html><style>html,body{margin:0}svg{display:block}</style>${svg(size, style)}`;
	await send('Page.navigate', { url: 'data:text/html,' + encodeURIComponent(html) });
	await sleep(300);
	const { data } = await send('Page.captureScreenshot', {
		format: 'png',
		clip: { x: 0, y: 0, width: size, height: size, scale: 1 }
	});
	writeFileSync(out, Buffer.from(data, 'base64'));
	console.log('wrote', out);
}

mkdirSync(join(root, 'static/icons'), { recursive: true });
await png(join(root, 'static/icons/icon-192.png'), 192, ANY);
await png(join(root, 'static/icons/icon-512.png'), 512, ANY);
await png(join(root, 'static/icons/icon-maskable-192.png'), 192, BLEED);
await png(join(root, 'static/icons/icon-maskable-512.png'), 512, BLEED);
// iOS rounds the corners itself and turns transparency black: full bleed
await png(join(root, 'static/apple-touch-icon.png'), 180, { markSize: 0.62, radius: 0 });
writeFileSync(join(root, 'src/lib/assets/favicon.svg'), svg(32, ANY) + '\n');
console.log('wrote src/lib/assets/favicon.svg');
ws.close();
proc.kill();
