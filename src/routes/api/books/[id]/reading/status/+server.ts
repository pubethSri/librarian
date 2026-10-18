import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { checkReadDays, dayToDate, latestDay } from '$lib/reading';
import { applyReadingStatus, readingSummary } from '$lib/server/reading';
import { idParam, parseBody, readingStatusBody } from '$lib/server/validation';

// PUT /api/books/[id]/reading/status — Set the book's current reading status
// (start, re-read start, drop, correct), per the rules in $lib/reading. `on` is the
// calendar day to stamp (`YYYY-MM-DD`, the phone's today by default; null = unknown);
// without it the server's UTC day. Finished reads go through POST …/reading/log.
export const PUT: RequestHandler = async ({ params, request }) => {
	const bookId = idParam(params.id, 'book ID');
	const body = await parseBody(request, readingStatusBody);
	const now = new Date();
	const on: string | null = body.on === undefined ? now.toISOString().slice(0, 10) : body.on;
	const problem = checkReadDays(on, null, latestDay(now));
	if (problem) throw error(400, problem.replace('start day', 'day'));

	const bookExists = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!bookExists) throw error(404, 'Book not found');

	const result = await db.transaction(async (tx) => {
		const changed = await applyReadingStatus(tx, [bookId], body.status, on ? dayToDate(on) : null);
		return { changed, ...(await readingSummary(tx, bookId)) };
	});

	return json(result);
};
