// ─── Volume labels ──────────────────────────────────────────────────────────
// An extra volume (side story, short-story collection…) keeps a volume number
// only as its sort position — 4.5 sits between 4 and 5 — so it is shown as
// "Extra", never as "4.5". Pure; unit-tested.

export type VolumeLike = { volumeNumber: string | number; isExtra: boolean };

/** Label for a volume column or chip: "5", or "Extra" */
export function volumeLabel(book: VolumeLike): string {
	return book.isExtra ? 'Extra' : String(Number(book.volumeNumber));
}

/**
 * The volume in a sentence: "vol. 5", or "extra (after vol. 4)" — placed by
 * the regular volume it sorts after; "(before vol. 1)" when it sorts first.
 */
export function volumeText(book: VolumeLike): string {
	if (!book.isExtra) return `vol. ${Number(book.volumeNumber)}`;
	const after = Math.floor(Number(book.volumeNumber));
	return after < 1 ? 'extra (before vol. 1)' : `extra (after vol. ${after})`;
}

/** The highest regular volume (extras don't count); 0 when there is none */
export function latestVolume(books: readonly VolumeLike[]): number {
	const regular = books.filter((b) => !b.isExtra).map((b) => Number(b.volumeNumber));
	return regular.length > 0 ? Math.max(...regular) : 0;
}
