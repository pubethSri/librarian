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
