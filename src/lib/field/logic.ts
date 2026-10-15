// ─── Field Mode: "Do I own this?" ───────────────────────────────────────────
// Find a series from 2–3 typed letters, then lay out what is owned: every
// regular volume from 1 to the latest (owned or missing), extras apart, and
// the next volume to buy. Pure — no runes, no DOM; unit-tested.

import type { BookLocation, ReadingStatus, SeriesListItem } from '$lib/types';
import { latestVolume } from '$lib/utils/volume';

// ─── Search ──────────────────────────────────────────────────────────────────

/** Lower-cased, NFKC-normalised, punctuation turned into spaces */
export function normalize(text: string): string {
	return text
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
		.trim();
}

/** First letter of each word: "Mushoku Tensei" → "mt" */
export function initials(text: string): string {
	return normalize(text)
		.split(' ')
		.filter(Boolean)
		.map((w) => w[0])
		.join('');
}

export type SearchableSeries = Pick<SeriesListItem, 'id' | 'shortName' | 'fullName'>;

/**
 * How well a series matches a query; lower is better, null = no match.
 * 0 name starts with it · 1 a word starts with it · 2 initials start with it
 * · 3 it appears anywhere (spaces ignored, so "mushokuten" still finds it).
 */
export function matchScore(series: SearchableSeries, query: string): number | null {
	const q = normalize(query);
	if (!q) return null;
	const names = [normalize(series.shortName), normalize(series.fullName)];
	if (names.some((n) => n.startsWith(q))) return 0;
	if (names.some((n) => n.split(' ').some((w) => w.startsWith(q)))) return 1;
	const compactQuery = q.replace(/ /g, '');
	if ([series.shortName, series.fullName].some((n) => initials(n).startsWith(compactQuery)))
		return 2;
	if (names.some((n) => n.replace(/ /g, '').includes(compactQuery))) return 3;
	return null;
}

/** Matching series, best match first; ties: most books owned, then name */
export function searchSeries<T extends SearchableSeries & { bookCount: number }>(
	series: readonly T[],
	query: string,
	limit = 20
): T[] {
	return series
		.map((s) => ({ s, score: matchScore(s, query) }))
		.filter((r): r is { s: T; score: number } => r.score !== null)
		.sort(
			(a, b) =>
				a.score - b.score ||
				b.s.bookCount - a.s.bookCount ||
				a.s.shortName.localeCompare(b.s.shortName)
		)
		.slice(0, limit)
		.map((r) => r.s);
}

// ─── Owned volumes ───────────────────────────────────────────────────────────

/** The fields of a book the volume grid looks at */
export type OwnedBookLike = {
	id: number;
	volumeNumber: string | number;
	isExtra: boolean;
	location: BookLocation;
	readingStatus: ReadingStatus;
	timesRead: number;
};

export type VolumeSlot = {
	/** Regular volume number, or the extra's sort position */
	volume: number;
	isExtra: boolean;
	/** 0 = a gap: a regular volume below the latest that isn't owned */
	copies: number;
	/** Where the copies are, one entry per copy */
	locations: BookLocation[];
	/** Read at least once (any copy) */
	read: boolean;
};

export type OwnedVolumes = {
	/** Regular volumes 1 … latest, gaps included */
	volumes: VolumeSlot[];
	/** Extras in sort order */
	extras: VolumeSlot[];
	/** Highest regular volume owned; 0 when none */
	latest: number;
	/** The volume to look for next: latest + 1 */
	next: number;
	/** Regular volumes below the latest that aren't owned */
	missing: number[];
	/** Books owned, extras and duplicate copies included */
	total: number;
};

function slotOf(volume: number, isExtra: boolean, books: readonly OwnedBookLike[]): VolumeSlot {
	return {
		volume,
		isExtra,
		copies: books.length,
		locations: books.map((b) => b.location),
		read: books.some((b) => b.timesRead > 0)
	};
}

export function ownedVolumes(books: readonly OwnedBookLike[]): OwnedVolumes {
	const latest = latestVolume(books);
	const regular = new Map<number, OwnedBookLike[]>();
	const extras = new Map<number, OwnedBookLike[]>();
	for (const b of books) {
		const n = Number(b.volumeNumber);
		const map = b.isExtra ? extras : regular;
		const list = map.get(n) ?? [];
		list.push(b);
		map.set(n, list);
	}

	// Whole numbers 1 … latest; a fractional regular volume (rare) slots in too
	const numbers = new Set<number>([...regular.keys()]);
	for (let n = 1; n <= latest; n++) numbers.add(n);
	const volumes = [...numbers]
		.sort((a, b) => a - b)
		.map((n) => slotOf(n, false, regular.get(n) ?? []));

	return {
		volumes,
		extras: [...extras.keys()]
			.sort((a, b) => a - b)
			.map((n) => slotOf(n, true, extras.get(n) ?? [])),
		latest,
		next: Math.floor(latest) + 1,
		missing: volumes.filter((v) => v.copies === 0).map((v) => v.volume),
		total: books.length
	};
}

/** Books grouped by series id */
export function groupBySeries<T extends { seriesId: number }>(
	books: readonly T[]
): Map<number, T[]> {
	const map = new Map<number, T[]>();
	for (const b of books) {
		const list = map.get(b.seriesId) ?? [];
		list.push(b);
		map.set(b.seriesId, list);
	}
	return map;
}
