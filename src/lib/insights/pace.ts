// ─── Insights: reading pace & bookfair funnel ───────────────────────────────
// Pace: how long a book waits between purchase and finish — dated reads of
// dated purchases only; a finish before the purchase (a re-bought copy) is
// left out. Funnel: per bookfair, what was bought and how much of it is read.
// Pure; tested.

import type { FunnelRow, InsightsPace } from '$lib/types';
import { MIN_DATED_READS } from './backlog';
import { countReadStates, daysBetween, moneyOf, type BookFact, type InsightsInput } from './common';

/** Upper bounds (exclusive, in days) of the pace bands */
export const PACE_BANDS: readonly { label: string; below: number }[] = [
	{ label: '< 1 month', below: 31 },
	{ label: '1–3 months', below: 92 },
	{ label: '3–6 months', below: 183 },
	{ label: '6–12 months', below: 366 },
	{ label: '1–2 years', below: 731 },
	{ label: '2+ years', below: Infinity }
];

export function median(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computePace(facts: readonly BookFact[]): InsightsPace {
	const days: number[] = [];
	for (const b of facts) {
		if (!b.boughtDay) continue;
		for (const finished of b.finishedDays) {
			const d = daysBetween(b.boughtDay, finished);
			if (d >= 0) days.push(d);
		}
	}
	return {
		samples: days.length,
		medianDays: days.length >= MIN_DATED_READS ? median(days) : null,
		buckets: PACE_BANDS.map((band, i) => ({
			label: band.label,
			count: days.filter((d) => d < band.below && (i === 0 || d >= PACE_BANDS[i - 1].below)).length
		}))
	};
}

export function computeFunnel(
	facts: readonly BookFact[],
	bookfairs: InsightsInput['bookfairs']
): FunnelRow[] {
	return [...bookfairs]
		.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
		.map((fair) => {
			const haul = facts.filter((b) => b.sourceEventId === fair.id);
			return {
				bookfairId: fair.id,
				name: fair.name,
				date: fair.date,
				bought: haul.length,
				counts: countReadStates(haul),
				spent: moneyOf(haul)
			};
		});
}
