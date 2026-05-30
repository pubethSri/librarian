import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type {
	BookfairWithCount,
	BookfairDetail,
	Bookfair,
	CreateBookfairPayload,
	UpdateBookfairPayload
} from '$lib/types';

/** Fetch all bookfairs with book count */
async function fetchBookfairs(): Promise<BookfairWithCount[]> {
	const res = await fetch('/api/bookfairs');
	if (!res.ok) throw new Error('Failed to fetch bookfairs');
	return res.json();
}

/** Fetch a single bookfair by ID */
async function fetchBookfairDetail(id: number): Promise<BookfairDetail> {
	const res = await fetch(`/api/bookfairs/${id}`);
	if (!res.ok) {
		if (res.status === 404) throw new Error('Bookfair not found');
		throw new Error('Failed to fetch bookfair');
	}
	return res.json();
}

/** Query: list all bookfairs */
export function createBookfairsListQuery() {
	return createQuery<BookfairWithCount[]>(() => ({
		queryKey: ['bookfairs'],
		queryFn: fetchBookfairs
	}));
}

/** Query: single bookfair detail */
export function createBookfairDetailQuery(id: number) {
	return createQuery<BookfairDetail>(() => ({
		queryKey: ['bookfairs', id],
		queryFn: () => fetchBookfairDetail(id),
		enabled: id > 0
	}));
}

/** Mutation: create a new bookfair */
export function createBookfairMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (payload: CreateBookfairPayload) => {
			const res = await fetch('/api/bookfairs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create bookfair');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookfairs'] });
		}
	}));
}

/** Mutation: update a bookfair */
export function createBookfairUpdateMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async ({ id, ...payload }: UpdateBookfairPayload & { id: number }) => {
			const res = await fetch(`/api/bookfairs/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update bookfair');
			}
			return res.json();
		},
		onSuccess: (_data: unknown, variables: UpdateBookfairPayload & { id: number }) => {
			queryClient.invalidateQueries({ queryKey: ['bookfairs'] });
			queryClient.invalidateQueries({ queryKey: ['bookfairs', variables.id] });
		}
	}));
}

/** Mutation: delete a bookfair */
export function createBookfairDeleteMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: async (id: number) => {
			const res = await fetch(`/api/bookfairs/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete bookfair');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookfairs'] });
		}
	}));
}
