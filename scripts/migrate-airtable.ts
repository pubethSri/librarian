import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5432/local';
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Column Mappings ─────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, 'ongoing' | 'ended' | 'dropped'> = {
	Ongoing: 'ongoing',
	End: 'ended',
	Dropped: 'dropped'
};

const TYPE_MAP: Record<string, 'light_novel' | 'manga'> = {
	'Light Novel': 'light_novel',
	Manga: 'manga'
};

const LOCATION_MAP: Record<string, 'home' | 'apartment'> = {
	Home: 'home',
	Apartment: 'apartment'
};

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

interface DictionaryRow {
	Name: string;
	Fullname: string;
	Status: string;
	Type: string;
	Publisher: string;
	Volumes: string;
	LookupVol: string;
	LastestVol: string;
}

interface BooksRow {
	Name: string;
	Volume: string;
	Where: string;
	Book_Name: string;
	'Fullname (from Book_Name)': string;
	Type: string;
	Publisher: string;
	Created: string;
}

function parseCsv<T>(filePath: string): T[] {
	const content = readFileSync(filePath, 'utf-8');
	return parse(content, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true,
		relax_quotes: true,
		relax_column_count: true
	}) as T[];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function migrate() {
	const csvDir = resolve(process.cwd(), 'AirtableExport');
	const dictionaryPath = resolve(csvDir, 'Dictionary.csv');
	const booksPath = resolve(csvDir, 'BooksTable.csv');

	console.log(`📦 Airtable Migration ${DRY_RUN ? '(DRY RUN)' : ''}`);
	console.log(`   Dictionary: ${dictionaryPath}`);
	console.log(`   Books:      ${booksPath}\n`);

	// Parse CSVs
	const dictionaryRows = parseCsv<DictionaryRow>(dictionaryPath);
	const booksRows = parseCsv<BooksRow>(booksPath);

	console.log(`   Found ${dictionaryRows.length} series, ${booksRows.length} books\n`);

	if (DRY_RUN) {
		dryRun(dictionaryRows, booksRows);
		return;
	}

	// Connect to DB
	const client = postgres(DATABASE_URL);
	const db = drizzle(client, { schema });

	// Clear existing data
	await db.delete(schema.seriesTags);
	await db.delete(schema.reading);
	await db.delete(schema.books);
	await db.delete(schema.bookfairs);
	await db.delete(schema.tags);
	await db.delete(schema.series);
	console.log('  ✓ Cleared existing data');

	// ── Import Series ────────────────────────────────────────────────────────
	const seriesMap = new Map<string, number>(); // shortName → id
	let seriesCount = 0;
	const warnings: string[] = [];

	for (const row of dictionaryRows) {
		const status = STATUS_MAP[row.Status];
		const type = TYPE_MAP[row.Type];

		if (!status) {
			warnings.push(`Unknown status "${row.Status}" for series "${row.Name}", defaulting to "ongoing"`);
		}
		if (!type) {
			warnings.push(`Unknown type "${row.Type}" for series "${row.Name}", skipping`);
			continue;
		}

		// Determine if this is a watchlist entry (no volumes)
		const isWatchlist = !row.Volumes || row.LastestVol === 'No Volumes';

		const [inserted] = await db
			.insert(schema.series)
			.values({
				shortName: row.Name,
				fullName: row.Fullname,
				status: status || 'ongoing',
				type,
				publisher: row.Publisher || null,
				totalVolumes: null, // We don't know total published, only latest owned
				watchlist: isWatchlist
			})
			.returning();

		seriesMap.set(row.Name, inserted.id);
		seriesCount++;
	}
	console.log(`  ✓ ${seriesCount} series imported`);

	// ── Import Books ─────────────────────────────────────────────────────────
	let booksCount = 0;
	let readingCount = 0;

	for (const row of booksRows) {
		const seriesId = seriesMap.get(row.Book_Name);
		if (!seriesId) {
			warnings.push(`Book "${row.Name}" references unknown series "${row.Book_Name}", skipping`);
			continue;
		}

		const volumeNumber = parseFloat(row.Volume);
		if (isNaN(volumeNumber)) {
			warnings.push(`Book "${row.Name}" has invalid volume number "${row.Volume}", skipping`);
			continue;
		}

		const location = LOCATION_MAP[row.Where];
		if (!location) {
			warnings.push(`Book "${row.Name}" has unknown location "${row.Where}", defaulting to "home"`);
		}

		// Parse the Created timestamp as bought_at
		let boughtAt: Date | null = null;
		if (row.Created) {
			boughtAt = new Date(row.Created.replace(' ', 'T') + ':00+07:00'); // Assume Bangkok timezone
			if (isNaN(boughtAt.getTime())) {
				warnings.push(`Book "${row.Name}" has invalid date "${row.Created}"`);
				boughtAt = null;
			}
		}

		const [insertedBook] = await db
			.insert(schema.books)
			.values({
				seriesId,
				volumeNumber: volumeNumber.toFixed(1),
				location: location || 'home',
				boughtAt,
				createdAt: boughtAt || new Date()
			})
			.returning();
		booksCount++;

		// Create a default reading record (unread)
		await db.insert(schema.reading).values({
			bookId: insertedBook.id,
			status: 'unread'
		});
		readingCount++;
	}
	console.log(`  ✓ ${booksCount} books imported`);
	console.log(`  ✓ ${readingCount} reading records created`);

	// ── Warnings ─────────────────────────────────────────────────────────────
	if (warnings.length > 0) {
		console.log(`\n⚠️  ${warnings.length} warnings:`);
		for (const w of warnings) {
			console.log(`   - ${w}`);
		}
	}

	console.log('\n✅ Migration complete!\n');
	console.log(`   Series:    ${seriesCount}`);
	console.log(`   Books:     ${booksCount}`);
	console.log(`   Readings:  ${readingCount}`);
	console.log(`   Warnings:  ${warnings.length}`);

	await client.end();
}

// ─── Dry Run ─────────────────────────────────────────────────────────────────

function dryRun(dictionaryRows: DictionaryRow[], booksRows: BooksRow[]) {
	console.log('── Series to import ──────────────────────────────────────────');
	for (const row of dictionaryRows) {
		const status = STATUS_MAP[row.Status] || '???';
		const type = TYPE_MAP[row.Type] || '???';
		const watchlist = !row.Volumes || row.LastestVol === 'No Volumes';
		console.log(`  ${row.Name} → ${row.Fullname} [${type}, ${status}${watchlist ? ', WATCHLIST' : ''}]`);
	}

	console.log('\n── Books to import (first 20) ────────────────────────────────');
	for (const row of booksRows.slice(0, 20)) {
		const vol = parseFloat(row.Volume);
		const loc = LOCATION_MAP[row.Where] || '???';
		console.log(`  ${row.Name} → vol ${vol} @ ${loc} (${row.Created})`);
	}
	if (booksRows.length > 20) {
		console.log(`  ... and ${booksRows.length - 20} more`);
	}

	console.log('\n── Summary ──────────────────────────────────────────────────');
	console.log(`  Would insert ${dictionaryRows.length} series`);
	console.log(`  Would insert ${booksRows.length} books`);
	console.log(`  Would create ${booksRows.length} reading records (all "unread")`);
	console.log('\n  No changes were made to the database.\n');
}

migrate().catch((err) => {
	console.error('❌ Migration failed:', err);
	process.exit(1);
});
