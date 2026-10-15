import { describe, it, expect } from 'vitest';
import {
	buildPreviewRows,
	bulkConfirmText,
	dayOf,
	formatDay,
	pendingPurchaseDay,
	UNKNOWN_DATE,
	expandVolumeRange,
	filterPreviewRows,
	formatPrice,
	getActionLabel,
	isFilterActive,
	matchesConditions,
	nextVolumeFor,
	rangeIds,
	requiresExplicitTarget,
	selectBooks,
	remapPreviewFilterState,
	toAffectedIds,
	toBatchPayload,
	toBulkUpdates
} from './logic';
import type { Condition, SeriesMeta } from './types';
import { createEmptyFilterState, type UnifiedFilterState } from '$lib/components/filterEngine';
import type { BookListItem, BookLocation, StagedBookEntry } from '$lib/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Characterization tests: these lock in the CURRENT behavior of the Console's
// pure logic so the surrounding page can be decomposed safely. Where the
// behavior is a known quirk, the test says so rather than asserting the ideal.

function book(overrides: Partial<BookListItem> = {}): BookListItem {
	return {
		id: 1,
		seriesId: 10,
		seriesShortName: 'Mushoku',
		seriesFullName: 'Mushoku Tensei',
		volumeNumber: '1',
		location: 'home',
		boughtAt: null,
		price: '350',
		source: 'bookstore',
		sourceEventId: null,
		isDraft: false,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
		seriesTags: [{ id: 1, name: 'isekai' }],
		readingStatus: 'unread',
		timesRead: 0,
		...overrides
	};
}

function staged(overrides: Partial<StagedBookEntry> = {}): StagedBookEntry {
	return {
		tempId: 'tmp-1',
		seriesId: 10,
		seriesShortName: 'Mushoku',
		volumeNumber: 1,
		location: 'apartment',
		isDraft: false,
		...overrides
	};
}

function state(overrides: Partial<UnifiedFilterState> = {}): UnifiedFilterState {
	return { ...createEmptyFilterState(), ...overrides };
}

function cond(overrides: Partial<Condition> = {}): Condition {
	return { id: 'c1', column: 'location', op: '=', value: 'home', ...overrides };
}

const rangeInput = {
	seriesId: 10,
	seriesName: 'Mushoku',
	volumeFrom: 1,
	volumeTo: 1,
	price: '',
	location: 'apartment' as BookLocation,
	defaults: null,
	existing: [] as BookListItem[],
	staged: [] as StagedBookEntry[]
};

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
	it('renders an em dash for null, undefined and empty string', () => {
		expect(formatPrice(null)).toBe('—');
		expect(formatPrice(undefined)).toBe('—');
		expect(formatPrice('')).toBe('—');
	});

	it('formats numbers and numeric strings with a baht sign and separators', () => {
		expect(formatPrice(350)).toBe('฿350');
		expect(formatPrice('1250')).toBe('฿1,250');
	});

	it('renders a zero price rather than treating it as absent', () => {
		expect(formatPrice(0)).toBe('฿0');
	});
});

// ─── getActionLabel ──────────────────────────────────────────────────────────

describe('getActionLabel', () => {
	it('labels location, source and draft values', () => {
		expect(getActionLabel('location', 'home')).toBe('Home');
		expect(getActionLabel('source', 'bookfair')).toBe('Bookfair');
		expect(getActionLabel('isDraft', 'true')).toBe('Draft');
		expect(getActionLabel('isDraft', 'false')).toBe('Not Draft');
	});

	it('treats any non-"home" location as Apartment (quirk: no validation)', () => {
		expect(getActionLabel('location', 'nonsense')).toBe('Apartment');
	});

	it('falls through to the raw value for an unset action', () => {
		expect(getActionLabel('', 'whatever')).toBe('whatever');
	});
});

// ─── matchesConditions ───────────────────────────────────────────────────────

describe('matchesConditions', () => {
	it('matches every book when there are no conditions', () => {
		expect(matchesConditions(book(), [])).toBe(true);
	});

	it('applies AND across multiple conditions', () => {
		const conditions = [
			cond({ id: 'a', column: 'location', value: 'home' }),
			cond({ id: 'b', column: 'isDraft', value: 'false' })
		];
		expect(matchesConditions(book({ location: 'home', isDraft: false }), conditions)).toBe(true);
		expect(matchesConditions(book({ location: 'home', isDraft: true }), conditions)).toBe(false);
	});

	it('matches the series condition by series id (picked, not typed)', () => {
		const conditions = [cond({ column: 'series', value: '10' })];
		expect(matchesConditions(book({ seriesId: 10 }), conditions)).toBe(true);
		expect(matchesConditions(book({ seriesId: 11 }), conditions)).toBe(false);
		expect(matchesConditions(book({ seriesId: 11 }), [{ ...conditions[0], op: '!=' }])).toBe(true);
	});

	it('supports the != operator', () => {
		const conditions = [cond({ op: '!=', value: 'home' })];
		expect(matchesConditions(book({ location: 'apartment' }), conditions)).toBe(true);
		expect(matchesConditions(book({ location: 'home' }), conditions)).toBe(false);
	});

	it('treats a null source as the empty string', () => {
		expect(matchesConditions(book({ source: null }), [cond({ column: 'source', value: '' })])).toBe(
			true
		);
	});

	it('matches nothing when a condition value is left blank (known quirk)', () => {
		// A freshly added condition starts with value: '' — until the user picks
		// a value it excludes every book rather than being ignored.
		expect(matchesConditions(book(), [cond({ value: '' })])).toBe(false);
	});
});

describe('matchesConditions — volume', () => {
	const vol = (v: string) => book({ volumeNumber: v });

	it('compares volume numerically with all six operators', () => {
		const at = (op: Condition['op'], value: string) =>
			['1', '4.5', '10'].filter((v) =>
				matchesConditions(vol(v), [cond({ column: 'volume', op, value })])
			);
		expect(at('=', '10')).toEqual(['10']);
		expect(at('!=', '10')).toEqual(['1', '4.5']);
		expect(at('>', '4')).toEqual(['4.5', '10']);
		expect(at('<', '4.5')).toEqual(['1']);
		expect(at('>=', '4.5')).toEqual(['4.5', '10']);
		expect(at('<=', '4.5')).toEqual(['1', '4.5']);
	});

	it('matches nothing for a blank or non-numeric volume', () => {
		expect(matchesConditions(vol('1'), [cond({ column: 'volume', value: '' })])).toBe(false);
		expect(matchesConditions(vol('1'), [cond({ column: 'volume', value: 'abc' })])).toBe(false);
	});

	it('matches nothing when an ordering op lands on a text column', () => {
		expect(matchesConditions(book(), [cond({ column: 'location', op: '>', value: 'home' })])).toBe(
			false
		);
	});
});

describe('bulk edit — reading status and price (B2)', () => {
	it('builds readingStatus and numeric price updates', () => {
		expect(toBulkUpdates('readingStatus', 'read')).toEqual({ readingStatus: 'read' });
		expect(toBulkUpdates('price', '175')).toEqual({ price: 175 });
		expect(toBulkUpdates('price', '0')).toEqual({ price: 0 });
	});

	it('labels reading status and price values for the preview arrow', () => {
		expect(getActionLabel('readingStatus', 'read')).toBe('Read');
		expect(getActionLabel('price', '175')).toBe('฿175');
	});

	it('names every action in the confirm text, and warns that reading edits are undated', () => {
		expect(bulkConfirmText('price', '175', 5)).toBe(
			'Apply "Set price" (฿175) to 5 books? This cannot be undone.'
		);
		expect(bulkConfirmText('readingStatus', 'read', 1)).toBe(
			'Apply "Set reading status" (Read) to 1 book? No dates will be recorded. This cannot be undone.'
		);
		expect(bulkConfirmText('location', 'home', 2)).toContain('"Change location" (Home)');
	});

	it('links to a bookfair: source + event together, purchase date only when asked', () => {
		expect(toBulkUpdates('bookfair', '5')).toEqual({ source: 'bookfair', sourceEventId: 5 });
		expect(toBulkUpdates('bookfair', '5', { fairDate: null })).toEqual({
			source: 'bookfair',
			sourceEventId: 5
		});
		expect(toBulkUpdates('bookfair', '5', { fairDate: '2025-10-12' })).toEqual({
			source: 'bookfair',
			sourceEventId: 5,
			boughtAt: '2025-10-12'
		});
	});

	it('confirm text uses a value label for ids and appends a note', () => {
		expect(
			bulkConfirmText('bookfair', '5', 3, {
				valueLabel: 'มหกรรมหนังสือระดับชาติ 30',
				note: 'Purchase dates will be set to 2025-10-12.'
			})
		).toBe(
			'Apply "Link to bookfair" (มหกรรมหนังสือระดับชาติ 30) to 3 books? Purchase dates will be set to 2025-10-12. This cannot be undone.'
		);
	});

	it('Set purchase date: a day, or Unknown to clear', () => {
		expect(toBulkUpdates('boughtAt', '2025-10-12')).toEqual({ boughtAt: '2025-10-12' });
		expect(toBulkUpdates('boughtAt', UNKNOWN_DATE)).toEqual({ boughtAt: null });
		expect(getActionLabel('boughtAt', '2025-10-12')).toBe('Oct 12, 2025');
		expect(getActionLabel('boughtAt', UNKNOWN_DATE)).toBe('Unknown');
	});

	it('pendingPurchaseDay: which day an edit sets, undefined when dates are untouched', () => {
		expect(pendingPurchaseDay('boughtAt', '2025-10-12')).toBe('2025-10-12');
		expect(pendingPurchaseDay('boughtAt', UNKNOWN_DATE)).toBeNull();
		expect(pendingPurchaseDay('bookfair', '5', { fairDate: '2025-10-12' })).toBe('2025-10-12');
		expect(pendingPurchaseDay('bookfair', '5', { fairDate: null })).toBeUndefined();
		expect(pendingPurchaseDay('price', '175')).toBeUndefined();
	});

	it('formats purchase days by calendar day, never shifted by a timezone', () => {
		expect(formatDay('2023-12-10T00:00:00.000Z')).toBe('Dec 10, 2023');
		expect(formatDay('2025-10-12')).toBe('Oct 12, 2025');
		expect(formatDay(null)).toBe('—');
		expect(dayOf('2023-12-10T00:00:00.000Z')).toBe('2023-12-10');
	});

	it('carries the purchase date onto preview rows', () => {
		const rows = buildPreviewRows(
			[book({ boughtAt: '2023-12-10T00:00:00.000Z' })],
			[staged({ volumeNumber: 2, boughtAt: '2025-10-12' })]
		);
		expect(rows.map((r) => r.boughtAt)).toEqual(['2023-12-10T00:00:00.000Z', '2025-10-12']);
	});

	it('only "Link to bookfair" refuses to default to every book in scope', () => {
		expect(requiresExplicitTarget('bookfair')).toBe(true);
		for (const action of ['location', 'source', 'isDraft', 'readingStatus', 'price'] as const) {
			expect(requiresExplicitTarget(action)).toBe(false);
		}
	});

	it('carries the linked bookfair onto preview rows', () => {
		const rows = buildPreviewRows(
			[book({ sourceEventId: 4 })],
			[staged({ volumeNumber: 2, sourceEventId: 7 })]
		);
		expect(rows.map((r) => r.sourceEventId)).toEqual([4, 7]);
		expect(buildPreviewRows([book()], [])[0].sourceEventId).toBeNull();
	});

	it('matches the reading condition exactly', () => {
		const c = cond({ column: 'reading', value: 'read' });
		expect(matchesConditions(book({ readingStatus: 'read' }), [c])).toBe(true);
		expect(matchesConditions(book({ readingStatus: 'unread' }), [c])).toBe(false);
		expect(matchesConditions(book({ readingStatus: 'unread' }), [{ ...c, op: '!=' }])).toBe(true);
	});

	it('carries reading status onto preview rows; staged rows are Unread', () => {
		const rows = buildPreviewRows([book({ readingStatus: 'read' })], [staged({ volumeNumber: 2 })]);
		expect(rows.map((r) => r.readingStatus)).toEqual(['read', 'unread']);
	});
});

describe('selection — selectBooks / rangeIds', () => {
	it('selectBooks keeps book order and ignores ids out of scope', () => {
		const books = [book({ id: 1 }), book({ id: 2 }), book({ id: 3 })];
		expect(selectBooks(books, new Set(['3', '1', '99'])).map((b) => b.id)).toEqual([1, 3]);
		expect(selectBooks(books, new Set())).toEqual([]);
	});

	it('rangeIds spans both directions inclusively and skips staged rows', () => {
		const rows = buildPreviewRows(
			[
				book({ id: 1, volumeNumber: '1' }),
				book({ id: 2, volumeNumber: '3' }),
				book({ id: 3, volumeNumber: '4' })
			],
			[staged({ tempId: 'tmp', volumeNumber: 2 })]
		);
		// rows: vol 1 (1), vol 2 (staged), vol 3 (2), vol 4 (3)
		expect(rangeIds(rows, 0, 3)).toEqual(['1', '2', '3']);
		expect(rangeIds(rows, 3, 2)).toEqual(['2', '3']);
	});
});

// ─── toAffectedIds ───────────────────────────────────────────────────────────

describe('toAffectedIds', () => {
	it('stringifies ids so they can be matched against preview row ids', () => {
		const ids = toAffectedIds([book({ id: 7 }), book({ id: 12 })]);
		expect(ids.has('7')).toBe(true);
		expect(ids.has('12')).toBe(true);
	});

	it('returns an empty set for no books', () => {
		expect(toAffectedIds([]).size).toBe(0);
	});
});

// ─── toBulkUpdates ───────────────────────────────────────────────────────────

describe('toBulkUpdates', () => {
	it('builds a single-key patch per action', () => {
		expect(toBulkUpdates('location', 'apartment')).toEqual({ location: 'apartment' });
		expect(toBulkUpdates('source', 'online')).toEqual({ source: 'online' });
	});

	it('coerces the draft flag to a boolean', () => {
		expect(toBulkUpdates('isDraft', 'true')).toEqual({ isDraft: true });
		expect(toBulkUpdates('isDraft', 'false')).toEqual({ isDraft: false });
	});

	it('returns an empty patch when no action is selected', () => {
		expect(toBulkUpdates('', 'home')).toEqual({});
	});
});

// ─── nextVolumeFor ───────────────────────────────────────────────────────────

describe('nextVolumeFor', () => {
	it('suggests volume 1 when nothing is owned or staged', () => {
		expect(nextVolumeFor([], [], 10)).toBe(1);
	});

	it('suggests one past the highest owned volume', () => {
		const books = [book({ id: 1, volumeNumber: '1' }), book({ id: 2, volumeNumber: '4' })];
		expect(nextVolumeFor(books, [], 10)).toBe(5);
	});

	it('counts staged entries alongside owned volumes', () => {
		const books = [book({ volumeNumber: '2' })];
		expect(nextVolumeFor(books, [staged({ volumeNumber: 7 })], 10)).toBe(8);
	});

	it('ignores books and staged entries from other series', () => {
		const books = [book({ seriesId: 99, volumeNumber: '20' })];
		expect(nextVolumeFor(books, [staged({ seriesId: 99, volumeNumber: 30 })], 10)).toBe(1);
	});

	it('rounds half-volumes up through Math.max (4.5 owned suggests 5.5)', () => {
		expect(nextVolumeFor([book({ volumeNumber: '4.5' })], [], 10)).toBe(5.5);
	});
});

// ─── expandVolumeRange ───────────────────────────────────────────────────────

describe('expandVolumeRange', () => {
	it('rejects a missing series', () => {
		const result = expandVolumeRange({ ...rangeInput, seriesId: null });
		expect(result).toEqual({ ok: false, error: 'Please select a series' });
	});

	it('rejects non-positive volumes', () => {
		expect(expandVolumeRange({ ...rangeInput, volumeFrom: 0, volumeTo: 3 })).toEqual({
			ok: false,
			error: 'Volume numbers must be positive'
		});
	});

	it('rejects an inverted range', () => {
		expect(expandVolumeRange({ ...rangeInput, volumeFrom: 5, volumeTo: 2 })).toEqual({
			ok: false,
			error: 'End volume must be ≥ start volume'
		});
	});

	it('accepts 50 volumes and rejects 51, matching the "Maximum 50" message', () => {
		const ok = expandVolumeRange({ ...rangeInput, volumeFrom: 1, volumeTo: 50 });
		expect(ok.ok).toBe(true);

		const tooMany = expandVolumeRange({ ...rangeInput, volumeFrom: 1, volumeTo: 51 });
		expect(tooMany).toEqual({ ok: false, error: 'Maximum 50 volumes per batch' });
	});

	it('expands an inclusive range into one entry per volume', () => {
		const result = expandVolumeRange({ ...rangeInput, volumeFrom: 2, volumeTo: 4 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries.map((e) => e.volumeNumber)).toEqual([2, 3, 4]);
		expect(result.skipped).toEqual([]);
	});

	it('skips volumes that already exist, reporting them in volume order', () => {
		const result = expandVolumeRange({
			...rangeInput,
			volumeFrom: 1,
			volumeTo: 3,
			existing: [book({ volumeNumber: '2' })]
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries.map((e) => e.volumeNumber)).toEqual([1, 3]);
		expect(result.skipped).toEqual(['Volume 2 of "Mushoku" already exists']);
	});

	it('reports the "already exists" reason ahead of "already staged" for the same volume', () => {
		const result = expandVolumeRange({
			...rangeInput,
			volumeFrom: 1,
			volumeTo: 1,
			existing: [book({ volumeNumber: '1' })],
			staged: [staged({ volumeNumber: 1 })]
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.skipped).toEqual(['Volume 1 of "Mushoku" already exists']);
	});

	it('skips volumes that are already staged', () => {
		const result = expandVolumeRange({
			...rangeInput,
			volumeFrom: 1,
			volumeTo: 2,
			staged: [staged({ volumeNumber: 1 })]
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries.map((e) => e.volumeNumber)).toEqual([2]);
		expect(result.skipped).toEqual(['Volume 1 of "Mushoku" is already staged']);
	});

	it('uses the chosen location and leaves bookfair fields unset without defaults', () => {
		const result = expandVolumeRange({ ...rangeInput, location: 'home' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries[0]).toMatchObject({
			location: 'home',
			source: undefined,
			sourceEventId: undefined,
			boughtAt: undefined,
			isDraft: false
		});
	});

	it('applies bookfair defaults when the scope provides them', () => {
		const result = expandVolumeRange({
			...rangeInput,
			defaults: {
				source: 'bookfair',
				sourceEventId: 3,
				boughtAt: '2026-03-01'
			}
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries[0]).toMatchObject({
			location: 'apartment',
			source: 'bookfair',
			sourceEventId: 3,
			boughtAt: '2026-03-01'
		});
	});

	it('requires a bookfair event when the source is Bookfair', () => {
		expect(expandVolumeRange({ ...rangeInput, defaults: { source: 'bookfair' } })).toEqual({
			ok: false,
			error: 'Pick which bookfair'
		});
		const linked = expandVolumeRange({
			...rangeInput,
			defaults: { source: 'bookfair', sourceEventId: 5, boughtAt: '2025-10-12' }
		});
		expect(linked.ok).toBe(true);
	});

	it('applies form purchase fields outside a bookfair scope', () => {
		const result = expandVolumeRange({
			...rangeInput,
			defaults: { source: 'bookstore', boughtAt: '2026-10-15' }
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entries[0]).toMatchObject({
			source: 'bookstore',
			sourceEventId: undefined,
			boughtAt: '2026-10-15'
		});
	});

	it('keeps a zero price, and treats a blank or null price as untracked', () => {
		const zero = expandVolumeRange({ ...rangeInput, price: 0 });
		expect(zero.ok).toBe(true);
		if (!zero.ok) return;
		expect(zero.entries[0].price).toBe(0);

		for (const price of ['', null]) {
			const blank = expandVolumeRange({ ...rangeInput, price });
			expect(blank.ok).toBe(true);
			if (!blank.ok) return;
			expect(blank.entries[0].price).toBeUndefined();
		}

		const paid = expandVolumeRange({ ...rangeInput, price: '350' });
		expect(paid.ok).toBe(true);
		if (!paid.ok) return;
		expect(paid.entries[0].price).toBe(350);
	});
});

// ─── toBatchPayload ──────────────────────────────────────────────────────────

describe('toBatchPayload', () => {
	it('strips tempId and seriesShortName from the API payload', () => {
		const payload = toBatchPayload([staged({ price: 350, source: 'bookfair' })]);
		expect(payload).toEqual([
			{
				seriesId: 10,
				volumeNumber: 1,
				location: 'apartment',
				source: 'bookfair',
				sourceEventId: undefined,
				boughtAt: undefined,
				price: 350,
				isDraft: false
			}
		]);
	});
});

// ─── buildPreviewRows ────────────────────────────────────────────────────────

describe('buildPreviewRows', () => {
	it('tags rows by origin and stringifies book ids', () => {
		const rows = buildPreviewRows(
			[book({ id: 7 })],
			[staged({ tempId: 'tmp-9', volumeNumber: 2 })]
		);
		expect(rows.map((r) => [r.type, r.id])).toEqual([
			['existing', '7'],
			['staged', 'tmp-9']
		]);
	});

	it('sorts by series name then volume, interleaving staged rows', () => {
		const rows = buildPreviewRows(
			[
				book({ id: 1, seriesShortName: 'Zebra', volumeNumber: '1' }),
				book({ id: 2, seriesShortName: 'Alpha', volumeNumber: '3' })
			],
			[staged({ tempId: 't', seriesShortName: 'Alpha', volumeNumber: 1 })]
		);
		expect(rows.map((r) => `${r.seriesShortName}${r.volumeNumber}`)).toEqual([
			'Alpha1',
			'Alpha3',
			'Zebra1'
		]);
	});

	it('coerces the numeric volume string to a number', () => {
		const [row] = buildPreviewRows([book({ volumeNumber: '4.5' })], []);
		expect(row.volumeNumber).toBe(4.5);
	});

	it('normalises staged price to a string and staged source to null', () => {
		const [row] = buildPreviewRows([], [staged({ price: 350, source: undefined })]);
		expect(row.price).toBe('350');
		expect(row.source).toBeNull();
	});

	it('gives staged rows no tags and null series fields when the series is unknown', () => {
		const [row] = buildPreviewRows([], [staged()]);
		expect(row.seriesTags).toEqual([]);
		expect(row).toMatchObject({ publisher: null, status: null, seriesType: null });
	});

	it('borrows series fields for both kinds of row, and tags for staged rows', () => {
		const seriesById = new Map<number, SeriesMeta>([
			[
				10,
				{
					publisher: 'Kadokawa',
					status: 'ongoing',
					type: 'light_novel',
					tags: [{ id: 5, name: 'isekai' }]
				}
			]
		]);
		const rows = buildPreviewRows(
			[book({ id: 1, volumeNumber: '1' })],
			[staged({ volumeNumber: 2 })],
			seriesById
		);
		for (const row of rows) {
			expect(row).toMatchObject({
				publisher: 'Kadokawa',
				status: 'ongoing',
				seriesType: 'light_novel'
			});
		}
		expect(rows.map((r) => r.type)).toEqual(['existing', 'staged']);
		expect(rows[1].seriesTags).toEqual([{ id: 5, name: 'isekai' }]);
	});
});

// ─── Preview filtering ───────────────────────────────────────────────────────

describe('isFilterActive', () => {
	it('is false for a pristine filter state', () => {
		expect(isFilterActive(state())).toBe(false);
	});

	it('is true as soon as query text is present, before it parses', () => {
		expect(isFilterActive(state({ booruQuery: 'loc' }))).toBe(true);
	});

	it('stays true when the query text is cleared but parsed params linger', () => {
		// The search bar clears `booruQuery` synchronously but only reparses
		// after a 150ms debounce, so this transient state is real.
		expect(
			isFilterActive(
				state({ booruQuery: '', paramFilters: [{ key: 'location', op: '=', value: 'home' }] })
			)
		).toBe(true);
	});
});

describe('remapPreviewFilterState', () => {
	it('maps volumes to volumeNumber and draft to isDraft', () => {
		const remapped = remapPreviewFilterState(
			state({
				paramFilters: [
					{ key: 'volumes', op: '>=', value: '2' },
					{ key: 'draft', op: '=', value: 'true' },
					{ key: 'location', op: '=', value: 'home' }
				]
			})
		);
		expect(remapped.paramFilters.map((p) => p.key)).toEqual([
			'volumeNumber',
			'isDraft',
			'location'
		]);
	});

	it('leaves the rest of the state untouched', () => {
		const original = state({ searchTerms: ['isekai'], booruQuery: 'isekai' });
		const remapped = remapPreviewFilterState(original);
		expect(remapped.searchTerms).toEqual(['isekai']);
		expect(remapped.booruQuery).toBe('isekai');
	});
});

describe('filterPreviewRows', () => {
	const seriesById = new Map<number, SeriesMeta>([
		[10, { publisher: 'Kadokawa', status: 'ongoing', type: 'light_novel', tags: [] }],
		[20, { publisher: 'Yen Press', status: 'ended', type: 'manga', tags: [] }]
	]);
	const rows = buildPreviewRows(
		[
			book({ id: 1, seriesShortName: 'Mushoku', volumeNumber: '1', location: 'home' }),
			book({
				id: 2,
				seriesId: 20,
				seriesShortName: 'Spice',
				volumeNumber: '3',
				location: 'apartment',
				seriesTags: [{ id: 2, name: 'romance' }]
			})
		],
		[],
		seriesById
	);

	it('returns the list untouched when no filter is active', () => {
		expect(filterPreviewRows(rows, state())).toBe(rows);
	});

	it('filters by a book-level param', () => {
		const result = filterPreviewRows(
			rows,
			state({
				booruQuery: 'location:home',
				paramFilters: [{ key: 'location', op: '=', value: 'home' }]
			})
		);
		expect(result.map((r) => r.seriesShortName)).toEqual(['Mushoku']);
	});

	it('applies the volumes alias against volumeNumber, not bookCount', () => {
		const result = filterPreviewRows(
			rows,
			state({ booruQuery: 'volumes:3', paramFilters: [{ key: 'volumes', op: '=', value: '3' }] })
		);
		expect(result.map((r) => r.seriesShortName)).toEqual(['Spice']);
	});

	it('searches series short names via bare terms', () => {
		const result = filterPreviewRows(rows, state({ booruQuery: 'spice', searchTerms: ['spice'] }));
		expect(result.map((r) => r.seriesShortName)).toEqual(['Spice']);
	});

	it('filters by series-level params: publisher, status and type', () => {
		const by = (key: string, value: string) =>
			filterPreviewRows(
				rows,
				state({ booruQuery: `${key}:${value}`, paramFilters: [{ key, op: '=', value }] })
			).map((r) => r.seriesShortName);
		expect(by('publisher', 'kadokawa')).toEqual(['Mushoku']);
		expect(by('status', 'ended')).toEqual(['Spice']);
		expect(by('type', 'light_novel')).toEqual(['Mushoku']);
	});

	it('filters by tag:', () => {
		const result = filterPreviewRows(
			rows,
			state({
				booruQuery: 'tag:isekai',
				paramFilters: [{ key: 'tag', op: '=', value: 'isekai' }]
			})
		);
		expect(result.map((r) => r.seriesShortName)).toEqual(['Mushoku']);
	});
});
