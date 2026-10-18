import { describe, expect, it } from 'vitest';
import type { Pile, Spine } from './pile';
import { fairStory, pileStory, pxPerCm, stackLayout } from './pileImage';

const spine = (bookId: number, seriesId: number, fair = false, cm = 1.8): Spine => ({
	bookId,
	seriesId,
	cm,
	fair
});

const pile = (spines: Spine[]): Pile => ({
	books: spines.length,
	cm: Math.round(spines.reduce((s, x) => s + x.cm, 0) * 10) / 10,
	byType: { light_novel: spines.length, manga: 0 },
	spines
});

describe('pileStory', () => {
	it('says how tall the pile is and what it compares with', () => {
		const p = pile(Array.from({ length: 95 }, (_, i) => spine(i, 1)));
		expect(pileStory(p, 'Oct 18, 2026')).toMatchObject({
			kicker: 'MY UNREAD PILE',
			big: '1.71 m',
			gold: false,
			line: "95 books I own and haven't read",
			sub: 'About as tall as a person',
			dateLabel: 'Oct 18, 2026'
		});
	});

	it('never shows fair spines in gold', () => {
		const story = pileStory(pile([spine(1, 1, true)]), 'x');
		expect(story.spines[0].fair).toBe(false);
	});

	it('has a line for an empty pile', () => {
		expect(pileStory(pile([]), 'x')).toMatchObject({
			big: '0 cm',
			line: 'Every book I own is read',
			sub: 'Nothing left to read'
		});
	});
});

describe('fairStory', () => {
	const p = pile(Array.from({ length: 136 }, (_, i) => spine(i, 1, i >= 100)));

	it('shows what the fair added and the pile now', () => {
		const story = fairStory(
			p,
			{ books: 40, cm: 72, unread: 36, unreadCm: 64.8, beforeCm: 180 },
			'มหกรรมหนังสือระดับชาติ 31',
			'Oct 26, 2026'
		);
		expect(story).toMatchObject({
			kicker: 'มหกรรมหนังสือระดับชาติ 31',
			big: '+72 cm',
			gold: true,
			line: '40 new books · 4 already read',
			sub: 'The pile is now 2.45 m — taller than a door'
		});
		expect(story.spines.filter((s) => s.fair)).toHaveLength(36);
	});

	it('leaves out "already read" when nothing is', () => {
		const story = fairStory(
			p,
			{ books: 1, cm: 1.8, unread: 1, unreadCm: 1.8, beforeCm: 1 },
			'Fair',
			'x'
		);
		expect(story.line).toBe('1 new book');
	});
});

describe('layout', () => {
	it('fits the taller of the pile and the 2 m door', () => {
		expect(pxPerCm(100)).toBeCloseTo(920 / 200);
		expect(pxPerCm(460)).toBeCloseTo(920 / 460);
		expect(pxPerCm(0)).toBeCloseTo(920 / 200);
	});

	it('stacks spines upward from the floor, one colour per series run', () => {
		const rects = stackLayout([spine(1, 1), spine(2, 1), spine(3, 2), spine(4, 2, true)], 5);
		// Each rect sits on the one below it
		expect(rects[0].y + rects[0].h).toBeCloseTo(1700);
		for (let i = 1; i < rects.length; i++) {
			expect(rects[i].y + rects[i].h).toBeCloseTo(rects[i - 1].y);
		}
		expect(rects[0].color).toBe(rects[1].color);
		expect(rects[2].color).not.toBe(rects[1].color);
		expect(rects[3].color).toMatch(/^#(a3852a|c9a94a|8a6d1a)$/);
	});

	it('varies the thickness but keeps the true height', () => {
		const spines = Array.from({ length: 40 }, (_, i) => spine(i + 1, 1 + (i % 6)));
		const rects = stackLayout(spines, 5);
		const total = rects.reduce((s, r) => s + r.h, 0);
		expect(total).toBeCloseTo(40 * 1.8 * 5);
		const heights = new Set(rects.map((r) => r.h.toFixed(2)));
		expect(heights.size).toBeGreaterThan(20);
		expect(Math.min(...rects.map((r) => r.h))).toBeGreaterThan(9 * 0.6);
		expect(Math.max(...rects.map((r) => r.h))).toBeLessThan(9 * 1.5);
	});

	it('is the same stack every time it is drawn', () => {
		const s = [spine(10, 1), spine(11, 1)];
		expect(stackLayout(s, 4)).toEqual(stackLayout(s, 4));
	});
});
