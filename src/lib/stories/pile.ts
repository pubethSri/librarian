// ─── Pile-height stories: the numbers ────────────────────────────────────────
// How tall the unread pile is (books × an average spine — there are no page
// counts), what a bookfair added to it, and an everyday thing to compare the
// height with. Pure; tested. Drawing lives in ./pileImage.

import type { BookListItem, SeriesType } from '$lib/types';

/** Average spine thickness (cm): a Thai LN (~300 pages) and a tankobon */
export const SPINE_CM: Record<SeriesType, number> = { light_novel: 1.8, manga: 1.2 };

/** The fields the pile needs from a book */
export type PileBook = Pick<
	BookListItem,
	'id' | 'seriesId' | 'volumeNumber' | 'readingStatus' | 'timesRead' | 'sourceEventId'
>;

/** One book in the drawn stack, bottom to top */
export type Spine = { bookId: number; seriesId: number; cm: number; fair: boolean };

export type Pile = {
	books: number;
	cm: number;
	byType: Record<SeriesType, number>;
	/** Bottom to top: series grouped (A→Z by id), volumes in order; the fair's books on top */
	spines: Spine[];
};

export type FairAdd = {
	/** Every book bought at the fair, read since or not */
	books: number;
	cm: number;
	/** …of which still in the pile */
	unread: number;
	unreadCm: number;
	/** The pile without the fair's still-unread books */
	beforeCm: number;
};

/** In the unread pile: never read, not being read, not dropped (as Insights → Backlog) */
export function inPile(b: Pick<PileBook, 'readingStatus' | 'timesRead'>): boolean {
	return b.timesRead === 0 && b.readingStatus === 'unread';
}

/** cm rounded to a tenth, so sums of 1.8s don't print 173.99999 */
const tenth = (n: number) => Math.round(n * 10) / 10;

function spineOf(b: PileBook, typeOf: ReadonlyMap<number, SeriesType>): number {
	return SPINE_CM[typeOf.get(b.seriesId) ?? 'light_novel'];
}

/**
 * The unread pile. `typeOf` maps series id → type (unknown series count as LN).
 * With `fairId`, that fair's unread books sit on top of the stack (the gold slice).
 */
export function pileOf(
	books: readonly PileBook[],
	typeOf: ReadonlyMap<number, SeriesType>,
	fairId: number | null = null
): Pile {
	const pile = books.filter(inPile);
	const byType: Record<SeriesType, number> = { light_novel: 0, manga: 0 };
	for (const b of pile) byType[typeOf.get(b.seriesId) ?? 'light_novel']++;

	const order = (a: PileBook, b: PileBook) =>
		a.seriesId - b.seriesId || Number(a.volumeNumber) - Number(b.volumeNumber) || a.id - b.id;
	const isFair = (b: PileBook) => fairId !== null && b.sourceEventId === fairId;
	const spines = [
		...pile.filter((b) => !isFair(b)).sort(order),
		...pile.filter(isFair).sort(order)
	].map((b) => ({ bookId: b.id, seriesId: b.seriesId, cm: spineOf(b, typeOf), fair: isFair(b) }));

	return {
		books: pile.length,
		cm: tenth(spines.reduce((s, x) => s + x.cm, 0)),
		byType,
		spines
	};
}

/** What a fair added: every book linked to it; "before" = the pile without its unread ones */
export function fairAdd(
	books: readonly PileBook[],
	typeOf: ReadonlyMap<number, SeriesType>,
	fairId: number
): FairAdd {
	const bought = books.filter((b) => b.sourceEventId === fairId);
	const unread = bought.filter(inPile);
	const cm = tenth(bought.reduce((s, b) => s + spineOf(b, typeOf), 0));
	const unreadCm = tenth(unread.reduce((s, b) => s + spineOf(b, typeOf), 0));
	const pileCm = pileOf(books, typeOf).cm;
	return {
		books: bought.length,
		cm,
		unread: unread.length,
		unreadCm,
		beforeCm: tenth(Math.max(0, pileCm - unreadCm))
	};
}

/** "71 cm" under a metre, else "1.74 m" */
export function formatHeight(cm: number): string {
	if (cm < 100) return `${Math.round(cm)} cm`;
	return `${(cm / 100).toFixed(2)} m`;
}

/** Everyday heights (cm), shortest first */
export const COMPARISONS: readonly { cm: number; name: string }[] = [
	{ cm: 25, name: 'a cat' },
	{ cm: 90, name: 'a kitchen counter' },
	{ cm: 170, name: 'a person' },
	{ cm: 200, name: 'a door' },
	{ cm: 305, name: 'a basketball hoop' },
	{ cm: 440, name: 'a double-decker bus' },
	{ cm: 550, name: 'a giraffe' },
	{ cm: 700, name: 'a two-storey house' }
];

/** Within this share of a thing's height, the pile is "about as tall as" it */
const ABOUT = 0.05;

/** "about as tall as a person", "taller than a door", "shorter than a cat" */
export function compareHeight(cm: number): string {
	if (cm <= 0) return 'nothing left to read';
	const near = COMPARISONS.find((c) => Math.abs(cm - c.cm) <= c.cm * ABOUT);
	if (near) return `about as tall as ${near.name}`;
	const below = COMPARISONS.filter((c) => c.cm < cm).at(-1);
	return below ? `taller than ${below.name}` : `shorter than ${COMPARISONS[0].name}`;
}

/** "99 books", "1 book" */
export function booksLabel(n: number): string {
	return `${n} book${n === 1 ? '' : 's'}`;
}

/** File names, e.g. pile-2026-10-18.png, pile-fair-12-2026-10-26.png */
export function pileFileName(day: string, fairId: number | null = null): string {
	return fairId === null ? `pile-${day}.png` : `pile-fair-${fairId}-${day}.png`;
}

/**
 * The fair story 2 is about: the one picked in Field Mode's chip once it has
 * books, else the latest fair that has books; null when there is none.
 */
export function storyFair<F extends { id: number; date: string; bookCount: number }>(
	fairs: readonly F[],
	pickedId: number | null
): F | null {
	const picked = fairs.find((f) => f.id === pickedId);
	if (picked && picked.bookCount > 0) return picked;
	return (
		fairs
			.filter((f) => f.bookCount > 0)
			.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0] ?? null
	);
}
