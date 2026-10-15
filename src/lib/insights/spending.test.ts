import { describe, it, expect } from 'vitest';
import { computeSpending } from './spending';
import { buildBookFacts } from './common';
import { bookRow, input, readingRow, seriesRow } from './testFixtures';

const TODAY = '2026-10-16';

function spending() {
	const data = input({
		series: [seriesRow({ id: 1, type: 'light_novel' }), seriesRow({ id: 2, type: 'manga' })],
		books: [
			bookRow({
				id: 1,
				seriesId: 1,
				price: '300',
				source: 'bookfair',
				boughtAt: '2026-08-02T00:00:00Z'
			}),
			bookRow({
				id: 2,
				seriesId: 1,
				price: '250',
				source: 'bookfair',
				boughtAt: '2026-08-02T00:00:00Z'
			}),
			bookRow({
				id: 3,
				seriesId: 2,
				price: '95',
				source: 'online',
				boughtAt: '2026-10-01T00:00:00Z'
			}),
			bookRow({
				id: 4,
				seriesId: 2,
				price: null,
				source: 'online',
				boughtAt: '2026-10-01T00:00:00Z'
			}),
			bookRow({ id: 5, seriesId: 2, price: '0', source: null, boughtAt: null })
		],
		readings: [readingRow({ bookId: 1, status: 'read' }), readingRow({ bookId: 3, status: 'read' })]
	});
	return computeSpending(buildBookFacts(data, 'UTC'), TODAY);
}

describe('computeSpending', () => {
	it('totals priced books with coverage — an unpriced book is not ฿0', () => {
		expect(spending().total).toEqual({ total: 645, priced: 4, of: 5 });
	});

	it('spends by purchase month, gaps filled up to this month', () => {
		const s = spending();
		expect(s.monthly).toEqual([
			{ month: '2026-08', spent: { total: 550, priced: 2, of: 2 } },
			{ month: '2026-09', spent: { total: 0, priced: 0, of: 0 } },
			{ month: '2026-10', spent: { total: 95, priced: 1, of: 2 } }
		]);
		expect(s.undatedPriced).toBe(1);
	});

	it('splits by source (no source = unknown), biggest first', () => {
		expect(spending().bySource).toEqual([
			{ source: 'bookfair', spent: { total: 550, priced: 2, of: 2 } },
			{ source: 'online', spent: { total: 95, priced: 1, of: 2 } },
			{ source: 'unknown', spent: { total: 0, priced: 1, of: 1 } }
		]);
	});

	it('prices the unread pile and the cost per book read', () => {
		const s = spending();
		expect(s.unread).toEqual({ total: 250, priced: 2, of: 3 });
		expect(s.readBooks).toBe(2);
		expect(s.costPerRead).toBe(645 / 2);
		expect(s.averageByType.light_novel).toEqual({ total: 550, priced: 2, of: 2 });
	});

	it('has no cost per read when nothing is read', () => {
		const s = computeSpending(
			buildBookFacts(input({ books: [bookRow({ price: '100' })] }), 'UTC'),
			TODAY
		);
		expect(s.costPerRead).toBeNull();
		expect(s.monthly).toEqual([]);
	});
});
