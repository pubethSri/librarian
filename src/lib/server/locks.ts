import { sql } from 'drizzle-orm';
import type { db } from '$lib/server/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Advisory-lock namespace for "one insert per series at a time" */
const SERIES_INSERT_LOCK = 4201;

/**
 * Hold the per-series insert lock(s) until the transaction ends, so two
 * devices adding the same volume wait for each other instead of both
 * passing the "already owned?" check. Sorted ids: no lock-order deadlock.
 */
export async function lockSeriesInserts(tx: Tx, seriesIds: readonly number[]): Promise<void> {
	for (const id of [...new Set(seriesIds)].sort((a, b) => a - b)) {
		await tx.execute(sql`SELECT pg_advisory_xact_lock(${SERIES_INSERT_LOCK}, ${id})`);
	}
}

/** Advisory lock for rewriting the reading queue's order */
const QUEUE_ORDER_LOCK = 4202;

/** Hold the queue-order lock until the transaction ends (one reorder at a time) */
export async function lockQueueOrder(tx: Tx): Promise<void> {
	await tx.execute(sql`SELECT pg_advisory_xact_lock(${QUEUE_ORDER_LOCK})`);
}
