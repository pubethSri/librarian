import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type {
	SeriesListItem,
	CreateSeriesPayload,
	UpdateSeriesPayload
} from '$lib/types';

/** Fetch all series with optional filters */
async function fetchSeries(params?: {
	search?: string;
	type?: string;
	status?: string;
}): Promise<SeriesListItem[]> {
	const url = new URL('/api/series', window.location.origin);
	if (params?.search) url.searchParams.set('search', params.search);
	if (params?.type) url.searchParams.set('type', params.type);
	if (params?.status) url.searchParams.set('status', params.status);

	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch series');
	return res.json();
}

/** Query: list all series */
export function createSeriesListQuery() {
	return createQuery<SeriesListItem[]>(() => ({
		queryKey: ['series'],
		queryFn: () => fetchSeries()
	}));
}

/** Mutation: create a new series */
export function createSeriesMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (payload: CreateSeriesPayload) => {
			const res = await fetch('/api/series', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create series');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series'] });
		}
	}));
}

/** Mutation: update an existing series */
export function createSeriesUpdateMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ id, ...payload }: UpdateSeriesPayload & { id: number }) => {
			const res = await fetch(`/api/series/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update series');
			}
			return res.json();
		},
		onSuccess: (_data: unknown, variables: UpdateSeriesPayload & { id: number }) => {
			queryClient.invalidateQueries({ queryKey: ['series'] });
			queryClient.invalidateQueries({ queryKey: ['series', variables.id] });
		}
	}));
}

/** Mutation: delete a series */
export function createSeriesDeleteMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (id: number) => {
			const res = await fetch(`/api/series/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete series');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series'] });
		}
	}));
}
