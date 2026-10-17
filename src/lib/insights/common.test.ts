import { describe, it, expect } from 'vitest';
import {
	addMonths,
	buildBookFacts,
	countReadStates,
	dayInZone,
	daysBetween,
	moneyOf,
	monthRange,
	readStateOf,
	safeTimeZone
} from './common';
import { bookRow, input, readingRow, seriesRow } from './testFixtures';

describe('readStateOf', () => {
	it('is read once read at least once, even during a re-read', () => {
		expect(readStateOf('reading', 1)).toBe('read');
		expect(readStateOf('read', 2)).toBe('read');
	});

	it('is the current status for a book never read', () => {
		expect(readStateOf('unread', 0)).toBe('unread');
		expect(readStateOf('reading', 0)).toBe('reading');
		expect(readStateOf('dropped', 0)).toBe('dropped');
	});
});

describe('dates', () => {
	it('buckets an instant by the day it falls on in the time zone', () => {
		// 17:30 UTC is already the next day in Bangkok (+07:00)
		expect(dayInZone('2026-10-15T17:30:00Z', 'Asia/Bangkok')).toBe('2026-10-16');
		expect(dayInZone('2026-10-15T17:30:00Z', 'UTC')).toBe('2026-10-15');
	});

	it('falls back to UTC for an unknown or missing time zone', () => {
		expect(safeTimeZone('Not/AZone')).toBe('UTC');
		expect(safeTimeZone(null)).toBe('UTC');
		expect(safeTimeZone('Asia/Bangkok')).toBe('Asia/Bangkok');
	});

	it('shifts months across year ends', () => {
		expect(addMonths('2026-12', 1)).toBe('2027-01');
		expect(addMonths('2026-01', -1)).toBe('2025-12');
		expect(addMonths('2026-10', -11)).toBe('2025-11');
	});

	it('lists every month in a range, gaps included', () => {
		expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
		expect(monthRange('2026-03', '2026-02')).toEqual([]);
	});

	it('counts whole days between calendar days', () => {
		expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
		expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
	});
});

describe('moneyOf', () => {
	it('sums priced books only and reports coverage', () => {
		expect(moneyOf([{ price: 100 }, { price: null }, { price: 0 }])).toEqual({
			total: 100,
			priced: 2,
			of: 3
		});
	});

	it('never turns an unpriced book into ฿0 coverage', () => {
		expect(moneyOf([{ price: null }])).toEqual({ total: 0, priced: 0, of: 1 });
	});
});

describe('buildBookFacts', () => {
	it('derives status, times read and read state from the reading rows', () => {
		const a = bookRow({ id: 1 });
		const b = bookRow({ id: 2 });
		const c = bookRow({ id: 3 });
		const facts = buildBookFacts(
			input({
				books: [a, b, c],
				readings: [
					readingRow({ bookId: 1, status: 'read', createdAt: '2026-01-01T00:00:00Z' }),
					// a re-read: newest row is Reading, but the book counts as read
					readingRow({ bookId: 1, status: 'reading', createdAt: '2026-02-01T00:00:00Z' }),
					readingRow({ bookId: 2, status: 'unread' })
				]
			})
		);
		expect(facts.map((f) => [f.status, f.timesRead, f.readState])).toEqual([
			['reading', 1, 'read'],
			['unread', 0, 'unread'],
			['unread', 0, 'unread'] // no rows = Unread
		]);
	});

	it('keeps the purchase calendar day, a null price and a price of 0 apart', () => {
		const facts = buildBookFacts(
			input({
				books: [
					bookRow({ boughtAt: '2025-10-12T00:00:00.000Z', price: '175.00' }),
					bookRow({ price: null }),
					bookRow({ price: '0.00' })
				]
			})
		);
		expect(facts.map((f) => [f.boughtDay, f.price])).toEqual([
			['2025-10-12', 175],
			[null, null],
			[null, 0]
		]);
	});

	it('lists finish days of dated Read rows only, as stored calendar days', () => {
		const book = bookRow({ id: 7 });
		const [fact] = buildBookFacts(
			input({
				books: [book],
				readings: [
					readingRow({ bookId: 7, status: 'read', finishedAt: '2026-03-02T00:00:00.000Z' }),
					readingRow({ bookId: 7, status: 'read', finishedAt: null }),
					readingRow({ bookId: 7, status: 'dropped', finishedAt: '2026-04-01T00:00:00Z' })
				]
			})
		);
		expect(fact.finishedDays).toEqual(['2026-03-02']);
	});

	it('takes the type from the series and counts extras as books', () => {
		const facts = buildBookFacts(
			input({
				series: [seriesRow({ id: 1, type: 'manga' })],
				books: [bookRow({ isExtra: true, volumeNumber: '4.5' }), bookRow({ seriesId: 99 })]
			})
		);
		expect(facts).toHaveLength(1); // series 99 does not exist
		expect(facts[0]).toMatchObject({ type: 'manga', isExtra: true, volumeNumber: 4.5 });
		expect(countReadStates(facts)).toEqual({ read: 0, reading: 0, unread: 1, dropped: 0 });
	});
});
