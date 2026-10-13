import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { CreateBookPayload } from '$lib/types';

/** Mutation: create multiple books at once */
export function createBatchBookMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (payload: { books: CreateBookPayload[] }): Promise<{ created: number }> => {
			const res = await fetch('/api/books/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create books');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['books'] });
			queryClient.invalidateQueries({ queryKey: ['series'] });
			queryClient.invalidateQueries({ queryKey: ['bookfairs'] });
		}
	}));
}
