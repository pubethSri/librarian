import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { readingQueue } from '$lib/server/db/schema';
import { reorder } from '$lib/queue';
import { lockQueueOrder } from '$lib/server/locks';
import { queueItems, queueOrder } from '$lib/server/queue';
import { parseBody, queueOrderBody } from '$lib/server/validation';

// PUT /api/queue/order — { bookIds }: the queue top first. Ids no longer queued are
// ignored; queued books missing from the list keep their order after the rest
// (`reorder` in $lib/queue). Returns the queue (QueueItem[]).
export const PUT: RequestHandler = async ({ request }) => {
	const { bookIds } = await parseBody(request, queueOrderBody);

	const items = await db.transaction(async (tx) => {
		// One reorder at a time, so two devices can't interleave their positions
		await lockQueueOrder(tx);
		const order = reorder(await queueOrder(tx), bookIds);
		for (const [i, bookId] of order.entries()) {
			await tx
				.update(readingQueue)
				.set({ position: i + 1 })
				.where(eq(readingQueue.bookId, bookId));
		}
		return queueItems(tx);
	});

	return json(items);
};
