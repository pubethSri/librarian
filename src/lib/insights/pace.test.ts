import { describe, it, expect } from 'vitest';
import { computeFunnel, computePace, median } from './pace';
import { buildBookFacts } from './common';
import { bookRow, input, readingRow } from './testFixtures';

describe('median', () => {
	it('takes the middle value, or the mean of the middle two', () => {
		expect(median([5, 1, 3])).toBe(3);
		expect(median([4, 1, 3, 2])).toBe(2.5);
		expect(median([])).toBeNull();
	});
});

describe('computePace', () => {
	function pace(reads: { bought: string | null; finished: string }[]) {
		const books = reads.map((r, i) =>
			bookRow({ id: i + 1, boughtAt: r.bought ? `${r.bought}T00:00:00Z` : null })
		);
		const readings = reads.map((r, i) =>
			readingRow({ bookId: i + 1, status: 'read', finishedAt: `${r.finished}T12:00:00Z` })
		);
		return computePace(buildBookFacts(input({ books, readings }), 'UTC'));
	}

	it('measures purchase → finish in days, banded', () => {
		const p = pace([
			{ bought: '2026-01-01', finished: '2026-01-10' }, // 9 days
			{ bought: '2026-01-01', finished: '2026-03-01' }, // 59
			{ bought: '2025-01-01', finished: '2026-01-01' }, // 365
			{ bought: '2023-01-01', finished: '2026-01-01' }, // 1096
			{ bought: '2026-01-01', finished: '2026-01-31' } // 30
		]);
		expect(p.samples).toBe(5);
		expect(p.medianDays).toBe(59);
		expect(p.buckets.map((b) => b.count)).toEqual([2, 1, 0, 1, 0, 1]);
	});

	it('skips undated purchases and finishes before the purchase', () => {
		const p = pace([
			{ bought: null, finished: '2026-01-10' },
			{ bought: '2026-05-01', finished: '2026-01-10' }
		]);
		expect(p.samples).toBe(0);
		expect(p.medianDays).toBeNull();
	});

	it('withholds the median below 5 samples', () => {
		const p = pace([{ bought: '2026-01-01', finished: '2026-01-10' }]);
		expect(p.samples).toBe(1);
		expect(p.medianDays).toBeNull();
	});
});

describe('computeFunnel', () => {
	it('lists every fair oldest first with its haul by read state and spend', () => {
		const data = input({
			bookfairs: [
				{ id: 2, name: 'Book Expo 2025', date: '2025-10-10' },
				{ id: 1, name: 'Book Expo 2024', date: '2024-10-11' },
				{ id: 3, name: 'Empty Fair', date: '2026-03-01' }
			],
			books: [
				bookRow({ id: 1, sourceEventId: 1, price: '200' }),
				bookRow({ id: 2, sourceEventId: 1, price: null }),
				bookRow({ id: 3, sourceEventId: 2, price: '95' }),
				bookRow({ id: 4, sourceEventId: null, price: '500' })
			],
			readings: [readingRow({ bookId: 1, status: 'read' })]
		});
		const funnel = computeFunnel(buildBookFacts(data, 'UTC'), data.bookfairs);
		expect(funnel.map((f) => [f.name, f.bought, f.counts.read, f.counts.unread, f.spent])).toEqual([
			['Book Expo 2024', 2, 1, 1, { total: 200, priced: 1, of: 2 }],
			['Book Expo 2025', 1, 0, 1, { total: 95, priced: 1, of: 1 }],
			['Empty Fair', 0, 0, 0, { total: 0, priced: 0, of: 0 }]
		]);
	});
});
