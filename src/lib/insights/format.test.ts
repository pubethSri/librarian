import { describe, it, expect } from 'vitest';
import {
	averagePrice,
	baht,
	coverageText,
	HIDDEN_MONEY,
	monthLabel,
	moneyText,
	percent
} from './format';

describe('money text', () => {
	it('shows a plain total when every book is priced', () => {
		expect(moneyText({ total: 1234.5, priced: 3, of: 3 })).toBe('฿1,235');
		expect(coverageText({ total: 1234.5, priced: 3, of: 3 })).toBeNull();
	});

	it('marks a partial total as a lower bound with its coverage', () => {
		expect(moneyText({ total: 500, priced: 2, of: 3 })).toBe('≥ ฿500');
		expect(coverageText({ total: 500, priced: 2, of: 3 })).toBe('from 2 of 3 books');
	});

	it('says "No prices" rather than ฿0 when nothing is priced', () => {
		expect(moneyText({ total: 0, priced: 0, of: 4 })).toBe('No prices');
	});

	it('hides every amount while Hide ฿ is on', () => {
		expect(moneyText({ total: 500, priced: 2, of: 3 }, true)).toBe(HIDDEN_MONEY);
	});

	it('averages priced books only', () => {
		expect(averagePrice({ total: 300, priced: 2, of: 5 })).toBe(150);
		expect(averagePrice({ total: 0, priced: 0, of: 5 })).toBeNull();
	});
});

describe('labels', () => {
	it('formats baht, percentages and months', () => {
		expect(baht(12000)).toBe('฿12,000');
		expect(percent(1, 3)).toBe('33%');
		expect(percent(0, 0)).toBe('—');
		expect(monthLabel('2026-10')).toBe('Oct 2026');
		expect(monthLabel('2026-01', true)).toBe('Jan 26');
	});
});
