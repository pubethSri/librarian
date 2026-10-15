// ─── Haul grouping ──────────────────────────────────────────────────────────
// A bookfair's books grouped by series, for the fair page's "By series" tab.
// Pure; unit-tested.

import type { BookListItem, BookLocation } from '$lib/types';

/** One chip on a series card: a volume number and how many copies were bought */
export type VolumeChip = { volume: number; copies: number };

/** Volumes in order, one entry each; a volume bought twice has copies: 2 */
export function volumeChips(volumes: readonly number[]): VolumeChip[] {
	const counts = new Map<number, number>();
	for (const v of volumes) counts.set(v, (counts.get(v) ?? 0) + 1);
	return [...counts.entries()]
		.sort(([a], [b]) => a - b)
		.map(([volume, copies]) => ({ volume, copies }));
}

export type HaulSeries = {
	seriesId: number;
	seriesShortName: string;
	seriesFullName: string;
	books: BookListItem[];
	volumes: VolumeChip[];
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
				volumes: volumeChips(sorted.map((b) => Number(b.volumeNumber))),
				spent: priced.reduce((sum, b) => sum + Number(b.price), 0),
				pricedCount: priced.length,
				locations
			};
		})
		.sort((a, b) => a.seriesShortName.localeCompare(b.seriesShortName));
}
