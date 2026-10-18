// ─── Fun: how long to clear the unread pile ──────────────────────────────────
// "My pace" (a pace per type → days to clear, with fun lines) and "By the fair"
// (the pace needed to clear it before the next spring bookfair). Paces are
// always in days: volumes a day, or days a volume. Light novels and manga have
// their own pace, read one after the other. Pure; tested.

import type { SeriesType } from '$lib/types';

/** Your record: 2.5 novels in one day (2026-10-18). Needing more is flagged */
export const MAX_NOVELS_PER_DAY = 2.5;

export type PaceUnit = 'perDay' | 'daysPer';
export type Pace = { value: number; unit: PaceUnit };
export type ByType = Record<SeriesType, number>;

/** Days one volume takes; null for an empty or non-positive pace */
export function daysPerVolume(p: Pace): number | null {
	if (!Number.isFinite(p.value) || p.value <= 0) return null;
	return p.unit === 'perDay' ? 1 / p.value : p.value;
}

/** 2.5 → "2.5", 3 → "3", 1.666 → "1.7" */
export function short(n: number): string {
	return (Math.round(n * 10) / 10).toString();
}

// ─── Days ────────────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` + n days */
export function addDays(day: string, n: number): string {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` */
export function dayDiff(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "≈ 3 weeks", "≈ 9 months", "≈ 2.3 years"; null under two weeks */
export function approxLabel(days: number): string | null {
	if (days < 14) return null;
	if (days < 60) return `≈ ${Math.round(days / 7)} weeks`;
	if (days < 730) {
		const m = Math.round(days / 30.44);
		return `≈ ${m} month${m === 1 ? '' : 's'}`;
	}
	return `≈ ${short(days / 365.25)} years`;
}

/** "1 day", "278 days" */
export function daysLabel(days: number): string {
	return `${days.toLocaleString('en-US')} day${days === 1 ? '' : 's'}`;
}

// ─── Buying ──────────────────────────────────────────────────────────────────

/** Books bought per day by type, over the 365 days up to today */
export function buyPerDay(
	books: readonly { seriesId: number; boughtAt: string | null }[],
	typeOf: ReadonlyMap<number, SeriesType>,
	today: string
): ByType {
	const from = addDays(today, -365);
	const out: ByType = { light_novel: 0, manga: 0 };
	for (const b of books) {
		const day = b.boughtAt?.slice(0, 10);
		if (day && day > from && day <= today) out[typeOf.get(b.seriesId) ?? 'light_novel']++;
	}
	return { light_novel: out.light_novel / 365, manga: out.manga / 365 };
}

// ─── My pace ─────────────────────────────────────────────────────────────────

export type ClearTime =
	| { kind: 'empty' }
	| { kind: 'never'; load: number }
	| { kind: 'days'; days: number };

/**
 * Days to read the pile at these paces (days per volume). With `buying`
 * (books a day), new books keep arriving: each day of reading also has to
 * absorb `load` days of new books; at load ≥ 1 the pile never clears.
 */
export function clearTime(pile: ByType, dpv: ByType, buying: ByType | null = null): ClearTime {
	const work = pile.light_novel * dpv.light_novel + pile.manga * dpv.manga;
	if (pile.light_novel + pile.manga === 0) return { kind: 'empty' };
	const load = buying ? buying.light_novel * dpv.light_novel + buying.manga * dpv.manga : 0;
	if (load >= 1) return { kind: 'never', load };
	return { kind: 'days', days: Math.max(1, Math.ceil(work / (1 - load))) };
}

/** How many times `MM-DD` falls after `from`, up to and including `to` */
export function countAnnual(monthDay: string, from: string, to: string): number {
	let n = 0;
	for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
		const d = `${y}-${monthDay}`;
		if (d > from && d <= to) n++;
	}
	return n;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "That's 1 Christmas and 2 Songkrans" — Christmas Dec 25, Songkran Apr 13 */
export function holidaysLine(today: string, end: string): string {
	const xmas = countAnnual('12-25', today, end);
	const songkran = countAnnual('04-13', today, end);
	if (xmas === 0 && songkran === 0) return 'Done before the next Christmas or Songkran';
	const parts = [];
	if (xmas > 0) parts.push(plural(xmas, 'Christmas', 'Christmases'));
	if (songkran > 0) parts.push(plural(songkran, 'Songkran', 'Songkrans'));
	return `That's ${parts.join(' and ')}`;
}

/** The season of a fair: spring (Feb–Jun) or autumn (Aug–Dec) */
function season(day: string): 'spring' | 'autumn' | null {
	const m = Number(day.slice(5, 7));
	if (m >= 2 && m <= 6) return 'spring';
	if (m >= 8) return 'autumn';
	return null;
}

/**
 * Bookfairs between today and `end`: the fairs on record, then each season's
 * latest one repeated yearly (same month and day).
 */
export function fairsPassed(
	fairs: readonly { date: string }[],
	today: string,
	end: string
): number {
	let n = 0;
	for (const s of ['spring', 'autumn'] as const) {
		const dates = fairs.map((f) => f.date.slice(0, 10)).filter((d) => season(d) === s);
		if (dates.length === 0) continue;
		n += dates.filter((d) => d > today && d <= end).length;
		const latest = dates.sort().at(-1) as string;
		for (let y = Number(latest.slice(0, 4)) + 1; y <= Number(end.slice(0, 4)); y++) {
			const d = `${y}${latest.slice(4)}`;
			if (d > today && d <= end) n++;
		}
	}
	return n;
}

export function fairsLine(n: number): string {
	if (n === 0) return "You'll finish before the next bookfair";
	return `${plural(n, 'more bookfair', 'more bookfairs')} before you finish`;
}

/** "You'll be about 2 years older"; null under a year */
export function olderLine(days: number): string | null {
	if (days < 365) return null;
	const years = days / 365.25;
	const n = years < 2 ? short(years) : String(Math.round(years));
	return `You'll be about ${n} year${n === '1' ? '' : 's'} older when you finish`;
}

/** A joke for a really slow pace (the slowest that applies); null under 10 years */
export function slowJoke(days: number): string | null {
	const years = days / 365.25;
	if (years >= 100) return 'Archaeologists will catalogue the rest for you.';
	if (years >= 50) return 'A family heirloom: your grandkids inherit the pile.';
	if (years >= 25) return 'Some of these series will be remade before you read the originals.';
	if (years >= 10) return 'The pile will outlive your phone — and the next three.';
	return null;
}

/** When you'd finish relative to the spring fair */
export function fairRelation(end: string, fairDate: string): string {
	const d = dayDiff(end, fairDate);
	if (d === 0) return 'Done on the day of the spring fair';
	const span = approxLabel(Math.abs(d))?.replace('≈ ', '') ?? daysLabel(Math.abs(d));
	return d > 0 ? `${span} before the spring fair` : `${span} after the spring fair`;
}

// ─── By the fair ─────────────────────────────────────────────────────────────

export type SpringFair = { name: string; date: string; guessed: boolean };

/** "สัปดาห์หนังสือแห่งชาติ 54" + 1 → "… 55"; a name without a number stays */
export function nextEdition(name: string, n: number): string {
	return name.replace(/(\d+)\s*$/, (m) => String(Number(m) + n));
}

/**
 * The next spring fair: one on record after today, else the latest spring
 * fair moved on by whole years (364 days a year keeps the weekday) until it is
 * after today. null when no spring fair is on record.
 */
export function nextSpringFair(
	fairs: readonly { name: string; date: string }[],
	today: string
): SpringFair | null {
	const spring = fairs
		.map((f) => ({ name: f.name, date: f.date.slice(0, 10) }))
		.filter((f) => season(f.date) === 'spring')
		.sort((a, b) => a.date.localeCompare(b.date));
	const upcoming = spring.find((f) => f.date > today);
	if (upcoming) return { ...upcoming, guessed: false };
	const last = spring.at(-1);
	if (!last) return null;
	let date = last.date;
	let years = 0;
	while (date <= today) {
		date = addDays(date, 364);
		years++;
	}
	return { name: nextEdition(last.name, years), date, guessed: true };
}

export type NeededPace =
	| { kind: 'past' }
	| { kind: 'empty' }
	| { kind: 'mangaOnly'; manga: number; mangaDays: number; fits: boolean }
	| {
			kind: 'pace';
			novels: number;
			manga: number;
			mangaDays: number;
			/** Novels a day needed; Infinity when the manga alone take every day */
			perDay: number;
			impossible: boolean;
	  };

/**
 * The novel pace needed to clear the pile by `fairDate`, the manga read at
 * their own pace (days per volume) first. With `buying`, the books you'd buy
 * until then count too.
 */
export function neededPace(
	pile: ByType,
	today: string,
	fairDate: string,
	mangaDpv: number,
	buying: ByType | null = null
): NeededPace {
	const daysLeft = dayDiff(today, fairDate);
	if (daysLeft <= 0) return { kind: 'past' };
	const novels = Math.round(pile.light_novel + (buying?.light_novel ?? 0) * daysLeft);
	const manga = Math.round(pile.manga + (buying?.manga ?? 0) * daysLeft);
	if (novels + manga === 0) return { kind: 'empty' };
	const mangaDays = manga * mangaDpv;
	if (novels === 0) return { kind: 'mangaOnly', manga, mangaDays, fits: mangaDays <= daysLeft };
	const novelDays = daysLeft - mangaDays;
	const perDay = novelDays > 0 ? novels / novelDays : Infinity;
	return {
		kind: 'pace',
		novels,
		manga,
		mangaDays,
		perDay,
		impossible: perDay > MAX_NOVELS_PER_DAY
	};
}

/** "1 light novel every 1.7 days", "2.3 light novels a day" */
export function novelPaceText(perDay: number): string {
	if (perDay >= 1) return `${short(perDay)} light novel${short(perDay) === '1' ? '' : 's'} a day`;
	return `1 light novel every ${short(1 / perDay)} days`;
}
