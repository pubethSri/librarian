import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { BookListItem, CreateBookPayload, UpdateBookPayload } from '$lib/types';
import { FRESH_MS } from './series';

/** Fetch all books with optional filters */
async function fetchBooks(signal?: AbortSignal): Promise<BookListItem[]> {
	const res = await fetch('/api/books', { signal });
	if (!res.ok) throw new Error('Failed to fetch books');
	return res.json();
}

/** Query: list all books; `fresh` as in `createSeriesListQuery` */
export function createBooksListQuery(opts: { fresh?: boolean } = {}) {
	return createQuery<BookListItem[]>(() => ({
		queryKey: ['books'],
		// The signal lets a superseded refetch free its connection
		queryFn: ({ signal }) => fetchBooks(signal),
		...(opts.fresh ? { staleTime: FRESH_MS, refetchOnWindowFocus: true } : {})
	}));
}

/** Fetch books linked to a specific bookfair event */
async function fetchBooksByEvent(eventId: number): Promise<BookListItem[]> {
	const res = await fetch(`/api/books?sourceEventId=${eventId}`);
	if (!res.ok) throw new Error('Failed to fetch books');
	return res.json();
}

/**
 * Query: list books for a specific bookfair event.
 *
 * Takes the id as a getter so the query re-keys when it changes (see
 * `createBookfairDetailQuery`).
 */
export function createBooksByEventQuery(getEventId: () => number) {
	return createQuery<BookListItem[]>(() => {
		const eventId = getEventId();
		return {
			queryKey: ['books', 'event', eventId],
			queryFn: () => fetchBooksByEvent(eventId),
			enabled: eventId > 0
		};
	});
}

/** Mutation: create a new book */
export function createBookMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (payload: CreateBookPayload) => {
			const res = await fetch('/api/books', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create book');
			}
			return res.json();
		},
		onSuccess: (_data: unknown, variables: CreateBookPayload) => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			queryClient.invalidateQueries({ queryKey: ['series'] });
			queryClient.invalidateQueries({ queryKey: ['series', variables.seriesId] });
		}
	}));
}

/** Mutation: update a book */
export function createBookUpdateMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ id, ...payload }: UpdateBookPayload & { id: number }) => {
			const res = await fetch(`/api/books/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update book');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			queryClient.invalidateQueries({ queryKey: ['series'] });
			queryClient.invalidateQueries({ queryKey: ['queue'] });
		}
	}));
}

/** Mutation: delete a book */
export function createBookDeleteMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (id: number) => {
			const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete book');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			queryClient.invalidateQueries({ queryKey: ['series'] });
			queryClient.invalidateQueries({ queryKey: ['queue'] });
		}
	}));
}
