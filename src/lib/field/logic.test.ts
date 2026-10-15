import { describe, it, expect } from 'vitest';
import {
	groupBySeries,
	initials,
	matchScore,
	normalize,
	ownedVolumes,
	searchSeries,
	type OwnedBookLike
} from './logic';

const series = (id: number, shortName: string, fullName = shortName, bookCount = 1) => ({
	id,
	shortName,
	fullName,
	bookCount
});

describe('normalize / initials', () => {
	it('lower-cases and turns punctuation into spaces', () => {
		expect(normalize('  Re:Zero — Starting Life! ')).toBe('re zero starting life');
	});

	it('keeps Thai text (combining marks included)', () => {
		expect(normalize('เกิดใหม่เป็นดาบ')).toBe('เกิดใหม่เป็นดาบ');
	});

	it('takes the first letter of each word', () => {
		expect(initials('Mushoku Tensei: Jobless Reincarnation')).toBe('mtjr');
	});
});

describe('matchScore', () => {
	const mushoku = series(1, 'Mushoku', 'Mushoku Tensei: Jobless Reincarnation');

	it('ranks a name prefix best', () => {
		expect(matchScore(mushoku, 'mus')).toBe(0);
	});

	it('then a word that starts with the query', () => {
		expect(matchScore(mushoku, 'ten')).toBe(1);
		expect(matchScore(mushoku, 'JOB')).toBe(1);
	});

	it('then initials', () => {
		expect(matchScore(mushoku, 'mt')).toBe(2);
		expect(matchScore(mushoku, 'm t')).toBe(2); // spaces don't matter for initials
	});

	it('then anywhere, ignoring spaces', () => {
		expect(matchScore(mushoku, 'shoku')).toBe(3);
		expect(matchScore(mushoku, 'kutensei')).toBe(3);
	});

	it('does not match unrelated text or an empty query', () => {
		expect(matchScore(mushoku, 'frieren')).toBeNull();
		expect(matchScore(mushoku, '  ')).toBeNull();
	});

	it('finds Thai names by any part', () => {
		expect(matchScore(series(2, 'เกิดใหม่เป็นดาบ'), 'ดาบ')).toBe(3);
		expect(matchScore(series(2, 'เกิดใหม่เป็นดาบ'), 'เกิด')).toBe(0);
	});
});

describe('searchSeries', () => {
	it('orders by match quality, then most owned, then name', () => {
		const list = [
			series(1, 'Spy Classroom', 'Spy Kyoushitsu', 3),
			series(2, 'Spy x Family', 'Spy x Family', 12),
			series(3, 'Classroom of the Elite', 'Youkoso Jitsuryoku', 20),
			series(4, 'Frieren', 'Sousou no Frieren', 9)
		];
		expect(searchSeries(list, 'spy').map((s) => s.id)).toEqual([2, 1]);
		expect(searchSeries(list, 'class').map((s) => s.id)).toEqual([3, 1]);
		expect(searchSeries(list, 'zzz')).toEqual([]);
	});

	it('caps the result count', () => {
		const list = Array.from({ length: 30 }, (_, i) => series(i, `Series ${i}`));
		expect(searchSeries(list, 'ser', 5)).toHaveLength(5);
	});
});

describe('ownedVolumes', () => {
	let nextId = 1;
	const book = (overrides: Partial<OwnedBookLike>): OwnedBookLike => ({
		id: nextId++,
		volumeNumber: '1.0',
		isExtra: false,
		location: 'apartment',
		readingStatus: 'unread',
		timesRead: 0,
		...overrides
	});

	it('lays out 1 … latest with gaps, copies, locations and read marks', () => {
		const owned = ownedVolumes([
			book({ volumeNumber: '1.0', timesRead: 1, readingStatus: 'read' }),
			book({ volumeNumber: '2.0', location: 'home' }),
			book({ volumeNumber: '2.0', location: 'apartment' }),
			book({ volumeNumber: '4.0' })
		]);
		expect(owned.volumes).toEqual([
			{ volume: 1, isExtra: false, copies: 1, locations: ['apartment'], read: true },
			{ volume: 2, isExtra: false, copies: 2, locations: ['home', 'apartment'], read: false },
			{ volume: 3, isExtra: false, copies: 0, locations: [], read: false },
			{ volume: 4, isExtra: false, copies: 1, locations: ['apartment'], read: false }
		]);
		expect(owned.latest).toBe(4);
		expect(owned.next).toBe(5);
		expect(owned.missing).toEqual([3]);
		expect(owned.total).toBe(4);
	});

	it('keeps extras apart: they are never the latest volume nor a gap', () => {
		const owned = ownedVolumes([
			book({ volumeNumber: '1.0' }),
			book({ volumeNumber: '1.5', isExtra: true }),
			book({ volumeNumber: '9.5', isExtra: true })
		]);
		expect(owned.latest).toBe(1);
		expect(owned.next).toBe(2);
		expect(owned.missing).toEqual([]);
		expect(owned.extras.map((e) => e.volume)).toEqual([1.5, 9.5]);
	});

	it('starts at volume 1 when nothing regular is owned', () => {
		const owned = ownedVolumes([book({ volumeNumber: '0.5', isExtra: true })]);
		expect(owned.volumes).toEqual([]);
		expect(owned.latest).toBe(0);
		expect(owned.next).toBe(1);
	});
});

describe('groupBySeries', () => {
	it('groups books by series id, keeping order', () => {
		const grouped = groupBySeries([
			{ id: 1, seriesId: 7 },
			{ id: 2, seriesId: 8 },
			{ id: 3, seriesId: 7 }
		]);
		expect([...grouped.entries()]).toEqual([
			[
				7,
				[
					{ id: 1, seriesId: 7 },
					{ id: 3, seriesId: 7 }
				]
			],
			[8, [{ id: 2, seriesId: 8 }]]
		]);
	});
});
