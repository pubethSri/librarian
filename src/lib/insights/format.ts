// ─── Insights: display formatting ───────────────────────────────────────────
// How figures read on the /insights page. Pure; tested.

import type { Money } from '$lib/types';

/** What a money figure shows while "Hide ฿" is on */
export const HIDDEN_MONEY = '฿ •••';

/** ฿1,234 — whole baht */
export function baht(amount: number): string {
	return `฿${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * A money figure: "฿1,234" when every book is priced, "≥ ฿1,234" when some
 * are not (a price is a lower bound), "No prices" when none are.
 */
export function moneyText(money: Money, hidden = false): string {
	if (hidden) return HIDDEN_MONEY;
	if (money.priced === 0) return 'No prices';
	return money.priced < money.of ? `≥ ${baht(money.total)}` : baht(money.total);
}

/** "from 369 of 385 books" when coverage is partial, else null */
export function coverageText(money: Money): string | null {
	if (money.of === 0 || money.priced === money.of) return null;
	return `from ${money.priced} of ${money.of} books`;
}

/** Average price of the priced books, null when none is priced */
export function averagePrice(money: Money): number | null {
	return money.priced > 0 ? money.total / money.priced : null;
}

/** 12.3 → "12.3"; whole numbers lose the decimal */
export function decimal(value: number, digits = 1): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function percent(part: number, whole: number): string {
	return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

/** `YYYY-MM` → "Oct 2026"; `short` → "Oct 26" */
export function monthLabel(month: string, short = false): string {
	const [y, m] = month.split('-').map(Number);
	const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
		month: 'short',
		timeZone: 'UTC'
	});
	return short ? `${name} ${String(y).slice(2)}` : `${name} ${y}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
	return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}
