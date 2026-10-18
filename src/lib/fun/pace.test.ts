import { describe, expect, it } from 'vitest';
import type { SeriesType } from '$lib/types';
import {
	addDays,
	approxLabel,
	buyPerDay,
	clearTime,
	countAnnual,
	dayDiff,
	daysPerVolume,
	fairRelation,
	fairsLine,
	fairsPassed,
	holidaysLine,
	neededPace,
	nextEdition,
	nextSpringFair,
	novelPaceText,
	olderLine,
	slowJoke
} from './pace';

const pile = { light_novel: 92, manga: 6 };

describe('daysPerVolume', () => {
	it('reads both units as days a volume', () => {
		expect(daysPerVolume({ value: 3, unit: 'daysPer' })).toBe(3);
		expect(daysPerVolume({ value: 4, unit: 'perDay' })).toBe(0.25);
		expect(daysPerVolume({ value: 0, unit: 'perDay' })).toBeNull();
		expect(daysPerVolume({ value: Number.NaN, unit: 'daysPer' })).toBeNull();
		expect(daysPerVolume({ value: -1, unit: 'daysPer' })).toBeNull();
	});
});

describe('days', () => {
	it('adds and diffs calendar days', () => {
		expect(addDays('2026-10-18', 278)).toBe('2027-07-23');
		expect(dayDiff('2026-10-18', '2027-03-27')).toBe(160);
	});

	it('approximates in weeks, months, years', () => {
		expect(approxLabel(10)).toBeNull();
		expect(approxLabel(21)).toBe('≈ 3 weeks');
		expect(approxLabel(278)).toBe('≈ 9 months');
		expect(approxLabel(31)).toBe('≈ 4 weeks');
		expect(approxLabel(65)).toBe('≈ 2 months');
		expect(approxLabel(850)).toBe('≈ 2.3 years');
	});
});

describe('buyPerDay', () => {
	it('counts the last 365 days by type', () => {
		const types = new Map<number, SeriesType>([
			[1, 'light_novel'],
			[2, 'manga']
		]);
		const books = [
			{ seriesId: 1, boughtAt: '2026-10-01T00:00:00.000Z' },
			{ seriesId: 1, boughtAt: '2025-10-19' },
			{ seriesId: 1, boughtAt: '2025-10-18' },
			{ seriesId: 2, boughtAt: '2026-03-28' },
			{ seriesId: 2, boughtAt: null }
		];
		const r = buyPerDay(books, types, '2026-10-18');
		expect(r.light_novel * 365).toBeCloseTo(2);
		expect(r.manga * 365).toBeCloseTo(1);
	});
});

describe('clearTime', () => {
	const dpv = { light_novel: 3, manga: 1 / 3 };

	it('reads the novels then the manga', () => {
		expect(clearTime(pile, dpv)).toEqual({ kind: 'days', days: 278 });
	});

	it('is empty without a pile', () => {
		expect(clearTime({ light_novel: 0, manga: 0 }, dpv)).toEqual({ kind: 'empty' });
	});

	it('takes longer while buying, and never when buying outpaces reading', () => {
		const slowBuying = { light_novel: 0.1, manga: 0 };
		expect(clearTime(pile, dpv, slowBuying)).toEqual({ kind: 'days', days: 398 });
		const fastBuying = { light_novel: 0.5, manga: 0 };
		expect(clearTime(pile, dpv, fastBuying)).toMatchObject({ kind: 'never', load: 1.5 });
	});
});

describe('fun lines', () => {
	it('counts Christmases and Songkrans', () => {
		expect(countAnnual('12-25', '2026-10-18', '2027-07-23')).toBe(1);
		expect(countAnnual('12-25', '2026-12-25', '2027-12-25')).toBe(1);
		expect(holidaysLine('2026-10-18', '2027-07-23')).toBe("That's 1 Christmas and 1 Songkran");
		expect(holidaysLine('2026-10-18', '2029-05-01')).toBe("That's 3 Christmases and 3 Songkrans");
		expect(holidaysLine('2026-10-18', '2026-11-01')).toBe(
			'Done before the next Christmas or Songkran'
		);
		expect(holidaysLine('2026-10-18', '2027-01-10')).toBe("That's 1 Christmas");
	});

	const fairs = [
		{ date: '2026-03-28' },
		{ date: '2025-10-12' },
		{ date: '2026-10-23' },
		{ date: '2025-03-29' }
	];

	it('counts bookfairs on record and repeated yearly', () => {
		// Oct 23 2026 (on record), Mar 28 2027
		expect(fairsPassed(fairs, '2026-10-18', '2027-07-23')).toBe(2);
		expect(fairsPassed(fairs, '2026-10-18', '2026-10-20')).toBe(0);
		// + Oct 23 2027, Mar 28 2028, Oct 23 2028
		expect(fairsPassed(fairs, '2026-10-18', '2028-12-01')).toBe(5);
		expect(fairsLine(0)).toBe("You'll finish before the next bookfair");
		expect(fairsLine(1)).toBe('1 more bookfair before you finish');
		expect(fairsLine(4)).toBe('4 more bookfairs before you finish');
	});

	it('says how much older you will be past a year', () => {
		expect(olderLine(300)).toBeNull();
		expect(olderLine(365)).toBe("You'll be about 1 year older when you finish");
		expect(olderLine(550)).toBe("You'll be about 1.5 years older when you finish");
		expect(olderLine(3000)).toBe("You'll be about 8 years older when you finish");
	});

	it('jokes about really slow paces', () => {
		expect(slowJoke(3000)).toBeNull();
		expect(slowJoke(4000)).toMatch(/outlive your phone/);
		expect(slowJoke(10_000)).toMatch(/remade/);
		expect(slowJoke(20_000)).toMatch(/heirloom/);
		expect(slowJoke(40_000)).toMatch(/Archaeologists/);
	});

	it('places the finish against the spring fair', () => {
		expect(fairRelation('2027-07-23', '2027-03-27')).toBe('4 months after the spring fair');
		expect(fairRelation('2027-03-20', '2027-03-27')).toBe('7 days before the spring fair');
		expect(fairRelation('2027-03-27', '2027-03-27')).toBe('Done on the day of the spring fair');
	});
});

describe('nextSpringFair', () => {
	const fairs = [
		{ name: 'สัปดาห์หนังสือแห่งชาติ 53', date: '2025-03-29' },
		{ name: 'สัปดาห์หนังสือแห่งชาติ 54', date: '2026-03-28' },
		{ name: 'มหกรรมหนังสือระดับชาติ 31', date: '2026-10-23' }
	];

	it('guesses from the last spring fair, same weekday next year', () => {
		expect(nextSpringFair(fairs, '2026-10-18')).toEqual({
			name: 'สัปดาห์หนังสือแห่งชาติ 55',
			date: '2027-03-27',
			guessed: true
		});
	});

	it('uses a spring fair on record once there is one', () => {
		const withReal = [...fairs, { name: 'สัปดาห์หนังสือแห่งชาติ 55', date: '2027-04-01' }];
		expect(nextSpringFair(withReal, '2026-10-18')).toEqual({
			name: 'สัปดาห์หนังสือแห่งชาติ 55',
			date: '2027-04-01',
			guessed: false
		});
	});

	it('skips whole years and is null without spring fairs', () => {
		expect(nextSpringFair(fairs.slice(0, 1), '2026-10-18')?.name).toBe('สัปดาห์หนังสือแห่งชาติ 55');
		expect(nextSpringFair([fairs[2]], '2026-10-18')).toBeNull();
		expect(nextEdition('Spring fair', 2)).toBe('Spring fair');
	});
});

describe('neededPace', () => {
	it('gives the novel pace after the manga', () => {
		const r = neededPace(pile, '2026-10-18', '2027-03-27', 1 / 3);
		expect(r).toMatchObject({ kind: 'pace', novels: 92, manga: 6, mangaDays: 2 });
		if (r.kind !== 'pace') throw new Error();
		expect(r.perDay).toBeCloseTo(92 / 158);
		expect(r.impossible).toBe(false);
		expect(novelPaceText(r.perDay)).toBe('1 light novel every 1.7 days');
	});

	it('flags more than 2.5 novels a day', () => {
		const r = neededPace(pile, '2026-10-18', '2026-11-20', 1 / 3);
		expect(r).toMatchObject({ kind: 'pace', impossible: true });
		if (r.kind !== 'pace') throw new Error();
		expect(novelPaceText(r.perDay)).toBe('3 light novels a day');
	});

	it('adds what you would buy until then', () => {
		const r = neededPace(pile, '2026-10-18', '2027-03-27', 1 / 3, {
			light_novel: 0.25,
			manga: 0
		});
		expect(r).toMatchObject({ kind: 'pace', novels: 132 });
	});

	it('handles the edges', () => {
		expect(neededPace(pile, '2027-04-01', '2027-03-27', 1)).toEqual({ kind: 'past' });
		expect(neededPace({ light_novel: 0, manga: 0 }, '2026-10-18', '2027-03-27', 1)).toEqual({
			kind: 'empty'
		});
		expect(neededPace({ light_novel: 0, manga: 30 }, '2026-10-18', '2027-03-27', 1)).toEqual({
			kind: 'mangaOnly',
			manga: 30,
			mangaDays: 30,
			fits: true
		});
		const r = neededPace({ light_novel: 5, manga: 200 }, '2026-10-18', '2027-03-27', 1);
		expect(r).toMatchObject({ kind: 'pace', perDay: Infinity, impossible: true });
		expect(novelPaceText(1)).toBe('1 light novel a day');
	});
});
