// ─── Insights: backlog (tsundoku) ───────────────────────────────────────────
// The unread pile, how fast it grows and shrinks, and how long it would take
// to clear. Rates only use dated events: purchases with a date, and Read rows
// with a finish date — a rate from too few dated reads is reported as unknown,
// never as a number. Pure; tested.

import type { InsightsBacklog, SeriesType } from '$lib/types';
import {
	addMonths,
	daysBetween,
	monthOf,
	monthRange,
	type BookFact,
	type InsightsInput
} from './common';

/** Below this, the read rate is unknown */
export const MIN_DATED_READS = 5;
/** …and the first dated read must be at least this many days ago */
export const MIN_READ_SPAN_DAYS = 30;

const DAYS_PER_MONTH = 365.25 / 12;
const OLDEST_LIMIT = 5;

/** `YYYY-MM-DD` shifted by n days */
function shiftDay(day: string, n: number): string {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Every dated read's finish day (re-reads included), oldest first */
export function finishDays(facts: readonly BookFact[]): string[] {
	return facts.flatMap((b) => b.finishedDays).sort();
}

/** Books bought per month over the 365 days up to today */
export function buyRate(facts: readonly BookFact[], today: string): number {
	const from = shiftDay(today, -365);
	const bought = facts.filter((b) => b.boughtDay && b.boughtDay > from && b.boughtDay <= today);
	return bought.length / 12;
}

/**
 * Dated reads per month over the last 365 days — or since the first dated read
 * when that is more recent. null below MIN_DATED_READS / MIN_READ_SPAN_DAYS.
 */
export function readRate(days: readonly string[], today: string): number | null {
	const past = days.filter((d) => d <= today);
	if (past.length < MIN_DATED_READS) return null;
	if (daysBetween(past[0], today) < MIN_READ_SPAN_DAYS) return null;
	const yearAgo = shiftDay(today, -365);
	const from = past[0] > yearAgo ? past[0] : yearAgo;
	const inWindow = past.filter((d) => d >= from).length;
	return inWindow / (daysBetween(from, today) / DAYS_PER_MONTH);
}

export function clearEstimate(
	pile: number,
	buy: number,
	read: number | null
): InsightsBacklog['clear'] {
	if (read === null) return { kind: 'unknown' };
	if (pile === 0) return { kind: 'months', months: 0 };
	const net = read - buy;
	if (net <= 0) return { kind: 'never' };
	return { kind: 'months', months: pile / net };
}

export function computeBacklog(
	facts: readonly BookFact[],
	series: InsightsInput['series'],
	today: string
): InsightsBacklog {
	const seriesById = new Map(series.map((s) => [s.id, s]));
	const pileBooks = facts.filter((b) => b.readState === 'unread');

	const pileByType: Record<SeriesType, number> = { light_novel: 0, manga: 0 };
	for (const b of pileBooks) pileByType[b.type]++;

	const oldestUnread = pileBooks
		.filter((b) => b.boughtDay !== null)
		.sort(
			(a, b) =>
				(a.boughtDay as string).localeCompare(b.boughtDay as string) ||
				a.seriesId - b.seriesId ||
				a.volumeNumber - b.volumeNumber
		)
		.slice(0, OLDEST_LIMIT)
		.map((b) => ({
			bookId: b.id,
			seriesId: b.seriesId,
			seriesShortName: seriesById.get(b.seriesId)?.shortName ?? '?',
			volumeNumber: b.volumeNumber,
			isExtra: b.isExtra,
			title: b.title,
			boughtDay: b.boughtDay as string
		}));

	const days = finishDays(facts);
	const buy = buyRate(facts, today);
	const read = readRate(days, today);

	const thisMonth = monthOf(today);
	const months = monthRange(addMonths(thisMonth, -11), thisMonth);
	const bought = new Map<string, number>();
	for (const b of facts) {
		if (b.boughtDay) bought.set(monthOf(b.boughtDay), (bought.get(monthOf(b.boughtDay)) ?? 0) + 1);
	}
	const reads = new Map<string, number>();
	for (const d of days) reads.set(monthOf(d), (reads.get(monthOf(d)) ?? 0) + 1);

	// Series where nothing has been touched: every owned book still Unread
	const booksBySeries = new Map<number, BookFact[]>();
	for (const b of facts) {
		const list = booksBySeries.get(b.seriesId) ?? [];
		list.push(b);
		booksBySeries.set(b.seriesId, list);
	}
	const neverStarted = [...booksBySeries.entries()]
		.filter(([, list]) => list.every((b) => b.readState === 'unread'))
		.map(([seriesId, list]) => {
			const s = seriesById.get(seriesId);
			return {
				seriesId,
				shortName: s?.shortName ?? '?',
				type: list[0].type,
				status: s?.status ?? 'ongoing',
				owned: list.length
			};
		})
		.sort((a, b) => b.owned - a.owned || a.shortName.localeCompare(b.shortName));

	return {
		pile: pileBooks.length,
		pileByType,
		oldestUnread,
		undatedPile: pileBooks.filter((b) => b.boughtDay === null).length,
		buyRate: buy,
		readRate: read,
		datedReads: days.length,
		clear: clearEstimate(pileBooks.length, buy, read),
		clearWithoutBuying: read === null || read === 0 ? null : pileBooks.length / read,
		monthly: months.map((month) => ({
			month,
			bought: bought.get(month) ?? 0,
			read: reads.get(month) ?? 0
		})),
		neverStarted
	};
}
