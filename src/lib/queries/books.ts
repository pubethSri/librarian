import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { BookListItem, CreateBookPayload, UpdateBookPayload } from '$lib/types';

/** Fetch all books with optional filters */
async function fetchBooks(): Promise<BookListItem[]> {
	const res = await fetch('/api/books');
	if (!res.ok) throw new Error('Failed to fetch books');
	return res.json();
}

/** Query: list all books */
export function createBooksListQuery() {
	return createQuery<BookListItem[]>(() => ({
		queryKey: ['books'],
		queryFn: () => fetchBooks()
	}));
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
		}
	}));
}
