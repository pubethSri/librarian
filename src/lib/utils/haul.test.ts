import { describe, it, expect } from 'vitest';
import { groupHaulBySeries, volumeChips } from './haul';
import type { BookListItem } from '$lib/types';

function book(overrides: Partial<BookListItem> = {}): BookListItem {
	return {
		id: 1,
		seriesId: 10,
		seriesShortName: 'Mushoku',
		seriesFullName: 'Mushoku Tensei',
		volumeNumber: '1',
		isExtra: false,
		location: 'apartment',
		boughtAt: null,
		price: null,
		source: 'bookfair',
		sourceEventId: 5,
		isDraft: false,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
		seriesTags: [],
		readingStatus: 'unread',
		timesRead: 0,
		...overrides
	};
}

const vol = (volumeNumber: number, isExtra = false) => ({ volumeNumber, isExtra });

describe('volumeChips', () => {
	it('lists each volume once, in sort order, extras in place', () => {
		expect(volumeChips([vol(3), vol(1), vol(2.5, true), vol(2)])).toEqual([
			{ volume: 1, isExtra: false, copies: 1 },
			{ volume: 2, isExtra: false, copies: 1 },
			{ volume: 2.5, isExtra: true, copies: 1 },
			{ volume: 3, isExtra: false, copies: 1 }
		]);
		expect(volumeChips([])).toEqual([]);
	});

	it('counts duplicate copies of a volume', () => {
		expect(volumeChips([vol(2), vol(1), vol(2)])).toEqual([
			{ volume: 1, isExtra: false, copies: 1 },
			{ volume: 2, isExtra: false, copies: 2 }
		]);
	});
});

describe('groupHaulBySeries', () => {
	const books = [
		book({ id: 1, seriesId: 20, seriesShortName: 'Zebra', volumeNumber: '2', price: '200' }),
		book({ id: 2, seriesId: 10, volumeNumber: '3', price: '175' }),
		book({ id: 3, seriesId: 10, volumeNumber: '1', price: '175', location: 'home' }),
		book({ id: 4, seriesId: 10, volumeNumber: '2', price: null })
	];
	const groups = groupHaulBySeries(books);

	it('makes one group per series, sorted by name, books by volume', () => {
		expect(groups.map((g) => g.seriesShortName)).toEqual(['Mushoku', 'Zebra']);
		expect(groups[0].books.map((b) => b.id)).toEqual([3, 4, 2]);
		expect(groups[0].volumes.map((c) => c.volume)).toEqual([1, 2, 3]);
	});

	it('sums only priced books and reports how many were priced', () => {
		expect(groups[0].spent).toBe(350);
		expect(groups[0].pricedCount).toBe(2);
		expect(groups[1].spent).toBe(200);
	});

	it('counts books per location', () => {
		expect(groups[0].locations).toEqual({ home: 1, apartment: 2 });
	});
});
