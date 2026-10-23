// ─── Reading queue (v0.4) ────────────────────────────────────────────────────
// What to read next. A pool, not a strict line: the order is a preference, and a
// book leaves the queue the moment it is started (it moves to Reading now) or
// finished — whether or not it was ever started. Dropped leaves it queued. A Read
// book in the queue is a planned re-read. Only owned books (`books` rows) can be
// queued. Pure — no runes, no DOM; unit-tested.

import { BOOK_SOURCE_LABELS, type BookSource, type ReadingStatus } from '$lib/types';
import { matchScore, volumeRanges, type SearchableSeries } from '$lib/field/logic';
import { rowDay, shiftDay } from '$lib/reading';
import { extraTitle, type VolumeLike } from '$lib/utils/volume';

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

/** The toast button offering the next volume: "Queue vol. 5" / "Queue รวมตอนสั้น" / "Queue the extra" */
export function offerLabel(book: VolumeLike): string {
	if (!book.isExtra) return `Queue vol. ${Number(book.volumeNumber)}`;
	const title = extraTitle(book);
	return title ? `Queue ${title}` : 'Queue the extra';
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

// ─── Series bar (queue rows) ─────────────────────────────────────────────────

export type BarBookLike = Pick<
	QueueBookLike,
	'seriesId' | 'volumeNumber' | 'isExtra' | 'readingStatus'
> & {
	timesRead: number;
};

export type SeriesBarModel =
	| { kind: 'segments'; segments: ('read' | 'this' | 'unread')[] }
	| { kind: 'continuous'; total: number; read: number; at: number; to?: number };

type BarTarget = Pick<BarBookLike, 'seriesId' | 'volumeNumber' | 'isExtra'>;

/**
 * Where a queued book — or a run of them — sits in its series: one segment per
 * regular volume from 1 to the latest owned (read = any copy read; a gap counts as
 * unread), the target book(s) marked. An extra gets its own segment after the
 * volume it follows. Past `maxSegments` the bar is continuous: `read` volumes
 * filled, a mark `at` 0…1 (a run: from `at` to `to`). Null when the series has no
 * regular volume to draw.
 */
export function seriesBar(
	books: readonly BarBookLike[],
	target: BarTarget | readonly BarTarget[],
	maxSegments = 20
): SeriesBarModel | null {
	const targets = ([] as BarTarget[]).concat(target);
	if (targets.length === 0) return null;
	const seriesId = targets[0].seriesId;
	const regular = books.filter((b) => b.seriesId === seriesId && !b.isExtra);
	const latest = Math.floor(Math.max(0, ...regular.map((b) => Number(b.volumeNumber))));
	if (latest < 1) return null;
	const readVolumes = new Set(
		regular
			.filter((b) => b.timesRead > 0 || b.readingStatus === 'read')
			.map((b) => Math.floor(Number(b.volumeNumber)))
	);
	// Slots by position: volume n at n, an extra after volume k at k + 0.5
	const slots: { pos: number; state: 'read' | 'this' | 'unread' }[] = [];
	for (let n = 1; n <= latest; n++)
		slots.push({ pos: n, state: readVolumes.has(n) ? 'read' : 'unread' });
	for (const t of targets) {
		const v = Number(t.volumeNumber);
		if (t.isExtra)
			slots.push({ pos: Math.min(Math.max(Math.floor(v), 0), latest) + 0.5, state: 'this' });
		else slots[Math.min(Math.max(Math.round(v), 1), latest) - 1].state = 'this';
	}
	slots.sort((a, b) => a.pos - b.pos);
	const segments = slots.map((s) => s.state);
	if (segments.length <= maxSegments) return { kind: 'segments', segments };
	const first = segments.indexOf('this');
	const last = segments.lastIndexOf('this');
	return {
		kind: 'continuous',
		total: segments.length,
		read: segments.filter((s) => s === 'read').length,
		at: (first + 0.5) / segments.length,
		...(targets.length > 1 ? { to: (last + 0.5) / segments.length } : {})
	};
}

/** The volume chip on a queue row: "Vol. 6", or "Extra" */
export function chipLabel(book: VolumeLike): string {
	return book.isExtra ? 'Extra' : `Vol. ${Number(book.volumeNumber)}`;
}

/** A run's chip: "Vol. 11–12", "Vol. 11–12 + 1 extra", one book as `chipLabel` */
export function runChipLabel(books: readonly VolumeLike[]): string {
	if (books.length === 1) return chipLabel(books[0]);
	const label = spanLabel(books);
	return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Just bought (phone: Add to queue, fair round 2) ─────────────────────────

export type BoughtBookLike = PileBookLike & {
	boughtAt: string | null;
	source: BookSource | null;
	sourceEventId: number | null;
};

/** One "where" of Just bought: a fair, else one shop day ("Bookstore · Oct 12") */
export type BoughtGroup<T> = {
	key: string;
	/** The fair's name, else "Bookstore · Oct 12" */
	label: string;
	/** Purchase days covered, first and last (`YYYY-MM-DD`) */
	from: string;
	to: string;
	/** Its series, most recently bought first, their unread volumes in order */
	groups: PileGroup<T>[];
	/** Unread books listed / books bought there */
	unread: number;
	total: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 12" from `YYYY-MM-DD` */
export function shortDay(day: string): string {
	return `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
}

/**
 * Books bought in the last `days` days (today included), grouped by where: every
 * book linked to a fair is one group (a fair runs for days), other books one group
 * per source and day. Newest group first. Only unread books are listed — a series
 * whose books are all read or being read drops out, and so does an empty group.
 * `query` filters series as Find does.
 */
export function justBought<T extends BoughtBookLike>(
	books: readonly T[],
	fairs: readonly { id: number; name: string }[],
	today: string,
	options: { days?: number; query?: string } = {}
): BoughtGroup<T>[] {
	const since = shiftDay(today, -((options.days ?? 60) - 1));
	const query = options.query?.trim() ?? '';
	const fairName = new Map(fairs.map((f) => [f.id, f.name]));
	const byKey = new Map<string, { label: string; books: { book: T; day: string }[] }>();
	for (const book of books) {
		const day = rowDay(book.boughtAt);
		if (!day || day < since || day > today) continue;
		const searchable = {
			id: book.seriesId,
			shortName: book.seriesShortName,
			fullName: book.seriesFullName
		};
		if (query && matchScore(searchable, query) === null) continue;
		const fair = book.sourceEventId !== null ? fairName.get(book.sourceEventId) : undefined;
		const key = fair !== undefined ? `fair:${book.sourceEventId}` : `day:${day}:${book.source}`;
		const label =
			fair ?? `${book.source ? BOOK_SOURCE_LABELS[book.source] : 'Bought'} · ${shortDay(day)}`;
		const entry = byKey.get(key) ?? { label, books: [] };
		entry.books.push({ book, day });
		byKey.set(key, entry);
	}

	const result: BoughtGroup<T>[] = [];
	for (const [key, { label, books: bought }] of byKey) {
		const days = bought.map((b) => b.day).sort();
		const bySeries = new Map<number, { latest: string; books: T[] }>();
		for (const { book, day } of bought) {
			const s = bySeries.get(book.seriesId) ?? { latest: '', books: [] };
			if (day > s.latest) s.latest = day;
			if (book.readingStatus === 'unread') s.books.push(book);
			bySeries.set(book.seriesId, s);
		}
		const groups = [...bySeries.entries()]
			.filter(([, s]) => s.books.length > 0)
			.sort(
				([, a], [, b]) =>
					b.latest.localeCompare(a.latest) ||
					a.books[0].seriesShortName.localeCompare(b.books[0].seriesShortName)
			)
			.map(([seriesId, s]) => ({
				seriesId,
				name: s.books[0].seriesShortName,
				books: [...s.books].sort(byVolume)
			}));
		if (groups.length === 0) continue;
		result.push({
			key,
			label,
			from: days[0],
			to: days[days.length - 1],
			groups,
			unread: groups.reduce((n, g) => n + g.books.length, 0),
			total: bought.length
		});
	}
	return result.sort((a, b) => b.to.localeCompare(a.to) || a.label.localeCompare(b.label));
}

// ─── Queue several (phone: the volume options sheet) ─────────────────────────

export type QueueChoices<T> = {
	/** The tapped book, then the unread volumes owned after it, in reading order */
	rest: T[];
	/** Every owned volume of the series in reading order (Read from the start) */
	fromStart: T[];
	/** Of `fromStart`, the books read before (re-reads) */
	rereads: number;
};

/**
 * What the options sheet can queue for `book`. One copy per volume (the tapped
 * one, else a queued copy, else an unread one, else the first); a volume with a
 * copy being read is left out. Books already queued stay in the lists — the
 * batch request skips them.
 */
export function queueChoices<T extends QueueBookLike>(
	books: readonly T[],
	book: T
): QueueChoices<T> {
	const copies = new Map<string, T[]>();
	for (const b of books) {
		if (b.seriesId !== book.seriesId) continue;
		const key = `${b.isExtra ? 'x' : 'v'}${Number(b.volumeNumber).toFixed(1)}`;
		copies.set(key, [...(copies.get(key) ?? []), b]);
	}
	const volumes: T[] = [];
	for (const list of copies.values()) {
		if (list.some((b) => b.readingStatus === 'reading')) continue;
		volumes.push(
			list.find((b) => b.id === book.id) ??
				list.find((b) => b.queued) ??
				list.find((b) => b.readingStatus === 'unread') ??
				list[0]
		);
	}
	volumes.sort(byVolume);
	const at = Number(book.volumeNumber);
	const rest = [
		book,
		...volumes.filter(
			(b) => b.id !== book.id && Number(b.volumeNumber) > at && b.readingStatus === 'unread'
		)
	];
	return {
		rest,
		fromStart: volumes,
		rereads: volumes.filter((b) => b.readingStatus === 'read' || b.readingStatus === 'dropped')
			.length
	};
}

/** "vol. 11–12", "vol. 1–12 + 2 extras", "2 extras" */
export function spanLabel(books: readonly VolumeLike[]): string {
	const regular = books.filter((b) => !b.isExtra).map((b) => Number(b.volumeNumber));
	const extras = books.length - regular.length;
	return [
		regular.length > 0 ? `vol. ${volumeRanges(regular)}` : '',
		extras > 0 ? `${extras} extra${extras > 1 ? 's' : ''}` : ''
	]
		.filter(Boolean)
		.join(' + ');
}

// ─── Series runs (the queue) ─────────────────────────────────────────────────

export type RunItemLike = {
	bookId: number;
	seriesId: number;
	volumeNumber: string | number;
	timesRead: number;
};

export type QueueRun<T> = {
	seriesId: number;
	items: T[];
	/**
	 * Reading the series again from its first volume: the run starts at the first
	 * volume owned and holds a book read before. Marked with a symbol on the row.
	 */
	fromStart: boolean;
};

/**
 * The queue as runs: consecutive books of the same series form one run (moved as
 * one); a single book is a run of one. `books` gives each series' first volume.
 */
export function queueRuns<T extends RunItemLike>(
	items: readonly T[],
	books: readonly Pick<QueueBookLike, 'seriesId' | 'volumeNumber'>[]
): QueueRun<T>[] {
	const first = new Map<number, number>();
	for (const b of books) {
		const n = Number(b.volumeNumber);
		if (n < (first.get(b.seriesId) ?? Infinity)) first.set(b.seriesId, n);
	}
	const runs: QueueRun<T>[] = [];
	for (const item of items) {
		const last = runs[runs.length - 1];
		if (last && last.seriesId === item.seriesId) last.items.push(item);
		else runs.push({ seriesId: item.seriesId, items: [item], fromStart: false });
	}
	for (const run of runs) {
		run.fromStart =
			run.items.length > 1 &&
			Number(run.items[0].volumeNumber) === first.get(run.seriesId) &&
			run.items.some((i) => i.timesRead > 0);
	}
	return runs;
}

/** The order after moving run `index` one run up or down (past the whole neighbour) */
export function moveRun<T extends RunItemLike>(
	runs: readonly QueueRun<T>[],
	index: number,
	move: 'up' | 'down'
): number[] {
	const order = runs.map((r) => r.items.map((i) => i.bookId));
	const to = move === 'up' ? index - 1 : index + 1;
	if (to >= 0 && to < order.length && index >= 0 && index < order.length) {
		[order[index], order[to]] = [order[to], order[index]];
	}
	return order.flat();
}
