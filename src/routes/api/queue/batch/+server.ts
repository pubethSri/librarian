import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { lockQueueOrder } from '$lib/server/locks';
import { dequeue, enqueue, queueItems } from '$lib/server/queue';
import { parseBody, queueBatchBody } from '$lib/server/validation';

// POST /api/queue/batch — { bookIds }: queue several books at the end, in the order
// given (Add to queue → "the rest you own" / "Read from the start"). Books already
// queued are skipped and keep their place. → { items: QueueItem[] (the newly
// queued, in order), skipped }.
export const POST: RequestHandler = async ({ request }) => {
	const { bookIds } = await parseBody(request, queueBatchBody);

	const found = await db.select({ id: books.id }).from(books).where(inArray(books.id, bookIds));
	if (found.length !== bookIds.length) {
		const have = new Set(found.map((b) => b.id));
		throw error(404, `Book not found: ${bookIds.filter((id) => !have.has(id)).join(', ')}`);
	}

	const items = await db.transaction(async (tx) => {
		await lockQueueOrder(tx);
		const added = await enqueue(tx, bookIds, 'end');
		return added.length > 0 ? queueItems(tx, added) : [];
	});

	return json({ items, skipped: bookIds.length - items.length }, { status: 201 });
};

// DELETE /api/queue/batch — { bookIds }: take several books out (the Undo of a
// POST). Books not queued are ignored. → { bookIds } as sent.
export const DELETE: RequestHandler = async ({ request }) => {
	const { bookIds } = await parseBody(request, queueBatchBody);
	await dequeue(db, bookIds);
	return json({ bookIds });
};
