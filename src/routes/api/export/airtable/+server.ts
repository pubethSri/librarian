import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { books, series } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	// Query all books with their series data
	const allBooks = await db
		.select({
			bookName: books.volumeNumber,
			seriesShortName: series.shortName,
			seriesFullName: series.fullName,
			seriesType: series.type,
			seriesPublisher: series.publisher,
			volumeNumber: books.volumeNumber,
			location: books.location,
			createdAt: books.createdAt
		})
		.from(books)
		.innerJoin(series, eq(books.seriesId, series.id))
		.orderBy(series.shortName, books.volumeNumber);

	// Build CSV
	const header = 'Name,Volume,Where,Book_Name,Fullname,Type,Publisher,Created';
	const rows = allBooks.map((b) => {
		const name = `${b.seriesShortName} ${b.volumeNumber}`;
		const volume = b.volumeNumber;
		const where = b.location === 'home' ? 'Home' : 'Apartment';
		const bookName = escapeCsv(b.seriesShortName);
		const fullname = escapeCsv(b.seriesFullName);
		const type = b.seriesType === 'light_novel' ? 'Light Novel' : 'Manga';
		const publisher = escapeCsv(b.seriesPublisher || '');
		const created = formatDate(b.createdAt);

		return `${escapeCsv(name)},${volume},${where},${bookName},${fullname},${type},${publisher},${created}`;
	});

	const csv = [header, ...rows].join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="librarian-export-${new Date().toISOString().slice(0, 10)}.csv"`
		}
	});
};

function escapeCsv(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function formatDate(date: Date | null): string {
	if (!date) return '';
	// Format as YYYY-MM-DD HH:MM to match Airtable format
	const d = new Date(date);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	const hh = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}
