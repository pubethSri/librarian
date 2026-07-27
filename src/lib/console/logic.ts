// ─── Console Logic ──────────────────────────────────────────────────────────
// Pure functions behind the Console workbench. No runes, no `crypto`, no
// toasts — everything here is deterministic and unit-testable. State lives in
// the `.svelte.ts` stores; side effects live in the components.

import type { BookListItem, CreateBookPayload, StagedBookEntry } from '$lib/types';
import { applyUnifiedFilter, type UnifiedFilterState } from '$lib/components/filterEngine';
import type { BookfairDefaults, BulkAction, Condition, PreviewRow } from './types';

// ─── Display helpers ────────────────────────────────────────────────────────

export function formatPrice(price: string | number | null | undefined): string {
	if (price === null || price === undefined || price === '') return '—';
	return `฿${Number(price).toLocaleString()}`;
}

/** Display label for a bulk-action value (used in the preview's old→new arrow) */
export function getActionLabel(action: BulkAction, value: string): string {
	if (action === 'location') return value === 'home' ? 'Home' : 'Apartment';
	if (action === 'source') {
		if (value === 'bookstore') return 'Bookstore';
		if (value === 'bookfair') return 'Bookfair';
		if (value === 'online') return 'Online';
	}
	if (action === 'isDraft') return value === 'true' ? 'Draft' : 'Not Draft';
	return value;
}

// ─── Bulk edit ──────────────────────────────────────────────────────────────

/** Does a book satisfy every condition? An empty condition list matches all. */
export function matchesConditions(book: BookListItem, conditions: Condition[]): boolean {
	if (conditions.length === 0) return true;
	return conditions.every((c) => {
		let bookValue: string;
		switch (c.column) {
			case 'series':
				bookValue = book.seriesShortName.toLowerCase();
				break;
			case 'location':
				bookValue = book.location;
				break;
			case 'source':
				bookValue = book.source || '';
				break;
			case 'isDraft':
				bookValue = String(book.isDraft);
				break;
			default:
				return true;
		}
		const condValue = c.column === 'series' ? c.value.toLowerCase() : c.value;
		if (c.op === '=') return bookValue === condValue;
		if (c.op === '!=') return bookValue !== condValue;
		return true;
	});
}

/**
 * The ids of the affected books, as strings, for preview-row lookup.
 *
 * The set is rebuilt from scratch whenever the affected list changes and is
 * never mutated in place, so a plain `Set` is correct here — reactivity comes
 * from the surrounding `$derived`, not from the collection.
 */
export function toAffectedIds(books: BookListItem[]): Set<string> {
	return new Set(books.map((b) => String(b.id)));
}

/** Build the PATCH body for /api/books/bulk from the selected action + value */
export function toBulkUpdates(action: BulkAction, value: string): Record<string, unknown> {
	const updates: Record<string, unknown> = {};
	if (action === 'location') updates.location = value;
	if (action === 'source') updates.source = value;
	if (action === 'isDraft') updates.isDraft = value === 'true';
	return updates;
}

// ─── Staging ────────────────────────────────────────────────────────────────

/**
 * The next volume to suggest for a series: one past the highest volume already
 * owned or staged. Note the caller passes the *scoped* book list, so a series
 * owned outside the current scope still suggests 1 — a known follow-up.
 */
export function nextVolumeFor(
	books: BookListItem[],
	staged: StagedBookEntry[],
	seriesId: number
): number {
	const allVols = [
		...books.filter((b) => b.seriesId === seriesId).map((b) => Number(b.volumeNumber)),
		...staged.filter((e) => e.seriesId === seriesId).map((e) => e.volumeNumber)
	];
	const maxVol = allVols.length > 0 ? Math.max(...allVols) : 0;
	return maxVol + 1;
}

export type ExpandVolumeRangeInput = {
	seriesId: number | null;
	seriesName: string;
	volumeFrom: number;
	volumeTo: number;
	price: string | number;
	defaults: BookfairDefaults | null;
	existing: BookListItem[];
	staged: StagedBookEntry[];
};

export type ExpandVolumeRangeResult =
	| { ok: false; error: string }
	| { ok: true; entries: Omit<StagedBookEntry, 'tempId'>[]; skipped: string[] };

/**
 * Expand a volume range into staged entries, skipping volumes that already
 * exist or are already staged.
 *
 * Returns a discriminated result so a hard validation failure (`ok: false`)
 * can be distinguished from per-volume skips — the caller must not advance the
 * volume range on a hard failure.
 */
export function expandVolumeRange(input: ExpandVolumeRangeInput): ExpandVolumeRangeResult {
	const { seriesId, seriesName, volumeFrom, volumeTo, price, defaults, existing, staged } = input;

	if (!seriesId) return { ok: false, error: 'Please select a series' };
	if (volumeFrom <= 0 || volumeTo <= 0) {
		return { ok: false, error: 'Volume numbers must be positive' };
	}
	if (volumeTo < volumeFrom) return { ok: false, error: 'End volume must be ≥ start volume' };
	// NOTE: this is off by one against its own message — a range of 52 volumes
	// is what actually trips it. Preserved as-is; see the Console follow-ups.
	if (volumeTo - volumeFrom > 50) return { ok: false, error: 'Maximum 50 volumes per batch' };

	const entries: Omit<StagedBookEntry, 'tempId'>[] = [];
	const skipped: string[] = [];

	for (let v = volumeFrom; v <= volumeTo; v++) {
		const alreadyExists = existing.some(
			(b) => b.seriesId === seriesId && Number(b.volumeNumber) === v
		);
		if (alreadyExists) {
			skipped.push(`Volume ${v} of "${seriesName}" already exists`);
			continue;
		}
		const alreadyStaged = staged.some((e) => e.seriesId === seriesId && e.volumeNumber === v);
		if (alreadyStaged) {
			skipped.push(`Volume ${v} of "${seriesName}" is already staged`);
			continue;
		}

		entries.push({
			seriesId,
			seriesShortName: seriesName,
			volumeNumber: v,
			location: defaults?.location ?? 'home',
			source: defaults?.source,
			sourceEventId: defaults?.sourceEventId,
			boughtAt: defaults?.boughtAt,
			price: price ? Number(price) : undefined,
			isDraft: false
		});
	}

	return { ok: true, entries, skipped };
}

/** Build the POST body for /api/books/batch from the staged entries */
export function toBatchPayload(entries: StagedBookEntry[]): CreateBookPayload[] {
	return entries.map((e) => ({
		seriesId: e.seriesId,
		volumeNumber: e.volumeNumber,
		location: e.location,
		source: e.source,
		sourceEventId: e.sourceEventId,
		boughtAt: e.boughtAt,
		price: e.price,
		isDraft: e.isDraft
	}));
}

// ─── Preview ────────────────────────────────────────────────────────────────

/** Merge existing + staged books into one list, sorted by series then volume */
export function buildPreviewRows(books: BookListItem[], staged: StagedBookEntry[]): PreviewRow[] {
	const existing: PreviewRow[] = books.map((b) => ({
		type: 'existing',
		id: String(b.id),
		seriesShortName: b.seriesShortName,
		volumeNumber: Number(b.volumeNumber),
		location: b.location,
		source: b.source,
		price: b.price,
		isDraft: b.isDraft,
		seriesTags: b.seriesTags ?? []
	}));
	const stagedRows: PreviewRow[] = staged.map((e) => ({
		type: 'staged',
		id: e.tempId,
		seriesShortName: e.seriesShortName,
		volumeNumber: e.volumeNumber,
		location: e.location,
		source: e.source ?? null,
		price: e.price != null ? String(e.price) : null,
		isDraft: e.isDraft,
		seriesTags: []
	}));
	return [...existing, ...stagedRows].sort((a, b) => {
		const nameCompare = a.seriesShortName.localeCompare(b.seriesShortName);
		if (nameCompare !== 0) return nameCompare;
		return a.volumeNumber - b.volumeNumber;
	});
}

/** Is the preview currently narrowed by a filter query? */
export function isFilterActive(state: UnifiedFilterState): boolean {
	return !!state.booruQuery || state.paramFilters.length > 0;
}

/**
 * Remap param keys for the Console preview context:
 * - `volumes` maps to `bookCount` in filterEngine, but preview rows carry
 *   `volumeNumber`
 * - `draft` needs to map to `isDraft`
 */
export function remapPreviewFilterState(state: UnifiedFilterState): UnifiedFilterState {
	return {
		...state,
		paramFilters: state.paramFilters.map((pf) => {
			if (pf.key === 'volumes') return { ...pf, key: 'volumeNumber' };
			if (pf.key === 'draft') return { ...pf, key: 'isDraft' };
			return pf;
		})
	};
}

export function filterPreviewRows(rows: PreviewRow[], state: UnifiedFilterState): PreviewRow[] {
	if (!isFilterActive(state)) return rows;

	const remappedState = remapPreviewFilterState(state);

	return rows.filter((row) =>
		applyUnifiedFilter(row as unknown as Record<string, unknown>, remappedState, {
			searchFields: ['seriesShortName'],
			getTagNames: (r) => {
				const typed = r as unknown as { seriesTags: { id: number; name: string }[] };
				return typed.seriesTags?.map((t) => t.name) ?? [];
			}
		})
	);
}
