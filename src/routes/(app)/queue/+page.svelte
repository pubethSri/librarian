<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowDown, ArrowUp, BookOpen, ListOrdered, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ReadingStatusControl from '$lib/components/ReadingStatusControl.svelte';
	import QueueAddBox from '$lib/components/queue/QueueAddBox.svelte';
	import { createBooksListQuery } from '$lib/queries/books';
	import {
		createQueueOrderMutation,
		createQueueQuery,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { currentlyReading } from '$lib/field/logic';
	import { moveInQueue, nextToQueue, offerLabel, seriesBar, type QueueMove } from '$lib/queue';
	import SeriesBar from '$lib/components/queue/SeriesBar.svelte';
	import { volumeText } from '$lib/utils/volume';
	import { BOOK_LOCATION_LABELS, type BookListItem, type BookLocation } from '$lib/types';

	// The reading queue: what to read next. A pool — the order is a preference;
	// starting or finishing a book takes it out (rules in $lib/queue).

	const queueQuery = createQueueQuery();
	const booksQuery = createBooksListQuery();
	const orderMutation = createQueueOrderMutation();
	const removeMutation = createQueueRemoveMutation();

	const queue = $derived(queueQuery.data ?? []);
	const books = $derived(booksQuery.data ?? []);
	const readingNow = $derived(currentlyReading(books));

	const locationClass: Record<BookLocation, string> = {
		apartment: 'border-info/45 text-info-ink',
		home: 'border-info/45 text-info-ink'
	};

	function move(bookId: number, to: QueueMove) {
		const order = moveInQueue(
			queue.map((i) => i.bookId),
			bookId,
			to
		);
		orderMutation.mutate(order, { onError: (err) => toast.error(err.message) });
	}

	async function remove(bookId: number, label: string) {
		try {
			await removeMutation.mutateAsync(bookId);
			toast.success(`${label}: removed from the queue`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove from the queue');
		}
	}

	function offerFor(book: Pick<BookListItem, 'id' | 'seriesId' | 'volumeNumber'>) {
		return (reread: boolean) => {
			const next = nextToQueue(books, book, { reread });
			return next && { bookId: next.id, action: offerLabel(next) };
		};
	}
</script>

<svelte:head>
	<title>Reading queue · Librarian</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold text-foreground">
			<ListOrdered class="h-5 w-5" />
			Reading queue
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			What to read next. The order is a preference — starting or finishing a book takes it out of
			the queue, whichever one it is. A read book here is a planned re-read.
		</p>
	</div>

	{#if readingNow.length > 0}
		<section class="space-y-2">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
				<BookOpen class="h-4 w-4" />
				Reading now
			</h2>
			<ul class="divide-y divide-border rounded-md border border-border">
				{#each readingNow as b (b.id)}
					{@const label = `${b.seriesShortName} ${volumeText(b)}`}
					<li class="flex items-center gap-3 px-3 py-2">
						<a
							href={resolve(`/series/${b.seriesId}`)}
							class="flex-1 text-sm font-medium hover:underline">{label}</a
						>
						<Badge variant="outline" class="text-xs {locationClass[b.location]}">
							{BOOK_LOCATION_LABELS[b.location]}
						</Badge>
						<ReadingStatusControl
							bookId={b.id}
							status={b.readingStatus}
							timesRead={b.timesRead}
							{label}
							nextOffer={offerFor(b)}
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-foreground">
			Up next{queue.length > 0 ? ` (${queue.length})` : ''}
		</h2>

		{#if booksQuery.data}
			<QueueAddBox {books} />
		{/if}

		{#if queueQuery.isPending}
			<Skeleton class="h-40 w-full" />
		{:else if queueQuery.isError}
			<p class="text-sm text-destructive">{queueQuery.error.message}</p>
		{:else if queue.length === 0}
			<EmptyState
				title="Your queue is empty"
				description="Add books below, or with Add to queue in a book's reading-status menu."
			/>
		{:else}
			<div class="rounded-md border border-border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-10">#</Table.Head>
							<Table.Head>Book</Table.Head>
							<Table.Head>Location</Table.Head>
							<Table.Head>Reading</Table.Head>
							<Table.Head class="w-[120px] text-right">Order</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each queue as item, i (item.bookId)}
							{@const label = `${item.seriesShortName} ${volumeText(item)}`}
							<Table.Row>
								<Table.Cell class="font-mono text-muted-foreground tabular-nums">{i + 1}</Table.Cell
								>
								<Table.Cell>
									<a href={resolve(`/series/${item.seriesId}`)} class="font-medium hover:underline"
										>{item.seriesShortName}</a
									>
									<span class="text-muted-foreground">{volumeText(item)}</span>
									{#if item.readingStatus === 'read'}
										<Badge variant="outline" class="ml-2 text-xs">re-read</Badge>
									{/if}
									{#if item.isDraft}
										<Badge variant="outline" class="ml-2 border-amber-300 text-xs text-amber-600">
											Draft
										</Badge>
									{/if}
									<SeriesBar model={seriesBar(books, item)} class="mt-1.5" />
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="text-xs {locationClass[item.location]}">
										{BOOK_LOCATION_LABELS[item.location]}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<ReadingStatusControl
										bookId={item.bookId}
										status={item.readingStatus}
										timesRead={item.timesRead}
										{label}
										queued={true}
										queueMark={false}
										nextOffer={offerFor({ ...item, id: item.bookId })}
									/>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center justify-end gap-0.5">
										<button
											class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
											aria-label="Move {label} up"
											title="Move up"
											disabled={i === 0 || orderMutation.isPending}
											onclick={() => move(item.bookId, 'up')}
										>
											<ArrowUp class="h-4 w-4" />
										</button>
										<button
											class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
											aria-label="Move {label} down"
											title="Move down"
											disabled={i === queue.length - 1 || orderMutation.isPending}
											onclick={() => move(item.bookId, 'down')}
										>
											<ArrowDown class="h-4 w-4" />
										</button>
										<button
											class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-30"
											aria-label="Remove {label} from the queue"
											title="Remove from the queue"
											disabled={removeMutation.isPending}
											onclick={() => remove(item.bookId, label)}
										>
											<X class="h-4 w-4" />
										</button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}
	</section>
</div>
