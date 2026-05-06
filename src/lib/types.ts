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
	location: BookLocation;
	boughtAt: string | null;
	price: string | null;
	source: BookSource | null;
	sourceEventId: number | null;
	isDraft: boolean;
	createdAt: string;
	updatedAt: string;
	readings: ReadingEntry[];
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
	location: BookLocation;
	boughtAt: string | null;
	price: string | null;
	source: BookSource | null;
	sourceEventId: number | null;
	isDraft: boolean;
	createdAt: string;
	updatedAt: string;
};

// ─── Mutation Payloads ───────────────────────────────────────────────────────

export type CreateSeriesPayload = {
	shortName: string;
	fullName: string;
	type: SeriesType;
	status?: SeriesStatus;
	publisher?: string;
	totalVolumes?: number;
	watchlist?: boolean;
};

export type UpdateSeriesPayload = Partial<CreateSeriesPayload>;

export type CreateBookPayload = {
	seriesId: number;
	volumeNumber: number;
	location?: BookLocation;
	boughtAt?: string;
	price?: number;
	source?: BookSource;
	sourceEventId?: number;
	isDraft?: boolean;
};

export type UpdateBookPayload = Partial<Omit<CreateBookPayload, 'seriesId'>>;
