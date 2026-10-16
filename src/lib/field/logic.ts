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

// ─── Where am I buying (B4) ──────────────────────────────────────────────────
// The phone remembers one choice per day — a bookfair, or "not at a fair"
// (a bookstore). A new day re-suggests from the dates, so yesterday's choice
// can't mis-tag today's purchases.

/** Days a fair stays suggested after its (opening) day — fairs run ~10 days */
export const FAIR_SUGGEST_DAYS = 10;

/** The local calendar day, `YYYY-MM-DD` */
export function localDay(now: Date): string {
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${m}-${d}`;
}

/** Today on this device, `YYYY-MM-DD` */
export function todayLocal(): string {
	return localDay(new Date());
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD` */
export function daysBetween(from: string, to: string): number {
	const ms =
		Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
	return Math.round(ms / 86_400_000);
}

export type FairLike = { id: number; date: string };

/** Fairs newest first (by date, then newest id) */
export function fairsNewestFirst<T extends FairLike>(fairs: readonly T[]): T[] {
	return [...fairs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

/**
 * The fair you are probably at: one whose day is today or up to
 * `FAIR_SUGGEST_DAYS` before it (never one that hasn't opened yet); the most
 * recently opened wins. Null = not at a fair.
 */
export function suggestFair<T extends FairLike>(fairs: readonly T[], today: string): T | null {
	return (
		fairsNewestFirst(fairs).find((f) => {
			const since = daysBetween(f.date, today);
			return since >= 0 && since <= FAIR_SUGGEST_DAYS;
		}) ?? null
	);
}

/** What the phone remembers: the choice and the day it was made */
export type StoredFairChoice = { day: string; fairId: number | null };

export function parseFairChoice(raw: string | null): StoredFairChoice | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw);
		if (typeof v?.day !== 'string') return null;
		if (v.fairId !== null && typeof v.fairId !== 'number') return null;
		return { day: v.day, fairId: v.fairId };
	} catch {
		return null;
	}
}

/**
 * The fair in effect today: today's remembered choice (while that fair still
 * exists), else the suggestion. `fairs` undefined = not loaded yet, so a
 * remembered fair is trusted until the list arrives.
 */
export function currentFairId(
	stored: StoredFairChoice | null,
	fairs: readonly FairLike[] | undefined,
	today: string
): { fairId: number | null; suggested: boolean } {
	if (stored && stored.day === today) {
		const exists = stored.fairId === null || !fairs || fairs.some((f) => f.id === stored.fairId);
		if (exists) return { fairId: stored.fairId, suggested: false };
	}
	return { fairId: fairs ? (suggestFair(fairs, today)?.id ?? null) : null, suggested: true };
}

/** Source, fair and purchase day for a book bought from the phone today */
export function purchaseFields(
	fairId: number | null,
	today: string
): { source: 'bookfair' | 'bookstore'; sourceEventId?: number; boughtAt: string } {
	return fairId === null
		? { source: 'bookstore', boughtAt: today }
		: { source: 'bookfair', sourceEventId: fairId, boughtAt: today };
}

// ─── Quick add (B4) ──────────────────────────────────────────────────────────

type PricedBookLike = {
	price: string | null;
	boughtAt: string | null;
	createdAt: string;
};

/**
 * The price to pre-fill for a series: its most recently bought priced book
 * (purchase day, then when it was entered); null when none is priced.
 */
export function lastPrice(books: readonly PricedBookLike[]): number | null {
	const priced = books.filter((b) => b.price !== null && b.price !== '');
	if (priced.length === 0) return null;
	const newest = priced.reduce((best, b) => {
		const day = (b.boughtAt ?? '').slice(0, 10);
		const bestDay = (best.boughtAt ?? '').slice(0, 10);
		if (day !== bestDay) return day > bestDay ? b : best;
		return b.createdAt > best.createdAt ? b : best;
	});
	return Number(newest.price);
}

/**
 * A typed price: blank = no price (undefined), "฿175" / "175.50" / "1,200" →
 * the number, anything else (or negative) = invalid (null).
 */
export function parsePrice(text: string): number | undefined | null {
	const t = text.replace(/[฿,\s]/g, '');
	if (t === '') return undefined;
	if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
	return Number(t);
}

/** A typed volume number: 1, 12, 4.5 (fits the 0.1-precision column); else null */
export function parseVolume(text: string): number | null {
	const t = text.trim();
	if (!/^\d{1,3}(\.\d)?$/.test(t)) return null;
	const n = Number(t);
	return n > 0 ? n : null;
}
