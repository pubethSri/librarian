import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books, series, seriesTags, tags } from '$lib/server/db/schema';
import { eq, ilike, sql } from 'drizzle-orm';

// GET /api/books — List all books with optional filters
export const GET: RequestHandler = async ({ url }) => {
	const seriesId = url.searchParams.get('seriesId');
	const location = url.searchParams.get('location');
	const isDraft = url.searchParams.get('isDraft');

	const conditions = [];

	if (seriesId) {
		conditions.push(eq(books.seriesId, Number(seriesId)));
	}
	if (location && (location === 'home' || location === 'apartment')) {
		conditions.push(eq(books.location, location));
	}
	if (isDraft === 'true') {
		conditions.push(eq(books.isDraft, true));
	}

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const rows = await db
		.select({
			id: books.id,
			seriesId: books.seriesId,
			seriesShortName: series.shortName,
			seriesFullName: series.fullName,
			volumeNumber: books.volumeNumber,
			location: books.location,
			boughtAt: books.boughtAt,
			price: books.price,
			source: books.source,
			sourceEventId: books.sourceEventId,
			isDraft: books.isDraft,
			createdAt: books.createdAt,
			updatedAt: books.updatedAt
		})
		.from(books)
		.innerJoin(series, eq(books.seriesId, series.id))
		.where(where)
		.orderBy(series.shortName, books.volumeNumber);

	// Fetch series tags for these books (grouped by seriesId)
	const seriesIds = [...new Set(rows.map((r) => r.seriesId))];
	let tagMap: Map<number, { id: number; name: string }[]> = new Map();

	if (seriesIds.length > 0) {
		const tagRows = await db
			.select({
				seriesId: seriesTags.seriesId,
				tagId: tags.id,
				tagName: tags.name
			})
			.from(seriesTags)
			.innerJoin(tags, eq(seriesTags.tagId, tags.id))
			.where(sql`${seriesTags.seriesId} IN (${sql.join(seriesIds.map((id) => sql`${id}`), sql`, `)})`);

		for (const row of tagRows) {
			const existing = tagMap.get(row.seriesId) || [];
			existing.push({ id: row.tagId, name: row.tagName });
			tagMap.set(row.seriesId, existing);
		}
	}

	const result = rows.map((r) => ({
		...r,
		seriesTags: tagMap.get(r.seriesId) || []
	}));

	return json(result);
};

// POST /api/books — Create a new book
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.seriesId || body.volumeNumber === undefined) {
		throw error(400, 'Missing required fields: seriesId, volumeNumber');
	}

	// Verify series exists
	const seriesExists = await db.query.series.findFirst({
		where: eq(series.id, body.seriesId)
	});
	if (!seriesExists) throw error(400, 'Series not found');

	const [created] = await db
		.insert(books)
		.values({
			seriesId: body.seriesId,
			volumeNumber: Number(body.volumeNumber).toFixed(1),
			location: body.location || 'home',
			boughtAt: body.boughtAt ? new Date(body.boughtAt) : null,
			price: body.price || null,
			source: body.source || null,
			sourceEventId: body.sourceEventId || null,
			isDraft: body.isDraft || false
		})
		.returning();

	return json(created, { status: 201 });
};
