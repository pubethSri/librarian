import { createMutation, useQueryClient } from '@tanstack/svelte-query';

/** Mutation: bulk update books */
export function createBulkBookUpdateMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (payload: {
			bookIds: number[];
			updates: Record<string, unknown>;
		}): Promise<{ updated: number }> => {
			const res = await fetch('/api/books/bulk', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to bulk update books');
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
