import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tags, seriesTags } from '$lib/server/db/schema';
import { eq, count, sql } from 'drizzle-orm';

// GET /api/tags — List all tags with usage count
export const GET: RequestHandler = async () => {
	const result = await db
		.select({
			id: tags.id,
			name: tags.name,
			seriesCount: count(seriesTags.seriesId)
		})
		.from(tags)
		.leftJoin(seriesTags, eq(tags.id, seriesTags.tagId))
		.groupBy(tags.id)
		.orderBy(tags.name);

	return json(result);
};

// POST /api/tags — Create a tag
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.name) {
		throw error(400, 'Missing required field: name');
	}

	try {
		const [created] = await db
			.insert(tags)
			.values({ name: body.name })
			.returning();

		return json(created, { status: 201 });
	} catch (err: unknown) {
		// Handle unique constraint violation
		if (err instanceof Error && err.message.includes('unique')) {
			throw error(409, 'Tag already exists');
		}
		throw err;
	}
};
