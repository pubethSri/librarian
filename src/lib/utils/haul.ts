// ─── Haul grouping ──────────────────────────────────────────────────────────
// A bookfair's books grouped by series, for the fair page's "By series" tab.
// Pure; unit-tested.

import type { BookListItem, BookLocation } from '$lib/types';

/**
 * Compact volume list: consecutive whole volumes collapse into a range.
 * [1, 2, 3, 5] → "1–3, 5"; half volumes stand alone: [4, 4.5, 5] → "4, 4.5, 5".
 * Duplicates (two copies of a volume) are listed once.
 */
export function formatVolumeRanges(volumes: readonly number[]): string {
	const sorted = [...new Set(volumes)].sort((a, b) => a - b);
	const parts: string[] = [];
	let start: number | null = null;
	let prev: number | null = null;

	const flush = () => {
		if (start === null || prev === null) return;
		parts.push(start === prev ? String(start) : `${start}–${prev}`);
	};

	for (const v of sorted) {
		const continues =
			prev !== null && Number.isInteger(v) && Number.isInteger(prev) && v === prev + 1;
		if (!continues) {
			flush();
			start = v;
		}
		prev = v;
	}
	flush();
	return parts.join(', ');
}

export type HaulSeries = {
	seriesId: number;
	seriesShortName: string;
	seriesFullName: string;
	books: BookListItem[];
	/** e.g. "1–3, 5" */
	volumes: string;
	/** Sum of the priced books — a lower bound when some are unpriced */
	spent: number;
	pricedCount: number;
	/** How many of the books sit at each location */
	locations: Partial<Record<BookLocation, number>>;
};

/** Group a fair's books by series, series sorted by name, books by volume */
export function groupHaulBySeries(books: readonly BookListItem[]): HaulSeries[] {
	const groups = new Map<number, BookListItem[]>();
	for (const book of books) {
		const list = groups.get(book.seriesId) ?? [];
		list.push(book);
		groups.set(book.seriesId, list);
	}

	return [...groups.values()]
		.map((list) => {
			const sorted = [...list].sort((a, b) => Number(a.volumeNumber) - Number(b.volumeNumber));
			const priced = sorted.filter((b) => b.price !== null && b.price !== '');
			const locations: Partial<Record<BookLocation, number>> = {};
			for (const b of sorted) locations[b.location] = (locations[b.location] ?? 0) + 1;
			return {
				seriesId: sorted[0].seriesId,
				seriesShortName: sorted[0].seriesShortName,
				seriesFullName: sorted[0].seriesFullName,
				books: sorted,
				volumes: formatVolumeRanges(sorted.map((b) => Number(b.volumeNumber))),
				spent: priced.reduce((sum, b) => sum + Number(b.price), 0),
				pricedCount: priced.length,
				locations
			};
		})
		.sort((a, b) => a.seriesShortName.localeCompare(b.seriesShortName));
}
