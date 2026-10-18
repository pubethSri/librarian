// ─── Pile-height stories: the images ─────────────────────────────────────────
// 1080×1920 Instagram-story PNGs: ① the unread pile now, ② what a bookfair
// added (its books in gold on top). Style A from the 2026-10-18 mock-ups:
// Stone + faint diamond tiles, the pile drawn as spines to scale beside a 2 m
// door. `pileStory` / `fairStory` / `stackLayout` are pure and tested; `drawStory`
// touches the DOM.

import {
	booksLabel,
	compareHeight,
	formatHeight,
	type FairAdd,
	type Pile,
	type Spine
} from './pile';

export type PileStory = {
	kicker: string;
	/** The big number, "1.74 m" / "+71 cm" */
	big: string;
	/** The big number and kicker in gold (the fair story) */
	gold: boolean;
	line: string;
	sub: string;
	spines: Spine[];
	dateLabel: string;
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Story ①: how tall the unread pile is */
export function pileStory(pile: Pile, dateLabel: string): PileStory {
	return {
		kicker: 'MY UNREAD PILE',
		big: formatHeight(pile.cm),
		gold: false,
		line:
			pile.books === 0
				? 'Every book I own is read'
				: `${booksLabel(pile.books)} I own and haven't read`,
		sub: capital(compareHeight(pile.cm)),
		spines: pile.spines.map((s) => ({ ...s, fair: false })),
		dateLabel
	};
}

/** Story ②: what a fair added — `pile` drawn with that fair's books on top */
export function fairStory(
	pile: Pile,
	add: FairAdd,
	fairName: string,
	dateLabel: string
): PileStory {
	const read = add.books - add.unread;
	return {
		kicker: fairName,
		big: `+${formatHeight(add.cm)}`,
		gold: true,
		line: `${add.books} new book${add.books === 1 ? '' : 's'}${read > 0 ? ` · ${read} already read` : ''}`,
		sub: `The pile is now ${formatHeight(pile.cm)} — ${compareHeight(pile.cm)}`,
		spines: pile.spines,
		dateLabel
	};
}

// ─── Layout (pure) ───────────────────────────────────────────────────────────

export const WIDTH = 1080;
export const HEIGHT = 1920;
/** The floor line, and the highest the stack or door may reach */
const GROUND = 1700;
const STACK_TOP = 780;
const DOOR_CM = 200;
/** A small pile isn't blown up past this */
const MAX_PX_PER_CM = 8;

const STACK_X = 150;
const STACK_W = 380;
export const DOOR = { x: 660, w: 250 };

export type SpineRect = { x: number; y: number; w: number; h: number; color: string };

const GREYS = ['#3f3f46', '#71717a', '#27272a', '#a1a1aa', '#52525b', '#d4d4d8', '#18181b'];
const GOLDS = ['#a3852a', '#c9a94a', '#8a6d1a'];

/** Small deterministic wobble from a book id, in [-1, 1] */
function wobble(id: number, salt: number): number {
	const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
	return (x - Math.floor(x)) * 2 - 1;
}

/** Pixels per cm so the taller of the pile and the door fits */
export function pxPerCm(pileCm: number): number {
	return Math.min(MAX_PX_PER_CM, (GROUND - STACK_TOP) / Math.max(pileCm, DOOR_CM));
}

/** Thickness spread: each series a little thicker or thinner (±20 %), each book ±15 % */
const SERIES_SPREAD = 0.2;
const BOOK_SPREAD = 0.15;

/**
 * Spines bottom to top as rectangles: one colour per run of a series (greys,
 * the fair's in gold). Books vary in thickness and width — a series a bit
 * thicker or wider than the next, each copy nudged — so it reads as a real
 * stack; the thicknesses are rescaled so the stack keeps its true height.
 */
export function stackLayout(spines: readonly Spine[], scale: number): SpineRect[] {
	const raw = spines.map(
		(s) =>
			s.cm * (1 + wobble(s.seriesId, 4) * SERIES_SPREAD) * (1 + wobble(s.bookId, 3) * BOOK_SPREAD)
	);
	const rawTotal = raw.reduce((a, b) => a + b, 0);
	const trueTotal = spines.reduce((a, s) => a + s.cm, 0);
	const fit = rawTotal > 0 ? (trueTotal / rawTotal) * scale : scale;

	const rects: SpineRect[] = [];
	let y = GROUND;
	let run = -1;
	let prev: { seriesId: number; fair: boolean } | null = null;
	spines.forEach((s, i) => {
		if (!prev || prev.seriesId !== s.seriesId || prev.fair !== s.fair) run++;
		prev = s;
		const h = raw[i] * fit;
		const w = STACK_W * (1 + wobble(s.seriesId, 5) * 0.07) + wobble(s.bookId, 1) * 14;
		const x = STACK_X + (STACK_W - w) / 2 + wobble(s.bookId, 2) * 10;
		y -= h;
		const palette = s.fair ? GOLDS : GREYS;
		rects.push({ x, y, w, h, color: palette[run % palette.length] });
	});
	return rects;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

const FONT =
	'"Google Sans Variable", -apple-system, "Segoe UI", Roboto, "Noto Sans Thai", "Leelawadee UI", sans-serif';
const STONE = '#f7f7f5';
const INK = '#18181b';
const MUTED = '#71717a';
const GOLD = '#8a6d1a';
const GOLD_INK = '#77601e';
const PAD = 96;

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

/** Up to two lines, broken at spaces; the rest cut with an ellipsis */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
	const words = text.split(' ');
	let first = '';
	let i = 0;
	for (; i < words.length; i++) {
		const next = first ? `${first} ${words[i]}` : words[i];
		if (first && ctx.measureText(next).width > max) break;
		first = next;
	}
	const rest = words.slice(i).join(' ');
	return rest ? [fit(ctx, first, max), fit(ctx, rest, max)] : [fit(ctx, first, max)];
}

/** The faint diamond tiles of the app's page ground, scaled up for 1080 px */
function tiles(ctx: CanvasRenderingContext2D) {
	const tw = 65;
	const th = 140;
	ctx.save();
	ctx.strokeStyle = 'rgba(24, 24, 27, 0.035)';
	ctx.lineWidth = 2.5;
	for (let row = -1; row * th < HEIGHT + th; row++) {
		for (let col = -1; col * tw < WIDTH + tw; col++) {
			const cx = col * tw + (row % 2 === 0 ? tw / 2 : 0);
			const cy = row * (th / 2) + th / 2;
			ctx.beginPath();
			ctx.moveTo(cx, cy - th / 2 + 7);
			ctx.lineTo(cx + tw / 2 - 7, cy);
			ctx.lineTo(cx, cy + th / 2 - 7);
			ctx.lineTo(cx - tw / 2 + 7, cy);
			ctx.closePath();
			ctx.stroke();
		}
	}
	ctx.restore();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: string) {
	// letterSpacing is newer than the rest of the canvas API (Chrome 99, Safari 17)
	if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = px;
}

/** One story on a 1080×1920 canvas */
export function drawStory(story: PileStory, pileCm: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not available');

	ctx.fillStyle = STONE;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	tiles(ctx);
	ctx.textBaseline = 'alphabetic';
	const inner = WIDTH - PAD * 2;

	// Text block — below Instagram's top bar
	setSpacing(ctx, '3px');
	ctx.fillStyle = story.gold ? GOLD_INK : MUTED;
	ctx.font = `600 36px ${FONT}`;
	ctx.fillText(fit(ctx, story.kicker, inner), PAD, 290);
	setSpacing(ctx, '0px');

	ctx.fillStyle = story.gold ? GOLD : INK;
	ctx.font = `600 190px ${FONT}`;
	ctx.fillText(fit(ctx, story.big, inner), PAD, 480);

	ctx.fillStyle = INK;
	ctx.font = `400 46px ${FONT}`;
	let y = 570;
	for (const l of wrap(ctx, story.line, inner)) {
		ctx.fillText(l, PAD, y);
		y += 60;
	}
	ctx.fillStyle = MUTED;
	for (const l of wrap(ctx, story.sub, inner)) {
		ctx.fillText(l, PAD, y);
		y += 60;
	}

	// The stack, to scale; thin Stone gaps between books while they're tall enough
	const scale = pxPerCm(pileCm);
	for (const r of stackLayout(story.spines, scale)) {
		ctx.fillStyle = r.color;
		ctx.fillRect(r.x, r.y, r.w, r.h);
		if (r.h >= 4) {
			ctx.fillStyle = STONE;
			ctx.fillRect(r.x, r.y, r.w, 1.5);
		}
	}

	// The door, 2 m
	const doorH = DOOR_CM * scale;
	const doorTop = GROUND - doorH;
	ctx.strokeStyle = '#a1a1aa';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(DOOR.x, GROUND);
	ctx.lineTo(DOOR.x, doorTop);
	ctx.lineTo(DOOR.x + DOOR.w, doorTop);
	ctx.lineTo(DOOR.x + DOOR.w, GROUND);
	ctx.stroke();
	ctx.fillStyle = '#a1a1aa';
	ctx.beginPath();
	ctx.arc(DOOR.x + DOOR.w - 30, GROUND - doorH * 0.48, 9, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = MUTED;
	ctx.font = `400 30px ${FONT}`;
	ctx.fillText('door · 2 m', DOOR.x, doorTop - 20);

	// Floor
	ctx.fillStyle = INK;
	ctx.fillRect(PAD / 2, GROUND, WIDTH - PAD, 4);

	// Footer
	ctx.fillStyle = MUTED;
	ctx.font = `500 32px ${FONT}`;
	ctx.fillText('Librarian', PAD, 1790);
	ctx.font = `400 32px ${FONT}`;
	const dw = ctx.measureText(story.dateLabel).width;
	ctx.fillText(story.dateLabel, WIDTH - PAD - dw, 1790);

	return canvas;
}
