import { describe, it, expect } from 'vitest';
import { completionOf, computeTags } from './tags';
import { buildBookFacts } from './common';
import { bookRow, input, readingRow, seriesRow } from './testFixtures';

function facts(readStates: ('read' | 'reading' | 'dropped' | 'unread')[]) {
	const books = readStates.map((_, i) => bookRow({ id: i + 1 }));
	const readings = readStates.flatMap((state, i) =>
		state === 'unread' ? [] : [readingRow({ bookId: i + 1, status: state })]
	);
	return buildBookFacts(input({ books, readings }));
}

describe('completionOf', () => {
	it('is abandoned whenever the series is Dropped', () => {
		expect(completionOf('dropped', facts(['read', 'read']))).toBe('abandoned');
	});

	it('is finished when every owned book is read', () => {
		expect(completionOf('ongoing', facts(['read', 'read']))).toBe('finished');
	});

	it('is in progress once anything is read, being read or dropped', () => {
		expect(completionOf('ended', facts(['read', 'unread']))).toBe('inProgress');
		expect(completionOf('ongoing', facts(['reading', 'unread']))).toBe('inProgress');
		expect(completionOf('ongoing', facts(['dropped', 'unread']))).toBe('inProgress');
	});

	it('is not started when every book is unread', () => {
		expect(completionOf('ongoing', facts(['unread', 'unread']))).toBe('notStarted');
	});
});

describe('computeTags', () => {
	const data = input({
		series: [
			seriesRow({ id: 1, shortName: 'A', publisher: 'Phoenix Next' }),
			seriesRow({ id: 2, shortName: 'B', publisher: 'Phoenix Next', status: 'dropped' }),
			seriesRow({ id: 3, shortName: 'C', publisher: 'Luckpim' }),
			seriesRow({ id: 4, shortName: 'D', publisher: null }),
			seriesRow({ id: 5, shortName: 'E', publisher: 'Siam' }) // owns nothing
		],
		books: [
			bookRow({ id: 1, seriesId: 1 }),
			bookRow({ id: 2, seriesId: 1 }),
			bookRow({ id: 3, seriesId: 2 }),
			bookRow({ id: 4, seriesId: 3 }),
			bookRow({ id: 5, seriesId: 4 })
		],
		readings: [
			readingRow({ bookId: 1, status: 'read' }),
			readingRow({ bookId: 2, status: 'read' }),
			readingRow({ bookId: 4, status: 'read' })
		],
		seriesTags: [
			{ seriesId: 1, tagName: 'isekai' },
			{ seriesId: 2, tagName: 'isekai' },
			{ seriesId: 3, tagName: 'romance' },
			{ seriesId: 5, tagName: 'romance' } // series with no books: ignored
		]
	});

	it('counts series, books, read books and completion per tag, most books first', () => {
		const result = computeTags(buildBookFacts(data), data);
		expect(result.tags).toEqual([
			{
				name: 'isekai',
				series: 2,
				books: 3,
				readBooks: 2,
				completion: { finished: 1, inProgress: 0, notStarted: 0, abandoned: 1 }
			},
			{
				name: 'romance',
				series: 1,
				books: 1,
				readBooks: 1,
				completion: { finished: 1, inProgress: 0, notStarted: 0, abandoned: 0 }
			}
		]);
		expect(result.untaggedSeries).toBe(1);
	});

	it('folds one-series publishers (and unknown ones) into Other, listed last', () => {
		const result = computeTags(buildBookFacts(data), data);
		expect(result.publishers.map((p) => [p.name, p.series, p.books])).toEqual([
			['Phoenix Next', 2, 3],
			['Other', 2, 2]
		]);
	});
});
