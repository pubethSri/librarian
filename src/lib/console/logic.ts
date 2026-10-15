// ─── Console Logic ──────────────────────────────────────────────────────────
// Pure functions behind the Console workbench. No runes, no `crypto`, no
// toasts — everything here is deterministic and unit-testable. State lives in
// the `.svelte.ts` stores; side effects live in the components.

import {
	READING_STATUS_LABELS,
	type BookListItem,
	type BookLocation,
	type CreateBookPayload,
	type StagedBookEntry
} from '$lib/types';
import { applyUnifiedFilter, type UnifiedFilterState } from '$lib/components/filterEngine';
import type { BookfairDefaults, BulkAction, Condition, PreviewRow, SeriesMeta } from './types';

// ─── Display helpers ────────────────────────────────────────────────────────

export function formatPrice(price: string | number | null | undefined): string {
	if (price === null || price === undefined || price === '') return '—';
	return `฿${Number(price).toLocaleString()}`;
}

/** Display name of each bulk action (confirm dialog) */
export const BULK_ACTION_LABELS: Record<Exclude<BulkAction, ''>, string> = {
	location: 'Change location',
	source: 'Set source',
	isDraft: 'Set draft status',
	readingStatus: 'Set reading status',
	price: 'Set price',
	bookfair: 'Link to bookfair'
};

/**
 * The bulk-edit confirm text, e.g. `Apply "Set price" (฿175) to 5 books?`.
 * Reading-status edits say they are undated, since that is easy to forget.
 */
export function bulkConfirmText(
	action: BulkAction,
	value: string,
	count: number,
	options: {
		/** Display name for the value when it is an id, e.g. the bookfair's name */
		valueLabel?: string;
		/** An extra sentence, e.g. that purchase dates will change */
		note?: string;
	} = {}
): string {
	if (!action) return '';
	const books = `${count} book${count !== 1 ? 's' : ''}`;
	const label = options.valueLabel ?? getActionLabel(action, value);
	const undated = action === 'readingStatus' ? ' No dates will be recorded.' : '';
	const note = options.note ? ` ${options.note}` : '';
	return `Apply "${BULK_ACTION_LABELS[action]}" (${label}) to ${books}?${undated}${note} This cannot be undone.`;
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
	if (action === 'readingStatus') {
		return READING_STATUS_LABELS[value as keyof typeof READING_STATUS_LABELS] ?? value;
	}
	if (action === 'price') return formatPrice(value);
	return value;
}

// ─── Bulk edit ──────────────────────────────────────────────────────────────

/** Does a book satisfy every condition? An empty condition list matches all. */
export function matchesConditions(book: BookListItem, conditions: Condition[]): boolean {
	if (conditions.length === 0) return true;
	return conditions.every((c) => {
		if (c.column === 'volume') {
			// Blank or non-numeric matches nothing, like a blank value elsewhere
			if (c.value.trim() === '' || Number.isNaN(Number(c.value))) return false;
			const vol = Number(book.volumeNumber);
			const target = Number(c.value);
			switch (c.op) {
				case '=':
					return vol === target;
				case '!=':
					return vol !== target;
				case '>':
					return vol > target;
				case '<':
					return vol < target;
				case '>=':
					return vol >= target;
				case '<=':
					return vol <= target;
			}
		}

		let bookValue: string;
		switch (c.column) {
			case 'series':
				// The value is a series id, picked with the series search
				bookValue = String(book.seriesId);
				break;
			case 'reading':
				bookValue = book.readingStatus;
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
		const condValue = c.value;
		if (c.op === '=') return bookValue === condValue;
		if (c.op === '!=') return bookValue !== condValue;
		// An ordering op on a text column is meaningless — match nothing rather
		// than everything, so a stale op can never widen a bulk edit
		return false;
	});
}

/**
 * Actions that never fall back to "every book in scope". Linking books to a
 * bookfair is always about specific books, and the Console opens pre-set to
 * it from a bookfair page — one careless Apply must not link the collection.
 */
export function requiresExplicitTarget(action: BulkAction): boolean {
	return action === 'bookfair';
}

/** The books whose (stringified) id is in the selection, in book order */
export function selectBooks(
	books: BookListItem[],
	selectedIds: ReadonlySet<string>
): BookListItem[] {
	if (selectedIds.size === 0) return [];
	return books.filter((b) => selectedIds.has(String(b.id)));
}

/**
 * The ids of the selectable rows between two positions in the visible list,
 * inclusive and in either direction — a shift-click range. Staged rows are
 * skipped: only saved books can be bulk-edited.
 */
export function rangeIds(rows: PreviewRow[], from: number, to: number): string[] {
	const [start, end] = from <= to ? [from, to] : [to, from];
	return rows
		.slice(Math.max(0, start), end + 1)
		.filter((r) => r.type === 'existing')
		.map((r) => r.id);
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
export function toBulkUpdates(
	action: BulkAction,
	value: string,
	/** For 'bookfair': the fair's date, when its purchase dates should follow */
	options: { fairDate?: string | null } = {}
): Record<string, unknown> {
	const updates: Record<string, unknown> = {};
	if (action === 'location') updates.location = value;
	if (action === 'source') updates.source = value;
	if (action === 'isDraft') updates.isDraft = value === 'true';
	// Reading status is applied server-side through the reading rules, undated
	if (action === 'readingStatus') updates.readingStatus = value;
	if (action === 'price') updates.price = Number(value);
	// Linking sets the source and the event together, so no book ends up as
	// "bookfair" without saying which one
	if (action === 'bookfair') {
		updates.source = 'bookfair';
		updates.sourceEventId = Number(value);
		if (options.fairDate) updates.boughtAt = options.fairDate;
	}
	return updates;
}

// ─── Staging ────────────────────────────────────────────────────────────────

/**
 * The next volume to suggest for a series: one past the highest volume already
 * owned or staged. Pass *all* owned books, not the scoped list — otherwise a
 * series owned outside a bookfair scope would suggest volume 1.
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
	price: string | number | null;
	location: BookLocation;
	defaults: BookfairDefaults | null;
	/** Every owned book (not just the scoped ones), for duplicate detection */
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
	const {
		seriesId,
		seriesName,
		volumeFrom,
		volumeTo,
		price,
		location,
		defaults,
		existing,
		staged
	} = input;

	if (!seriesId) return { ok: false, error: 'Please select a series' };
	if (volumeFrom <= 0 || volumeTo <= 0) {
		return { ok: false, error: 'Volume numbers must be positive' };
	}
	if (volumeTo < volumeFrom) return { ok: false, error: 'End volume must be ≥ start volume' };
	if (volumeTo - volumeFrom + 1 > 50) return { ok: false, error: 'Maximum 50 volumes per batch' };

	// A blank price means "not tracked"; zero is a real price (a free book)
	const parsedPrice = price === '' || price === null ? undefined : Number(price);

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
			location,
			source: defaults?.source,
			sourceEventId: defaults?.sourceEventId,
			boughtAt: defaults?.boughtAt,
			price: Number.isNaN(parsedPrice) ? undefined : parsedPrice,
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

/**
 * Merge existing + staged books into one list, sorted by series then volume.
 *
 * `seriesById` supplies the series-level fields (publisher/status/type, and
 * tags for staged rows). A series missing from it yields nulls and no tags.
 */
export function buildPreviewRows(
	books: BookListItem[],
	staged: StagedBookEntry[],
	seriesById: Map<number, SeriesMeta> = new Map()
): PreviewRow[] {
	const seriesFields = (seriesId: number) => {
		const s = seriesById.get(seriesId);
		return {
			publisher: s?.publisher ?? null,
			status: s?.status ?? null,
			seriesType: s?.type ?? null
		};
	};
	const existing: PreviewRow[] = books.map((b) => ({
		type: 'existing',
		id: String(b.id),
		seriesShortName: b.seriesShortName,
		volumeNumber: Number(b.volumeNumber),
		location: b.location,
		source: b.source,
		sourceEventId: b.sourceEventId,
		price: b.price,
		isDraft: b.isDraft,
		readingStatus: b.readingStatus,
		seriesTags: b.seriesTags ?? [],
		...seriesFields(b.seriesId)
	}));
	const stagedRows: PreviewRow[] = staged.map((e) => ({
		type: 'staged',
		id: e.tempId,
		seriesShortName: e.seriesShortName,
		volumeNumber: e.volumeNumber,
		location: e.location,
		source: e.source ?? null,
		sourceEventId: e.sourceEventId ?? null,
		price: e.price != null ? String(e.price) : null,
		isDraft: e.isDraft,
		readingStatus: 'unread',
		seriesTags: seriesById.get(e.seriesId)?.tags ?? [],
		...seriesFields(e.seriesId)
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
 * - `type` maps to `seriesType`, since a row's own `type` is existing/staged
 */
export function remapPreviewFilterState(state: UnifiedFilterState): UnifiedFilterState {
	return {
		...state,
		paramFilters: state.paramFilters.map((pf) => {
			if (pf.key === 'volumes') return { ...pf, key: 'volumeNumber' };
			if (pf.key === 'draft') return { ...pf, key: 'isDraft' };
			if (pf.key === 'type') return { ...pf, key: 'seriesType' };
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
