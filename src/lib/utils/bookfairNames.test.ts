import { describe, it, expect } from 'vitest';
import { fairNameSuggestions, splitEdition } from './bookfairNames';

const WEEK = 'สัปดาห์หนังสือแห่งชาติ';
const FEST = 'มหกรรมหนังสือระดับชาติ';

const fairs = [
	{ name: `${WEEK} 53`, date: '2025-03-28', location: 'QSNCC' },
	{ name: `${FEST} 30`, date: '2025-10-12', location: 'QSNCC' },
	{ name: `${WEEK} 54`, date: '2026-04-01', location: 'QSNCC' },
	{ name: 'Comic Day', date: '2026-06-01', location: null }
];

describe('splitEdition', () => {
	it('splits a trailing edition number off the event name', () => {
		expect(splitEdition(`${WEEK} 54`)).toEqual({ base: WEEK, edition: 54 });
		expect(splitEdition('Big Bad Wolf 2026 ')).toEqual({ base: 'Big Bad Wolf', edition: 2026 });
	});

	it('returns null for a name without an edition number', () => {
		expect(splitEdition('Comic Day')).toBeNull();
		expect(splitEdition('54')).toBeNull();
	});
});

describe('fairNameSuggestions', () => {
	it('suggests each event once, without its edition number, with its last location', () => {
		const suggestions = fairNameSuggestions(fairs);
		expect(suggestions.map((s) => s.name).sort()).toEqual(['Comic Day', FEST, WEEK].sort());
		expect(suggestions.find((s) => s.name === WEEK)?.location).toBe('QSNCC');
		expect(suggestions.find((s) => s.name === 'Comic Day')?.location).toBeNull();
	});

	it('puts the event usually held nearest the chosen month first', () => {
		expect(fairNameSuggestions(fairs, '2026-10-20')[0].name).toBe(FEST);
		expect(fairNameSuggestions(fairs, '2027-03-25')[0].name).toBe(WEEK);
	});

	it('falls back to most recently held first without a date', () => {
		expect(fairNameSuggestions(fairs)[0].name).toBe('Comic Day');
	});

	it('suggests nothing when no fair is logged', () => {
		expect(fairNameSuggestions([])).toEqual([]);
	});
});
