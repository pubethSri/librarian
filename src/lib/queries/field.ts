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

/** Mutation: undo a quick add (deletes the book; patched out of the cache) */
export function createUndoAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ bookId }: { bookId: number; seriesId: number }) => {
			const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
			// 404: already gone (deleted elsewhere) — the same outcome
			if (!res.ok && res.status !== 404) throw new Error('Failed to undo');
		},
		onSuccess: (_: void, { bookId, seriesId }) => {
			queryClient.setQueryData<BookListItem[]>(['books'], (list) => withoutBook(list, bookId));
			queryClient.setQueryData<SeriesListItem[]>(['series'], (list) =>
				withBookCount(list, seriesId, -1)
			);
			markStale(queryClient);
		}
	}));
}

/** Mutation: Add tab — a new series with its first volume as a draft */
export function createSeriesWithFirstVolumeMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({
			series,
			book
		}: {
			series: CreateSeriesPayload;
			book: Omit<CreateBookPayload, 'seriesId'>;
		}): Promise<{ series: Pick<SeriesListItem, 'id' | 'shortName'>; book: BookRow }> => {
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
				const createdBook = await postBook({ ...book, seriesId: created.id });
				return { series: created, book: createdBook };
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
