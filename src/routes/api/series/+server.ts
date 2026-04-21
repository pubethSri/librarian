import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { series, seriesTags, tags, books } from '$lib/server/db/schema';
import { eq, ilike, sql, count } from 'drizzle-orm';

// GET /api/series — List all series with optional filters
export const GET: RequestHandler = async ({ url }) => {
	const search = url.searchParams.get('search');
	const type = url.searchParams.get('type');
	const status = url.searchParams.get('status');

	const conditions = [];

	if (search) {
		conditions.push(
			sql`(${ilike(series.shortName, `%${search}%`)} OR ${ilike(series.fullName, `%${search}%`)})`
		);
	}
	if (type && (type === 'light_novel' || type === 'manga')) {
		conditions.push(eq(series.type, type));
	}
	if (status && (status === 'ongoing' || status === 'ended' || status === 'dropped')) {
		conditions.push(eq(series.status, status));
	}

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const result = await db
		.select({
			id: series.id,
			shortName: series.shortName,
			fullName: series.fullName,
			status: series.status,
			type: series.type,
			publisher: series.publisher,
			totalVolumes: series.totalVolumes,
			watchlist: series.watchlist,
			createdAt: series.createdAt,
			updatedAt: series.updatedAt,
			bookCount: count(books.id)
		})
		.from(series)
		.leftJoin(books, eq(series.id, books.seriesId))
		.where(where)
		.groupBy(series.id)
		.orderBy(series.shortName);

	return json(result);
};

// POST /api/series — Create a new series
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.shortName || !body.fullName || !body.type) {
		throw error(400, 'Missing required fields: shortName, fullName, type');
	}

	if (!['light_novel', 'manga'].includes(body.type)) {
		throw error(400, 'type must be "light_novel" or "manga"');
	}

	const [created] = await db
		.insert(series)
		.values({
			shortName: body.shortName,
			fullName: body.fullName,
			status: body.status || 'ongoing',
			type: body.type,
			publisher: body.publisher || null,
			totalVolumes: body.totalVolumes || null,
			watchlist: body.watchlist || false
		})
		.returning();

	return json(created, { status: 201 });
};
