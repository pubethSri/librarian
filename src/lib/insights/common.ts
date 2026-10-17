// ─── Insights: shared facts ─────────────────────────────────────────────────
// The raw rows GET /api/insights loads, turned into one fact per book, plus the
// date and money helpers every insight uses. Pure — no DB, no runes; tested.
//
// Rules (STATUS.md decisions):
// - Reading status comes from $lib/reading: current status = newest row,
//   times read = number of Read rows.
// - Extras are real books: they count in owned / bought / spent / read.
// - A price is a lower bound; an unpriced book is never ฿0 (see Money).
// - Purchase and reading dates are calendar days stored as UTC midnight
//   (dayOf); only "today" depends on the viewer's time zone.

import { currentStatus, timesRead } from '$lib/reading';
import { dayOf } from '$lib/console/logic';
import type {
	BookSource,
	Money,
	ReadingStatus,
	ReadState,
	ReadStateCounts,
	SeriesStatus,
	SeriesType
} from '$lib/types';

/** What the insights endpoint loads: plain rows, dates as ISO strings */
export type InsightsInput = {
	books: {
		id: number;
		seriesId: number;
		volumeNumber: string;
		isExtra: boolean;
		boughtAt: string | null;
		price: string | null;
		source: BookSource | null;
		sourceEventId: number | null;
	}[];
	readings: {
		id: number;
		bookId: number;
		status: ReadingStatus;
		startedAt: string | null;
		finishedAt: string | null;
		createdAt: string;
	}[];
	series: {
		id: number;
		shortName: string;
		type: SeriesType;
		status: SeriesStatus;
		publisher: string | null;
	}[];
	seriesTags: { seriesId: number; tagName: string }[];
	bookfairs: { id: number; name: string; date: string }[];
};

export type BookFact = {
	id: number;
	seriesId: number;
	volumeNumber: number;
	isExtra: boolean;
	type: SeriesType;
	/** Purchase day `YYYY-MM-DD`, null when unknown */
	boughtDay: string | null;
	/** null = unpriced, never 0 */
	price: number | null;
	source: BookSource | null;
	sourceEventId: number | null;
	status: ReadingStatus;
	timesRead: number;
	readState: ReadState;
	/** The finish day of each dated Read row, in the viewer's time zone */
	finishedDays: string[];
};

export const READ_STATES: readonly ReadState[] = ['read', 'reading', 'unread', 'dropped'];

export function emptyCounts(): ReadStateCounts {
	return { read: 0, reading: 0, unread: 0, dropped: 0 };
}

/** Read once read at least once (a re-read stays Read); otherwise the current status */
export function readStateOf(status: ReadingStatus, times: number): ReadState {
	return times > 0 ? 'read' : status;
}

/** The time zone if the runtime knows it, else UTC */
export function safeTimeZone(timeZone: string | null | undefined): string {
	if (!timeZone) return 'UTC';
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
		return timeZone;
	} catch {
		return 'UTC';
	}
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar day `YYYY-MM-DD` an instant falls on in a time zone */
export function dayInZone(instant: string | Date, timeZone: string): string {
	let format = dayFormatters.get(timeZone);
	if (!format) {
		// en-CA formats as YYYY-MM-DD
		format = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		dayFormatters.set(timeZone, format);
	}
	return format.format(new Date(instant));
}

/** `YYYY-MM-DD` → `YYYY-MM` */
export function monthOf(day: string): string {
	return day.slice(0, 7);
}

/** `YYYY-MM` shifted by n months */
export function addMonths(month: string, n: number): string {
	const [y, m] = month.split('-').map(Number);
	const index = y * 12 + (m - 1) + n;
	const year = Math.floor(index / 12);
	return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Every month from `from` to `to`, both included; empty when from > to */
export function monthRange(from: string, to: string): string[] {
	const months: string[] = [];
	for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
	return months;
}

/** Whole days from day a to day b (b − a) */
export function daysBetween(a: string, b: string): number {
	return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** The money a set of books cost — priced books only, with coverage */
export function moneyOf(books: readonly { price: number | null }[]): Money {
	let total = 0;
	let priced = 0;
	for (const b of books) {
		if (b.price === null) continue;
		total += b.price;
		priced++;
	}
	return { total, priced, of: books.length };
}

/** Count books per read state */
export function countReadStates(books: readonly { readState: ReadState }[]): ReadStateCounts {
	const counts = emptyCounts();
	for (const b of books) counts[b.readState]++;
	return counts;
}

/**
 * One fact per book; books whose series is missing are skipped. Finish days
 * are calendar days (stored as UTC midnight, like purchase dates — STATUS.md →
 * Reading-flow Decisions 2026-10-16), so no time zone is needed.
 */
export function buildBookFacts(input: InsightsInput): BookFact[] {
	const typeBySeries = new Map(input.series.map((s) => [s.id, s.type]));
	const rowsByBook = new Map<number, InsightsInput['readings']>();
	for (const row of input.readings) {
		const list = rowsByBook.get(row.bookId) ?? [];
		list.push(row);
		rowsByBook.set(row.bookId, list);
	}

	const facts: BookFact[] = [];
	for (const b of input.books) {
		const type = typeBySeries.get(b.seriesId);
		if (!type) continue;
		const rows = rowsByBook.get(b.id) ?? [];
		const status = currentStatus(rows);
		const times = timesRead(rows);
		const price = b.price === null || b.price === '' ? null : Number(b.price);
		facts.push({
			id: b.id,
			seriesId: b.seriesId,
			volumeNumber: Number(b.volumeNumber),
			isExtra: b.isExtra,
			type,
			boughtDay: dayOf(b.boughtAt),
			price: price !== null && Number.isFinite(price) ? price : null,
			source: b.source,
			sourceEventId: b.sourceEventId,
			status,
			timesRead: times,
			readState: readStateOf(status, times),
			finishedDays: rows
				.filter((r) => r.status === 'read' && r.finishedAt)
				.map((r) => dayOf(r.finishedAt) as string)
				.sort()
		});
	}
	return facts;
}
