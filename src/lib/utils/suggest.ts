// ─── Free-text suggestions ──────────────────────────────────────────────────
// For free-text fields whose values repeat (publisher, bookfair location):
// "a new value" is just one nothing uses yet. These helpers keep spellings
// consistent by steering the input toward values already in use. Pure;
// unit-tested. Used by SuggestInput.

/**
 * Distinct names, sorted. Names differing only in case or
 * surrounding spaces count as one, keeping the first spelling seen.
 */
export function distinctNames(names: readonly (string | null | undefined)[]): string[] {
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
 * Names matching what has been typed (case-insensitive substring).
 * Names that start with the query come first. An empty query matches all.
 */
export function matchNames(names: readonly string[], query: string): string[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...names];
	const starts: string[] = [];
	const contains: string[] = [];
	for (const p of names) {
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
export function canonicalName(names: readonly string[], typed: string): string | null {
	const key = typed.trim().toLowerCase();
	if (!key) return null;
	return names.find((p) => p.toLowerCase() === key) ?? null;
}
