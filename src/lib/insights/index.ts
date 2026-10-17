// ─── Insights ───────────────────────────────────────────────────────────────
// computeInsights() turns the rows GET /api/insights loads into every figure
// the /insights page shows. Pure; each part is unit-tested in its own module.

import type { Insights, InsightsOverview, SeriesType } from '$lib/types';
import { computeBacklog } from './backlog';
import { computeGrowth } from './growth';
import { computeTags } from './tags';
import { computeSpending } from './spending';
import { computeFunnel, computePace } from './pace';
import {
	buildBookFacts,
	dayInZone,
	countReadStates,
	moneyOf,
	safeTimeZone,
	type BookFact,
	type InsightsInput
} from './common';

export type { InsightsInput } from './common';

const TYPES: readonly SeriesType[] = ['light_novel', 'manga'];

export function overviewOf(facts: readonly BookFact[], seriesCount: number): InsightsOverview {
	return {
		books: facts.length,
		series: seriesCount,
		extras: facts.filter((b) => b.isExtra).length,
		readState: countReadStates(facts),
		byType: TYPES.map((type) => ({
			type,
			counts: countReadStates(facts.filter((b) => b.type === type))
		})),
		spent: moneyOf(facts),
		undatedPurchases: facts.filter((b) => b.boughtDay === null).length,
		datedReads: facts.reduce((n, b) => n + b.finishedDays.length, 0)
	};
}

/**
 * @param now      the moment "this month" / "the last 12 months" are measured from
 * @param timeZone the viewer's IANA time zone — which calendar day is "today"
 */
export function computeInsights(
	input: InsightsInput,
	now: Date,
	timeZone: string | null | undefined
): Insights {
	const zone = safeTimeZone(timeZone);
	const facts = buildBookFacts(input);
	// Series with no books own nothing yet
	const seriesCount = new Set(facts.map((b) => b.seriesId)).size;
	const today = dayInZone(now, zone);
	return {
		generatedAt: now.toISOString(),
		timeZone: zone,
		overview: overviewOf(facts, seriesCount),
		backlog: computeBacklog(facts, input.series, today),
		growth: computeGrowth(facts, today),
		tags: computeTags(facts, input),
		spending: computeSpending(facts, today),
		pace: computePace(facts),
		funnel: computeFunnel(facts, input.bookfairs)
	};
}
