import { describe, it, expect } from 'vitest';
import { formatVolumeRanges, groupHaulBySeries } from './haul';
import type { BookListItem } from '$lib/types';

function book(overrides: Partial<BookListItem> = {}): BookListItem {
	return {
		id: 1,
		seriesId: 10,
		seriesShortName: 'Mushoku',
		seriesFullName: 'Mushoku Tensei',
		volumeNumber: '1',
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

describe('formatVolumeRanges', () => {
	it('collapses consecutive whole volumes into ranges', () => {
		expect(formatVolumeRanges([3, 1, 2, 5])).toBe('1–3, 5');
		expect(formatVolumeRanges([7])).toBe('7');
		expect(formatVolumeRanges([])).toBe('');
	});

	it('keeps half volumes standalone and breaks ranges around them', () => {
		expect(formatVolumeRanges([4, 4.5, 5, 6])).toBe('4, 4.5, 5–6');
	});

	it('lists a duplicated volume once', () => {
		expect(formatVolumeRanges([1, 1, 2])).toBe('1–2');
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
		expect(groups[0].volumes).toBe('1–3');
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
