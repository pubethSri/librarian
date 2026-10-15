import { describe, it, expect } from 'vitest';
import { computeInsights } from './index';
import { bookRow, input, readingRow, seriesRow } from './testFixtures';

const NOW = new Date('2026-10-16T05:00:00Z');

describe('computeInsights — overview', () => {
	it('counts books, owned series, extras and read states by type', () => {
		const result = computeInsights(
			input({
				series: [
					seriesRow({ id: 1, type: 'light_novel' }),
					seriesRow({ id: 2, type: 'manga' }),
					seriesRow({ id: 3, type: 'manga' }) // owns no books
				],
				books: [
					bookRow({ id: 1, seriesId: 1, price: '200' }),
					bookRow({ id: 2, seriesId: 1, isExtra: true, boughtAt: '2026-01-05T00:00:00Z' }),
					bookRow({ id: 3, seriesId: 2, price: '90', boughtAt: '2026-02-01T00:00:00Z' })
				],
				readings: [
					readingRow({ bookId: 1, status: 'read', finishedAt: '2026-10-16T01:00:00Z' }),
					readingRow({ bookId: 3, status: 'reading' })
				]
			}),
			NOW,
			'Asia/Bangkok'
		);

		expect(result.timeZone).toBe('Asia/Bangkok');
		expect(result.overview).toEqual({
			books: 3,
			series: 2,
			extras: 1,
			readState: { read: 1, reading: 1, unread: 1, dropped: 0 },
			byType: [
				{ type: 'light_novel', counts: { read: 1, reading: 0, unread: 1, dropped: 0 } },
				{ type: 'manga', counts: { read: 0, reading: 1, unread: 0, dropped: 0 } }
			],
			spent: { total: 290, priced: 2, of: 3 },
			undatedPurchases: 1,
			datedReads: 1
		});
	});

	it('handles an empty collection', () => {
		const result = computeInsights(input({ series: [] }), NOW, undefined);
		expect(result.timeZone).toBe('UTC');
		expect(result.overview.books).toBe(0);
		expect(result.overview.spent).toEqual({ total: 0, priced: 0, of: 0 });
	});
});
