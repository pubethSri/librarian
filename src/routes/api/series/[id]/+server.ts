import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { series, books, reading, seriesTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/series/[id] — Get single series with books, tags, and reading data
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid series ID');

	const result = await db.query.series.findFirst({
		where: eq(series.id, id),
		with: {
			books: {
				with: {
					readings: true
				},
				orderBy: (books, { asc }) => [asc(books.volumeNumber)]
			},
			seriesTags: {
				with: {
					tag: true
				}
			}
		}
	});

	if (!result) throw error(404, 'Series not found');

	// Flatten tags for cleaner response
	const response = {
		...result,
		tags: result.seriesTags.map((st) => st.tag),
		seriesTags: undefined
	};

	return json(response);
};

// PATCH /api/series/[id] — Update a series
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid series ID');

	const body = await request.json();

	// Verify series exists
	const existing = await db.query.series.findFirst({ where: eq(series.id, id) });
	if (!existing) throw error(404, 'Series not found');

	const [updated] = await db
		.update(series)
		.set({
			...(body.shortName !== undefined && { shortName: body.shortName }),
			...(body.fullName !== undefined && { fullName: body.fullName }),
			...(body.status !== undefined && { status: body.status }),
			...(body.type !== undefined && { type: body.type }),
			...(body.publisher !== undefined && { publisher: body.publisher }),
			...(body.totalVolumes !== undefined && { totalVolumes: body.totalVolumes }),
			...(body.watchlist !== undefined && { watchlist: body.watchlist }),
			updatedAt: new Date()
		})
		.where(eq(series.id, id))
		.returning();

	return json(updated);
};

// DELETE /api/series/[id] — Delete a series (cascades to books)
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid series ID');

	const existing = await db.query.series.findFirst({ where: eq(series.id, id) });
	if (!existing) throw error(404, 'Series not found');

	await db.delete(series).where(eq(series.id, id));

	return json({ success: true });
};
