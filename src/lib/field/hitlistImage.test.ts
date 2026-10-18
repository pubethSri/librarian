import { describe, it, expect } from 'vitest';
import { hitlistFileName, hitlistImageLines } from './hitlistImage';
import type { HitlistGroup } from './logic';

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
	const item = (
		id: number,
		name: string,
		next: number,
		confirmedTo: number | null,
		missing: number[] = []
	) => ({
		series: series(id, name),
		next,
		confirmedTo,
		missing,
		owned: next - 1,
		boughtToday: [],
		done: false
	});
	const groups: HitlistGroup[] = [
		{
			publisher: 'Phoenix Next',
			items: [
				item(1, 'Frieren', 15, 16, [3]),
				item(2, 'Silent Witch', 10, null),
				item(3, 'Ougon', 5, null, [2])
			]
		},
		{ publisher: null, items: [item(4, 'X', 1, null)] }
	];

	it('keeps confirmed volumes inside their publisher group', () => {
		const lines = hitlistImageLines(groups, 'Oct 17, 2026');
		expect(lines.map((l) => l.kind)).toEqual([
			'title',
			'subtitle',
			'heading',
			'confirmed',
			'row',
			'row',
			'heading',
			'row'
		]);
		expect(lines[1]).toEqual({ kind: 'subtitle', text: '4 series · 1 confirmed · Oct 17, 2026' });
		expect(lines[2]).toEqual({ kind: 'heading', text: 'Phoenix Next · 3' });
		expect(lines[3]).toEqual({
			kind: 'confirmed',
			name: 'Frieren',
			detail: 'out up to vol. 16 · also missing 3',
			volume: '15–16'
		});
		expect(lines[5]).toEqual({ kind: 'row', name: 'Ougon', detail: 'missing 2', volume: '5' });
		expect(lines[6]).toEqual({ kind: 'heading', text: 'Unknown publisher · 1' });
	});

	it('says nothing about confirmed when none are', () => {
		const lines = hitlistImageLines(
			[{ publisher: null, items: [item(4, 'X', 1, null)] }],
			'Oct 17, 2026'
		);
		expect(lines[1]).toEqual({ kind: 'subtitle', text: '1 series · Oct 17, 2026' });
	});

	it('names the file by day', () => {
		expect(hitlistFileName('2026-10-17')).toBe('hitlist-2026-10-17.png');
	});
});
