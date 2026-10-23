import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { books, reading, readingQueue, series } from '$lib/server/db/schema';
import { currentStatus, timesRead } from '$lib/reading';
import type { QueueItem } from '$lib/types';

// Server side of the reading queue (rules in $lib/queue). The pool rule — a book
// leaves the queue when started or finished — is applied by $lib/server/reading,
// inside the same transaction as the reading change.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

/** Take books out of the queue (no-op for books not queued) */
export async function dequeue(tx: Db, bookIds: number[]): Promise<void> {
	if (bookIds.length === 0) return;
	await tx.delete(readingQueue).where(inArray(readingQueue.bookId, bookIds));
}

/** Whether a book is queued */
export async function isQueued(tx: Db, bookId: number): Promise<boolean> {
	const [row] = await tx
		.select({ id: readingQueue.id })
		.from(readingQueue)
		.where(eq(readingQueue.bookId, bookId));
	return row !== undefined;
}

/** Of these books, the queued ones */
export async function queuedAmong(tx: Db, bookIds: number[]): Promise<Set<number>> {
	if (bookIds.length === 0) return new Set();
	const rows = await tx
		.select({ bookId: readingQueue.bookId })
		.from(readingQueue)
		.where(inArray(readingQueue.bookId, bookIds));
	return new Set(rows.map((r) => r.bookId));
}

/** Queued book ids, top first */
export async function queueOrder(tx: Db): Promise<number[]> {
	const rows = await tx
		.select({ bookId: readingQueue.bookId })
		.from(readingQueue)
		.orderBy(asc(readingQueue.position), asc(readingQueue.id));
	return rows.map((r) => r.bookId);
}

/** The queue as the client shows it, top first (`bookIds` narrows it to those books) */
export async function queueItems(tx: Db, bookIds?: number[]): Promise<QueueItem[]> {
	const rows = await tx
		.select({
			bookId: readingQueue.bookId,
			position: readingQueue.position,
			addedAt: readingQueue.addedAt,
			seriesId: books.seriesId,
			seriesShortName: series.shortName,
			seriesFullName: series.fullName,
			volumeNumber: books.volumeNumber,
			isExtra: books.isExtra,
			title: books.title,
			location: books.location,
			isDraft: books.isDraft
		})
		.from(readingQueue)
		.innerJoin(books, eq(readingQueue.bookId, books.id))
		.innerJoin(series, eq(books.seriesId, series.id))
		.where(bookIds ? inArray(readingQueue.bookId, bookIds) : undefined)
		.orderBy(asc(readingQueue.position), asc(readingQueue.id));
	if (rows.length === 0) return [];

	const readingRows = await tx
		.select({
			id: reading.id,
			bookId: reading.bookId,
			status: reading.status,
			startedAt: reading.startedAt,
			finishedAt: reading.finishedAt,
			createdAt: reading.createdAt
		})
		.from(reading)
		.where(
			inArray(
				reading.bookId,
				rows.map((r) => r.bookId)
			)
		);
	const byBook = new Map<number, (typeof readingRows)[number][]>();
	for (const r of readingRows) {
		const list = byBook.get(r.bookId) ?? [];
		list.push(r);
		byBook.set(r.bookId, list);
	}

	return rows.map((r) => {
		const list = byBook.get(r.bookId) ?? [];
		return {
			...r,
			addedAt: r.addedAt.toISOString(),
			readingStatus: currentStatus(list),
			timesRead: timesRead(list)
		};
	});
}
