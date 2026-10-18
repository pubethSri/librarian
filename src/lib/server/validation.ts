import { error } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { reading } from '$lib/server/db/schema';
import { isDay } from '$lib/reading';

// Request-body validation (v0.4 Q0). Schemas are generated from `schema.ts` where a
// body maps onto a table, hand-written where it carries something else (calendar
// days, id lists). A body that fails → 400 with a readable message, never a 500.

/** Turn zod issues into one readable line: "finishedOn: Invalid day; status: …" */
export function formatIssues(issues: z.core.$ZodIssue[]): string {
	return issues
		.map((issue) => {
			const path = issue.path.map(String).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');
}

/** Validate a parsed body; the 400's message lists every problem */
export function validate<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
	const result = schema.safeParse(body);
	if (!result.success) throw error(400, formatIssues(result.error.issues));
	return result.data;
}

/** Read a JSON request body and validate it. Missing / broken JSON → 400. */
export async function parseBody<S extends z.ZodType>(
	request: Request,
	schema: S,
	options: { optional?: boolean } = {}
): Promise<z.output<S>> {
	const text = await request.text();
	if (text.trim() === '') {
		if (options.optional) return validate(schema, {});
		throw error(400, 'Request body is missing');
	}
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		throw error(400, 'Request body is not valid JSON');
	}
	return validate(schema, body);
}

/** A positive whole-number id from a route param, else 400 */
export function idParam(value: string, name = 'ID'): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw error(400, `Invalid ${name}`);
	return id;
}

// ─── Building blocks ─────────────────────────────────────────────────────────

export const id = z.number({ error: 'Must be a number' }).int('Must be a whole number').positive();

/** A calendar day `YYYY-MM-DD` that exists */
export const day = z.string({ error: 'Must be a day (YYYY-MM-DD)' }).refine(isDay, 'Invalid day');

/** A day field of a PATCH: undefined = unchanged, null = cleared */
const dayOrNull = day.nullable();

// ─── Reading ─────────────────────────────────────────────────────────────────

const readingInsert = createInsertSchema(reading);

/** POST /api/books/[id]/reading — a raw reading row (legacy; the app uses log / status) */
export const createReadingBody = z.object({
	status: readingInsert.shape.status,
	startedAt: z.iso.datetime({ offset: true }).or(day).nullish(),
	finishedAt: z.iso.datetime({ offset: true }).or(day).nullish(),
	rating: readingInsert.shape.rating,
	notes: readingInsert.shape.notes
});

/** PUT /api/books/[id]/reading/status — `on` undefined = the server's day, null = unknown */
export const readingStatusBody = z.object({
	status: readingInsert.shape.status.unwrap(),
	on: dayOrNull.optional()
});

/** POST /api/books/[id]/reading/log — "I read this" */
export const logReadBody = z.object({
	finishedOn: dayOrNull.default(null),
	startedOn: dayOrNull.optional()
});

/** PATCH /api/books/[id]/reading/[readingId] — edit a read-through's days */
export const readingDaysBody = z.object({
	startedOn: dayOrNull.optional(),
	finishedOn: dayOrNull.optional()
});

// ─── Queue ───────────────────────────────────────────────────────────────────

/** POST /api/queue */
export const queueAddBody = z.object({ bookId: id });

/** PUT /api/queue/order — the whole queue, top first, each book once */
export const queueOrderBody = z.object({
	bookIds: z
		.array(id, { error: 'Must be a list of book ids' })
		.max(1000)
		.refine((ids) => new Set(ids).size === ids.length, 'A book is listed twice')
});
