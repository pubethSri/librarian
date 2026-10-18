import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reading, books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { dayToDate, isDay } from '$lib/reading';
import { createReadingBody, idParam, parseBody } from '$lib/server/validation';

// GET /api/books/[id]/reading — Get reading history for a book
export const GET: RequestHandler = async ({ params }) => {
	const bookId = idParam(params.id, 'book ID');

	const bookExists = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!bookExists) throw error(404, 'Book not found');

	const result = await db.query.reading.findMany({
		where: eq(reading.bookId, bookId),
		orderBy: (reading, { desc }) => [desc(reading.createdAt), desc(reading.id)]
	});

	return json(result);
};

// POST /api/books/[id]/reading — Create a new reading entry
export const POST: RequestHandler = async ({ params, request }) => {
	const bookId = idParam(params.id, 'book ID');

	const bookExists = await db.query.books.findFirst({ where: eq(books.id, bookId) });
	if (!bookExists) throw error(404, 'Book not found');

	const body = await parseBody(request, createReadingBody);
	const instant = (value: string | null | undefined) =>
		value ? (isDay(value) ? dayToDate(value) : new Date(value)) : null;

	const [created] = await db
		.insert(reading)
		.values({
			bookId,
			status: body.status ?? 'unread',
			startedAt: instant(body.startedAt),
			finishedAt: instant(body.finishedAt),
			rating: body.rating ?? null,
			notes: body.notes || null
		})
		.returning();

	return json(created, { status: 201 });
};
