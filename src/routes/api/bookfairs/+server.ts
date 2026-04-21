import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookfairs, books } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

// GET /api/bookfairs — List all bookfairs
export const GET: RequestHandler = async () => {
	const result = await db
		.select({
			id: bookfairs.id,
			name: bookfairs.name,
			date: bookfairs.date,
			location: bookfairs.location,
			createdAt: bookfairs.createdAt,
			bookCount: count(books.id)
		})
		.from(bookfairs)
		.leftJoin(books, eq(bookfairs.id, books.sourceEventId))
		.groupBy(bookfairs.id)
		.orderBy(bookfairs.date);

	return json(result);
};

// POST /api/bookfairs — Create a bookfair
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.name || !body.date) {
		throw error(400, 'Missing required fields: name, date');
	}

	const [created] = await db
		.insert(bookfairs)
		.values({
			name: body.name,
			date: body.date,
			location: body.location || null
		})
		.returning();

	return json(created, { status: 201 });
};
