// ─── Publisher suggestions ──────────────────────────────────────────────────
// Publisher is free text on `series`, so "a new publisher" is just a value no
// series has used yet. These helpers keep spellings consistent by steering the
// input toward names already in use. Pure; unit-tested.

/**
 * Distinct publisher names, sorted. Names differing only in case or
 * surrounding spaces count as one, keeping the first spelling seen.
 */
export function distinctPublishers(names: readonly (string | null | undefined)[]): string[] {
	const byKey = new Map<string, string>();
	for (const raw of names) {
		const name = raw?.trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (!byKey.has(key)) byKey.set(key, name);
	}
	return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Publishers matching what has been typed (case-insensitive substring).
 * Names that start with the query come first. An empty query matches all.
 */
export function matchPublishers(publishers: readonly string[], query: string): string[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...publishers];
	const starts: string[] = [];
	const contains: string[] = [];
	for (const p of publishers) {
		const lower = p.toLowerCase();
		if (lower.startsWith(q)) starts.push(p);
		else if (lower.includes(q)) contains.push(p);
	}
	return [...starts, ...contains];
}

/**
 * The existing spelling of the typed name, if one matches ignoring case and
 * surrounding spaces — so "phoenix next" snaps to "Phoenix Next".
 * Null means the name is new.
 */
export function canonicalPublisher(publishers: readonly string[], typed: string): string | null {
	const key = typed.trim().toLowerCase();
	if (!key) return null;
	return publishers.find((p) => p.toLowerCase() === key) ?? null;
}
