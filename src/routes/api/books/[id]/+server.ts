import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/books/[id] — Get single book with reading history
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid book ID');

	const result = await db.query.books.findFirst({
		where: eq(books.id, id),
		with: {
			series: true,
			readings: {
				orderBy: (reading, { desc }) => [desc(reading.createdAt)]
			},
			sourceEvent: true
		}
	});

	if (!result) throw error(404, 'Book not found');

	return json(result);
};

// PATCH /api/books/[id] — Update a book
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid book ID');

	const body = await request.json();

	const existing = await db.query.books.findFirst({ where: eq(books.id, id) });
	if (!existing) throw error(404, 'Book not found');

	const [updated] = await db
		.update(books)
		.set({
			...(body.volumeNumber !== undefined && { volumeNumber: Number(body.volumeNumber).toFixed(1) }),
			...(body.location !== undefined && { location: body.location }),
			...(body.boughtAt !== undefined && { boughtAt: body.boughtAt ? new Date(body.boughtAt) : null }),
			...(body.price !== undefined && { price: body.price }),
			...(body.source !== undefined && { source: body.source }),
			...(body.sourceEventId !== undefined && { sourceEventId: body.sourceEventId }),
			...(body.isDraft !== undefined && { isDraft: body.isDraft }),
			updatedAt: new Date()
		})
		.where(eq(books.id, id))
		.returning();

	return json(updated);
};

// DELETE /api/books/[id] — Delete a book
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid book ID');

	const existing = await db.query.books.findFirst({ where: eq(books.id, id) });
	if (!existing) throw error(404, 'Book not found');

	await db.delete(books).where(eq(books.id, id));

	return json({ success: true });
};
