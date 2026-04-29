import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { TagWithCount } from '$lib/types';

/** Fetch all tags with usage count */
async function fetchTags(): Promise<TagWithCount[]> {
	const res = await fetch('/api/tags');
	if (!res.ok) throw new Error('Failed to fetch tags');
	return res.json();
}

/** Query: list all tags */
export function createTagsListQuery() {
	return createQuery<TagWithCount[]>(() => ({
		queryKey: ['tags'],
		queryFn: fetchTags
	}));
}

/** Mutation: create a new tag */
export function createTagMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (name: string) => {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create tag');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	}));
}

/** Mutation: delete a tag */
export function createTagDeleteMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (id: number) => {
			const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete tag');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	}));
}

/** Mutation: replace all tags for a series */
export function createSeriesTagsMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ seriesId, tagIds }: { seriesId: number; tagIds: number[] }) => {
			const res = await fetch(`/api/series/${seriesId}/tags`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tagIds })
			});
			if (!res.ok) throw new Error('Failed to update series tags');
			return res.json();
		},
		onSuccess: (_data: unknown, variables: { seriesId: number; tagIds: number[] }) => {
			queryClient.invalidateQueries({ queryKey: ['series', variables.seriesId] });
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	}));
}
