import { describe, it, expect } from 'vitest';
import { nextEditions, splitEdition } from './bookfairNames';

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

describe('nextEditions', () => {
	it('suggests one past the highest edition of each numbered event, with its last location', () => {
		const names = nextEditions(fairs).map((e) => e.name);
		expect(names).toContain(`${WEEK} 55`);
		expect(names).toContain(`${FEST} 31`);
		expect(names).toHaveLength(2); // "Comic Day" has no edition
		expect(nextEditions(fairs).every((e) => e.location === 'QSNCC')).toBe(true);
	});

	it('puts the event usually held nearest the chosen month first', () => {
		expect(nextEditions(fairs, '2026-10-20')[0].name).toBe(`${FEST} 31`);
		expect(nextEditions(fairs, '2027-03-25')[0].name).toBe(`${WEEK} 55`);
	});

	it('falls back to most recently held first without a date', () => {
		expect(nextEditions(fairs)[0].name).toBe(`${WEEK} 55`);
	});

	it('suggests nothing when no fair is numbered', () => {
		expect(nextEditions([{ name: 'Comic Day', date: '2026-06-01', location: null }])).toEqual([]);
	});
});
