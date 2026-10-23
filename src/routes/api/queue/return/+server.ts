import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { books, reading } from '$lib/server/db/schema';
import { planUnstart } from '$lib/reading';
import { lockQueueOrder } from '$lib/server/locks';
import { enqueue } from '$lib/server/queue';
import { readingSummary } from '$lib/server/reading';
import { parseBody, queueAddBody } from '$lib/server/validation';

// POST /api/queue/return — { bookId }: "Back to the queue" for a book being read.
// The start never happened (`planUnstart`: the read-through being read is removed,
// so a first read is Unread again and a re-read Read again), and the book goes to
// the top of the queue. Not being read → 409. → ReadingSummary.
export const POST: RequestHandler = async ({ request }) => {
	const { bookId } = await parseBody(request, queueAddBody);

	const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!book) throw error(404, 'Book not found');

	const summary = await db.transaction(async (tx) => {
		const rows = await tx.select().from(reading).where(eq(reading.bookId, bookId));
		const id = planUnstart(rows);
		if (id === null) return null;
		await tx.delete(reading).where(eq(reading.id, id));
		await lockQueueOrder(tx);
		await enqueue(tx, [bookId], 'top');
		return readingSummary(tx, bookId);
	});
	if (!summary) throw error(409, 'This book is not being read');

	return json(summary);
};
