import { describe, it, expect } from 'vitest';
import { buyRate, clearEstimate, computeBacklog, readRate } from './backlog';
import { buildBookFacts } from './common';
import { bookRow, input, readingRow, seriesRow } from './testFixtures';

const TODAY = '2026-10-16';

describe('readRate', () => {
	it('is unknown with fewer than 5 dated reads', () => {
		expect(readRate(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'], TODAY)).toBeNull();
	});

	it('is unknown when the first dated read is under 30 days old', () => {
		const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
		expect(readRate(days, TODAY)).toBeNull();
	});

	it('averages over the time since the first dated read when that is under a year', () => {
		// 6 reads over the 61 days since Aug 16 ≈ 3 a month
		const days = [
			'2026-08-16',
			'2026-09-01',
			'2026-09-10',
			'2026-10-01',
			'2026-10-05',
			'2026-10-10'
		];
		expect(readRate(days, TODAY)).toBeCloseTo(6 / (61 / (365.25 / 12)), 5);
	});

	it('only counts the last 365 days once dated reads go back further', () => {
		const days = [
			'2024-01-01',
			'2024-02-01',
			'2025-11-01',
			'2026-01-01',
			'2026-05-01',
			'2026-09-01'
		];
		// 4 reads inside the year → 4 per 12 months
		expect(readRate(days, TODAY)).toBeCloseTo(4 / (365 / (365.25 / 12)), 5);
	});
});

describe('buyRate', () => {
	it('counts dated purchases in the last 365 days, per month', () => {
		const facts = buildBookFacts(
			input({
				books: [
					bookRow({ boughtAt: '2026-10-16T00:00:00Z' }),
					bookRow({ boughtAt: '2025-10-17T00:00:00Z' }),
					bookRow({ boughtAt: '2025-10-16T00:00:00Z' }), // exactly a year ago: out
					bookRow({ boughtAt: null })
				]
			})
		);
		expect(buyRate(facts, TODAY)).toBe(2 / 12);
	});
});

describe('clearEstimate', () => {
	it('is unknown without a read rate', () => {
		expect(clearEstimate(100, 2, null)).toEqual({ kind: 'unknown' });
	});

	it('never clears while buying keeps pace with reading', () => {
		expect(clearEstimate(100, 4, 4)).toEqual({ kind: 'never' });
	});

	it('divides the pile by the net reading pace', () => {
		expect(clearEstimate(100, 2, 6)).toEqual({ kind: 'months', months: 25 });
	});
});

describe('computeBacklog', () => {
	const series = [
		seriesRow({ id: 1, shortName: 'Mushoku', type: 'light_novel' }),
		seriesRow({ id: 2, shortName: 'Frieren', type: 'manga' }),
		seriesRow({ id: 3, shortName: 'Spy', type: 'manga', status: 'dropped' })
	];

	function backlog() {
		const data = input({
			series,
			books: [
				bookRow({ id: 1, seriesId: 1, volumeNumber: '1.0', boughtAt: '2021-03-01T00:00:00Z' }),
				bookRow({ id: 2, seriesId: 1, volumeNumber: '2.0', boughtAt: '2020-12-05T00:00:00Z' }),
				bookRow({ id: 3, seriesId: 2, volumeNumber: '1.0', boughtAt: '2026-09-20T00:00:00Z' }),
				bookRow({ id: 4, seriesId: 2, volumeNumber: '2.0' }),
				bookRow({ id: 5, seriesId: 3, volumeNumber: '1.0', boughtAt: '2026-10-01T00:00:00Z' }),
				bookRow({ id: 6, seriesId: 3, volumeNumber: '2.0', boughtAt: '2026-10-01T00:00:00Z' }),
				bookRow({ id: 7, seriesId: 3, volumeNumber: '3.0', boughtAt: '2026-10-01T00:00:00Z' })
			],
			readings: [readingRow({ bookId: 1, status: 'read', finishedAt: '2026-10-02T03:00:00Z' })]
		});
		return computeBacklog(buildBookFacts(data), series, TODAY);
	}

	it('measures the pile by type and lists the oldest unread first', () => {
		const b = backlog();
		expect(b.pile).toBe(6);
		expect(b.pileByType).toEqual({ light_novel: 1, manga: 5 });
		expect(b.undatedPile).toBe(1);
		expect(b.oldestUnread.map((x) => [x.seriesShortName, x.volumeNumber, x.boughtDay])).toEqual([
			['Mushoku', 2, '2020-12-05'],
			['Frieren', 1, '2026-09-20'],
			['Spy', 1, '2026-10-01'],
			['Spy', 2, '2026-10-01'],
			['Spy', 3, '2026-10-01']
		]);
	});

	it('reports an unknown read rate and clear time with too few dated reads', () => {
		const b = backlog();
		expect(b.datedReads).toBe(1);
		expect(b.readRate).toBeNull();
		expect(b.clear).toEqual({ kind: 'unknown' });
		expect(b.clearWithoutBuying).toBeNull();
		expect(b.buyRate).toBe(4 / 12);
	});

	it('charts the last 12 months, gaps included', () => {
		const b = backlog();
		expect(b.monthly).toHaveLength(12);
		expect(b.monthly[0].month).toBe('2025-11');
		expect(b.monthly.at(-1)).toEqual({ month: '2026-10', bought: 3, read: 1 });
		expect(b.monthly.find((m) => m.month === '2026-09')).toEqual({
			month: '2026-09',
			bought: 1,
			read: 0
		});
	});

	it('lists series with nothing started, most owned first', () => {
		expect(backlog().neverStarted).toEqual([
			{ seriesId: 3, shortName: 'Spy', type: 'manga', status: 'dropped', owned: 3 },
			{ seriesId: 2, shortName: 'Frieren', type: 'manga', status: 'ongoing', owned: 2 }
		]);
	});
});
