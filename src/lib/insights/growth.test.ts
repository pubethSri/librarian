import { describe, it, expect } from 'vitest';
import { computeGrowth } from './growth';
import { buildBookFacts } from './common';
import { bookRow, input, seriesRow } from './testFixtures';

function facts(books: ReturnType<typeof bookRow>[]) {
	return buildBookFacts(
		input({
			series: [seriesRow({ id: 1, type: 'light_novel' }), seriesRow({ id: 2, type: 'manga' })],
			books
		})
	);
}

describe('computeGrowth', () => {
	it('counts purchases per month by type, gaps filled, up to this month', () => {
		const g = computeGrowth(
			facts([
				bookRow({ seriesId: 1, boughtAt: '2026-07-31T00:00:00Z' }),
				bookRow({ seriesId: 2, boughtAt: '2026-07-01T00:00:00Z' }),
				bookRow({ seriesId: 2, boughtAt: '2026-09-15T00:00:00Z' }),
				bookRow({ seriesId: 1, boughtAt: null })
			]),
			'2026-10-16'
		);
		expect(g.monthly).toEqual([
			{ month: '2026-07', light_novel: 1, manga: 1, total: 2 },
			{ month: '2026-08', light_novel: 0, manga: 0, total: 0 },
			{ month: '2026-09', light_novel: 0, manga: 1, total: 1 },
			{ month: '2026-10', light_novel: 0, manga: 0, total: 0 }
		]);
		expect(g.cumulative).toEqual([2, 2, 3, 3]);
		expect(g.undated).toBe(1);
	});

	it('is empty when no purchase is dated', () => {
		expect(computeGrowth(facts([bookRow()]), '2026-10-16')).toEqual({
			monthly: [],
			cumulative: [],
			undated: 1
		});
	});

	it('keeps a purchase dated after today on the timeline', () => {
		const g = computeGrowth(facts([bookRow({ boughtAt: '2026-11-02T00:00:00Z' })]), '2026-10-16');
		expect(g.monthly.map((m) => m.month)).toEqual(['2026-11']);
		expect(g.cumulative).toEqual([1]);
	});
});
