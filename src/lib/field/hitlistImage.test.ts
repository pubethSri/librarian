import { describe, it, expect } from 'vitest';
import { hitlistFileName, hitlistImageLines } from './hitlistImage';
import type { ConfirmedItem, HitlistGroup } from './logic';

const series = (id: number, shortName: string, watchlist = true) => ({
	id,
	shortName,
	fullName: shortName,
	type: 'manga' as const,
	status: 'ongoing' as const,
	publisher: null,
	watchlist,
	tags: []
});

describe('hitlistImageLines', () => {
	const confirmed: ConfirmedItem[] = [
		{ series: series(1, 'Frieren'), from: 15, to: 16, missing: [3] }
	];
	const groups: HitlistGroup[] = [
		{
			publisher: 'Phoenix Next',
			items: [
				{ series: series(2, 'Silent Witch'), next: 10, missing: [], owned: 10 },
				{ series: series(3, 'Ougon'), next: 5, missing: [2], owned: 3 }
			]
		},
		{ publisher: null, items: [{ series: series(4, 'X'), next: 1, missing: [], owned: 0 }] }
	];

	it('puts the title, the confirmed section, then each publisher with its rows', () => {
		const lines = hitlistImageLines(groups, confirmed, 'Oct 17, 2026');
		expect(lines.map((l) => l.kind)).toEqual([
			'title',
			'subtitle',
			'heading',
			'confirmed',
			'heading',
			'row',
			'row',
			'heading',
			'row'
		]);
		expect(lines[1]).toEqual({ kind: 'subtitle', text: '4 series to look for · Oct 17, 2026' });
		expect(lines[3]).toEqual({
			kind: 'confirmed',
			name: 'Frieren',
			detail: 'out up to vol. 16 · also missing 3',
			volume: '15–16'
		});
		expect(lines[6]).toEqual({ kind: 'row', name: 'Ougon', detail: 'missing 2', volume: '5' });
		expect(lines[7]).toEqual({ kind: 'heading', text: 'Unknown publisher · 1' });
	});

	it('leaves out the confirmed heading when nothing is confirmed', () => {
		const lines = hitlistImageLines(groups, [], 'Oct 17, 2026');
		expect(lines.filter((l) => l.kind === 'confirmed')).toHaveLength(0);
		expect(lines[2]).toEqual({ kind: 'heading', text: 'Phoenix Next · 2' });
	});

	it('names the file by day', () => {
		expect(hitlistFileName('2026-10-17')).toBe('hitlist-2026-10-17.png');
	});
});
