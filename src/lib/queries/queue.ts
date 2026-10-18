import {
	createMutation,
	createQuery,
	useQueryClient,
	type QueryClient
} from '@tanstack/svelte-query';
import type { BookListItem, QueueItem } from '$lib/types';
import { FRESH_MS } from './series';

// The reading queue (rules in $lib/queue). Every write patches the cached queue
// and the books list's `queued` flag from the reply, so one tap is one request;
// series details (their own `queued` flags) are marked stale.

async function send<T>(url: string, method: string, body: unknown, failure: string): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || failure);
	}
	return res.json();
}

/** Query: the queue, top first; `fresh` as in `createSeriesListQuery` (Field Mode) */
export function createQueueQuery(opts: { fresh?: boolean } = {}) {
	return createQuery<QueueItem[]>(() => ({
		queryKey: ['queue'],
		queryFn: async ({ signal }) => {
			const res = await fetch('/api/queue', { signal });
			if (!res.ok) throw new Error('Failed to load the reading queue');
			return res.json();
		},
		...(opts.fresh ? { staleTime: FRESH_MS, refetchOnWindowFocus: true } : {})
	}));
}

function markQueued(qc: QueryClient, bookId: number, queued: boolean) {
	qc.setQueryData<BookListItem[]>(['books'], (list) =>
		list?.map((b) => (b.id === bookId ? { ...b, queued } : b))
	);
	// Series details (['series', id]) carry the flag too — not the series list
	qc.invalidateQueries({
		predicate: (q) => q.queryKey[0] === 'series' && q.queryKey.length === 2
	});
}

/** Mutation: add a book at the end (already queued → unchanged) */
export function createQueueAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookId: number) =>
			send<QueueItem>('/api/queue', 'POST', { bookId }, 'Failed to add to the queue'),
		onSuccess: (item) => {
			queryClient.setQueryData<QueueItem[]>(['queue'], (list) =>
				list && !list.some((i) => i.bookId === item.bookId) ? [...list, item] : list
			);
			markQueued(queryClient, item.bookId, true);
		}
	}));
}

/** Mutation: take a book out of the queue */
export function createQueueRemoveMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookId: number) =>
			send<{ bookId: number }>(
				`/api/queue/${bookId}`,
				'DELETE',
				undefined,
				'Failed to remove from the queue'
			),
		onSuccess: ({ bookId }) => {
			queryClient.setQueryData<QueueItem[]>(['queue'], (list) =>
				list?.filter((i) => i.bookId !== bookId)
			);
			markQueued(queryClient, bookId, false);
		}
	}));
}

/**
 * Mutation: save a new order (top first). Shown at once (optimistic); the reply —
 * the server's queue — replaces it, and a failure puts the old order back.
 */
export function createQueueOrderMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookIds: number[]) =>
			send<QueueItem[]>('/api/queue/order', 'PUT', { bookIds }, 'Failed to save the order'),
		onMutate: async (bookIds: number[]) => {
			await queryClient.cancelQueries({ queryKey: ['queue'] });
			const previous = queryClient.getQueryData<QueueItem[]>(['queue']);
			if (previous) {
				const byId = new Map(previous.map((i) => [i.bookId, i]));
				queryClient.setQueryData<QueueItem[]>(
					['queue'],
					bookIds.flatMap((id) => byId.get(id) ?? [])
				);
			}
			return { previous };
		},
		onError: (_err, _ids, context) => {
			if (context?.previous) queryClient.setQueryData(['queue'], context.previous);
		},
		onSuccess: (items) => queryClient.setQueryData(['queue'], items)
	}));
}
