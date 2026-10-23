import { describe, it, expect } from 'vitest';
import {
	checkReadDays,
	currentStatus,
	dayToDate,
	isDay,
	latestDay,
	latestReading,
	planLogRead,
	planReadingChange,
	planUnstart,
	rowDay,
	shiftDay,
	timesRead
} from './reading';
import type { ReadingRowLike } from './reading';

const NOW = new Date('2026-10-14T10:00:00Z');

function row(overrides: Partial<ReadingRowLike> = {}): ReadingRowLike {
	return {
		id: 1,
		status: 'unread',
		startedAt: null,
		finishedAt: null,
		createdAt: '2026-01-01T00:00:00Z',
		...overrides
	};
}

describe('latestReading / currentStatus / timesRead', () => {
	it('treats a book with no rows as Unread, read zero times', () => {
		expect(latestReading([])).toBeNull();
		expect(currentStatus([])).toBe('unread');
		expect(timesRead([])).toBe(0);
	});

	it('picks the newest row by createdAt regardless of array order', () => {
		const rows = [
			row({ id: 2, status: 'reading', createdAt: '2026-05-01T00:00:00Z' }),
			row({ id: 1, status: 'read', createdAt: '2026-01-01T00:00:00Z' })
		];
		expect(latestReading([...rows].reverse())?.id).toBe(2);
		expect(currentStatus(rows)).toBe('reading');
	});

	it('breaks createdAt ties by the higher id', () => {
		const rows = [row({ id: 7, status: 'read' }), row({ id: 9, status: 'dropped' })];
		expect(currentStatus(rows)).toBe('dropped');
	});

	it('counts Read rows as times read', () => {
		const rows = [
			row({ id: 1, status: 'read' }),
			row({ id: 2, status: 'read', createdAt: '2026-02-01T00:00:00Z' }),
			row({ id: 3, status: 'reading', createdAt: '2026-03-01T00:00:00Z' })
		];
		expect(timesRead(rows)).toBe(2);
	});
});

describe('planReadingChange — book with no rows', () => {
	it('does nothing for Unread', () => {
		expect(planReadingChange(null, 'unread', NOW)).toEqual({ kind: 'none' });
	});

	it('inserts a dated row for Reading and Read', () => {
		expect(planReadingChange(null, 'reading', NOW)).toEqual({
			kind: 'insert',
			values: { status: 'reading', startedAt: NOW, finishedAt: null }
		});
		expect(planReadingChange(null, 'read', NOW)).toEqual({
			kind: 'insert',
			values: { status: 'read', startedAt: null, finishedAt: NOW }
		});
	});

	it('inserts an undated row when backfilling (now = null)', () => {
		expect(planReadingChange(null, 'read', null)).toEqual({
			kind: 'insert',
			values: { status: 'read', startedAt: null, finishedAt: null }
		});
	});
});

describe('planReadingChange — existing current row', () => {
	it('does nothing when the status is already the target', () => {
		expect(planReadingChange(row({ status: 'read' }), 'read', NOW)).toEqual({ kind: 'none' });
	});

	it('Unread → Reading starts the current row', () => {
		expect(planReadingChange(row({ id: 4 }), 'reading', NOW)).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'reading', startedAt: NOW, finishedAt: null }
		});
	});

	it('Dropped → Reading resumes and keeps the original start date', () => {
		const started = '2026-03-01T00:00:00Z';
		expect(
			planReadingChange(row({ id: 4, status: 'dropped', startedAt: started }), 'reading', NOW)
		).toEqual({ kind: 'update', id: 4, set: { status: 'reading', finishedAt: null } });
	});

	it('→ Read stamps finishedAt on the current row (no new row)', () => {
		expect(planReadingChange(row({ id: 4, status: 'reading' }), 'read', NOW)).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'read', finishedAt: NOW }
		});
	});

	it('→ Read during backfill leaves finishedAt empty', () => {
		expect(planReadingChange(row({ id: 4 }), 'read', null)).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'read', finishedAt: null }
		});
	});

	it('Read → Reading is a re-read: a new row, the old Read row is kept', () => {
		expect(planReadingChange(row({ id: 4, status: 'read' }), 'reading', NOW)).toEqual({
			kind: 'insert',
			values: { status: 'reading', startedAt: NOW, finishedAt: null }
		});
	});

	it('→ Unread is a correction that clears the current row dates', () => {
		expect(
			planReadingChange(row({ id: 4, status: 'read', finishedAt: NOW }), 'unread', NOW)
		).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'unread', startedAt: null, finishedAt: null }
		});
	});

	it('→ Dropped edits the current row', () => {
		expect(planReadingChange(row({ id: 4, status: 'reading' }), 'dropped', NOW)).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'dropped', finishedAt: null }
		});
	});
});

describe('reading days', () => {
	it('accepts only real YYYY-MM-DD days', () => {
		expect(isDay('2026-10-17')).toBe(true);
		expect(isDay('2026-02-30')).toBe(false);
		expect(isDay('2026-10-17T00:00:00Z')).toBe(false);
		expect(isDay(null)).toBe(false);
	});

	it('stores a day as UTC midnight and reads it back unshifted', () => {
		expect(dayToDate('2026-10-17').toISOString()).toBe('2026-10-17T00:00:00.000Z');
		expect(rowDay(dayToDate('2026-10-17'))).toBe('2026-10-17');
		expect(rowDay('2026-10-17T00:00:00.000Z')).toBe('2026-10-17');
		expect(rowDay(null)).toBeNull();
	});

	it('shifts days across month and year ends', () => {
		expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30');
		expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
	});

	it('bounds "not in the future" by the furthest-ahead time zone', () => {
		expect(latestDay(new Date('2026-10-17T09:00:00Z'))).toBe('2026-10-17');
		// 23:00 UTC is already the next day in Bangkok (UTC+7)
		expect(latestDay(new Date('2026-10-17T23:00:00Z'))).toBe('2026-10-18');
	});

	it('rejects future days and a finish before the start', () => {
		expect(checkReadDays('2026-10-01', '2026-10-05', '2026-10-17')).toBeNull();
		expect(checkReadDays(null, null, '2026-10-17')).toBeNull();
		expect(checkReadDays('2026-10-05', '2026-10-05', '2026-10-17')).toBeNull();
		expect(checkReadDays(null, '2026-10-18', '2026-10-17')).toMatch(/finish day is in the future/);
		expect(checkReadDays('2026-10-18', null, '2026-10-17')).toMatch(/start day is in the future/);
		expect(checkReadDays('2026-10-05', '2026-10-01', '2026-10-17')).toMatch(/before the start/);
	});
});

describe('planLogRead ("I read this")', () => {
	const day = (d: string) => new Date(`${d}T00:00:00Z`);

	it('inserts a Read row for a book with no rows', () => {
		expect(planLogRead(null, { finishedOn: '2026-10-16' })).toEqual({
			startedOn: null,
			change: {
				kind: 'insert',
				values: { status: 'read', startedAt: null, finishedAt: day('2026-10-16') }
			}
		});
	});

	it('logs a re-read on a Read book in one step: a new Read row', () => {
		const latest = row({ status: 'read', finishedAt: '2025-01-01T00:00:00Z' });
		const plan = planLogRead(latest, { finishedOn: '2026-10-16', startedOn: '2026-10-10' });
		expect(plan.change).toEqual({
			kind: 'insert',
			values: { status: 'read', startedAt: day('2026-10-10'), finishedAt: day('2026-10-16') }
		});
	});

	it('completes the current row of a Reading book and keeps its start', () => {
		const latest = row({ id: 4, status: 'reading', startedAt: '2026-10-01T00:00:00Z' });
		const plan = planLogRead(latest, { finishedOn: '2026-10-16' });
		expect(plan.startedOn).toBe('2026-10-01');
		expect(plan.change).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'read', finishedAt: day('2026-10-16') }
		});
	});

	it('replaces or clears the start when one is given', () => {
		const latest = row({ id: 4, status: 'dropped', startedAt: '2026-10-01T00:00:00Z' });
		expect(planLogRead(latest, { finishedOn: null, startedOn: null }).change).toEqual({
			kind: 'update',
			id: 4,
			set: { status: 'read', startedAt: null, finishedAt: null }
		});
		expect(planLogRead(latest, { finishedOn: null, startedOn: '2026-10-03' }).startedOn).toBe(
			'2026-10-03'
		);
	});

	it('completes an Unread row (finish day unknown)', () => {
		expect(planLogRead(row({ id: 2 }), { finishedOn: null }).change).toEqual({
			kind: 'update',
			id: 2,
			set: { status: 'read', finishedAt: null }
		});
	});
});

describe('planUnstart (Back to the queue)', () => {
	it('removes the read-through being read: a first read → Unread, a re-read → Read', () => {
		const first = row({ id: 4, status: 'reading', startedAt: '2026-10-20T00:00:00Z' });
		expect(planUnstart([first])).toBe(4);
		const done = row({ id: 5, status: 'read', createdAt: '2026-01-01T00:00:00Z' });
		const again = row({ id: 6, status: 'reading', createdAt: '2026-10-20T00:00:00Z' });
		expect(planUnstart([done, again])).toBe(6);
		expect(currentStatus([done])).toBe('read');
	});

	it('does nothing for a book that is not being read', () => {
		expect(planUnstart([])).toBeNull();
		expect(planUnstart([row({ status: 'read' })])).toBeNull();
		expect(planUnstart([row({ status: 'dropped' })])).toBeNull();
	});
});
