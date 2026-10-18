import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import {
	createReadingBody,
	idParam,
	logReadBody,
	parseBody,
	queueAddBody,
	queueOrderBody,
	readingDaysBody,
	readingStatusBody,
	validate
} from './validation';

/** The 400 message a body produces, or null when it passes */
function problem(fn: () => unknown): string | null {
	try {
		fn();
		return null;
	} catch (err) {
		if (isHttpError(err) && err.status === 400) return err.body.message;
		throw err;
	}
}

function request(body: string): Request {
	return new Request('http://x/api', { method: 'POST', body });
}

describe('parseBody', () => {
	it('parses and validates JSON', async () => {
		await expect(parseBody(request('{"bookId":3}'), queueAddBody)).resolves.toEqual({ bookId: 3 });
	});

	it('rejects broken JSON with a 400', async () => {
		await expect(parseBody(request('{bookId:'), queueAddBody)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Request body is not valid JSON' }
		});
	});

	it('rejects a missing body unless optional', async () => {
		await expect(parseBody(request(''), queueAddBody)).rejects.toMatchObject({ status: 400 });
		await expect(parseBody(request(''), logReadBody, { optional: true })).resolves.toEqual({
			finishedOn: null
		});
	});
});

describe('idParam', () => {
	it('accepts positive whole numbers only', () => {
		expect(idParam('12')).toBe(12);
		expect(problem(() => idParam('abc'))).toBe('Invalid ID');
		expect(problem(() => idParam('0', 'book ID'))).toBe('Invalid book ID');
		expect(problem(() => idParam('1.5'))).toBe('Invalid ID');
	});
});

describe('reading bodies', () => {
	it('status: needs a known status; `on` is a real day, null or absent', () => {
		expect(validate(readingStatusBody, { status: 'reading' })).toEqual({ status: 'reading' });
		expect(validate(readingStatusBody, { status: 'read', on: null }).on).toBeNull();
		expect(problem(() => validate(readingStatusBody, {}))).toMatch(/^status: /);
		expect(problem(() => validate(readingStatusBody, { status: 'finished' }))).toMatch(/^status: /);
		expect(problem(() => validate(readingStatusBody, { status: 'read', on: '2026-02-30' }))).toBe(
			'on: Invalid day'
		);
	});

	it('log: finish defaults to unknown, start optional, both real days', () => {
		expect(validate(logReadBody, {})).toEqual({ finishedOn: null });
		expect(validate(logReadBody, { finishedOn: '2026-10-17', startedOn: '2026-10-01' })).toEqual({
			finishedOn: '2026-10-17',
			startedOn: '2026-10-01'
		});
		expect(problem(() => validate(logReadBody, { finishedOn: 'yesterday' }))).toBe(
			'finishedOn: Invalid day'
		);
		expect(problem(() => validate(logReadBody, { finishedOn: 20261017 }))).toMatch(
			/^finishedOn: Must be a day/
		);
	});

	it('days patch: lists every bad field', () => {
		expect(validate(readingDaysBody, { startedOn: null })).toEqual({ startedOn: null });
		expect(
			problem(() => validate(readingDaysBody, { startedOn: '2026-13-01', finishedOn: 'x' }))
		).toBe('startedOn: Invalid day; finishedOn: Invalid day');
	});

	it('raw create: status from the enum, dates as instants or days', () => {
		expect(validate(createReadingBody, {})).toEqual({});
		expect(
			validate(createReadingBody, { status: 'read', finishedAt: '2026-10-17T00:00:00.000Z' })
				.finishedAt
		).toBe('2026-10-17T00:00:00.000Z');
		expect(problem(() => validate(createReadingBody, { status: 'done' }))).toMatch(/^status: /);
		expect(problem(() => validate(createReadingBody, { rating: 'great' }))).toMatch(/^rating: /);
	});
});

describe('queue bodies', () => {
	it('add: a positive whole book id', () => {
		expect(validate(queueAddBody, { bookId: 7 })).toEqual({ bookId: 7 });
		expect(problem(() => validate(queueAddBody, { bookId: '7' }))).toBe('bookId: Must be a number');
		expect(problem(() => validate(queueAddBody, { bookId: 2.5 }))).toBe(
			'bookId: Must be a whole number'
		);
		expect(problem(() => validate(queueAddBody, {}))).toMatch(/^bookId: /);
	});

	it('order: a list of distinct ids (empty allowed)', () => {
		expect(validate(queueOrderBody, { bookIds: [3, 1, 2] })).toEqual({ bookIds: [3, 1, 2] });
		expect(validate(queueOrderBody, { bookIds: [] })).toEqual({ bookIds: [] });
		expect(problem(() => validate(queueOrderBody, { bookIds: [1, 2, 1] }))).toBe(
			'bookIds: A book is listed twice'
		);
		expect(problem(() => validate(queueOrderBody, { bookIds: 'all' }))).toBe(
			'bookIds: Must be a list of book ids'
		);
		expect(problem(() => validate(queueOrderBody, { bookIds: [1, -2] }))).toMatch(/^bookIds\.1: /);
	});
});
