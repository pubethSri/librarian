import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookfairs, books } from '$lib/server/db/schema';
import { eq, count, sum } from 'drizzle-orm';

// GET /api/bookfairs/[id] — Get a single bookfair with stats
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid bookfair ID');

	const [result] = await db
		.select({
			id: bookfairs.id,
			name: bookfairs.name,
			date: bookfairs.date,
			location: bookfairs.location,
			createdAt: bookfairs.createdAt,
			bookCount: count(books.id),
			totalSpent: sum(books.price)
		})
		.from(bookfairs)
		.leftJoin(books, eq(bookfairs.id, books.sourceEventId))
		.where(eq(bookfairs.id, id))
		.groupBy(bookfairs.id);

	if (!result) throw error(404, 'Bookfair not found');

	return json({
		...result,
		totalSpent: result.totalSpent ? Number(result.totalSpent) : 0
	});
};

// PATCH /api/bookfairs/[id] — Update a bookfair
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid bookfair ID');

	const existing = await db.query.bookfairs.findFirst({ where: eq(bookfairs.id, id) });
	if (!existing) throw error(404, 'Bookfair not found');

	const body = await request.json();

	const [updated] = await db
		.update(bookfairs)
		.set({
			...(body.name !== undefined && { name: body.name }),
			...(body.date !== undefined && { date: body.date }),
			...(body.location !== undefined && { location: body.location })
		})
		.where(eq(bookfairs.id, id))
		.returning();

	return json(updated);
};

// DELETE /api/bookfairs/[id] — Delete a bookfair
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid bookfair ID');

	const existing = await db.query.bookfairs.findFirst({ where: eq(bookfairs.id, id) });
	if (!existing) throw error(404, 'Bookfair not found');

	await db.delete(bookfairs).where(eq(bookfairs.id, id));

	return json({ success: true });
};
