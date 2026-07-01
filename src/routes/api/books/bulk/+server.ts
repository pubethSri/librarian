import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

const ALLOWED_FIELDS = ['location', 'source', 'sourceEventId', 'isDraft', 'price'] as const;

// PATCH /api/books/bulk — Bulk update books
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

	if (Object.keys(allowedUpdates).length === 0) {
		throw error(400, 'No valid fields to update');
	}

	// Clear sourceEventId if source is changed away from 'bookfair'
	if (allowedUpdates.source !== undefined && allowedUpdates.source !== 'bookfair') {
		allowedUpdates.sourceEventId = null;
	}

	const rows = await db
		.update(books)
		.set({ ...allowedUpdates, updatedAt: new Date() })
		.where(inArray(books.id, bookIds))
		.returning();

	return json({ updated: rows.length });
};
