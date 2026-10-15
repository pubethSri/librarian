// ─── Insights: collection growth ────────────────────────────────────────────
// Books bought per month (by type) and the running total, from the first dated
// purchase to this month. Undated books are counted apart. Pure; tested.

import type { InsightsGrowth } from '$lib/types';
import { monthOf, monthRange, type BookFact } from './common';

export function computeGrowth(facts: readonly BookFact[], today: string): InsightsGrowth {
	const dated = facts.filter((b) => b.boughtDay !== null);
	const undated = facts.length - dated.length;
	if (dated.length === 0) return { monthly: [], cumulative: [], undated };

	const first = dated.map((b) => b.boughtDay as string).sort()[0];
	const last = monthOf(today);
	const byMonth = new Map<string, { light_novel: number; manga: number }>();
	for (const b of dated) {
		const month = monthOf(b.boughtDay as string);
		const counts = byMonth.get(month) ?? { light_novel: 0, manga: 0 };
		counts[b.type]++;
		byMonth.set(month, counts);
	}

	// A purchase dated after today still belongs on the timeline
	const latest = [...byMonth.keys()].reduce((max, m) => (m > max ? m : max), last);
	let running = 0;
	const monthly: InsightsGrowth['monthly'] = [];
	const cumulative: number[] = [];
	for (const month of monthRange(monthOf(first), latest)) {
		const counts = byMonth.get(month) ?? { light_novel: 0, manga: 0 };
		const total = counts.light_novel + counts.manga;
		running += total;
		monthly.push({ month, ...counts, total });
		cumulative.push(running);
	}
	return { monthly, cumulative, undated };
}
