import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookfairs, books } from '$lib/server/db/schema';
import { and, eq, count, sql, sum } from 'drizzle-orm';

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
	const dateChanged = body.date !== undefined && body.date !== existing.date;

	const result = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(bookfairs)
			.set({
				...(body.name !== undefined && { name: body.name }),
				...(body.date !== undefined && { date: body.date }),
				...(body.location !== undefined && { location: body.location })
			})
			.where(eq(bookfairs.id, id))
			.returning();

		// Optionally carry linked books along with the date fix — only those
		// still dated exactly the old fair day (purchase dates are stored as UTC
		// midnight), so a date entered on purpose is left alone
		let movedBooks = 0;
		if (dateChanged && body.moveBookDates === true) {
			const moved = await tx
				.update(books)
				.set({ boughtAt: new Date(`${body.date}T00:00:00Z`), updatedAt: new Date() })
				.where(
					and(
						eq(books.sourceEventId, id),
						sql`(${books.boughtAt} at time zone 'UTC')::date = ${existing.date}`
					)
				)
				.returning({ id: books.id });
			movedBooks = moved.length;
		}

		return { ...updated, movedBooks };
	});

	return json(result);
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
