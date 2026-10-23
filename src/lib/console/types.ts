import type {
	BookLocation,
	BookSource,
	ReadingStatus,
	SeriesListItem,
	SeriesStatus,
	SeriesType
} from '$lib/types';

// ─── Scope ──────────────────────────────────────────────────────────────────

export type ScopeType = 'all' | 'bookfair' | 'series';

/**
 * Where and when staged books were bought. Comes from the bookfair scope
 * (see BookfairDefaults) or, outside it, from the Add Books form.
 */
export type PurchaseFields = {
	source?: BookSource;
	sourceEventId?: number;
	boughtAt?: string;
};

/**
 * Field defaults derived from a bookfair-scoped Console session. Location is
 * not among them: the Add Books form owns it (defaulting to Apartment).
 */
export type BookfairDefaults = {
	source: BookSource;
	sourceEventId: number;
	boughtAt: string;
};

// ─── Bulk Edit ──────────────────────────────────────────────────────────────

export type BulkAction =
	| 'location'
	| 'source'
	| 'isDraft'
	| 'readingStatus'
	| 'price'
	| 'bookfair'
	| 'boughtAt'
	| '';
export type ConditionColumn = 'series' | 'volume' | 'reading' | 'location' | 'source' | 'isDraft';
/** The ordering operators apply to the numeric `volume` column only */
export type ConditionOp = '=' | '!=' | '>' | '<' | '>=' | '<=';

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
	/** Sort position; shown as "Extra" when isExtra */
	volumeNumber: number;
	isExtra: boolean;
	/** An extra's title */
	title: string | null;
	location: BookLocation;
	source: BookSource | null;
	/** The bookfair the book is linked to, if any */
	sourceEventId: number | null;
	price: string | null;
	/** Purchase date (ISO timestamp or YYYY-MM-DD), null when unknown */
	boughtAt: string | null;
	isDraft: boolean;
	/** Current reading status; staged rows are Unread */
	readingStatus: ReadingStatus;
	seriesTags: { id: number; name: string }[];
	// Series-level fields, so `publisher:` / `status:` / `type:` can match.
	// `seriesType` because `type` already means existing-vs-staged here.
	publisher: string | null;
	status: SeriesStatus | null;
	seriesType: SeriesType | null;
};

/** The series fields the preview borrows, looked up by series id */
export type SeriesMeta = Pick<SeriesListItem, 'publisher' | 'status' | 'type' | 'tags'>;
