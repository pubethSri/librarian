import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { applyReadingStatus, isReadingStatus } from '$lib/server/reading';

// PUT /api/books/[id]/reading/status — Set the book's current reading status.
// Mark read / re-read / correct, per the rules in $lib/reading. Dated "now".
export const PUT: RequestHandler = async ({ params, request }) => {
	const bookId = Number(params.id);
	if (isNaN(bookId)) throw error(400, 'Invalid book ID');

	const body = await request.json();
	if (!isReadingStatus(body.status)) throw error(400, 'Invalid reading status');

	const bookExists = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!bookExists) throw error(404, 'Book not found');

	const changed = await db.transaction((tx) =>
		applyReadingStatus(tx, [bookId], body.status, new Date())
	);

	return json({ changed });
};
