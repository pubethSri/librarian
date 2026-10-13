import { describe, it, expect } from 'vitest';
import { currentStatus, latestReading, planReadingChange, timesRead } from './reading';
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
