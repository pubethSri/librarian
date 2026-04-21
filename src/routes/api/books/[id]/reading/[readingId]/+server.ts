import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reading } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// PATCH /api/books/[id]/reading/[readingId] — Update a reading entry
export const PATCH: RequestHandler = async ({ params, request }) => {
	const bookId = Number(params.id);
	const readingId = Number(params.readingId);
	if (isNaN(bookId) || isNaN(readingId)) throw error(400, 'Invalid ID');

	const existing = await db.query.reading.findFirst({
		where: and(eq(reading.id, readingId), eq(reading.bookId, bookId))
	});
	if (!existing) throw error(404, 'Reading entry not found');

	const body = await request.json();

	const [updated] = await db
		.update(reading)
		.set({
			...(body.status !== undefined && { status: body.status }),
			...(body.startedAt !== undefined && {
				startedAt: body.startedAt ? new Date(body.startedAt) : null
			}),
			...(body.finishedAt !== undefined && {
				finishedAt: body.finishedAt ? new Date(body.finishedAt) : null
			}),
			...(body.rating !== undefined && { rating: body.rating }),
			...(body.notes !== undefined && { notes: body.notes })
		})
		.where(eq(reading.id, readingId))
		.returning();

	return json(updated);
};
