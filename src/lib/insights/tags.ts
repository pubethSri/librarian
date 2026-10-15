// ─── Insights: tags & completion ────────────────────────────────────────────
// Per tag and per publisher: how much is owned, how much of it is read, and
// how the series end up — finished, in progress, not started, or abandoned
// (series status Dropped means the user dropped it). Pure; tested.

import type { CompletionCounts, CompletionState, GroupStats, InsightsTags } from '$lib/types';
import type { BookFact, InsightsInput } from './common';

export const OTHER_PUBLISHERS = 'Other';
export const UNKNOWN_PUBLISHER = 'Unknown';

export function emptyCompletion(): CompletionCounts {
	return { finished: 0, inProgress: 0, notStarted: 0, abandoned: 0 };
}

export function completionOf(
	status: InsightsInput['series'][number]['status'],
	books: readonly BookFact[]
): CompletionState {
	if (status === 'dropped') return 'abandoned';
	if (books.every((b) => b.readState === 'read')) return 'finished';
	if (books.some((b) => b.readState !== 'unread')) return 'inProgress';
	return 'notStarted';
}

type OwnedSeries = { id: number; state: CompletionState; books: BookFact[] };

function statsOf(name: string, list: readonly OwnedSeries[]): GroupStats {
	const completion = emptyCompletion();
	let books = 0;
	let readBooks = 0;
	for (const s of list) {
		completion[s.state]++;
		books += s.books.length;
		readBooks += s.books.filter((b) => b.readState === 'read').length;
	}
	return { name, series: list.length, books, readBooks, completion };
}

const byBooks = (a: GroupStats, b: GroupStats) =>
	b.books - a.books || b.series - a.series || a.name.localeCompare(b.name);

export function computeTags(facts: readonly BookFact[], input: InsightsInput): InsightsTags {
	const booksBySeries = new Map<number, BookFact[]>();
	for (const b of facts) {
		const list = booksBySeries.get(b.seriesId) ?? [];
		list.push(b);
		booksBySeries.set(b.seriesId, list);
	}

	// Only series that own books take part
	const owned = new Map<number, OwnedSeries & { publisher: string }>();
	for (const s of input.series) {
		const books = booksBySeries.get(s.id);
		if (!books) continue;
		owned.set(s.id, {
			id: s.id,
			state: completionOf(s.status, books),
			books,
			publisher: s.publisher?.trim() || UNKNOWN_PUBLISHER
		});
	}

	const seriesByTag = new Map<string, OwnedSeries[]>();
	const tagged = new Set<number>();
	for (const { seriesId, tagName } of input.seriesTags) {
		const s = owned.get(seriesId);
		if (!s) continue;
		tagged.add(seriesId);
		const list = seriesByTag.get(tagName) ?? [];
		list.push(s);
		seriesByTag.set(tagName, list);
	}

	const seriesByPublisher = new Map<string, OwnedSeries[]>();
	for (const s of owned.values()) {
		const list = seriesByPublisher.get(s.publisher) ?? [];
		list.push(s);
		seriesByPublisher.set(s.publisher, list);
	}
	const publishers: GroupStats[] = [];
	const others: OwnedSeries[] = [];
	for (const [name, list] of seriesByPublisher) {
		if (list.length === 1) others.push(...list);
		else publishers.push(statsOf(name, list));
	}
	publishers.sort(byBooks);
	if (others.length > 0) publishers.push(statsOf(OTHER_PUBLISHERS, others));

	return {
		tags: [...seriesByTag.entries()].map(([name, list]) => statsOf(name, list)).sort(byBooks),
		untaggedSeries: owned.size - tagged.size,
		publishers
	};
}
