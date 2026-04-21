import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5432/local';

async function seed() {
	const client = postgres(DATABASE_URL);
	const db = drizzle(client, { schema });

	console.log('🌱 Seeding database...\n');

	// Clear existing data (in reverse dependency order)
	await db.delete(schema.seriesTags);
	await db.delete(schema.reading);
	await db.delete(schema.books);
	await db.delete(schema.bookfairs);
	await db.delete(schema.tags);
	await db.delete(schema.series);
	console.log('  ✓ Cleared existing data');

	// ── Tags ─────────────────────────────────────────────────────────────────
	const [tagYuri, tagFantasy, tagSliceOfLife, tagAction, tagIsekai] = await db
		.insert(schema.tags)
		.values([
			{ name: 'Yuri' },
			{ name: 'Fantasy' },
			{ name: 'Slice of Life' },
			{ name: 'Action' },
			{ name: 'Isekai' }
		])
		.returning();
	console.log('  ✓ 5 tags created');

	// ── Bookfairs ────────────────────────────────────────────────────────────
	const [fair1, fair2, fair3] = await db
		.insert(schema.bookfairs)
		.values([
			{ name: 'Bangkok Book Fair 2024', date: '2024-03-28', location: 'BITEC Bangna' },
			{ name: 'Comic Market TH 2024', date: '2024-07-15', location: 'Impact Arena' },
			{ name: 'National Book Week 2025', date: '2025-03-27', location: 'Queen Sirikit Center' }
		])
		.returning();
	console.log('  ✓ 3 bookfairs created');

	// ── Series ───────────────────────────────────────────────────────────────
	const [seriesFrieren, seriesArifureta, seriesSasayaku, seriesSlime, seriesSlave] = await db
		.insert(schema.series)
		.values([
			{
				shortName: 'Frieren',
				fullName: 'Sousou no Frieren',
				status: 'ongoing',
				type: 'manga',
				publisher: 'Siam Inter Comic'
			},
			{
				shortName: 'Arifureta',
				fullName: 'Arifureta Shokugyou de Sekai Saikyou',
				status: 'ended',
				type: 'light_novel',
				publisher: 'First Page Pro.'
			},
			{
				shortName: 'Sasayaku',
				fullName: 'Sasayaku You ni Koi o Utau',
				status: 'ongoing',
				type: 'manga',
				publisher: 'Phoenix Next'
			},
			{
				shortName: 'Slime 300 years',
				fullName: 'Suraimu Taoshite Sanbyaku-nen',
				status: 'ongoing',
				type: 'light_novel',
				publisher: 'Animag',
				totalVolumes: 12
			},
			{
				shortName: 'Slave',
				fullName: 'Mato Seihei no Slave',
				status: 'ongoing',
				type: 'manga',
				publisher: 'Siam Inter Comic'
			}
		])
		.returning();
	console.log('  ✓ 5 series created');

	// ── Series Tags ──────────────────────────────────────────────────────────
	await db.insert(schema.seriesTags).values([
		{ seriesId: seriesFrieren.id, tagId: tagFantasy.id },
		{ seriesId: seriesFrieren.id, tagId: tagSliceOfLife.id },
		{ seriesId: seriesArifureta.id, tagId: tagIsekai.id },
		{ seriesId: seriesArifureta.id, tagId: tagAction.id },
		{ seriesId: seriesSasayaku.id, tagId: tagYuri.id },
		{ seriesId: seriesSasayaku.id, tagId: tagSliceOfLife.id },
		{ seriesId: seriesSlime.id, tagId: tagIsekai.id },
		{ seriesId: seriesSlime.id, tagId: tagFantasy.id },
		{ seriesId: seriesSlave.id, tagId: tagAction.id },
		{ seriesId: seriesSlave.id, tagId: tagFantasy.id }
	]);
	console.log('  ✓ 10 series-tag links created');

	// ── Books ────────────────────────────────────────────────────────────────
	const booksData: (typeof schema.books.$inferInsert)[] = [];

	// Frieren 1-5
	for (let i = 1; i <= 5; i++) {
		booksData.push({
			seriesId: seriesFrieren.id,
			volumeNumber: i.toFixed(1),
			location: 'apartment',
			boughtAt: new Date(`2024-04-0${i}T12:00:00Z`),
			source: 'bookstore'
		});
	}

	// Arifureta 1-4
	for (let i = 1; i <= 4; i++) {
		booksData.push({
			seriesId: seriesArifureta.id,
			volumeNumber: i.toFixed(1),
			location: 'apartment',
			boughtAt: new Date(`2023-12-10T18:${20 + i}:00Z`),
			source: 'bookstore'
		});
	}

	// Sasayaku 1-3 (bought at book fair)
	for (let i = 1; i <= 3; i++) {
		booksData.push({
			seriesId: seriesSasayaku.id,
			volumeNumber: i.toFixed(1),
			location: 'apartment',
			boughtAt: new Date(`2025-03-29T01:${30 + i}:00Z`),
			source: 'bookfair',
			sourceEventId: fair3.id
		});
	}

	// Slime 300 years 1-2
	for (let i = 1; i <= 2; i++) {
		booksData.push({
			seriesId: seriesSlime.id,
			volumeNumber: i.toFixed(1),
			location: 'home',
			boughtAt: new Date(`2023-12-10T19:${50 + i}:00Z`),
			source: 'bookstore'
		});
	}

	// Slave vol 4.5 (special volume)
	booksData.push({
		seriesId: seriesSlave.id,
		volumeNumber: '4.5',
		location: 'apartment',
		boughtAt: new Date('2024-07-15T14:00:00Z'),
		source: 'bookfair',
		sourceEventId: fair2.id
	});

	const insertedBooks = await db.insert(schema.books).values(booksData).returning();
	console.log(`  ✓ ${insertedBooks.length} books created`);

	// ── Reading records ──────────────────────────────────────────────────────
	const readingData: (typeof schema.reading.$inferInsert)[] = [
		{
			bookId: insertedBooks[0].id,
			status: 'read',
			startedAt: new Date('2024-04-05'),
			finishedAt: new Date('2024-04-06'),
			rating: 9,
			notes: 'Incredible worldbuilding'
		},
		{
			bookId: insertedBooks[1].id,
			status: 'read',
			startedAt: new Date('2024-04-07'),
			finishedAt: new Date('2024-04-08'),
			rating: 8
		},
		{
			bookId: insertedBooks[5].id,
			status: 'reading',
			startedAt: new Date('2024-01-15')
		},
		{
			bookId: insertedBooks[9].id,
			status: 'unread'
		},
		{
			bookId: insertedBooks[14].id,
			status: 'dropped',
			startedAt: new Date('2024-08-01'),
			rating: 4,
			notes: 'Not my cup of tea'
		}
	];

	await db.insert(schema.reading).values(readingData);
	console.log(`  ✓ ${readingData.length} reading records created`);

	console.log('\n✅ Seed complete!\n');
	console.log(`   Series:    5`);
	console.log(`   Books:     ${insertedBooks.length}`);
	console.log(`   Readings:  ${readingData.length}`);
	console.log(`   Tags:      5`);
	console.log(`   Bookfairs: 3`);

	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
