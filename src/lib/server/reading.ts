import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reading } from '$lib/server/db/schema';
import { latestReading, planReadingChange } from '$lib/reading';
import type { ReadingStatus } from '$lib/types';

export const READING_STATUSES: readonly ReadingStatus[] = ['unread', 'reading', 'read', 'dropped'];

export function isReadingStatus(value: unknown): value is ReadingStatus {
	return typeof value === 'string' && (READING_STATUSES as readonly string[]).includes(value);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Set the current reading status of each book, following the rules in
 * `$lib/reading`. Runs inside the caller's transaction.
 *
 * @param now timestamp to stamp, or null for "date unknown" (backfill)
 * @param options.allowReread whether Read → Reading may start a re-read (a new
 *   row). Off for bulk backfill, so a re-read is always a deliberate per-book act.
 * @returns how many books actually changed
 */
export async function applyReadingStatus(
	tx: Tx,
	bookIds: number[],
	target: ReadingStatus,
	now: Date | null,
	options: { allowReread: boolean } = { allowReread: true }
): Promise<number> {
	if (bookIds.length === 0) return 0;

	const rows = await tx.select().from(reading).where(inArray(reading.bookId, bookIds));
	const byBook = new Map<number, (typeof rows)[number][]>();
	for (const r of rows) {
		const list = byBook.get(r.bookId) ?? [];
		list.push(r);
		byBook.set(r.bookId, list);
	}

	let changed = 0;
	for (const bookId of bookIds) {
		const latest = latestReading(byBook.get(bookId) ?? []);
		if (!options.allowReread && latest?.status === 'read' && target === 'reading') continue;
		const change = planReadingChange(latest, target, now);
		if (change.kind === 'update') {
			await tx.update(reading).set(change.set).where(eq(reading.id, change.id));
			changed++;
		} else if (change.kind === 'insert') {
			await tx.insert(reading).values({ bookId, ...change.values });
			changed++;
		}
	}
	return changed;
}
