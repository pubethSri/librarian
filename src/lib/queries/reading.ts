import {
	createMutation,
	createQuery,
	useQueryClient,
	type QueryClient
} from '@tanstack/svelte-query';
import type {
	BookListItem,
	LogReadPayload,
	QueueItem,
	ReadingEntry,
	ReadingStatus,
	ReadingSummary,
	UpdateReadingPayload
} from '$lib/types';

/**
 * How a reading write refreshes the cache. Desktop refetches what it shows;
 * Field Mode (`patch`) costs one request per tap: the reply's summary is
 * patched into the cached books list and the rest is only marked stale.
 */
export type ReadingCacheMode = { patch?: boolean };

function afterReadingWrite(qc: QueryClient, summary: ReadingSummary, mode: ReadingCacheMode) {
	// Starting or finishing takes a book out of the reading queue ($lib/queue)
	if (!summary.queued) {
		qc.setQueryData<QueueItem[]>(['queue'], (list) =>
			list?.filter((item) => item.bookId !== summary.bookId)
		);
	}
	if (mode.patch) {
		qc.setQueryData<BookListItem[]>(['books'], (list) =>
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
		for (const queryKey of [['series'], ['insights'], ['reading', summary.bookId], ['queue']]) {
			qc.invalidateQueries({ queryKey, refetchType: 'none' });
		}
		return;
	}
	for (const queryKey of [
		['books'],
		['series'],
		['insights'],
		['reading', summary.bookId],
		['queue']
	]) {
		qc.invalidateQueries({ queryKey });
	}
}

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

/**
 * Mutation: set a book's current reading status (start, re-read start, drop,
 * correct). `on` = the calendar day to stamp — pass the device's today.
 */
export function createReadingStatusMutation(mode: ReadingCacheMode = {}) {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			bookId,
			status,
			on
		}: {
			bookId: number;
			status: ReadingStatus;
			on?: string | null;
		}) =>
			send<ReadingSummary & { changed: number }>(
				`/api/books/${bookId}/reading/status`,
				'PUT',
				{ status, on },
				'Failed to update reading status'
			),
		onSuccess: (summary) => afterReadingWrite(queryClient, summary, mode)
	}));
}

/** Mutation: "I read this" — a finished read-through (a re-read on a Read book) */
export function createLogReadMutation(mode: ReadingCacheMode = {}) {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ bookId, ...payload }: LogReadPayload & { bookId: number }) =>
			send<ReadingSummary>(
				`/api/books/${bookId}/reading/log`,
				'POST',
				payload,
				'Failed to log the read'
			),
		onSuccess: (summary) => afterReadingWrite(queryClient, summary, mode)
	}));
}

/** Query: a book's read-throughs, newest first; `bookId` null = disabled */
export function createReadingHistoryQuery(bookId: () => number | null) {
	return createQuery<ReadingEntry[]>(() => ({
		queryKey: ['reading', bookId()],
		queryFn: async () => {
			const res = await fetch(`/api/books/${bookId()}/reading`);
			if (!res.ok) throw new Error('Failed to load the reading history');
			return res.json();
		},
		enabled: bookId() !== null
	}));
}

/** Mutation: edit a read-through's start / finish days (history editor) */
export function createReadingDaysMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			bookId,
			readingId,
			...payload
		}: UpdateReadingPayload & { bookId: number; readingId: number }) =>
			send<ReadingSummary>(
				`/api/books/${bookId}/reading/${readingId}`,
				'PATCH',
				payload,
				'Failed to save the days'
			),
		onSuccess: (summary) => afterReadingWrite(queryClient, summary, {})
	}));
}

/** Mutation: delete a mistaken read-through (history editor) */
export function createReadingDeleteMutation() {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ bookId, readingId }: { bookId: number; readingId: number }) =>
			send<ReadingSummary>(
				`/api/books/${bookId}/reading/${readingId}`,
				'DELETE',
				undefined,
				'Failed to delete the read'
			),
		onSuccess: (summary) => afterReadingWrite(queryClient, summary, {})
	}));
}
