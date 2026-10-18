import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logRead, readingSummary, ReadingDaysError } from '$lib/server/reading';
import { idParam, logReadBody, parseBody } from '$lib/server/validation';

// POST /api/books/[id]/reading/log — "I read this": a finished read-through with the
// days picked ({ finishedOn, startedOn? }, `YYYY-MM-DD` or null). On a Read book it
// adds a re-read. Rules in $lib/reading (planLogRead). Returns the book's ReadingSummary.
export const POST: RequestHandler = async ({ params, request }) => {
	const bookId = idParam(params.id, 'book ID');
	const { finishedOn, startedOn } = await parseBody(request, logReadBody, { optional: true });

	const bookExists = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!bookExists) throw error(404, 'Book not found');

	try {
		const summary = await db.transaction(async (tx) => {
			await logRead(tx, bookId, { finishedOn, startedOn }, new Date());
			return readingSummary(tx, bookId);
		});
		return json(summary);
	} catch (err) {
		if (err instanceof ReadingDaysError) throw error(400, err.message);
		throw err;
	}
};
