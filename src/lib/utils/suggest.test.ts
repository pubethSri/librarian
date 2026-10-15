import { describe, it, expect } from 'vitest';
import { canonicalName, distinctNames, matchNames } from './suggest';

describe('distinctNames', () => {
	it('drops blanks and case/space duplicates, keeping the first spelling, sorted', () => {
		expect(
			distinctNames(['Phoenix Next', null, '  ', 'phoenix next', 'Animag ', undefined, 'Animag'])
		).toEqual(['Animag', 'Phoenix Next']);
	});
});

describe('matchNames', () => {
	const all = ['Animag', 'First Page Pro.', 'Phoenix Next', 'Siam Inter Comic'];

	it('lists every publisher for an empty query', () => {
		expect(matchNames(all, '  ')).toEqual(all);
	});

	it('matches substrings case-insensitively, prefix matches first', () => {
		expect(matchNames(all, 'NI')).toEqual(['Animag', 'Phoenix Next']);
		expect(matchNames(all, 'pho')).toEqual(['Phoenix Next']);
		expect(matchNames(all, 'si')).toEqual(['Siam Inter Comic']);
		expect(matchNames(all, 'a')).toEqual(['Animag', 'First Page Pro.', 'Siam Inter Comic']);
	});

	it('returns nothing for a name no publisher contains', () => {
		expect(matchNames(all, 'Yen Press')).toEqual([]);
	});
});

describe('canonicalName', () => {
	const all = ['Animag', 'Phoenix Next'];

	it('returns the existing spelling for a case/space-insensitive match', () => {
		expect(canonicalName(all, '  phoenix NEXT ')).toBe('Phoenix Next');
	});

	it('returns null for a new name or a blank', () => {
		expect(canonicalName(all, 'Phoenix')).toBeNull();
		expect(canonicalName(all, '')).toBeNull();
	});
});
