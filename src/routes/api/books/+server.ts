import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books, reading, series, seriesTags, tags } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { currentStatus, timesRead } from '$lib/reading';
import { findSameVolume, normalizeTitle } from '$lib/utils/volume';
import { lockSeriesInserts } from '$lib/server/locks';
import { queuedAmong } from '$lib/server/queue';

// GET /api/books — List all books with optional filters
export const GET: RequestHandler = async ({ url }) => {
	const seriesId = url.searchParams.get('seriesId');
	const location = url.searchParams.get('location');
	const isDraft = url.searchParams.get('isDraft');
	const sourceEventId = url.searchParams.get('sourceEventId');

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
	if (sourceEventId) {
		conditions.push(eq(books.sourceEventId, Number(sourceEventId)));
	}

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const rows = await db
		.select({
			id: books.id,
			seriesId: books.seriesId,
			seriesShortName: series.shortName,
			seriesFullName: series.fullName,
			volumeNumber: books.volumeNumber,
			isExtra: books.isExtra,
			title: books.title,
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
	const tagMap: Map<number, { id: number; name: string }[]> = new Map();

	if (seriesIds.length > 0) {
		const tagRows = await db
			.select({
				seriesId: seriesTags.seriesId,
				tagId: tags.id,
				tagName: tags.name
			})
			.from(seriesTags)
			.innerJoin(tags, eq(seriesTags.tagId, tags.id))
			.where(
				sql`${seriesTags.seriesId} IN (${sql.join(
					seriesIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			);

		for (const row of tagRows) {
			const existing = tagMap.get(row.seriesId) || [];
			existing.push({ id: row.tagId, name: row.tagName });
			tagMap.set(row.seriesId, existing);
		}
	}

	// Reading rows → current status + times read per book (rules in $lib/reading)
	const readingRows =
		rows.length > 0
			? await db
					.select({
						id: reading.id,
						bookId: reading.bookId,
						status: reading.status,
						startedAt: reading.startedAt,
						finishedAt: reading.finishedAt,
						createdAt: reading.createdAt
					})
					.from(reading)
					.where(
						inArray(
							reading.bookId,
							rows.map((r) => r.id)
						)
					)
			: [];
	const readingMap: Map<number, (typeof readingRows)[number][]> = new Map();
	for (const row of readingRows) {
		const list = readingMap.get(row.bookId) || [];
		list.push(row);
		readingMap.set(row.bookId, list);
	}

	const queued = await queuedAmong(
		db,
		rows.map((r) => r.id)
	);

	const result = rows.map((r) => {
		const bookReadings = readingMap.get(r.id) || [];
		return {
			...r,
			seriesTags: tagMap.get(r.seriesId) || [],
			readingStatus: currentStatus(bookReadings),
			timesRead: timesRead(bookReadings),
			queued: queued.has(r.id)
		};
	});

	return json(result);
};

// POST /api/books — Create a new book (`onlyIfMissing: true` → 409 if the volume exists)
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

	const values = {
		seriesId: body.seriesId,
		volumeNumber: Number(body.volumeNumber).toFixed(1),
		isExtra: body.isExtra === true,
		title: normalizeTitle(body.title),
		location: body.location || 'home',
		boughtAt: body.boughtAt ? new Date(body.boughtAt) : null,
		price: body.price === '' || body.price == null ? null : body.price,
		source: body.source || null,
		sourceEventId: body.sourceEventId || null,
		isDraft: body.isDraft || false
	};

	// Opt-in duplicate guard (Field Mode quick add): another device may have
	// added this volume since the phone loaded. The per-series advisory lock
	// makes two simultaneous taps wait for each other instead of both passing.
	// The desktop Add Volume dialog doesn't opt in — it may add a real copy.
	if (body.onlyIfMissing === true) {
		const result = await db.transaction(async (tx) => {
			await lockSeriesInserts(tx, [values.seriesId]);
			const existing = findSameVolume(
				await tx.select().from(books).where(eq(books.seriesId, values.seriesId)),
				values
			);
			if (existing) return { existing };
			const [created] = await tx.insert(books).values(values).returning();
			return { created };
		});
		if (result.existing) {
			return json(
				{ message: 'This volume is already in the collection', book: result.existing },
				{ status: 409 }
			);
		}
		return json(result.created, { status: 201 });
	}

	const [created] = await db.insert(books).values(values).returning();

	return json(created, { status: 201 });
};
