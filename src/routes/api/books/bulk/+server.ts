import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookfairs, books } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { applyReadingStatus, isReadingStatus } from '$lib/server/reading';

const ALLOWED_FIELDS = [
	'location',
	'source',
	'sourceEventId',
	'isDraft',
	'price',
	'boughtAt'
] as const;

// PATCH /api/books/bulk — Bulk update books
//
// `updates` takes book columns from ALLOWED_FIELDS, and/or `readingStatus`,
// which goes through the reading rules in $lib/reading with no dates stamped:
// bulk edits are for backfilling history, whose dates are unknown.
export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { bookIds, updates } = body as { bookIds: number[]; updates: Record<string, unknown> };

	if (!Array.isArray(bookIds) || bookIds.length === 0) {
		throw error(400, 'bookIds must be a non-empty array');
	}

	if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
		throw error(400, 'updates must be a non-empty object');
	}

	// Only allow permitted fields
	const allowedUpdates: Record<string, unknown> = {};
	for (const field of ALLOWED_FIELDS) {
		if (updates[field] !== undefined) {
			allowedUpdates[field] = updates[field];
		}
	}

	const readingStatus = updates.readingStatus;
	if (readingStatus !== undefined && !isReadingStatus(readingStatus)) {
		throw error(400, 'Invalid reading status');
	}

	if (Object.keys(allowedUpdates).length === 0 && readingStatus === undefined) {
		throw error(400, 'No valid fields to update');
	}

	// Price: a non-negative number (a lower bound — see STATUS.md), or null to clear
	if (allowedUpdates.price !== undefined && allowedUpdates.price !== null) {
		const price = Number(allowedUpdates.price);
		if (!Number.isFinite(price) || price < 0) throw error(400, 'Invalid price');
		allowedUpdates.price = price.toFixed(2);
	}

	// Purchase date: a date string, or null to clear
	if (allowedUpdates.boughtAt !== undefined && allowedUpdates.boughtAt !== null) {
		const boughtAt = new Date(allowedUpdates.boughtAt as string);
		if (Number.isNaN(boughtAt.getTime())) throw error(400, 'Invalid purchase date');
		allowedUpdates.boughtAt = boughtAt;
	}

	// Linking to a bookfair: the event must exist (a clear 400, not an FK 500)
	if (allowedUpdates.sourceEventId !== undefined && allowedUpdates.sourceEventId !== null) {
		const fair = await db.query.bookfairs.findFirst({
			where: eq(bookfairs.id, Number(allowedUpdates.sourceEventId))
		});
		if (!fair) throw error(400, 'Bookfair not found');
	}

	// Clear sourceEventId if source is changed away from 'bookfair'
	if (allowedUpdates.source !== undefined && allowedUpdates.source !== 'bookfair') {
		allowedUpdates.sourceEventId = null;
	}

	const result = await db.transaction(async (tx) => {
		let updated = 0;
		if (Object.keys(allowedUpdates).length > 0) {
			const rows = await tx
				.update(books)
				.set({ ...allowedUpdates, updatedAt: new Date() })
				.where(inArray(books.id, bookIds))
				.returning({ id: books.id });
			updated = rows.length;
		}
		if (readingStatus !== undefined) {
			const changed = await applyReadingStatus(tx, bookIds, readingStatus, null, {
				allowReread: false
			});
			updated = Math.max(updated, changed);
		}
		return { updated };
	});

	return json(result);
};
