import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { dequeue } from '$lib/server/queue';
import { idParam } from '$lib/server/validation';

// DELETE /api/queue/[bookId] — take a book out of the queue (a no-op if it isn't queued)
export const DELETE: RequestHandler = async ({ params }) => {
	const bookId = idParam(params.bookId, 'book ID');
	await dequeue(db, [bookId]);
	return json({ bookId, queued: false });
};
