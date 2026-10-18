<script lang="ts">
	// Field Mode → Queue: Reading now (Finished), then Up next — the reading queue in
	// order. Tap a row for the reading sheet (Started today / Finished… take it out,
	// Move to top, Remove); ▲▼ reorder; swipe left removes. Books at the other place
	// than this phone's location are greyed ("can I grab it?"). Rules in $lib/queue.
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { ArrowDown, ArrowUp, ListMinus, ListPlus, LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import CurrentlyReading from '$lib/components/field/CurrentlyReading.svelte';
	import SwipeRow from '$lib/components/field/SwipeRow.svelte';
	import VolumeReadingSheet from '$lib/components/field/VolumeReadingSheet.svelte';
	import { createBooksListQuery } from '$lib/queries/books';
	import {
		createQueueOrderMutation,
		createQueueQuery,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import { moveInQueue, type QueueMove } from '$lib/queue';
	import type { VolumeSlot } from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import { BOOK_LOCATION_LABELS, type QueueItem } from '$lib/types';

	const settings = getFieldSettings();
	const booksQuery = createBooksListQuery({ fresh: true });
	const queueQuery = createQueueQuery({ fresh: true });
	const orderMutation = createQueueOrderMutation();
	const removeMutation = createQueueRemoveMutation();

	const queue = $derived(queueQuery.data ?? []);
	const books = $derived(booksQuery.data ?? []);

	/** The Up next row whose sheet is open */
	let openItem = $state<{ item: QueueItem; position: number } | null>(null);
	let sheetSlot = $state<VolumeSlot | null>(null);

	function open(item: QueueItem, position: number) {
		openItem = { item, position };
		sheetSlot = {
			volume: Number(item.volumeNumber),
			isExtra: item.isExtra,
			copies: 1,
			locations: [item.location],
			read: item.timesRead > 0,
			bookId: item.bookId,
			status: item.readingStatus,
			queuedId: item.bookId
		};
	}

	function move(bookId: number, to: QueueMove) {
		orderMutation.mutate(
			moveInQueue(
				queue.map((i) => i.bookId),
				bookId,
				to
			),
			{ onError: (err) => toast.error(err.message) }
		);
	}

	function remove(item: QueueItem) {
		const name = `${item.seriesShortName} ${volumeText(item)}`;
		removeMutation.mutate(item.bookId, {
			onSuccess: () => toast.success(`${name}: removed from the queue`),
			onError: (err) => toast.error(err.message)
		});
	}

	const letter = (l: QueueItem['location']) => (l === 'apartment' ? 'A' : 'H');
</script>

<svelte:head>
	<title>Queue — Field Mode</title>
</svelte:head>

<div class="mx-auto max-w-md">
	<h1 class="sr-only">Reading queue</h1>

	<CurrentlyReading {books} onopen={(id) => goto(resolve(`/field?series=${id}`))} />

	<section>
		<div class="flex items-baseline justify-between px-1 pb-2">
			<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Up next{queue.length > 0 ? ` · ${queue.length}` : ''}
			</p>
			<p class="text-xs text-muted-foreground">
				here: {BOOK_LOCATION_LABELS[settings.location]}
			</p>
		</div>

		{#if queueQuery.isPending}
			<div class="flex justify-center py-10 text-muted-foreground">
				<LoaderCircle class="h-6 w-6 animate-spin" />
			</div>
		{:else if queueQuery.isError}
			<p class="px-1 text-sm text-destructive">{queueQuery.error.message}</p>
		{:else if queue.length === 0}
			<div class="rounded-xl border border-dashed border-border px-4 py-8 text-center">
				<p class="text-base font-medium text-foreground">Nothing queued yet</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Pick what to read next from your unread pile.
				</p>
			</div>
		{:else}
			<ol class="divide-y divide-border overflow-hidden rounded-xl border border-border">
				{#each queue as item, i (item.bookId)}
					{@const away = item.location !== settings.location}
					<li>
						<SwipeRow label="Remove" icon={ListMinus} tone="remove" onswipe={() => remove(item)}>
							<div class="flex min-h-14 items-center gap-1 pr-1">
								<button
									type="button"
									onclick={() => open(item, i + 1)}
									aria-label="Reading actions — {item.seriesShortName} {volumeText(item)}"
									class="flex min-h-14 min-w-0 flex-1 items-center gap-3 pl-3 text-left active:bg-accent {away
										? 'opacity-50'
										: ''}"
								>
									<span class="w-5 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
										{i + 1}
									</span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium text-foreground">
											{item.seriesShortName}
										</span>
										<span class="block text-xs text-muted-foreground">
											{volumeText(item)}{item.readingStatus === 'read'
												? ' · re-read'
												: item.readingStatus === 'dropped'
													? ' · dropped'
													: ''}
										</span>
									</span>
									<span
										class="shrink-0 rounded border border-border px-1.5 text-[11px] font-semibold text-muted-foreground"
										title={BOOK_LOCATION_LABELS[item.location]}
									>
										{letter(item.location)}
									</span>
								</button>
								<button
									type="button"
									aria-label="Move up"
									disabled={i === 0 || orderMutation.isPending}
									onclick={() => move(item.bookId, 'up')}
									class="flex h-11 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
								>
									<ArrowUp class="h-5 w-5" />
								</button>
								<button
									type="button"
									aria-label="Move down"
									disabled={i === queue.length - 1 || orderMutation.isPending}
									onclick={() => move(item.bookId, 'down')}
									class="flex h-11 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
								>
									<ArrowDown class="h-5 w-5" />
								</button>
							</div>
						</SwipeRow>
					</li>
				{/each}
			</ol>
			<p class="mt-2 px-1 text-xs text-muted-foreground">
				Tap a book to start or finish it — it then leaves the queue. Swipe left to remove.
			</p>
		{/if}

		<a
			href={resolve('/field/queue/add')}
			class="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-xl border border-border text-base font-medium text-foreground active:bg-accent"
		>
			<ListPlus class="h-5 w-5" /> Add a book to the queue
		</a>
	</section>

	<VolumeReadingSheet
		bind:slot={sheetSlot}
		seriesName={openItem?.item.seriesShortName ?? ''}
		{books}
		position={openItem?.position ?? null}
		onmovetop={() => openItem && move(openItem.item.bookId, 'top')}
	/>
</div>
