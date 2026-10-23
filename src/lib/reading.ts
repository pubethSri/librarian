// ─── Reading rules ──────────────────────────────────────────────────────────
// Pure functions that turn "set this book to status X" into a change to its
// reading rows. Shared by the single-book endpoint and the Console bulk edit,
// and by the client for display. No DB, no runes — unit-tested.
//
// The agreed rules (STATUS.md → Bookfair-release Decisions):
// - A book's current status is its newest reading row; no rows means Unread.
// - Times read = how many of its rows are Read. Derived, never stored.
// - Only a re-read (Read → Reading) creates a row; every other change edits
//   the current row.
// - `now = null` means "date unknown" (bulk backfill): no dates are stamped.

import type { ReadingStatus } from '$lib/types';

/** The fields of a reading row the rules look at */
export type ReadingRowLike = {
	id: number;
	status: ReadingStatus;
	startedAt: string | Date | null;
	finishedAt: string | Date | null;
	createdAt: string | Date;
};

export type ReadingDates = { startedAt?: Date | null; finishedAt?: Date | null };

export type ReadingChange =
	| { kind: 'none' }
	| { kind: 'update'; id: number; set: { status: ReadingStatus } & ReadingDates }
	| {
			kind: 'insert';
			values: { status: ReadingStatus; startedAt: Date | null; finishedAt: Date | null };
	  };

/** The newest row — by createdAt, then id (rows created in one transaction tie) */
export function latestReading<T extends ReadingRowLike>(rows: readonly T[]): T | null {
	let latest: T | null = null;
	for (const row of rows) {
		if (!latest) {
			latest = row;
			continue;
		}
		const a = new Date(row.createdAt).getTime();
		const b = new Date(latest.createdAt).getTime();
		if (a > b || (a === b && row.id > latest.id)) latest = row;
	}
	return latest;
}

export function currentStatus(rows: readonly ReadingRowLike[]): ReadingStatus {
	return latestReading(rows)?.status ?? 'unread';
}

export function timesRead(rows: readonly ReadingRowLike[]): number {
	return rows.filter((r) => r.status === 'read').length;
}

/**
 * What to do to a book's reading rows so its current status becomes `target`.
 *
 * @param latest the book's newest reading row, or null if it has none
 * @param now    the timestamp to stamp, or null for "date unknown" (backfill)
 */
/**
 * "Back to the queue" for a book being read: the start never happened. The
 * read-through being read is removed — a first read goes back to Unread, a
 * re-read to Read (and a resumed Dropped one too: dropping stays in history only
 * if it's an earlier row). Returns that row's id; null when not being read.
 */
export function planUnstart<T extends ReadingRowLike>(rows: readonly T[]): T['id'] | null {
	const latest = latestReading(rows);
	return latest?.status === 'reading' ? latest.id : null;
}

export function planReadingChange(
	latest: ReadingRowLike | null,
	target: ReadingStatus,
	now: Date | null
): ReadingChange {
	if (!latest) {
		if (target === 'unread') return { kind: 'none' };
		return {
			kind: 'insert',
			values: {
				status: target,
				startedAt: target === 'reading' ? now : null,
				finishedAt: target === 'read' ? now : null
			}
		};
	}

	if (latest.status === target) return { kind: 'none' };

	// Re-read: a finished book goes back to Reading as a new read-through
	if (latest.status === 'read' && target === 'reading') {
		return { kind: 'insert', values: { status: 'reading', startedAt: now, finishedAt: null } };
	}

	switch (target) {
		case 'unread':
			// A correction: the current read-through never happened
			return {
				kind: 'update',
				id: latest.id,
				set: { status: 'unread', startedAt: null, finishedAt: null }
			};
		case 'reading':
			// Unread → start; Dropped → resume (keeps an existing start date)
			return {
				kind: 'update',
				id: latest.id,
				set: latest.startedAt
					? { status: 'reading', finishedAt: null }
					: { status: 'reading', startedAt: now, finishedAt: null }
			};
		case 'read':
			return { kind: 'update', id: latest.id, set: { status: 'read', finishedAt: now } };
		case 'dropped':
			return { kind: 'update', id: latest.id, set: { status: 'dropped', finishedAt: null } };
	}
}

// ─── Logging a read after the fact ──────────────────────────────────────────
// STATUS.md → Reading-flow Decisions 2026-10-16: a read is logged once, when
// you remember, with the day you pick. Reading dates are calendar days, stored
// like purchase dates — UTC midnight — so no time zone shifts the day.

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day written `YYYY-MM-DD` */
export function isDay(value: unknown): value is string {
	if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** A calendar day as stored: UTC midnight */
export function dayToDate(day: string): Date {
	return new Date(`${day}T00:00:00Z`);
}

/** The calendar day a stored reading date stands for */
export function rowDay(value: string | Date | null): string | null {
	return value ? new Date(value).toISOString().slice(0, 10) : null;
}

/** `YYYY-MM-DD` moved by n days */
export function shiftDay(day: string, n: number): string {
	return new Date(dayToDate(day).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The latest day that is already "today" somewhere (UTC+14). The server
 * can't know the phone's time zone, so this is its "not in the future" bound;
 * the client checks against its own today.
 */
export function latestDay(now: Date): string {
	return new Date(now.getTime() + 14 * 3_600_000).toISOString().slice(0, 10);
}

/** Checks a read-through's days: none in the future, finish not before start. Error or null */
export function checkReadDays(
	startedOn: string | null,
	finishedOn: string | null,
	maxDay: string
): string | null {
	if (startedOn && startedOn > maxDay) return 'The start day is in the future';
	if (finishedOn && finishedOn > maxDay) return 'The finish day is in the future';
	if (startedOn && finishedOn && finishedOn < startedOn) {
		return 'The finish day is before the start day';
	}
	return null;
}

/**
 * "I read this". `finishedOn` null = finished, day unknown. `startedOn`
 * undefined = keep the start already recorded; null = no start day.
 */
export type LogRead = { finishedOn: string | null; startedOn?: string | null };

/**
 * What "I read this" does to a book's reading rows:
 * - Unread / Reading / Dropped: completes the current row (a recorded start
 *   is kept unless a start is given);
 * - Read, or no rows yet: a new Read row — on a Read book, a re-read logged
 *   in one step.
 * Also returns the start day in effect, for `checkReadDays`.
 */
export function planLogRead(
	latest: ReadingRowLike | null,
	log: LogRead
): { change: ReadingChange; startedOn: string | null } {
	const finishedAt = log.finishedOn ? dayToDate(log.finishedOn) : null;

	if (!latest || latest.status === 'read') {
		const startedOn = log.startedOn ?? null;
		return {
			startedOn,
			change: {
				kind: 'insert',
				values: { status: 'read', startedAt: startedOn ? dayToDate(startedOn) : null, finishedAt }
			}
		};
	}

	const startedOn = log.startedOn === undefined ? rowDay(latest.startedAt) : log.startedOn;
	return {
		startedOn,
		change: {
			kind: 'update',
			id: latest.id,
			set:
				log.startedOn === undefined
					? { status: 'read', finishedAt }
					: { status: 'read', startedAt: startedOn ? dayToDate(startedOn) : null, finishedAt }
		}
	};
}
