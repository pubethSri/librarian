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

	// Build update fields
	const updateFields: Record<string, unknown> = {};
	if (body.volumeNumber !== undefined) updateFields.volumeNumber = Number(body.volumeNumber).toFixed(1);
	if (body.location !== undefined) updateFields.location = body.location;
	if (body.boughtAt !== undefined) updateFields.boughtAt = body.boughtAt ? new Date(body.boughtAt) : null;
	if (body.price !== undefined) updateFields.price = body.price;
	if (body.source !== undefined) updateFields.source = body.source;
	if (body.sourceEventId !== undefined) updateFields.sourceEventId = body.sourceEventId;
	if (body.isDraft !== undefined) updateFields.isDraft = body.isDraft;

	// Clear sourceEventId if source is changed away from 'bookfair'
	if (body.source !== undefined && body.source !== 'bookfair') {
		updateFields.sourceEventId = null;
	}

	updateFields.updatedAt = new Date();

	const [updated] = await db
		.update(books)
		.set(updateFields)
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
