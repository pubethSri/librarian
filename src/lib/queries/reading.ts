import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { CreateReadingPayload, UpdateReadingPayload } from '$lib/types';

/** Mutation: create a new reading entry for a book */
export function createReadingMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({
			bookId,
			...payload
		}: CreateReadingPayload & { bookId: number; seriesId?: number }) => {
			const res = await fetch(`/api/books/${bookId}/reading`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create reading entry');
			}
			return res.json();
		},
		onSuccess: (
			_data: unknown,
			variables: CreateReadingPayload & { bookId: number; seriesId?: number }
		) => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			// Invalidate specific series detail if seriesId is provided
			if (variables.seriesId) {
				queryClient.invalidateQueries({ queryKey: ['series', variables.seriesId] });
			}
			// Also broadly invalidate series list for dashboard stats
			queryClient.invalidateQueries({ queryKey: ['series'] });
		}
	}));
}

/** Mutation: update an existing reading entry */
export function createReadingUpdateMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({
			bookId,
			readingId,
			...payload
		}: UpdateReadingPayload & { bookId: number; readingId: number; seriesId?: number }) => {
			const res = await fetch(`/api/books/${bookId}/reading/${readingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update reading entry');
			}
			return res.json();
		},
		onSuccess: (
			_data: unknown,
			variables: UpdateReadingPayload & {
				bookId: number;
				readingId: number;
				seriesId?: number;
			}
		) => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			if (variables.seriesId) {
				queryClient.invalidateQueries({ queryKey: ['series', variables.seriesId] });
			}
			queryClient.invalidateQueries({ queryKey: ['series'] });
		}
	}));
}
