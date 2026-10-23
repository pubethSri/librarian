// ─── Shared TypeScript types for client-side use ─────────────────────────────
// Derived from Drizzle schema (src/lib/server/db/schema.ts)
// These types match the API response shapes.

// ─── Enums ───────────────────────────────────────────────────────────────────

export type SeriesStatus = 'ongoing' | 'ended' | 'dropped';
export type SeriesType = 'light_novel' | 'manga';
export type BookLocation = 'home' | 'apartment';
export type BookSource = 'bookstore' | 'bookfair' | 'online';
export type ReadingStatus = 'unread' | 'reading' | 'read' | 'dropped';

// ─── Display helpers ─────────────────────────────────────────────────────────

export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
	ongoing: 'Ongoing',
	ended: 'Ended',
	dropped: 'Dropped'
};

export const SERIES_TYPE_LABELS: Record<SeriesType, string> = {
	light_novel: 'Light Novel',
	manga: 'Manga'
};

export const BOOK_LOCATION_LABELS: Record<BookLocation, string> = {
	home: 'Home',
	apartment: 'Apartment'
};

export const BOOK_SOURCE_LABELS: Record<BookSource, string> = {
	bookstore: 'Bookstore',
	bookfair: 'Bookfair',
	online: 'Online'
};

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
	unread: 'Unread',
	reading: 'Reading',
	read: 'Read',
	dropped: 'Dropped'
};

// ─── API Response Types ──────────────────────────────────────────────────────

/** Series list item — returned by GET /api/series */
export type SeriesListItem = {
	id: number;
	shortName: string;
	fullName: string;
	status: SeriesStatus;
	type: SeriesType;
	publisher: string | null;
	/** Latest volume known to be released, set by hand (null = unknown) — the Hitlist's Confirmed section */
	totalVolumes: number | null;
	watchlist: boolean;
	createdAt: string;
	updatedAt: string;
	bookCount: number;
	tags: { id: number; name: string }[];
};

/** Reading entry */
export type ReadingEntry = {
	id: number;
	bookId: number;
	status: ReadingStatus;
	startedAt: string | null;
	finishedAt: string | null;
	rating: number | null;
	notes: string | null;
	createdAt: string;
};

/** Book with readings — used in series detail */
export type BookWithReadings = {
	id: number;
	seriesId: number;
	volumeNumber: string;
	/** An extra volume — volumeNumber is then only its sort position */
	isExtra: boolean;
	/** As printed on the cover; set on extras (tells them apart), null otherwise */
	title: string | null;
	location: BookLocation;
	boughtAt: string | null;
	price: string | null;
	source: BookSource | null;
	sourceEventId: number | null;
	isDraft: boolean;
	createdAt: string;
	updatedAt: string;
	readings: ReadingEntry[];
	/** In the reading queue */
	queued: boolean;
};

/** Tag */
export type Tag = {
	id: number;
	name: string;
};

/** Tag with usage count — returned by enhanced GET /api/tags */
export type TagWithCount = Tag & {
	seriesCount: number;
};

/** Bookfair */
export type Bookfair = {
	id: number;
	name: string;
	date: string;
	location: string | null;
	createdAt: string;
};

/** Bookfair list item with book count — returned by GET /api/bookfairs */
export type BookfairWithCount = Bookfair & {
	bookCount: number;
};

/** Bookfair detail — returned by GET /api/bookfairs/[id] */
export type BookfairDetail = BookfairWithCount & {
	totalSpent: number;
};

/** Series detail — returned by GET /api/series/[id] */
export type SeriesDetail = {
	id: number;
	shortName: string;
	fullName: string;
	status: SeriesStatus;
	type: SeriesType;
	publisher: string | null;
	totalVolumes: number | null;
	watchlist: boolean;
	createdAt: string;
	updatedAt: string;
	books: BookWithReadings[];
	tags: Tag[];
};

/** Book list item — returned by GET /api/books */
export type BookListItem = {
	id: number;
	seriesId: number;
	seriesShortName: string;
	seriesFullName: string;
	volumeNumber: string;
	/** An extra volume — volumeNumber is then only its sort position */
	isExtra: boolean;
	/** As printed on the cover; set on extras (tells them apart), null otherwise */
	title: string | null;
	location: BookLocation;
	boughtAt: string | null;
	price: string | null;
	source: BookSource | null;
	sourceEventId: number | null;
	isDraft: boolean;
	createdAt: string;
	updatedAt: string;
	seriesTags: { id: number; name: string }[];
	/** Derived from the reading rows — see $lib/reading */
	readingStatus: ReadingStatus;
	timesRead: number;
	/** In the reading queue (GET /api/queue has the order) */
	queued: boolean;
};

// ─── Mutation Payloads ───────────────────────────────────────────────────────

export type CreateSeriesPayload = {
	shortName: string;
	fullName: string;
	type: SeriesType;
	status?: SeriesStatus;
	publisher?: string;
	totalVolumes?: number | null;
	watchlist?: boolean;
};

export type UpdateSeriesPayload = Partial<CreateSeriesPayload>;

export type CreateBookPayload = {
	seriesId: number;
	volumeNumber: number;
	isExtra?: boolean;
	/** An extra's title; blank → null */
	title?: string | null;
	location?: BookLocation;
	boughtAt?: string;
	price?: number;
	source?: BookSource;
	sourceEventId?: number;
	isDraft?: boolean;
	/** Field Mode quick add: 409 (with the existing book) instead of a second copy */
	onlyIfMissing?: boolean;
};

/** `sourceEventId: null` clears the link (sent when source moves off bookfair) */
export type UpdateBookPayload = Partial<
	Omit<CreateBookPayload, 'seriesId' | 'sourceEventId' | 'onlyIfMissing'>
> & {
	sourceEventId?: number | null;
};

// ─── Bookfair Payloads ──────────────────────────────────────────────────────

export type CreateBookfairPayload = {
	name: string;
	date: string;
	location?: string;
};

export type UpdateBookfairPayload = Partial<CreateBookfairPayload> & {
	/** When the date changes: move linked books still dated the old day */
	moveBookDates?: boolean;
};

// ─── Reading Payloads ───────────────────────────────────────────────────────

export type CreateReadingPayload = {
	status?: ReadingStatus;
	startedAt?: string;
	finishedAt?: string;
	rating?: number;
	notes?: string;
};

/**
 * Edit a read-through's days (PATCH /api/books/[id]/reading/[readingId]).
 * `YYYY-MM-DD` calendar days; null clears; a key left out is unchanged.
 */
export type UpdateReadingPayload = { startedOn?: string | null; finishedOn?: string | null };

/** "I read this" (POST /api/books/[id]/reading/log) — see `LogRead` in $lib/reading */
export type LogReadPayload = { finishedOn: string | null; startedOn?: string | null };

/**
 * A book's derived reading state, returned by every reading write. `queued` is
 * false after a start or finish took the book out of the reading queue.
 */
export type ReadingSummary = {
	bookId: number;
	readingStatus: ReadingStatus;
	timesRead: number;
	queued: boolean;
};

// ─── Reading Queue ──────────────────────────────────────────────────────────

/**
 * A queued book — GET /api/queue returns them top first. The queue is a pool: a
 * book leaves it when started or finished (rules in $lib/queue). A Read book in
 * the queue is a planned re-read.
 */
export type QueueItem = {
	bookId: number;
	position: number;
	addedAt: string;
	seriesId: number;
	seriesShortName: string;
	seriesFullName: string;
	volumeNumber: string;
	isExtra: boolean;
	title: string | null;
	location: BookLocation;
	isDraft: boolean;
	readingStatus: ReadingStatus;
	timesRead: number;
};

// ─── Console Types ──────────────────────────────────────────────────────────

/** Staged book entry (for Console preview — new additions) */
export type StagedBookEntry = {
	tempId: string;
	seriesId: number;
	seriesShortName: string;
	volumeNumber: number;
	location: BookLocation;
	source?: BookSource;
	sourceEventId?: number;
	boughtAt?: string;
	price?: number;
	isDraft: boolean;
};

/** Staged edit (for Console preview — pending bulk changes) */
export type StagedEdit = {
	bookId: number;
	field: string;
	oldValue: unknown;
	newValue: unknown;
};

// ─── Insights ────────────────────────────────────────────────────────────────
// Returned by GET /api/insights; computed by the pure $lib/insights module.

/**
 * A money figure. A price is a lower bound and an unpriced book is never ฿0,
 * so every total says how many of the books it covers.
 */
export type Money = {
	/** Sum of the priced books */
	total: number;
	/** How many books had a price */
	priced: number;
	/** How many books the figure is about */
	of: number;
};

/**
 * Where a book stands for insights: Read once read at least once (even while
 * being re-read), otherwise its current reading status.
 */
export type ReadState = 'read' | 'reading' | 'dropped' | 'unread';

export type ReadStateCounts = Record<ReadState, number>;

export type InsightsOverview = {
	books: number;
	series: number;
	extras: number;
	readState: ReadStateCounts;
	byType: { type: SeriesType; counts: ReadStateCounts }[];
	spent: Money;
	/** Books with no purchase date — left out of every time series */
	undatedPurchases: number;
	/** Read rows with a finish date — the only reads rates and pace can use */
	datedReads: number;
};

/** An unread book in a backlog list */
export type BacklogBook = {
	bookId: number;
	seriesId: number;
	seriesShortName: string;
	volumeNumber: number;
	isExtra: boolean;
	title: string | null;
	boughtDay: string;
};

/** How long the unread pile takes to clear at the current pace */
export type ClearEstimate =
	| { kind: 'unknown' } // not enough dated reads to know the read rate
	| { kind: 'never' } // buying at least as fast as reading
	| { kind: 'months'; months: number };

export type InsightsBacklog = {
	pile: number;
	pileByType: Record<SeriesType, number>;
	/** The longest-waiting unread books (dated purchases only) */
	oldestUnread: BacklogBook[];
	/** Unread books with no purchase date (can't be ranked by age) */
	undatedPile: number;
	/** Books bought per month, last 12 months */
	buyRate: number;
	/** Dated reads per month; null below the minimum sample */
	readRate: number | null;
	datedReads: number;
	clear: ClearEstimate;
	/** Months to clear if buying stopped; null when the read rate is unknown */
	clearWithoutBuying: number | null;
	/** Last 12 months, oldest first */
	monthly: { month: string; bought: number; read: number }[];
	/** Series with books owned but none read, reading or dropped — most owned first */
	neverStarted: {
		seriesId: number;
		shortName: string;
		type: SeriesType;
		status: SeriesStatus;
		owned: number;
	}[];
};

export type InsightsGrowth = {
	/** First dated purchase month → this month, gaps included */
	monthly: { month: string; light_novel: number; manga: number; total: number }[];
	/** Running total of dated purchases, aligned with `monthly` */
	cumulative: number[];
	/** Books with no purchase date — not on the timeline */
	undated: number;
};

/**
 * Where a series stands: Abandoned when its status is Dropped (the user
 * dropped it); otherwise Finished when every owned book is read, In progress
 * when any is read / reading / dropped, else Not started.
 */
export type CompletionState = 'finished' | 'inProgress' | 'notStarted' | 'abandoned';

export type CompletionCounts = Record<CompletionState, number>;

/** One tag or publisher */
export type GroupStats = {
	name: string;
	series: number;
	books: number;
	/** Books read at least once */
	readBooks: number;
	/** Series per completion state */
	completion: CompletionCounts;
};

export type InsightsTags = {
	/** Most books first */
	tags: GroupStats[];
	/** Series without any tag */
	untaggedSeries: number;
	/** Most books first; one-series publishers fold into "Other" (last) */
	publishers: GroupStats[];
};

export type InsightsSpending = {
	total: Money;
	/** Dated purchases only: first dated month → this month */
	monthly: { month: string; spent: Money }[];
	/** Priced books with no purchase date — in the totals, not the timeline */
	undatedPriced: number;
	/** Bookfair / online / bookstore / unknown, biggest spend first */
	bySource: { source: BookSource | 'unknown'; spent: Money }[];
	/** Average price of priced books per series type */
	averageByType: Record<SeriesType, Money>;
	/** What the unread pile cost */
	unread: Money;
	/** Everything spent ÷ books read; null with nothing read or priced */
	costPerRead: number | null;
	readBooks: number;
};

export type InsightsPace = {
	/** Dated reads of books with a purchase date (finished on or after it) */
	samples: number;
	/** Median days from purchase to finish; null below the minimum sample */
	medianDays: number | null;
	/** How long reads took, in fixed bands */
	buckets: { label: string; count: number }[];
};

/** One bookfair's haul and how much of it got read */
export type FunnelRow = {
	bookfairId: number;
	name: string;
	date: string;
	bought: number;
	counts: ReadStateCounts;
	spent: Money;
};

export type Insights = {
	generatedAt: string;
	/** The time zone dated reads were bucketed in */
	timeZone: string;
	overview: InsightsOverview;
	backlog: InsightsBacklog;
	growth: InsightsGrowth;
	tags: InsightsTags;
	spending: InsightsSpending;
	pace: InsightsPace;
	/** Every bookfair, oldest first */
	funnel: FunnelRow[];
};
