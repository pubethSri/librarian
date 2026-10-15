// ─── Haul grouping ──────────────────────────────────────────────────────────
// A bookfair's books grouped by series, for the fair page's "By series" tab.
// Pure; unit-tested.

import type { BookListItem, BookLocation } from '$lib/types';
import type { VolumeLike } from './volume';

/** One chip on a series card: a volume (by sort position) and how many copies were bought */
export type VolumeChip = { volume: number; isExtra: boolean; copies: number };

/** Volumes in order, one entry each; a volume bought twice has copies: 2 */
export function volumeChips(books: readonly VolumeLike[]): VolumeChip[] {
	const chips = new Map<string, VolumeChip>();
	for (const b of books) {
		const volume = Number(b.volumeNumber);
		const key = `${volume}:${b.isExtra}`;
		const chip = chips.get(key);
		if (chip) chip.copies++;
		else chips.set(key, { volume, isExtra: b.isExtra, copies: 1 });
	}
	return [...chips.values()].sort((a, b) => a.volume - b.volume);
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
				volumes: volumeChips(sorted),
				spent: priced.reduce((sum, b) => sum + Number(b.price), 0),
				pricedCount: priced.length,
				locations
			};
		})
		.sort((a, b) => a.seriesShortName.localeCompare(b.seriesShortName));
}
