import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reading } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkReadDays, dayToDate, latestDay, rowDay } from '$lib/reading';
import { readingSummary } from '$lib/server/reading';
import { idParam, parseBody, readingDaysBody } from '$lib/server/validation';

function parseIds(params: { id: string; readingId: string }) {
	return {
		bookId: idParam(params.id, 'book ID'),
		readingId: idParam(params.readingId, 'reading ID')
	};
}

// PATCH /api/books/[id]/reading/[readingId] — Edit a read-through's days (history
// editor): { startedOn?, finishedOn? } as `YYYY-MM-DD` or null. Status and times read
// stay derived. Returns the book's ReadingSummary.
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { bookId, readingId } = parseIds(params);

	const existing = await db.query.reading.findFirst({
		where: and(eq(reading.id, readingId), eq(reading.bookId, bookId))
	});
	if (!existing) throw error(404, 'Reading entry not found');

	const { startedOn, finishedOn } = await parseBody(request, readingDaysBody, { optional: true });
	if (finishedOn && existing.status !== 'read') {
		throw error(400, 'Only a finished read has a finish day');
	}

	const start = startedOn === undefined ? rowDay(existing.startedAt) : startedOn;
	const finish = finishedOn === undefined ? rowDay(existing.finishedAt) : finishedOn;
	const problem = checkReadDays(start, finish, latestDay(new Date()));
	if (problem) throw error(400, problem);

	const summary = await db.transaction(async (tx) => {
		await tx
			.update(reading)
			.set({
				...(startedOn !== undefined && { startedAt: startedOn ? dayToDate(startedOn) : null }),
				...(finishedOn !== undefined && { finishedAt: finishedOn ? dayToDate(finishedOn) : null })
			})
			.where(eq(reading.id, readingId));
		return readingSummary(tx, bookId);
	});

	return json(summary);
};

// DELETE /api/books/[id]/reading/[readingId] — Remove a mistaken read-through.
// The current status and times read follow from the rows left.
export const DELETE: RequestHandler = async ({ params }) => {
	const { bookId, readingId } = parseIds(params);

	const summary = await db.transaction(async (tx) => {
		const [deleted] = await tx
			.delete(reading)
			.where(and(eq(reading.id, readingId), eq(reading.bookId, bookId)))
			.returning({ id: reading.id });
		if (!deleted) throw error(404, 'Reading entry not found');
		return readingSummary(tx, bookId);
	});

	return json(summary);
};
