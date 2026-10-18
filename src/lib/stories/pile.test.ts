import { describe, expect, it } from 'vitest';
import type { SeriesType } from '$lib/types';
import {
	booksLabel,
	compareHeight,
	fairAdd,
	formatHeight,
	inPile,
	pileFileName,
	pileOf,
	storyFair,
	type PileBook
} from './pile';

let nextId = 1;
function book(over: Partial<PileBook> = {}): PileBook {
	return {
		id: nextId++,
		seriesId: 1,
		volumeNumber: '1',
		readingStatus: 'unread',
		timesRead: 0,
		sourceEventId: null,
		...over
	};
}

const types = new Map<number, SeriesType>([
	[1, 'light_novel'],
	[2, 'manga']
]);

describe('inPile', () => {
	it('is unread books that were never read', () => {
		expect(inPile({ readingStatus: 'unread', timesRead: 0 })).toBe(true);
		expect(inPile({ readingStatus: 'reading', timesRead: 0 })).toBe(false);
		expect(inPile({ readingStatus: 'dropped', timesRead: 0 })).toBe(false);
		expect(inPile({ readingStatus: 'read', timesRead: 1 })).toBe(false);
		// A re-read in progress or planned is not the unread pile
		expect(inPile({ readingStatus: 'unread', timesRead: 1 })).toBe(false);
	});
});

describe('pileOf', () => {
	it('adds LN and manga spines', () => {
		const books = [
			...Array.from({ length: 92 }, (_, i) => book({ volumeNumber: String(i + 1) })),
			...Array.from({ length: 7 }, (_, i) => book({ seriesId: 2, volumeNumber: String(i + 1) })),
			book({ readingStatus: 'read', timesRead: 1 })
		];
		const pile = pileOf(books, types);
		expect(pile.books).toBe(99);
		expect(pile.cm).toBe(174);
		expect(pile.byType).toEqual({ light_novel: 92, manga: 7 });
		expect(pile.spines).toHaveLength(99);
	});

	it('counts an unknown series as a light novel', () => {
		expect(pileOf([book({ seriesId: 99 })], types).cm).toBe(1.8);
	});

	it('groups by series and volume, with the fair on top', () => {
		const a2 = book({ seriesId: 2, volumeNumber: '2' });
		const a1 = book({ seriesId: 2, volumeNumber: '1' });
		const fair = book({ seriesId: 1, volumeNumber: '5', sourceEventId: 7 });
		const b1 = book({ seriesId: 1, volumeNumber: '1' });
		const pile = pileOf([a2, fair, a1, b1], types, 7);
		expect(pile.spines.map((s) => s.bookId)).toEqual([b1.id, a1.id, a2.id, fair.id]);
		expect(pile.spines.map((s) => s.fair)).toEqual([false, false, false, true]);
	});

	it('is empty when everything is read', () => {
		const pile = pileOf([book({ readingStatus: 'read', timesRead: 2 })], types);
		expect(pile).toMatchObject({ books: 0, cm: 0, spines: [] });
	});
});

describe('fairAdd', () => {
	it('counts every book bought there; before = the pile without its unread ones', () => {
		const books = [
			book(),
			book(),
			book({ sourceEventId: 5 }),
			book({ sourceEventId: 5, seriesId: 2 }),
			book({ sourceEventId: 5, readingStatus: 'read', timesRead: 1 }),
			book({ sourceEventId: 6 })
		];
		expect(fairAdd(books, types, 5)).toEqual({
			books: 3,
			cm: 4.8,
			unread: 2,
			unreadCm: 3,
			beforeCm: 5.4
		});
	});

	it('is zero for a fair without books', () => {
		expect(fairAdd([book()], types, 5)).toMatchObject({ books: 0, cm: 0, beforeCm: 1.8 });
	});
});

describe('formatHeight', () => {
	it('uses cm under a metre, else metres', () => {
		expect(formatHeight(0)).toBe('0 cm');
		expect(formatHeight(71.4)).toBe('71 cm');
		expect(formatHeight(99.6)).toBe('100 cm');
		expect(formatHeight(100)).toBe('1.00 m');
		expect(formatHeight(174)).toBe('1.74 m');
		expect(formatHeight(1234.5)).toBe('12.35 m');
	});
});

describe('compareHeight', () => {
	it('picks a nearby thing, else the tallest thing below', () => {
		expect(compareHeight(0)).toBe('nothing left to read');
		expect(compareHeight(10)).toBe('shorter than a cat');
		expect(compareHeight(174)).toBe('about as tall as a person');
		expect(compareHeight(245)).toBe('taller than a door');
		expect(compareHeight(199)).toBe('about as tall as a door');
		expect(compareHeight(2000)).toBe('taller than a two-storey house');
	});
});

describe('labels', () => {
	it('booksLabel', () => {
		expect(booksLabel(1)).toBe('1 book');
		expect(booksLabel(40)).toBe('40 books');
	});

	it('pileFileName', () => {
		expect(pileFileName('2026-10-18')).toBe('pile-2026-10-18.png');
		expect(pileFileName('2026-10-26', 12)).toBe('pile-fair-12-2026-10-26.png');
	});
});

describe('storyFair', () => {
	const fairs = [
		{ id: 1, date: '2025-10-12', bookCount: 43 },
		{ id: 2, date: '2026-03-28', bookCount: 38 },
		{ id: 3, date: '2026-10-23', bookCount: 0 }
	];

	it('takes the picked fair once it has books', () => {
		expect(storyFair(fairs, 1)?.id).toBe(1);
	});

	it('falls back to the latest fair with books', () => {
		expect(storyFair(fairs, null)?.id).toBe(2);
		expect(storyFair(fairs, 3)?.id).toBe(2);
		expect(storyFair(fairs, 42)?.id).toBe(2);
	});

	it('is null without a fair that has books', () => {
		expect(storyFair([{ id: 3, date: '2026-10-23', bookCount: 0 }], null)).toBeNull();
	});
});
