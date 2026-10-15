// ─── Insights: spending ─────────────────────────────────────────────────────
// Money by month and by source, what the unread pile cost, and what each book
// actually read cost. A price is a lower bound and an unpriced book is never
// ฿0, so every figure is a Money with its coverage. Pure; tested.

import type { BookSource, InsightsSpending, SeriesType } from '$lib/types';
import { monthOf, monthRange, moneyOf, type BookFact } from './common';

const SOURCES: readonly (BookSource | 'unknown')[] = ['bookfair', 'online', 'bookstore', 'unknown'];
const TYPES: readonly SeriesType[] = ['light_novel', 'manga'];

export function computeSpending(facts: readonly BookFact[], today: string): InsightsSpending {
	const total = moneyOf(facts);

	const dated = facts.filter((b) => b.boughtDay !== null);
	const byMonth = new Map<string, BookFact[]>();
	for (const b of dated) {
		const month = monthOf(b.boughtDay as string);
		const list = byMonth.get(month) ?? [];
		list.push(b);
		byMonth.set(month, list);
	}
	const months = [...byMonth.keys()].sort();
	const monthly =
		months.length === 0
			? []
			: monthRange(months[0], [months.at(-1) as string, monthOf(today)].sort()[1]).map((month) => ({
					month,
					spent: moneyOf(byMonth.get(month) ?? [])
				}));

	const bySource = SOURCES.map((source) => ({
		source,
		spent: moneyOf(facts.filter((b) => (b.source ?? 'unknown') === source))
	}))
		.filter((s) => s.spent.of > 0)
		.sort((a, b) => b.spent.total - a.spent.total || b.spent.of - a.spent.of);

	const averageByType = Object.fromEntries(
		TYPES.map((type) => [type, moneyOf(facts.filter((b) => b.type === type))])
	) as Record<SeriesType, InsightsSpending['averageByType'][SeriesType]>;

	const readBooks = facts.filter((b) => b.readState === 'read').length;

	return {
		total,
		monthly,
		undatedPriced: facts.filter((b) => b.boughtDay === null && b.price !== null).length,
		bySource,
		averageByType,
		unread: moneyOf(facts.filter((b) => b.readState === 'unread')),
		costPerRead: readBooks > 0 && total.priced > 0 ? total.total / readBooks : null,
		readBooks
	};
}
