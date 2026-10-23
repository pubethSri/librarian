// ─── Volume labels ──────────────────────────────────────────────────────────
// An extra volume (side story, short-story collection…) keeps a volume number
// only as its sort position — 4.5 sits between 4 and 5 — so it is shown by its
// title ("รวมตอนสั้น") or as "Extra", never as "4.5". Pure; unit-tested.

export type VolumeLike = {
	volumeNumber: string | number;
	isExtra: boolean;
	/** As printed on the cover; only an extra's title is shown */
	title?: string | null;
};

/** Longest title stored (`books.title` is varchar(200)) */
export const TITLE_MAX = 200;

/** A title as typed → as stored: trimmed, inner spaces collapsed, blank → null */
export function normalizeTitle(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const title = value.trim().replace(/\s+/g, ' ').slice(0, TITLE_MAX).trim();
	return title === '' ? null : title;
}

/** An extra's title; null for a regular volume or an extra without one */
export function extraTitle(book: VolumeLike): string | null {
	return book.isExtra ? normalizeTitle(book.title) : null;
}

/** Where an extra sits: "after vol. 4", or "before vol. 1" when it sorts first */
export function extraPlace(book: VolumeLike): string {
	const after = Math.floor(Number(book.volumeNumber));
	return after < 1 ? 'before vol. 1' : `after vol. ${after}`;
}

/** Label for a volume column or chip: "5", an extra's title, or "Extra" */
export function volumeLabel(book: VolumeLike): string {
	if (!book.isExtra) return String(Number(book.volumeNumber));
	return extraTitle(book) ?? 'Extra';
}

/**
 * The volume in a sentence: "vol. 5", an extra's title ("รวมตอนสั้น"), or
 * "extra (after vol. 4)" — placed by the regular volume it sorts after;
 * "(before vol. 1)" when it sorts first.
 */
export function volumeText(book: VolumeLike): string {
	if (!book.isExtra) return `vol. ${Number(book.volumeNumber)}`;
	return extraTitle(book) ?? `extra (${extraPlace(book)})`;
}

/**
 * Sort positions for `count` new extras placed after regular volume `after`
 * (0 = before vol. 1), in tenths between `after` and `after + 1`: after the last
 * position already taken there, starting at `.5` when the gap is empty (4.5 sits
 * between 4 and 5). When the tail is full, the free tenths below are used. Fewer
 * than `count` come back only when all nine tenths are taken.
 */
export function nextExtraPositions(
	books: readonly VolumeLike[],
	after: number,
	count = 1
): number[] {
	const base = Math.floor(after);
	const taken = new Set(
		books
			.map((b) => Math.round(Number(b.volumeNumber) * 10))
			.filter((t) => t > base * 10 && t < (base + 1) * 10)
	);
	const tenths = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => base * 10 + k);
	const highest = Math.max(base * 10 + 4, ...taken);
	const order = [
		...tenths.filter((t) => t > highest),
		...tenths.filter((t) => t <= highest).reverse()
	];
	return order
		.filter((t) => !taken.has(t))
		.slice(0, count)
		.sort((a, b) => a - b)
		.map((t) => t / 10);
}

/** The highest regular volume (extras don't count); 0 when there is none */
export function latestVolume(books: readonly VolumeLike[]): number {
	const regular = books.filter((b) => !b.isExtra).map((b) => Number(b.volumeNumber));
	return regular.length > 0 ? Math.max(...regular) : 0;
}

/**
 * The book already standing in for `target`: same volume number (to the
 * stored 0.1 precision) and the same extra flag. Field Mode's quick add
 * refuses to insert a second one (`onlyIfMissing`); a real second copy is
 * added on purpose from the desktop.
 */
export function findSameVolume<T extends VolumeLike>(
	books: readonly T[],
	target: VolumeLike
): T | null {
	const n = Number(target.volumeNumber).toFixed(1);
	return (
		books.find((b) => b.isExtra === target.isExtra && Number(b.volumeNumber).toFixed(1) === n) ??
		null
	);
}

/**
 * Split books about to be added into the ones the collection lacks and the
 * ones it already has — by series + volume + extra flag, counting earlier
 * entries of the same list too (a volume listed twice is added once).
 */
type SeriesVolume = { seriesId: number; volumeNumber: string | number; isExtra?: boolean };

export function splitMissing<T extends SeriesVolume>(
	existing: readonly SeriesVolume[],
	toAdd: readonly T[]
): { add: T[]; skipped: T[] } {
	const add: T[] = [];
	const skipped: T[] = [];
	const has = (list: readonly SeriesVolume[], b: SeriesVolume) =>
		findSameVolume(
			list
				.filter((e) => e.seriesId === b.seriesId)
				.map((e) => ({ volumeNumber: e.volumeNumber, isExtra: e.isExtra === true })),
			{ volumeNumber: b.volumeNumber, isExtra: b.isExtra === true }
		) !== null;
	for (const b of toAdd) {
		if (has(existing, b) || has(add, b)) skipped.push(b);
		else add.push(b);
	}
	return { add, skipped };
}
