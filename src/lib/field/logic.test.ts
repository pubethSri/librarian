import { describe, it, expect } from 'vitest';
import {
	addVolumes,
	nextRun,
	pickableVolumes,
	toggleVolume,
	volumeRanges,
	toBookListItem,
	withBook,
	withBookCount,
	withoutBook,
	buildHitlist,
	hitlistTags,
	hitlistText,
	currentFairId,
	lastPrice,
	parsePrice,
	parseVolume,
	daysBetween,
	fairsNewestFirst,
	localDay,
	parseFairChoice,
	purchaseFields,
	suggestFair,
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

describe('where am I buying', () => {
	const fairs = [
		{ id: 4, date: '2026-03-28' },
		{ id: 12, date: '2026-10-23' },
		{ id: 5, date: '2025-10-12' }
	];

	it('formats the local day', () => {
		expect(localDay(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
	});

	it('counts days between calendar days', () => {
		expect(daysBetween('2026-10-23', '2026-11-02')).toBe(10);
		expect(daysBetween('2026-10-23', '2026-10-20')).toBe(-3);
		expect(daysBetween('2026-10-23T00:00:00.000Z', '2026-10-23')).toBe(0);
	});

	it('sorts fairs newest first', () => {
		expect(fairsNewestFirst(fairs).map((f) => f.id)).toEqual([12, 4, 5]);
	});

	it('suggests a fair from its day through 10 days later', () => {
		expect(suggestFair(fairs, '2026-10-23')?.id).toBe(12);
		expect(suggestFair(fairs, '2026-10-26')?.id).toBe(12);
		expect(suggestFair(fairs, '2026-11-02')?.id).toBe(12);
		expect(suggestFair(fairs, '2026-11-03')).toBeNull();
	});

	it('never suggests a fair before it opens (the bookstore trial)', () => {
		expect(suggestFair(fairs, '2026-10-21')).toBeNull();
		expect(suggestFair(fairs, '2026-10-22')).toBeNull();
	});

	it('picks the most recently opened of two overlapping fairs', () => {
		const two = [...fairs, { id: 13, date: '2026-10-25' }];
		expect(suggestFair(two, '2026-10-26')?.id).toBe(13);
	});

	it('parses a stored choice and rejects junk', () => {
		expect(parseFairChoice('{"day":"2026-10-24","fairId":12}')).toEqual({
			day: '2026-10-24',
			fairId: 12
		});
		expect(parseFairChoice('{"day":"2026-10-24","fairId":null}')?.fairId).toBeNull();
		expect(parseFairChoice('nope')).toBeNull();
		expect(parseFairChoice('{"fairId":12}')).toBeNull();
		expect(parseFairChoice('{"day":"2026-10-24","fairId":"12"}')).toBeNull();
		expect(parseFairChoice(null)).toBeNull();
	});

	it("keeps today's choice, including Not at a fair during a fair", () => {
		expect(currentFairId({ day: '2026-10-24', fairId: 4 }, fairs, '2026-10-24')).toEqual({
			fairId: 4,
			suggested: false
		});
		expect(currentFairId({ day: '2026-10-24', fairId: null }, fairs, '2026-10-24')).toEqual({
			fairId: null,
			suggested: false
		});
	});

	it('re-suggests on a new day or when the chosen fair is gone', () => {
		expect(currentFairId({ day: '2026-10-23', fairId: null }, fairs, '2026-10-24').fairId).toBe(12);
		expect(currentFairId({ day: '2026-10-24', fairId: 99 }, fairs, '2026-10-24').fairId).toBe(12);
		expect(currentFairId(null, fairs, '2026-10-21')).toEqual({ fairId: null, suggested: true });
	});

	it('trusts a remembered fair until the fair list loads', () => {
		expect(currentFairId({ day: '2026-10-24', fairId: 99 }, undefined, '2026-10-24').fairId).toBe(
			99
		);
	});

	it('dates a purchase today, at a fair or a bookstore', () => {
		expect(purchaseFields(12, '2026-10-24')).toEqual({
			source: 'bookfair',
			sourceEventId: 12,
			boughtAt: '2026-10-24'
		});
		expect(purchaseFields(null, '2026-10-21')).toEqual({
			source: 'bookstore',
			boughtAt: '2026-10-21'
		});
	});
});

describe('quick add helpers', () => {
	const book = (
		price: string | null,
		boughtAt: string | null,
		createdAt = '2026-01-01T00:00:00Z'
	) => ({
		price,
		boughtAt,
		createdAt
	});

	it('pre-fills the price of the most recently bought priced book', () => {
		expect(
			lastPrice([
				book('150.00', '2025-10-12T00:00:00.000Z'),
				book('175.00', '2026-03-28T00:00:00.000Z'),
				book(null, '2026-10-01T00:00:00.000Z')
			])
		).toBe(175);
	});

	it('breaks a same-day tie by entry time, and dated beats undated', () => {
		expect(
			lastPrice([
				book('160.00', '2026-03-28T00:00:00.000Z', '2026-03-28T10:00:00Z'),
				book('165.00', '2026-03-28T00:00:00.000Z', '2026-03-28T11:00:00Z'),
				book('99.00', null, '2026-10-01T00:00:00Z')
			])
		).toBe(165);
	});

	it('keeps a price of 0 and has nothing for an unpriced series', () => {
		expect(lastPrice([book('0.00', '2026-03-28T00:00:00.000Z')])).toBe(0);
		expect(lastPrice([book(null, null)])).toBeNull();
		expect(lastPrice([])).toBeNull();
	});

	it('parses typed prices', () => {
		expect(parsePrice('')).toBeUndefined();
		expect(parsePrice('  ')).toBeUndefined();
		expect(parsePrice('175')).toBe(175);
		expect(parsePrice('฿1,200')).toBe(1200);
		expect(parsePrice('89.50')).toBe(89.5);
		expect(parsePrice('0')).toBe(0);
		expect(parsePrice('-5')).toBeNull();
		expect(parsePrice('abc')).toBeNull();
		expect(parsePrice('1.234')).toBeNull();
	});
});

describe('parseVolume', () => {
	it('accepts whole and one-decimal volume numbers', () => {
		expect(parseVolume('1')).toBe(1);
		expect(parseVolume(' 12 ')).toBe(12);
		expect(parseVolume('4.5')).toBe(4.5);
	});

	it('rejects zero, blanks, junk and numbers the column cannot hold', () => {
		for (const t of ['', '0', '-1', 'abc', '1.25', '1000']) expect(parseVolume(t)).toBeNull();
	});
});

describe('hitlist', () => {
	const s = (
		id: number,
		shortName: string,
		publisher: string | null,
		tags: { id: number; name: string }[] = [],
		watchlist = true
	) => ({
		id,
		shortName,
		fullName: shortName,
		type: 'light_novel' as const,
		status: 'ongoing' as const,
		publisher,
		watchlist,
		tags
	});
	const isekai = { id: 1, name: 'isekai' };
	const romance = { id: 2, name: 'romance' };
	const series = [
		s(1, 'Silent Witch', 'Phoenix Next', [isekai]),
		s(2, 'Frieren', 'Siam Inter', [isekai, romance]),
		s(3, 'Ougon', null, [romance]),
		s(4, 'Alya', 'Phoenix Next'),
		s(5, 'Not watched', 'Phoenix Next', [isekai], false)
	];
	const vol = (id: number, volumeNumber: number) => ({
		id,
		volumeNumber,
		isExtra: false,
		location: 'apartment' as const,
		readingStatus: 'unread' as const,
		timesRead: 0
	});
	const books = new Map([
		[1, [vol(10, 1), vol(11, 2), vol(12, 4)]],
		[2, [vol(20, 1)]]
	]);

	it('groups watchlist series by publisher, unknown last, names A→Z', () => {
		const groups = buildHitlist(series, books);
		expect(groups.map((g) => g.publisher)).toEqual(['Phoenix Next', 'Siam Inter', null]);
		expect(groups[0].items.map((i) => i.series.shortName)).toEqual(['Alya', 'Silent Witch']);
	});

	it('gives the next volume and the gaps; nothing owned = vol. 1', () => {
		const items = buildHitlist(series, books).flatMap((g) => g.items);
		const witch = items.find((i) => i.series.id === 1);
		expect(witch).toMatchObject({ next: 5, missing: [3], owned: 3 });
		expect(items.find((i) => i.series.id === 4)).toMatchObject({ next: 1, missing: [], owned: 0 });
	});

	it('keeps only series with every selected tag', () => {
		const ids = (tags: number[]) =>
			buildHitlist(series, books, tags).flatMap((g) => g.items.map((i) => i.series.id));
		expect(ids([1])).toEqual([1, 2]);
		expect(ids([1, 2])).toEqual([2]);
		expect(ids([])).toHaveLength(4);
	});

	it('lists the watchlist tags by name', () => {
		expect(hitlistTags(series)).toEqual([isekai, romance]);
	});

	it('treats a blank publisher as unknown', () => {
		expect(buildHitlist([s(9, 'X', '  ')], new Map())[0].publisher).toBeNull();
	});

	it('writes the copy text', () => {
		expect(hitlistText(buildHitlist(series, books, [1]))).toBe(
			[
				'Hitlist — 2 series',
				'',
				'Phoenix Next',
				'- Silent Witch — vol. 5 (missing 3)',
				'',
				'Siam Inter',
				'- Frieren — vol. 2'
			].join('\n')
		);
	});
});

describe('cache patches', () => {
	const row = {
		id: 7,
		seriesId: 3,
		volumeNumber: '10.0',
		isExtra: false,
		location: 'apartment' as const,
		boughtAt: '2026-10-17T00:00:00.000Z',
		price: '175.00',
		source: 'bookfair' as const,
		sourceEventId: 13,
		isDraft: false,
		createdAt: '2026-10-17T07:00:00.000Z',
		updatedAt: '2026-10-17T07:00:00.000Z'
	};
	const series = { shortName: 'SW', fullName: 'Silent Witch', tags: [{ id: 1, name: 'Fantasy' }] };
	const item = toBookListItem(row, series);
	const seriesList = [
		{ id: 3, bookCount: 9 },
		{ id: 4, bookCount: 0 }
	] as unknown as Parameters<typeof withBookCount>[0];

	it('turns a created row into an unread list item with the series fields', () => {
		expect(item).toMatchObject({
			id: 7,
			seriesShortName: 'SW',
			seriesFullName: 'Silent Witch',
			seriesTags: [{ id: 1, name: 'Fantasy' }],
			readingStatus: 'unread',
			timesRead: 0
		});
	});

	it('adds and removes a book without duplicating it', () => {
		const once = withBook([], item);
		expect(withBook(once, item)).toHaveLength(1);
		expect(withoutBook(once, 7)).toEqual([]);
	});

	it('leaves an unloaded list alone', () => {
		expect(withBook(undefined, item)).toBeUndefined();
		expect(withoutBook(undefined, 7)).toBeUndefined();
		expect(withBookCount(undefined, 3, 1)).toBeUndefined();
	});

	it("moves one series' book count, never below 0", () => {
		expect(withBookCount(seriesList, 3, 1)?.map((s) => s.bookCount)).toEqual([10, 0]);
		expect(withBookCount(seriesList, 4, -1)?.map((s) => s.bookCount)).toEqual([9, 0]);
	});
});

describe('multi-add helpers', () => {
	const owned = { missing: [3, 4], next: 8 };

	it('offers the gaps, then volumes from the next one on', () => {
		expect(pickableVolumes(owned, 3)).toEqual([3, 4, 8, 9, 10]);
		expect(pickableVolumes({ missing: [], next: 1 }, 2)).toEqual([1, 2]);
	});

	it('takes a run from the next volume', () => {
		expect(nextRun(owned, 5)).toEqual([8, 9, 10, 11, 12]);
		expect(nextRun(owned, 0)).toEqual([]);
	});

	it('toggles and merges selections, sorted', () => {
		expect(toggleVolume([5, 9], 7)).toEqual([5, 7, 9]);
		expect(toggleVolume([5, 7, 9], 7)).toEqual([5, 9]);
		expect(addVolumes([9, 3], [8, 9, 10])).toEqual([3, 8, 9, 10]);
	});

	it('writes volumes as compact ranges', () => {
		expect(volumeRanges([7, 1, 2, 5, 6, 9])).toBe('1–2, 5–7, 9');
		expect(volumeRanges([4])).toBe('4');
		expect(volumeRanges([])).toBe('');
	});
});
