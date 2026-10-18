import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { books, readingQueue } from '$lib/server/db/schema';
import { queueItems } from '$lib/server/queue';
import { parseBody, queueAddBody } from '$lib/server/validation';

// GET /api/queue — the reading queue, top first (QueueItem[]). Rules in $lib/queue.
export const GET: RequestHandler = async () => {
	return json(await queueItems(db));
};

// POST /api/queue — { bookId }: add an owned book at the end. Already queued → 200 with
// its entry, unchanged; newly queued → 201. Returns the QueueItem.
export const POST: RequestHandler = async ({ request }) => {
	const { bookId } = await parseBody(request, queueAddBody);

	const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!book) throw error(404, 'Book not found');

	const inserted = await db
		.insert(readingQueue)
		.values({
			bookId,
			position: sql`(select coalesce(max(${readingQueue.position}), 0) + 1 from ${readingQueue})`
		})
		.onConflictDoNothing({ target: readingQueue.bookId })
		.returning({ id: readingQueue.id });

	const [item] = await queueItems(db, [bookId]);
	return json(item, { status: inserted.length > 0 ? 201 : 200 });
};
