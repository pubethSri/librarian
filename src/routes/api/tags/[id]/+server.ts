import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// DELETE /api/tags/[id] — Delete a tag
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (isNaN(id)) throw error(400, 'Invalid tag ID');

	const existing = await db.query.tags.findFirst({ where: eq(tags.id, id) });
	if (!existing) throw error(404, 'Tag not found');

	await db.delete(tags).where(eq(tags.id, id));

	return json({ success: true });
};
