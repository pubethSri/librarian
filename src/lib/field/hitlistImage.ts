// ─── Hitlist as an image ─────────────────────────────────────────────────────
// The Hitlist saved as a PNG for the phone's gallery (the offline fallback at
// the fair). Drawn on a <canvas> — no dependency, and Thai renders with the
// phone's own fonts. `hitlistImageLines` (what to draw) is pure and tested;
// `drawHitlist` / `saveHitlistImage` touch the DOM.

import { volumeSpan, type ConfirmedItem, type HitlistGroup } from './logic';

export type ImageLine =
	| { kind: 'title'; text: string }
	| { kind: 'subtitle'; text: string }
	| { kind: 'heading'; text: string }
	| { kind: 'confirmed'; name: string; detail: string; volume: string }
	| { kind: 'row'; name: string; detail: string; volume: string };

/** What the image shows, top to bottom — the same content as the screen */
export function hitlistImageLines(
	groups: readonly HitlistGroup[],
	confirmed: readonly ConfirmedItem[],
	dateLabel: string
): ImageLine[] {
	const count = groups.reduce((n, g) => n + g.items.length, 0) + confirmed.length;
	const lines: ImageLine[] = [
		{ kind: 'title', text: 'Hitlist' },
		{ kind: 'subtitle', text: `${count} series to look for · ${dateLabel}` }
	];
	if (confirmed.length > 0) {
		lines.push({ kind: 'heading', text: `Confirmed new volumes · ${confirmed.length}` });
		for (const c of confirmed) {
			const detail = [
				`out up to vol. ${c.to}`,
				c.missing.length > 0 ? `also missing ${c.missing.join(', ')}` : ''
			]
				.filter(Boolean)
				.join(' · ');
			lines.push({
				kind: 'confirmed',
				name: c.series.shortName,
				detail,
				volume: volumeSpan(c.from, c.to)
			});
		}
	}
	for (const g of groups) {
		lines.push({
			kind: 'heading',
			text: `${g.publisher ?? 'Unknown publisher'} · ${g.items.length}`
		});
		for (const i of g.items) {
			lines.push({
				kind: 'row',
				name: i.series.shortName,
				detail: i.missing.length > 0 ? `missing ${i.missing.join(', ')}` : '',
				volume: String(i.next)
			});
		}
	}
	return lines;
}

/** File name for a saved Hitlist, e.g. hitlist-2026-10-17.png */
export function hitlistFileName(day: string): string {
	return `hitlist-${day}.png`;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

const WIDTH = 1080;
const PAD = 64;
const FONT = '-apple-system, "Segoe UI", Roboto, "Noto Sans Thai", "Leelawadee UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
const INK = '#18181b';
const MUTED = '#71717a';
const LINE = '#e4e4e7';

/** Height each line takes (px) */
function lineHeight(line: ImageLine): number {
	switch (line.kind) {
		case 'title':
			return 84;
		case 'subtitle':
			return 56;
		case 'heading':
			return 88;
		case 'confirmed':
			return 132;
		case 'row':
			return line.detail ? 112 : 92;
	}
}

/** `text` cut with an ellipsis to fit `max` px */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
	if (ctx.measureText(text).width <= max) return text;
	let lo = 0;
	let hi = text.length;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (ctx.measureText(text.slice(0, mid) + '…').width <= max) lo = mid;
		else hi = mid - 1;
	}
	return text.slice(0, lo) + '…';
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/** The lines drawn on a white 1080-px-wide canvas */
export function drawHitlist(lines: readonly ImageLine[]): HTMLCanvasElement {
	const height = PAD * 2 + lines.reduce((h, l) => h + lineHeight(l), 0);
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not available');

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, WIDTH, height);
	ctx.textBaseline = 'alphabetic';

	const inner = WIDTH - PAD * 2;
	let y = PAD;
	for (const line of lines) {
		const h = lineHeight(line);
		if (line.kind === 'title') {
			ctx.fillStyle = INK;
			ctx.font = `700 64px ${FONT}`;
			ctx.fillText(line.text, PAD, y + 62);
		} else if (line.kind === 'subtitle') {
			ctx.fillStyle = MUTED;
			ctx.font = `400 32px ${FONT}`;
			ctx.fillText(line.text, PAD, y + 36);
		} else if (line.kind === 'heading') {
			ctx.fillStyle = MUTED;
			ctx.font = `600 28px ${FONT}`;
			ctx.fillText(line.text.toUpperCase(), PAD, y + 70);
		} else {
			const confirmed = line.kind === 'confirmed';
			const top = y + 8;
			const boxH = h - 16;
			if (confirmed) {
				ctx.fillStyle = INK;
				roundRect(ctx, PAD, top, inner, boxH, 24);
				ctx.fill();
			} else {
				ctx.strokeStyle = LINE;
				ctx.lineWidth = 3;
				roundRect(ctx, PAD + 1.5, top + 1.5, inner - 3, boxH - 3, 24);
				ctx.stroke();
			}
			// Volume, right-aligned: "VOL. 10–11"
			ctx.font = `700 44px ${MONO}`;
			const volW = ctx.measureText(line.volume).width;
			ctx.font = `400 22px ${FONT}`;
			const tagW = ctx.measureText('VOL. ').width;
			const right = PAD + inner - 32;
			const midY = top + boxH / 2;
			ctx.fillStyle = confirmed ? '#ffffff' : INK;
			ctx.font = `700 44px ${MONO}`;
			ctx.fillText(line.volume, right - volW, midY + 15);
			ctx.fillStyle = confirmed ? 'rgba(255,255,255,0.7)' : MUTED;
			ctx.font = `400 22px ${FONT}`;
			ctx.fillText('VOL. ', right - volW - tagW, midY + 12);
			// Name (+ detail line), cut to the space left of the volume
			const textMax = inner - 64 - volW - tagW - 24;
			ctx.fillStyle = confirmed ? '#ffffff' : INK;
			ctx.font = `${confirmed ? 700 : 500} 38px ${FONT}`;
			if (line.detail) {
				ctx.fillText(fit(ctx, line.name, textMax), PAD + 32, midY - 6);
				ctx.fillStyle = confirmed ? 'rgba(255,255,255,0.75)' : MUTED;
				ctx.font = `400 26px ${FONT}`;
				ctx.fillText(fit(ctx, line.detail, textMax), PAD + 32, midY + 32);
			} else {
				ctx.fillText(fit(ctx, line.name, textMax), PAD + 32, midY + 13);
			}
		}
		y += h;
	}
	return canvas;
}

/**
 * Save the canvas as a PNG: the share sheet where the browser offers it
 * (HTTPS — "Save image" to the gallery), else a download (Android →
 * Downloads; iPhone → Files / long-press). Returns how it was saved.
 */
export async function saveHitlistImage(
	canvas: HTMLCanvasElement,
	fileName: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
	const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
	if (!blob) throw new Error("Couldn't create the image");
	const file = new File([blob], fileName, { type: 'image/png' });
	try {
		if (navigator.canShare?.({ files: [file] })) {
			await navigator.share({ files: [file], title: 'Hitlist' });
			return 'shared';
		}
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
		// Share refused (not a user gesture, no permission): fall back to a download
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
	return 'downloaded';
}
