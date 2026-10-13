import { describe, it, expect } from 'vitest';
import {
	applyUnifiedFilter,
	createEmptyFilterState,
	type UnifiedFilterState
} from './filterEngine';

// ─── Fixtures ────────────────────────────────────────────────────────────────
// These characterization tests lock in the CURRENT behavior of the filter
// engine (used by SeriesTable, BooksTable, and the Console) so it can be
// refactored safely. Where behavior is a deliberate quirk, the test says so.

type SeriesRow = {
	shortName: string;
	fullName: string;
	status: string;
	type: string;
	publisher: string | null;
	bookCount: number;
	watchlist: boolean;
	tags: { id: number; name: string }[];
};

const seriesOptions = {
	searchFields: ['shortName', 'fullName'],
	getTagNames: (r: SeriesRow) => r.tags.map((t) => t.name)
};

function series(overrides: Partial<SeriesRow> = {}): SeriesRow {
	return {
		shortName: 'Mushoku',
		fullName: 'Mushoku Tensei: Jobless Reincarnation',
		status: 'ongoing',
		type: 'light_novel',
		publisher: 'Kadokawa',
		bookCount: 10,
		watchlist: false,
		tags: [
			{ id: 1, name: 'isekai' },
			{ id: 2, name: 'fantasy' }
		],
		...overrides
	};
}

function state(overrides: Partial<UnifiedFilterState> = {}): UnifiedFilterState {
	return { ...createEmptyFilterState(), ...overrides };
}

const pass = (row: SeriesRow, s: UnifiedFilterState) => applyUnifiedFilter(row, s, seriesOptions);

// ─── Empty state ─────────────────────────────────────────────────────────────

describe('applyUnifiedFilter — empty state', () => {
	it('passes any row when the filter state is empty', () => {
		expect(pass(series(), state())).toBe(true);
	});
});

// ─── Quick filters ───────────────────────────────────────────────────────────

describe('quickFilters', () => {
	it('matches on exact string equality', () => {
		expect(
			pass(series({ type: 'light_novel' }), state({ quickFilters: { type: 'light_novel' } }))
		).toBe(true);
		expect(pass(series({ type: 'light_novel' }), state({ quickFilters: { type: 'manga' } }))).toBe(
			false
		);
	});

	it('treats "all" and "" as no-ops', () => {
		expect(pass(series(), state({ quickFilters: { status: 'all' } }))).toBe(true);
		expect(pass(series(), state({ quickFilters: { status: '' } }))).toBe(true);
	});

	it('ANDs multiple quick filters', () => {
		const s = state({ quickFilters: { type: 'light_novel', status: 'ongoing' } });
		expect(pass(series({ type: 'light_novel', status: 'ongoing' }), s)).toBe(true);
		expect(pass(series({ type: 'light_novel', status: 'ended' }), s)).toBe(false);
	});

	it('coerces booleans via String() (watchlist:"true")', () => {
		expect(pass(series({ watchlist: true }), state({ quickFilters: { watchlist: 'true' } }))).toBe(
			true
		);
		expect(pass(series({ watchlist: false }), state({ quickFilters: { watchlist: 'true' } }))).toBe(
			false
		);
	});

	it('fails when the row value is null/undefined for an active filter', () => {
		expect(
			pass(series({ publisher: null }), state({ quickFilters: { publisher: 'Kadokawa' } }))
		).toBe(false);
		expect(pass(series(), state({ quickFilters: { doesNotExist: 'x' } }))).toBe(false);
	});
});

// ─── Include tags (chips) ────────────────────────────────────────────────────

describe('includeTags', () => {
	it('matches case-insensitively as a substring', () => {
		expect(pass(series(), state({ includeTags: ['ISE'] }))).toBe(true);
		expect(pass(series(), state({ includeTags: ['isekai'] }))).toBe(true);
	});

	it('requires ALL include tags (AND)', () => {
		expect(pass(series(), state({ includeTags: ['isekai', 'fantasy'] }))).toBe(true);
		expect(pass(series(), state({ includeTags: ['isekai', 'harem'] }))).toBe(false);
	});

	it('is ignored when no getTagNames extractor is provided', () => {
		// no options → includeTags cannot be evaluated, so the row passes
		expect(applyUnifiedFilter(series(), state({ includeTags: ['nope'] }), {})).toBe(true);
	});
});

// ─── Exclude tags ────────────────────────────────────────────────────────────

describe('excludeTags', () => {
	it('passes when the row has none of the excluded tags', () => {
		expect(pass(series(), state({ excludeTags: ['harem'] }))).toBe(true);
	});

	it('fails when the row has an excluded tag (substring, case-insensitive)', () => {
		expect(pass(series(), state({ excludeTags: ['isekai'] }))).toBe(false);
		expect(pass(series(), state({ excludeTags: ['FAN'] }))).toBe(false);
	});
});

// ─── Search terms (bare words) ───────────────────────────────────────────────

describe('searchTerms', () => {
	it('matches a name search field', () => {
		expect(pass(series(), state({ searchTerms: ['mushoku'] }))).toBe(true);
		expect(pass(series(), state({ searchTerms: ['jobless'] }))).toBe(true); // fullName
	});

	it('matches a tag name (OR with fields, per term)', () => {
		expect(pass(series(), state({ searchTerms: ['isekai'] }))).toBe(true);
	});

	it('fails when a term matches neither tag nor field', () => {
		expect(pass(series(), state({ searchTerms: ['zzz'] }))).toBe(false);
	});

	it('ANDs across terms', () => {
		expect(pass(series(), state({ searchTerms: ['mushoku', 'isekai'] }))).toBe(true);
		expect(pass(series(), state({ searchTerms: ['mushoku', 'zzz'] }))).toBe(false);
	});
});

// ─── Param filters: name ─────────────────────────────────────────────────────

describe('paramFilters — name', () => {
	it('searches across the name fields (substring, case-insensitive)', () => {
		expect(
			pass(series(), state({ paramFilters: [{ key: 'name', op: '=', value: 'mushoku' }] }))
		).toBe(true);
		expect(pass(series(), state({ paramFilters: [{ key: 'name', op: '=', value: 'zzz' }] }))).toBe(
			false
		);
	});

	it('matches seriesShortName / seriesFullName on book-shaped rows', () => {
		const bookRow = { seriesShortName: 'Spice', seriesFullName: 'Spice and Wolf' };
		const s = state({ paramFilters: [{ key: 'name', op: '=', value: 'spice' }] });
		expect(applyUnifiedFilter(bookRow, s)).toBe(true);
	});
});

// ─── Param filters: numeric (volumes → bookCount) ────────────────────────────

describe('paramFilters — numeric via volumes→bookCount', () => {
	it('= uses exact numeric equality, NOT substring (regression guard)', () => {
		// volumes:1 must NOT match bookCount 10/15 — this exact case regressed once.
		expect(
			pass(
				series({ bookCount: 10 }),
				state({ paramFilters: [{ key: 'volumes', op: '=', value: '1' }] })
			)
		).toBe(false);
		expect(
			pass(
				series({ bookCount: 15 }),
				state({ paramFilters: [{ key: 'volumes', op: '=', value: '1' }] })
			)
		).toBe(false);
		expect(
			pass(
				series({ bookCount: 1 }),
				state({ paramFilters: [{ key: 'volumes', op: '=', value: '1' }] })
			)
		).toBe(true);
	});

	it('supports >=, <=, >, <', () => {
		const row = series({ bookCount: 10 });
		expect(pass(row, state({ paramFilters: [{ key: 'volumes', op: '>=', value: '4' }] }))).toBe(
			true
		);
		expect(pass(row, state({ paramFilters: [{ key: 'volumes', op: '>=', value: '20' }] }))).toBe(
			false
		);
		expect(pass(row, state({ paramFilters: [{ key: 'volumes', op: '<=', value: '10' }] }))).toBe(
			true
		);
		expect(pass(row, state({ paramFilters: [{ key: 'volumes', op: '>', value: '10' }] }))).toBe(
			false
		);
		expect(pass(row, state({ paramFilters: [{ key: 'volumes', op: '<', value: '11' }] }))).toBe(
			true
		);
	});

	it('!= uses numeric inequality when both sides are numeric', () => {
		expect(
			pass(
				series({ bookCount: 10 }),
				state({ paramFilters: [{ key: 'volumes', op: '!=', value: '10' }] })
			)
		).toBe(false);
		expect(
			pass(
				series({ bookCount: 10 }),
				state({ paramFilters: [{ key: 'volumes', op: '!=', value: '5' }] })
			)
		).toBe(true);
	});
});

// ─── Param filters: boolean and text = ───────────────────────────────────────

describe('paramFilters — boolean and text equality', () => {
	it('= coerces booleans when the value is "true"/"false"', () => {
		expect(
			pass(
				series({ watchlist: true }),
				state({ paramFilters: [{ key: 'watchlist', op: '=', value: 'true' }] })
			)
		).toBe(true);
		expect(
			pass(
				series({ watchlist: false }),
				state({ paramFilters: [{ key: 'watchlist', op: '=', value: 'true' }] })
			)
		).toBe(false);
		expect(
			pass(
				series({ watchlist: false }),
				state({ paramFilters: [{ key: 'watchlist', op: '=', value: 'false' }] })
			)
		).toBe(true);
	});

	it('= on text uses forgiving substring matching', () => {
		expect(
			pass(
				series({ publisher: 'Kadokawa' }),
				state({ paramFilters: [{ key: 'publisher', op: '=', value: 'kado' }] })
			)
		).toBe(true);
		expect(
			pass(
				series({ status: 'ongoing' }),
				state({ paramFilters: [{ key: 'status', op: '=', value: 'ended' }] })
			)
		).toBe(false);
		expect(
			pass(
				series({ status: 'ended' }),
				state({ paramFilters: [{ key: 'status', op: '=', value: 'ended' }] })
			)
		).toBe(true);
	});

	it('!= on text excludes exact and substring matches', () => {
		expect(
			pass(
				series({ status: 'ongoing' }),
				state({ paramFilters: [{ key: 'status', op: '!=', value: 'ended' }] })
			)
		).toBe(true);
		expect(
			pass(
				series({ status: 'ended' }),
				state({ paramFilters: [{ key: 'status', op: '!=', value: 'ended' }] })
			)
		).toBe(false);
	});

	it('returns true for an unrecognized operator (quirk: no-op)', () => {
		expect(
			pass(series(), state({ paramFilters: [{ key: 'status', op: '~', value: 'anything' }] }))
		).toBe(true);
	});
});

// ─── Combined ────────────────────────────────────────────────────────────────

describe('combined filters (AND across all categories)', () => {
	it('passes only when every active category matches', () => {
		const s = state({
			quickFilters: { type: 'light_novel' },
			includeTags: ['isekai'],
			searchTerms: ['mushoku'],
			paramFilters: [{ key: 'volumes', op: '>=', value: '5' }]
		});
		expect(pass(series({ type: 'light_novel', bookCount: 10 }), s)).toBe(true);
		expect(pass(series({ type: 'manga', bookCount: 10 }), s)).toBe(false); // wrong type
		expect(pass(series({ type: 'light_novel', bookCount: 2 }), s)).toBe(false); // too few volumes
	});

	it('ANDs multiple param filters', () => {
		const s = state({
			paramFilters: [
				{ key: 'volumes', op: '>=', value: '5' },
				{ key: 'status', op: '=', value: 'ended' }
			]
		});
		expect(pass(series({ bookCount: 10, status: 'ended' }), s)).toBe(true);
		expect(pass(series({ bookCount: 10, status: 'ongoing' }), s)).toBe(false);
	});
});
