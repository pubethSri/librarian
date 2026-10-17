import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books, series } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { lockSeriesInserts } from '$lib/server/locks';
import { splitMissing } from '$lib/utils/volume';

// POST /api/books/batch — Create multiple books at once
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!Array.isArray(body.books) || body.books.length === 0) {
		throw error(400, 'books must be a non-empty array');
	}

	for (const b of body.books) {
		if (!b.seriesId || b.volumeNumber === undefined) {
			throw error(400, 'Each book must have seriesId and volumeNumber');
		}
	}

	// Verify all unique seriesIds exist in one query
	const uniqueSeriesIds = [...new Set(body.books.map((b: { seriesId: number }) => b.seriesId))];
	const existingSeries = await db
		.select({ id: series.id })
		.from(series)
		.where(inArray(series.id, uniqueSeriesIds as number[]));

	if (existingSeries.length !== uniqueSeriesIds.length) {
		const foundIds = new Set(existingSeries.map((s) => s.id));
		const missing = uniqueSeriesIds.filter((id) => !foundIds.has(id as number));
		throw error(400, `Series not found: ${missing.join(', ')}`);
	}

	const values: (typeof books.$inferInsert)[] = body.books.map((b: Record<string, unknown>) => ({
		seriesId: b.seriesId as number,
		volumeNumber: Number(b.volumeNumber).toFixed(1),
		isExtra: b.isExtra === true,
		location: (b.location as string) || 'home',
		boughtAt: b.boughtAt ? new Date(b.boughtAt as string) : null,
		// 0 is a real price (a free book); only a missing/blank price is untracked
		price: b.price === undefined || b.price === null || b.price === '' ? null : String(b.price),
		source: (b.source as string) || null,
		sourceEventId: (b.sourceEventId as number) || null,
		isDraft: (b.isDraft as boolean) || false
	}));

	// Opt-in (Field Mode multi-add): skip volumes the series already has — or
	// that appear twice in this request — and report them instead of adding
	// a second copy. Same per-series lock as POST /api/books.
	if (body.onlyIfMissing === true) {
		const result = await db.transaction(async (tx) => {
			const seriesIds = values.map((v) => v.seriesId);
			await lockSeriesInserts(tx, seriesIds);
			const existing = await tx.select().from(books).where(inArray(books.seriesId, seriesIds));
			const { add, skipped } = splitMissing(existing, values);
			const created = add.length > 0 ? await tx.insert(books).values(add).returning() : [];
			return { created, skipped };
		});
		return json(
			{
				created: result.created.length,
				books: result.created,
				skipped: result.skipped.map((v) => ({
					seriesId: v.seriesId,
					volumeNumber: v.volumeNumber
				}))
			},
			{ status: 201 }
		);
	}

	const created = await db.insert(books).values(values).returning();

	return json({ created: created.length, books: created }, { status: 201 });
};

// DELETE /api/books/batch — Delete several books by id ({ ids }); the Field
// Mode Undo of a multi-add. Ids already gone are ignored.
export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
	if (ids.length === 0) throw error(400, 'ids must be a non-empty array of book ids');
	const deleted = await db.delete(books).where(inArray(books.id, ids)).returning({ id: books.id });
	return json({ deleted: deleted.length });
};
