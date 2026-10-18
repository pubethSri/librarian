// ─── Reading queue (v0.4) ────────────────────────────────────────────────────
// What to read next. A pool, not a strict line: the order is a preference, and a
// book leaves the queue the moment it is started (it moves to Reading now) or
// finished — whether or not it was ever started. Dropped leaves it queued. A Read
// book in the queue is a planned re-read. Only owned books (`books` rows) can be
// queued. Pure — no runes, no DOM; unit-tested.

import type { ReadingStatus } from '$lib/types';
import { matchScore, type SearchableSeries } from '$lib/field/logic';
import type { VolumeLike } from '$lib/utils/volume';

/** Whether a reading change to `target` takes a queued book out (start or finish) */
export function leavesQueue(target: ReadingStatus): boolean {
	return target === 'reading' || target === 'read';
}

/** Position for a book added at the end (gaps allowed, lowest first) */
export function endPosition(positions: readonly number[]): number {
	return positions.length === 0 ? 1 : Math.max(...positions) + 1;
}

/**
 * The new order for PUT /api/queue/order. The client's list may be stale (a book
 * finished on the phone meanwhile, or added on the desktop): ids no longer queued
 * are dropped, queued ids the client didn't send keep their order after the rest.
 */
export function reorder(queued: readonly number[], requested: readonly number[]): number[] {
	const inQueue = new Set(queued);
	const seen = new Set<number>();
	const order: number[] = [];
	for (const id of requested) {
		if (inQueue.has(id) && !seen.has(id)) {
			order.push(id);
			seen.add(id);
		}
	}
	for (const id of queued) if (!seen.has(id)) order.push(id);
	return order;
}

export type QueueMove = 'up' | 'down' | 'top';

/** The order after moving one book up, down or to the top (▲ ▼ Move to top) */
export function moveInQueue(ids: readonly number[], bookId: number, move: QueueMove): number[] {
	const from = ids.indexOf(bookId);
	if (from === -1) return [...ids];
	const to =
		move === 'top' ? 0 : move === 'up' ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
	const order = [...ids];
	order.splice(from, 1);
	order.splice(to, 0, bookId);
	return order;
}

// ─── Queue the next volume ───────────────────────────────────────────────────

/** The fields of a book the queue helpers look at */
export type QueueBookLike = {
	id: number;
	seriesId: number;
	volumeNumber: string | number;
	isExtra: boolean;
	readingStatus: ReadingStatus;
	queued: boolean;
};

/**
 * After finishing `finished`: the book to offer for the queue — the next book of
 * the series in reading order (extras included: 4.5 follows 4), when owned and
 * not queued yet. Null when it isn't owned, any copy is queued or being read, or
 * it is already Read — unless the finish was itself a re-read (`reread`): then a
 * Read next volume continues the re-read run. With several copies, an unread one.
 */
export function nextToQueue<T extends QueueBookLike>(
	books: readonly T[],
	finished: Pick<QueueBookLike, 'id' | 'seriesId' | 'volumeNumber'>,
	options: { reread?: boolean } = {}
): T | null {
	const after = Number(finished.volumeNumber);
	const later = books.filter(
		(b) =>
			b.seriesId === finished.seriesId && b.id !== finished.id && Number(b.volumeNumber) > after
	);
	if (later.length === 0) return null;
	const next = Math.min(...later.map((b) => Number(b.volumeNumber)));
	const copies = later.filter((b) => Number(b.volumeNumber) === next);
	if (copies.some((b) => b.queued || b.readingStatus === 'reading')) return null;
	const unread = copies.find((b) => b.readingStatus !== 'read');
	return unread ?? (options.reread ? copies[0] : null);
}

/** Series you own books of, searchable like Find (desktop Add box) */
export function ownedSeries(
	books: readonly Pick<PileBookLike, 'seriesId' | 'seriesShortName' | 'seriesFullName'>[]
): (SearchableSeries & { bookCount: number })[] {
	const map = new Map<number, SearchableSeries & { bookCount: number }>();
	for (const b of books) {
		const s = map.get(b.seriesId);
		if (s) s.bookCount++;
		else
			map.set(b.seriesId, {
				id: b.seriesId,
				shortName: b.seriesShortName,
				fullName: b.seriesFullName,
				bookCount: 1
			});
	}
	return [...map.values()];
}

/** The toast button offering the next volume: "Queue vol. 5" / "Queue the extra" */
export function offerLabel(book: VolumeLike): string {
	return book.isExtra ? 'Queue the extra' : `Queue vol. ${Number(book.volumeNumber)}`;
}

// ─── The pile (phone: Add to queue) ──────────────────────────────────────────

export type PileBookLike = QueueBookLike & {
	seriesShortName: string;
	seriesFullName: string;
};

export type PileGroup<T> = { seriesId: number; name: string; books: T[] };

export type Pile<T> = {
	/** Per series you're partway through: the next unread owned volume */
	continue: T[];
	/** Series A→Z (best match first while filtering), their volumes in order */
	groups: PileGroup<T>[];
	/** Books listed in `groups` */
	count: number;
};

const byVolume = (a: QueueBookLike, b: QueueBookLike) =>
	Number(a.volumeNumber) - Number(b.volumeNumber);

/**
 * Books to pick from when queueing: the unread pile (with `includeRead`, also
 * Read and Dropped books — for a re-read), grouped by series. Books being read
 * never appear. `query` filters series with the same matching as Find.
 */
export function buildPile<T extends PileBookLike>(
	books: readonly T[],
	options: { includeRead?: boolean; query?: string } = {}
): Pile<T> {
	const query = options.query?.trim() ?? '';
	const bySeries = new Map<number, T[]>();
	for (const b of books) {
		const list = bySeries.get(b.seriesId) ?? [];
		list.push(b);
		bySeries.set(b.seriesId, list);
	}

	const scored: { group: PileGroup<T>; all: T[]; score: number }[] = [];
	for (const [seriesId, all] of bySeries) {
		const first = all[0];
		const searchable: SearchableSeries = {
			id: seriesId,
			shortName: first.seriesShortName,
			fullName: first.seriesFullName
		};
		const score = query ? matchScore(searchable, query) : 0;
		if (score === null) continue;
		const listed = all
			.filter((b) =>
				options.includeRead ? b.readingStatus !== 'reading' : b.readingStatus === 'unread'
			)
			.sort(byVolume);
		scored.push({ group: { seriesId, name: first.seriesShortName, books: listed }, all, score });
	}
	scored.sort((a, b) => a.score - b.score || a.group.name.localeCompare(b.group.name));

	const continueList: T[] = [];
	for (const { all } of scored) {
		const started = all.filter((b) => b.readingStatus === 'read' || b.readingStatus === 'reading');
		if (started.length === 0) continue;
		const furthest = Math.max(...started.map((b) => Number(b.volumeNumber)));
		const next = all
			.filter((b) => b.readingStatus === 'unread' && Number(b.volumeNumber) > furthest)
			.sort(byVolume)[0];
		if (next) continueList.push(next);
	}

	const groups = scored.map((s) => s.group).filter((g) => g.books.length > 0);
	return {
		continue: continueList,
		groups,
		count: groups.reduce((n, g) => n + g.books.length, 0)
	};
}
