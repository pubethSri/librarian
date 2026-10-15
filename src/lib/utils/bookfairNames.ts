// ─── Bookfair name suggestions ──────────────────────────────────────────────
// Recurring fairs are numbered editions ("สัปดาห์หนังสือแห่งชาติ 54",
// "มหกรรมหนังสือระดับชาติ 30", "Big Bad Wolf 2026"). From the fairs already
// logged, suggest each event's next edition. Pure; unit-tested.

export type FairLike = { name: string; date: string; location: string | null };
export type NextEdition = { name: string; location: string | null };

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
 * The next edition of every numbered event, with the location it was last
 * held at. Ordered so the event usually held nearest `forDate`'s month comes
 * first (October → the end-of-year fair), then by most recently held.
 */
export function nextEditions(fairs: readonly FairLike[], forDate?: string): NextEdition[] {
	const events = new Map<string, { base: string; maxEdition: number; latest: FairLike }>();
	for (const fair of fairs) {
		const split = splitEdition(fair.name);
		if (!split) continue;
		const key = split.base.toLowerCase();
		const event = events.get(key);
		if (!event) {
			events.set(key, { base: split.base, maxEdition: split.edition, latest: fair });
			continue;
		}
		event.maxEdition = Math.max(event.maxEdition, split.edition);
		if (fair.date > event.latest.date) event.latest = fair;
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
		.map((e) => ({ name: `${e.base} ${e.maxEdition + 1}`, location: e.latest.location }));
}
