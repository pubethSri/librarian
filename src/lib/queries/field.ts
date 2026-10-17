import { createMutation, useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import type {
	BookListItem,
	CreateBookPayload,
	CreateSeriesPayload,
	SeriesListItem
} from '$lib/types';
import {
	toBookListItem,
	withBook,
	withBookCount,
	withoutBook,
	type BookRow
} from '$lib/field/logic';

/** Raised when the guard finds the volume already added (HTTP 409) */
export class AlreadyAddedError extends Error {
	constructor(readonly book: Pick<BookListItem, 'id' | 'seriesId' | 'volumeNumber'>) {
		super('This volume is already in the collection');
	}
}

/**
 * Mark what a phone write changes as stale without refetching it now: fair
 * hauls, insights, series detail pages refresh the next time they're shown.
 */
function markStale(queryClient: QueryClient) {
	for (const queryKey of [['bookfairs'], ['insights'], ['books', 'event'], ['series']]) {
		queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
	}
}

/** Refetch the lists the Field screens show (after a 409: this device is behind) */
function refetchLists(queryClient: QueryClient) {
	return Promise.all(
		[['books'], ['series'], ['bookfairs'], ['insights']].map((queryKey) =>
			queryClient.invalidateQueries({ queryKey })
		)
	);
}

async function postBook(payload: CreateBookPayload): Promise<BookRow> {
	const res = await fetch('/api/books', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (res.status === 409) {
		const body = await res.json().catch(() => ({}));
		throw new AlreadyAddedError(body.book);
	}
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to add the book');
	}
	return res.json();
}

/**
 * Mutation: Field Mode quick add — one book, refused (409) if the volume
 * exists. A tap costs one request: the created row is patched into the
 * cached books / series lists instead of refetching them (~200 KB) — on a
 * phone, a refetch per tap queued enough requests to stall the page.
 */
export function createQuickAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			payload
		}: {
			payload: Omit<CreateBookPayload, 'onlyIfMissing'>;
			series: SeriesListItem;
		}) => postBook({ ...payload, onlyIfMissing: true }),
		onSuccess: (row: BookRow, { series }) => {
			const item = toBookListItem(row, series);
			queryClient.setQueryData<BookListItem[]>(['books'], (list) => withBook(list, item));
			queryClient.setQueryData<SeriesListItem[]>(['series'], (list) =>
				withBookCount(list, series.id, 1)
			);
			markStale(queryClient);
		},
		onError: (err: Error) => {
			// Another device added it: this one's lists are behind
			if (err instanceof AlreadyAddedError) refetchLists(queryClient);
		}
	}));
}

type BatchResult = {
	books: BookRow[];
	skipped: { seriesId: number; volumeNumber: string }[];
};

async function postBatch(books: Omit<CreateBookPayload, 'onlyIfMissing'>[]): Promise<BatchResult> {
	const res = await fetch('/api/books/batch', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ onlyIfMissing: true, books })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to add the books');
	}
	return res.json();
}

/** Fold created rows into the cached lists (one series) */
function patchAdded(queryClient: QueryClient, series: SeriesListItem, rows: readonly BookRow[]) {
	queryClient.setQueryData<BookListItem[]>(['books'], (list) =>
		rows.reduce((acc, row) => withBook(acc, toBookListItem(row, series)), list)
	);
	queryClient.setQueryData<SeriesListItem[]>(['series'], (list) =>
		withBookCount(list, series.id, rows.length)
	);
	markStale(queryClient);
}

/**
 * Mutation: Field Mode multi-add — several volumes of one series in one
 * request; volumes already owned (e.g. added on another device) are
 * skipped and reported, not added twice.
 */
export function createMultiAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			books
		}: {
			books: Omit<CreateBookPayload, 'onlyIfMissing'>[];
			series: SeriesListItem;
		}) => postBatch(books),
		onSuccess: (result: BatchResult, { series }) => {
			patchAdded(queryClient, series, result.books);
			// Something was skipped: this device's lists are behind
			if (result.skipped.length > 0) refetchLists(queryClient);
		}
	}));
}

/**
 * Mutation: undo a quick add or a multi-add — deletes the books in one
 * request and patches them out of the cache.
 */
export function createUndoAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ bookIds }: { bookIds: number[]; seriesId: number }) => {
			const res = await fetch('/api/books/batch', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: bookIds })
			});
			// Ids already gone (deleted elsewhere) are ignored by the server
			if (!res.ok) throw new Error('Failed to undo');
		},
		onSuccess: (_: void, { bookIds, seriesId }) => {
			queryClient.setQueryData<BookListItem[]>(['books'], (list) =>
				bookIds.reduce((acc, id) => withoutBook(acc, id), list)
			);
			queryClient.setQueryData<SeriesListItem[]>(['series'], (list) =>
				withBookCount(list, seriesId, -bookIds.length)
			);
			markStale(queryClient);
		}
	}));
}

/** Mutation: Add tab — a new series with its chosen volumes as drafts */
export function createSeriesWithVolumesMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({
			series,
			books
		}: {
			series: CreateSeriesPayload;
			books: Omit<CreateBookPayload, 'seriesId' | 'onlyIfMissing'>[];
		}): Promise<{ series: Pick<SeriesListItem, 'id' | 'shortName'>; books: BookRow[] }> => {
			const res = await fetch('/api/series', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(series)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create the series');
			}
			const created: Pick<SeriesListItem, 'id' | 'shortName'> = await res.json();
			try {
				const result = await postBatch(books.map((b) => ({ ...b, seriesId: created.id })));
				return { series: created, books: result.books };
			} catch (err) {
				// Don't leave an empty series behind
				await fetch(`/api/series/${created.id}`, { method: 'DELETE' }).catch(() => {});
				throw err;
			}
		},
		// Rare, and Find needs the new series in the list: refetch rather than patch
		onSettled: () => refetchLists(queryClient)
	}));
}
