// Builders for insights unit tests — not used by the app.

import type { InsightsInput } from './common';

type BookRow = InsightsInput['books'][number];
type ReadingRow = InsightsInput['readings'][number];
type SeriesRow = InsightsInput['series'][number];

let nextId = 1000;

export function seriesRow(overrides: Partial<SeriesRow> = {}): SeriesRow {
	return {
		id: 1,
		shortName: 'Mushoku',
		type: 'light_novel',
		status: 'ongoing',
		publisher: 'Phoenix Next',
		...overrides
	};
}

export function bookRow(overrides: Partial<BookRow> = {}): BookRow {
	return {
		id: nextId++,
		seriesId: 1,
		volumeNumber: '1.0',
		isExtra: false,
		boughtAt: null,
		price: null,
		source: null,
		sourceEventId: null,
		...overrides
	};
}

export function readingRow(overrides: Partial<ReadingRow> & { bookId: number }): ReadingRow {
	return {
		id: nextId++,
		status: 'read',
		startedAt: null,
		finishedAt: null,
		createdAt: '2026-10-15T12:00:00.000Z',
		...overrides
	};
}

export function input(overrides: Partial<InsightsInput> = {}): InsightsInput {
	return {
		books: [],
		readings: [],
		series: [seriesRow()],
		seriesTags: [],
		bookfairs: [],
		...overrides
	};
}
