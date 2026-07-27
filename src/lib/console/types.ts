import type { BookLocation, BookSource } from '$lib/types';

// ─── Scope ──────────────────────────────────────────────────────────────────

export type ScopeType = 'all' | 'bookfair' | 'series';

/** Field defaults derived from a bookfair-scoped Console session */
export type BookfairDefaults = {
	source: BookSource;
	sourceEventId: number;
	location: BookLocation;
	boughtAt: string;
};

// ─── Bulk Edit ──────────────────────────────────────────────────────────────

export type BulkAction = 'location' | 'source' | 'isDraft' | '';
export type ConditionColumn = 'series' | 'location' | 'source' | 'isDraft';
export type ConditionOp = '=' | '!=';

export type Condition = {
	id: string;
	column: ConditionColumn;
	op: ConditionOp;
	value: string;
};

// ─── Preview ────────────────────────────────────────────────────────────────

/**
 * A row in the Console preview table — an existing book or a staged addition.
 * `id` is the book id (stringified) for existing rows, the `tempId` for staged.
 */
export type PreviewRow = {
	type: 'existing' | 'staged';
	id: string;
	seriesShortName: string;
	volumeNumber: number;
	location: BookLocation;
	source: BookSource | null;
	price: string | null;
	isDraft: boolean;
	seriesTags: { id: number; name: string }[];
};
