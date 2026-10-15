// ─── Bookfair name suggestions ──────────────────────────────────────────────
// Recurring fairs are numbered editions ("สัปดาห์หนังสือแห่งชาติ 54",
// "มหกรรมหนังสือระดับชาติ 30"). From the fairs already logged, suggest each
// event's name without its number — the user types the edition. Pure;
// unit-tested.

export type FairLike = { name: string; date: string; location: string | null };
export type FairSuggestion = { name: string; location: string | null };

/** "สัปดาห์หนังสือแห่งชาติ 54" → { base: "สัปดาห์หนังสือแห่งชาติ", edition: 54 } */
export function splitEdition(name: string): { base: string; edition: number } | null {
	const m = name.trim().match(/^(.*\S)\s+(\d+)$/);
	return m ? { base: m[1], edition: Number(m[2]) } : null;
}

/** Month (1–12) of a `YYYY-MM-DD` date, or null */
function monthOf(date: string | undefined): number | null {
	const m = Number(date?.slice(5, 7));
	return m >= 1 && m <= 12 ? m : null;
}

/**
 * One suggestion per event: its name without the edition number (or the whole
 * name if it has none), with the location it was last held at. Ordered so the
 * event usually held nearest `forDate`'s month comes first (October → the
 * end-of-year fair), then by most recently held.
 */
export function fairNameSuggestions(
	fairs: readonly FairLike[],
	forDate?: string
): FairSuggestion[] {
	const events = new Map<string, { name: string; latest: FairLike }>();
	for (const fair of fairs) {
		const name = splitEdition(fair.name)?.base ?? fair.name.trim();
		if (!name) continue;
		const key = name.toLowerCase();
		const event = events.get(key);
		if (!event) events.set(key, { name, latest: fair });
		else if (fair.date > event.latest.date) event.latest = fair;
	}

	const target = monthOf(forDate);
	const distance = (date: string) => {
		const m = monthOf(date);
		if (target === null || m === null) return 0;
		const d = Math.abs(m - target);
		return Math.min(d, 12 - d);
	};

	return [...events.values()]
		.sort(
			(a, b) =>
				distance(a.latest.date) - distance(b.latest.date) ||
				b.latest.date.localeCompare(a.latest.date)
		)
		.map((e) => ({ name: e.name, location: e.latest.location }));
}
