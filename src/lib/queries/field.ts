import { createMutation, useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import type {
	BookListItem,
	CreateBookPayload,
	CreateSeriesPayload,
	SeriesListItem
} from '$lib/types';

/** Raised when the guard finds the volume already added (HTTP 409) */
export class AlreadyAddedError extends Error {
	constructor(readonly book: Pick<BookListItem, 'id' | 'seriesId' | 'volumeNumber'>) {
		super('This volume is already in the collection');
	}
}

/**
 * Everything a phone add or undo can change: lists, fair hauls, insights.
 * Awaited, so the mutation stays pending until the grid has the new data.
 */
function refreshAfterWrite(queryClient: QueryClient) {
	return Promise.all(
		[['books'], ['series'], ['bookfairs'], ['insights']].map((queryKey) =>
			queryClient.invalidateQueries({ queryKey })
		)
	);
}

async function postBook(payload: CreateBookPayload): Promise<BookListItem> {
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

/** Mutation: Field Mode quick add — one book, refused (409) if the volume exists */
export function createQuickAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (payload: Omit<CreateBookPayload, 'onlyIfMissing'>) =>
			postBook({ ...payload, onlyIfMissing: true }),
		// A 409 means this device's list is stale: refetch either way
		onSettled: () => refreshAfterWrite(queryClient)
	}));
}

/** Mutation: undo a quick add (deletes the book) */
export function createUndoAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (bookId: number) => {
			const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
			if (!res.ok && res.status !== 404) throw new Error('Failed to undo');
		},
		onSettled: () => refreshAfterWrite(queryClient)
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
		}): Promise<{ series: Pick<SeriesListItem, 'id' | 'shortName'>; book: BookListItem }> => {
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
		onSettled: () => refreshAfterWrite(queryClient)
	}));
}
