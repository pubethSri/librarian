import { db } from '$lib/server/db';
import { bookfairs, books, reading, series, seriesTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { InsightsInput } from '$lib/insights';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Every row the insights need, as plain values — the collection is small enough to load whole */
export async function loadInsightsInput(): Promise<InsightsInput> {
	const [bookRows, readingRows, seriesRows, tagRows, fairRows] = await Promise.all([
		db
			.select({
				id: books.id,
				seriesId: books.seriesId,
				volumeNumber: books.volumeNumber,
				isExtra: books.isExtra,
				boughtAt: books.boughtAt,
				price: books.price,
				source: books.source,
				sourceEventId: books.sourceEventId
			})
			.from(books),
		db
			.select({
				id: reading.id,
				bookId: reading.bookId,
				status: reading.status,
				startedAt: reading.startedAt,
				finishedAt: reading.finishedAt,
				createdAt: reading.createdAt
			})
			.from(reading),
		db
			.select({
				id: series.id,
				shortName: series.shortName,
				type: series.type,
				status: series.status,
				publisher: series.publisher
			})
			.from(series),
		db
			.select({ seriesId: seriesTags.seriesId, tagName: tags.name })
			.from(seriesTags)
			.innerJoin(tags, eq(seriesTags.tagId, tags.id)),
		db.select({ id: bookfairs.id, name: bookfairs.name, date: bookfairs.date }).from(bookfairs)
	]);

	return {
		books: bookRows.map((b) => ({ ...b, boughtAt: iso(b.boughtAt) })),
		readings: readingRows.map((r) => ({
			...r,
			startedAt: iso(r.startedAt),
			finishedAt: iso(r.finishedAt),
			createdAt: r.createdAt.toISOString()
		})),
		series: seriesRows,
		seriesTags: tagRows,
		bookfairs: fairRows
	};
}
