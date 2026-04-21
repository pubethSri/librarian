import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { series, seriesTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// PUT /api/series/[id]/tags — Replace all tags for a series
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid series ID');

	const body = await request.json();
	if (!Array.isArray(body.tagIds)) {
		throw error(400, 'Expected { tagIds: number[] }');
	}

	// Verify series exists
	const existing = await db.query.series.findFirst({ where: eq(series.id, id) });
	if (!existing) throw error(404, 'Series not found');

	// Remove all existing tags
	await db.delete(seriesTags).where(eq(seriesTags.seriesId, id));

	// Insert new tags
	if (body.tagIds.length > 0) {
		await db.insert(seriesTags).values(
			body.tagIds.map((tagId: number) => ({
				seriesId: id,
				tagId
			}))
		);
	}

	// Return updated tags
	const updatedTags = await db
		.select({ id: tags.id, name: tags.name })
		.from(seriesTags)
		.innerJoin(tags, eq(seriesTags.tagId, tags.id))
		.where(eq(seriesTags.seriesId, id));

	return json(updatedTags);
};
