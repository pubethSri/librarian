import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, {
	// No prepared statements: Neon's pooled URL (PgBouncer, transaction mode) can't keep them
	prepare: false,
	// Drop idle connections (seconds) before Neon's compute suspends under them
	idle_timeout: 20
});

export const db = drizzle(client, { schema });
