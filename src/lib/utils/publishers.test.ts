import { describe, it, expect } from 'vitest';
import { canonicalPublisher, distinctPublishers, matchPublishers } from './publishers';

describe('distinctPublishers', () => {
	it('drops blanks and case/space duplicates, keeping the first spelling, sorted', () => {
		expect(
			distinctPublishers([
				'Phoenix Next',
				null,
				'  ',
				'phoenix next',
				'Animag ',
				undefined,
				'Animag'
			])
		).toEqual(['Animag', 'Phoenix Next']);
	});
});

describe('matchPublishers', () => {
	const all = ['Animag', 'First Page Pro.', 'Phoenix Next', 'Siam Inter Comic'];

	it('lists every publisher for an empty query', () => {
		expect(matchPublishers(all, '  ')).toEqual(all);
	});

	it('matches substrings case-insensitively, prefix matches first', () => {
		expect(matchPublishers(all, 'NI')).toEqual(['Animag', 'Phoenix Next']);
		expect(matchPublishers(all, 'pho')).toEqual(['Phoenix Next']);
		expect(matchPublishers(all, 'si')).toEqual(['Siam Inter Comic']);
		expect(matchPublishers(all, 'a')).toEqual(['Animag', 'First Page Pro.', 'Siam Inter Comic']);
	});

	it('returns nothing for a name no publisher contains', () => {
		expect(matchPublishers(all, 'Yen Press')).toEqual([]);
	});
});

describe('canonicalPublisher', () => {
	const all = ['Animag', 'Phoenix Next'];

	it('returns the existing spelling for a case/space-insensitive match', () => {
		expect(canonicalPublisher(all, '  phoenix NEXT ')).toBe('Phoenix Next');
	});

	it('returns null for a new name or a blank', () => {
		expect(canonicalPublisher(all, 'Phoenix')).toBeNull();
		expect(canonicalPublisher(all, '')).toBeNull();
	});
});
