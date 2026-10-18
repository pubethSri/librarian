import { describe, expect, it } from 'vitest';
import {
	buildPile,
	endPosition,
	leavesQueue,
	moveInQueue,
	nextToQueue,
	reorder,
	type PileBookLike
} from './queue';
import type { ReadingStatus } from './types';

let nextId = 1;
function book(
	seriesId: number,
	volumeNumber: number,
	readingStatus: ReadingStatus = 'unread',
	extra: Partial<PileBookLike> = {}
): PileBookLike {
	const names: Record<number, [string, string]> = {
		1: ['Silent Witch', 'Silent Witch: The Secret of the Silent Witch'],
		2: ['Arifureta', 'Arifureta: From Commonplace to World’s Strongest'],
		3: ['86', '86 Eighty-Six']
	};
	return {
		id: nextId++,
		seriesId,
		seriesShortName: names[seriesId][0],
		seriesFullName: names[seriesId][1],
		volumeNumber: String(volumeNumber),
		isExtra: false,
		readingStatus,
		queued: false,
		...extra
	};
}

describe('leavesQueue', () => {
	it('starting or finishing takes a book out; dropping or unread does not', () => {
		expect(leavesQueue('reading')).toBe(true);
		expect(leavesQueue('read')).toBe(true);
		expect(leavesQueue('dropped')).toBe(false);
		expect(leavesQueue('unread')).toBe(false);
	});
});

describe('endPosition', () => {
	it('goes after the highest position, gaps kept', () => {
		expect(endPosition([])).toBe(1);
		expect(endPosition([1, 2, 7])).toBe(8);
	});
});

describe('reorder', () => {
	it('applies the requested order', () => {
		expect(reorder([1, 2, 3], [3, 1, 2])).toEqual([3, 1, 2]);
	});

	it('drops ids no longer queued and repeats', () => {
		expect(reorder([1, 3], [3, 2, 1, 3])).toEqual([3, 1]);
	});

	it('keeps queued ids the client did not know about, after the rest', () => {
		expect(reorder([1, 2, 3, 4], [2, 1])).toEqual([2, 1, 3, 4]);
	});
});

describe('moveInQueue', () => {
	const ids = [10, 20, 30];
	it('moves up, down and to the top, stopping at the ends', () => {
		expect(moveInQueue(ids, 20, 'up')).toEqual([20, 10, 30]);
		expect(moveInQueue(ids, 20, 'down')).toEqual([10, 30, 20]);
		expect(moveInQueue(ids, 30, 'top')).toEqual([30, 10, 20]);
		expect(moveInQueue(ids, 10, 'up')).toEqual(ids);
		expect(moveInQueue(ids, 30, 'down')).toEqual(ids);
		expect(moveInQueue(ids, 99, 'top')).toEqual(ids);
	});
});

describe('nextToQueue', () => {
	it('offers the next owned volume of the series', () => {
		const v4 = book(1, 4, 'read');
		const v5 = book(1, 5);
		const books = [v4, v5, book(1, 6), book(2, 5)];
		expect(nextToQueue(books, v4)).toBe(v5);
	});

	it('follows reading order, extras included', () => {
		const v4 = book(1, 4, 'read');
		const extra = book(1, 4.5, 'unread', { isExtra: true });
		expect(nextToQueue([v4, extra, book(1, 5)], v4)).toBe(extra);
	});

	it('offers nothing when the next volume is not owned, queued or being read', () => {
		const v4 = book(1, 4, 'read');
		expect(nextToQueue([v4], v4)).toBeNull();
		expect(nextToQueue([v4, book(1, 5, 'unread', { queued: true })], v4)).toBeNull();
		expect(nextToQueue([v4, book(1, 5, 'reading')], v4)).toBeNull();
	});

	it('skips a gap: vol. 7 follows a finished vol. 5 when 6 is missing', () => {
		const v5 = book(1, 5, 'read');
		const v7 = book(1, 7);
		expect(nextToQueue([v5, v7], v5)).toBe(v7);
	});

	it('with two copies, picks an unread one; a queued copy blocks the offer', () => {
		const v4 = book(1, 4, 'read');
		const readCopy = book(1, 5, 'read');
		const unreadCopy = book(1, 5);
		expect(nextToQueue([v4, readCopy, unreadCopy], v4)).toBe(unreadCopy);
		expect(nextToQueue([v4, readCopy, book(1, 5, 'unread', { queued: true })], v4)).toBeNull();
	});

	it('offers a Read next volume during a re-read run', () => {
		const v4 = book(1, 4, 'read');
		const v5 = book(1, 5, 'read');
		expect(nextToQueue([v4, v5], v4)).toBe(v5);
	});
});

describe('buildPile', () => {
	const sw = [book(1, 1, 'read'), book(1, 2, 'read'), book(1, 3), book(1, 4)];
	const ari = [book(2, 8, 'reading'), book(2, 9), book(2, 10, 'dropped')];
	const eighty = [book(3, 2), book(3, 1)];
	const all = [...ari, ...sw, ...eighty];

	it('lists unread books by series A→Z, volumes in order', () => {
		const pile = buildPile(all);
		expect(pile.groups.map((g) => g.name)).toEqual(['86', 'Arifureta', 'Silent Witch']);
		expect(pile.groups[0].books.map((b) => b.volumeNumber)).toEqual(['1', '2']);
		expect(pile.groups[1].books.map((b) => b.volumeNumber)).toEqual(['9']);
		expect(pile.count).toBe(5);
	});

	it('continue: the next unread volume past the furthest read or reading one', () => {
		const pile = buildPile(all);
		expect(pile.continue.map((b) => [b.seriesShortName, b.volumeNumber])).toEqual([
			['Arifureta', '9'],
			['Silent Witch', '3']
		]);
	});

	it('include read: adds Read and Dropped books, never the one being read', () => {
		const pile = buildPile(all, { includeRead: true });
		const arifureta = pile.groups.find((g) => g.name === 'Arifureta')!;
		expect(arifureta.books.map((b) => b.volumeNumber)).toEqual(['9', '10']);
		expect(pile.groups.find((g) => g.name === 'Silent Witch')!.books).toHaveLength(4);
	});

	it('filters series like Find (initials, words), best match first', () => {
		expect(buildPile(all, { query: 'sw' }).groups.map((g) => g.name)).toEqual(['Silent Witch']);
		expect(buildPile(all, { query: 'eighty' }).groups.map((g) => g.name)).toEqual(['86']);
		const filtered = buildPile(all, { query: 'zzz' });
		expect(filtered.groups).toEqual([]);
		expect(filtered.continue).toEqual([]);
	});

	it('drops series with nothing left to list', () => {
		const done = [book(1, 1, 'read'), book(1, 2, 'reading')];
		const pile = buildPile(done);
		expect(pile.groups).toEqual([]);
		expect(pile.continue).toEqual([]);
	});
});
