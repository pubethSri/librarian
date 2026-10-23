import {
	createMutation,
	createQuery,
	useQueryClient,
	type QueryClient
} from '@tanstack/svelte-query';
import type { BookListItem, QueueItem, ReadingSummary } from '$lib/types';
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

function markQueued(qc: QueryClient, bookIds: number | readonly number[], queued: boolean) {
	const ids = new Set(typeof bookIds === 'number' ? [bookIds] : bookIds);
	qc.setQueryData<BookListItem[]>(['books'], (list) =>
		list?.map((b) => (ids.has(b.id) ? { ...b, queued } : b))
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

/**
 * Mutation: queue several books at the end, in order (the options sheet: the rest
 * you own, Read from the start). Already queued ones are skipped.
 */
export function createQueueBatchAddMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookIds: number[]) =>
			send<{ items: QueueItem[]; skipped: number }>(
				'/api/queue/batch',
				'POST',
				{ bookIds },
				'Failed to add to the queue'
			),
		onSuccess: ({ items }) => {
			queryClient.setQueryData<QueueItem[]>(['queue'], (list) =>
				list ? [...list, ...items.filter((i) => !list.some((q) => q.bookId === i.bookId))] : list
			);
			markQueued(
				queryClient,
				items.map((i) => i.bookId),
				true
			);
		}
	}));
}

/** Mutation: take several books out of the queue (the Undo of a batch add) */
export function createQueueBatchRemoveMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookIds: number[]) =>
			send<{ bookIds: number[] }>(
				'/api/queue/batch',
				'DELETE',
				{ bookIds },
				'Failed to remove from the queue'
			),
		onSuccess: ({ bookIds }) => {
			const ids = new Set(bookIds);
			queryClient.setQueryData<QueueItem[]>(['queue'], (list) =>
				list?.filter((i) => !ids.has(i.bookId))
			);
			markQueued(queryClient, bookIds, false);
		}
	}));
}

/**
 * Mutation: Back to the queue — a book being read wasn't really started: its
 * read-through goes and it returns to the top of the queue (POST /api/queue/return).
 */
export function createBackToQueueMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (bookId: number) =>
			send<ReadingSummary>('/api/queue/return', 'POST', { bookId }, 'Failed to put it back'),
		onSuccess: (summary) => {
			queryClient.setQueryData<BookListItem[]>(['books'], (list) =>
				list?.map((b) =>
					b.id === summary.bookId
						? {
								...b,
								readingStatus: summary.readingStatus,
								timesRead: summary.timesRead,
								queued: summary.queued
							}
						: b
				)
			);
			queryClient.invalidateQueries({ queryKey: ['queue'] });
			queryClient.invalidateQueries({ queryKey: ['reading', summary.bookId] });
			for (const queryKey of [['series'], ['insights']]) {
				queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
			}
		}
	}));
}
