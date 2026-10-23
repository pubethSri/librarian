<script lang="ts">
	// Field Mode → Queue: Reading now (Finished), then Up next — the reading queue in
	// order. Tap a row for the reading sheet (Started today / Finished… take it out,
	// Move to top, Remove); ▲▼ reorder; swipe left removes. Books at the other place
	// than this phone's location are greyed ("can I grab it?"). Rules in $lib/queue.
	// At the end, the unread pile's height opens the pile stories.
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		ArrowDown,
		ArrowUp,
		ChevronDown,
		ChevronRight,
		ChevronUp,
		CircleCheck,
		ListMinus,
		ListPlus,
		LoaderCircle,
		RotateCcw
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import CurrentlyReading from '$lib/components/field/CurrentlyReading.svelte';
	import SwipeRow from '$lib/components/field/SwipeRow.svelte';
	import VolumeReadingSheet from '$lib/components/field/VolumeReadingSheet.svelte';
	import PileStories from '$lib/components/stories/PileStories.svelte';
	import { createBooksListQuery } from '$lib/queries/books';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { createSeriesListQuery } from '$lib/queries/series';
	import {
		createQueueOrderMutation,
		createQueueQuery,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		chipLabel,
		moveInQueue,
		moveRun,
		queueRuns,
		runChipLabel,
		seriesBar,
		type QueueMove
	} from '$lib/queue';
	import ExtraBadge from '$lib/components/ExtraBadge.svelte';
	import SeriesBar from '$lib/components/queue/SeriesBar.svelte';
	import type { VolumeSlot } from '$lib/field/logic';
	import { extraTitle, volumeText } from '$lib/utils/volume';
	import { formatHeight, pileOf, storyFair } from '$lib/stories/pile';
	import { BOOK_LOCATION_LABELS, type QueueItem, type SeriesType } from '$lib/types';

	const settings = getFieldSettings();
	const booksQuery = createBooksListQuery({ fresh: true });
	const queueQuery = createQueueQuery({ fresh: true });
	const orderMutation = createQueueOrderMutation();
	const removeMutation = createQueueRemoveMutation();

	const seriesQuery = createSeriesListQuery();
	const fairsQuery = createBookfairsListQuery();

	const queue = $derived(queueQuery.data ?? []);
	const books = $derived(booksQuery.data ?? []);
	/** Consecutive books of one series = a run, moved as one (`queueRuns`) */
	const runs = $derived(queueRuns(queue, books));
	/** Runs opened to reorder inside, by their first book */
	let openRuns = $state<number[]>([]);

	function toggleRun(firstId: number) {
		openRuns = openRuns.includes(firstId)
			? openRuns.filter((id) => id !== firstId)
			: [...openRuns, firstId];
	}

	/** A book's place in the whole queue (1 = top) */
	function positionOf(bookId: number): number {
		return queue.findIndex((i) => i.bookId === bookId) + 1;
	}

	function shiftRun(index: number, to: 'up' | 'down') {
		orderMutation.mutate(moveRun(runs, index, to), {
			onError: (err) => toast.error(err.message)
		});
	}

	// The unread pile card → the pile stories (② is about the chip's fair, else the latest)
	let storiesOpen = $state(false);
	const pile = $derived(
		booksQuery.data && seriesQuery.data
			? pileOf(books, new Map<number, SeriesType>(seriesQuery.data.map((s) => [s.id, s.type])))
			: null
	);
	const fair = $derived(storyFair(fairsQuery.data ?? [], settings.fairId));

	/** The Up next row whose sheet is open */
	let openItem = $state<{ item: QueueItem; position: number } | null>(null);
	let sheetSlot = $state<VolumeSlot | null>(null);

	/** The sheet's first step: the actions (tap) or "When did you finish?" (swipe right) */
	let sheetStep = $state<'actions' | 'finish'>('actions');

	function open(item: QueueItem, position: number, step: 'actions' | 'finish' = 'actions') {
		sheetStep = step;
		openItem = { item, position };
		sheetSlot = {
			volume: Number(item.volumeNumber),
			isExtra: item.isExtra,
			title: item.title,
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
				{#each runs as run, r (run.items[0].bookId)}
					{@const first = run.items[0]}
					{@const at = positionOf(first.bookId)}
					{@const isRun = run.items.length > 1}
					{@const opened = isRun && openRuns.includes(first.bookId)}
					<li>
						<SwipeRow
							label="Remove"
							icon={ListMinus}
							tone="remove"
							disabled={opened}
							onswipe={() => remove(first)}
							rightLabel={first.readingStatus === 'read' ? 'Re-read' : 'Finished'}
							rightIcon={CircleCheck}
							onswiperight={() => open(first, at, 'finish')}
						>
							<div
								class="flex min-h-14 items-center gap-0.5 pr-1 {opened
									? 'bg-highlight-soft/40'
									: ''}"
							>
								<button
									type="button"
									onclick={() => (opened ? toggleRun(first.bookId) : open(first, at))}
									aria-label="{opened
										? 'Close'
										: 'Reading actions —'} {first.seriesShortName} {isRun
										? runChipLabel(run.items)
										: volumeText(first)}"
									class="flex min-h-14 min-w-0 flex-1 items-center gap-3 pl-3 text-left active:bg-accent {first.location !==
									settings.location
										? 'opacity-50'
										: ''}"
								>
									<span class="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
										{r + 1}
									</span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium text-foreground">
											{first.seriesShortName}{#if !isRun && extraTitle(first)}
												· {extraTitle(first)}{/if}
										</span>
										<span class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
											<span
												class="flex shrink-0 items-center gap-1 rounded-md bg-highlight-soft px-1.5 text-xs leading-5 font-semibold text-highlight-ink tabular-nums"
											>
												{#if run.fromStart}
													<RotateCcw class="h-3 w-3" aria-label="Read from the start" />
												{/if}
												{isRun ? runChipLabel(run.items) : chipLabel(first)}
											</span>
											<SeriesBar model={seriesBar(books, run.items)} />
											{#if !isRun && first.readingStatus === 'read'}
												<span class="shrink-0">re-read</span>
											{:else if !isRun && first.readingStatus === 'dropped'}
												<span class="shrink-0">dropped</span>
											{/if}
										</span>
									</span>
									<span
										class="shrink-0 rounded border border-info/45 px-1.5 text-[11px] font-semibold text-info-ink"
										title={BOOK_LOCATION_LABELS[first.location]}
									>
										{letter(first.location)}
									</span>
								</button>
								{#if isRun}
									<button
										type="button"
										onclick={() => toggleRun(first.bookId)}
										aria-expanded={opened}
										aria-label="{opened ? 'Close' : 'Open'} the run ({run.items.length} books)"
										class="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-accent"
									>
										{#if opened}<ChevronUp class="h-5 w-5" />{:else}<ChevronDown
												class="h-5 w-5"
											/>{/if}
									</button>
								{/if}
								<button
									type="button"
									aria-label={isRun ? 'Move the run up' : 'Move up'}
									disabled={r === 0 || orderMutation.isPending}
									onclick={() => shiftRun(r, 'up')}
									class="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
								>
									<ArrowUp class="h-5 w-5" />
								</button>
								<button
									type="button"
									aria-label={isRun ? 'Move the run down' : 'Move down'}
									disabled={r === runs.length - 1 || orderMutation.isPending}
									onclick={() => shiftRun(r, 'down')}
									class="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
								>
									<ArrowDown class="h-5 w-5" />
								</button>
							</div>
						</SwipeRow>
						{#if opened}
							<ol class="divide-y divide-border border-t border-border bg-highlight-soft/20">
								{#each run.items as item, k (item.bookId)}
									<li>
										<SwipeRow
											label="Remove"
											icon={ListMinus}
											tone="remove"
											onswipe={() => remove(item)}
											rightLabel={item.readingStatus === 'read' ? 'Re-read' : 'Finished'}
											rightIcon={CircleCheck}
											onswiperight={() => open(item, positionOf(item.bookId), 'finish')}
										>
											<div class="flex min-h-12 items-center gap-0.5 pr-1">
												<button
													type="button"
													onclick={() => open(item, positionOf(item.bookId))}
													aria-label="Reading actions — {item.seriesShortName} {volumeText(item)}"
													class="flex min-h-12 min-w-0 flex-1 items-center pl-11 text-left text-sm text-foreground active:bg-accent"
												>
													{#if item.isExtra}
														<ExtraBadge book={item} />
													{:else}
														{chipLabel(item)}
													{/if}
												</button>
												<button
													type="button"
													aria-label="Earlier in the run"
													disabled={k === 0 || orderMutation.isPending}
													onclick={() => move(item.bookId, 'up')}
													class="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
												>
													<ArrowUp class="h-4 w-4" />
												</button>
												<button
													type="button"
													aria-label="Later in the run"
													disabled={k === run.items.length - 1 || orderMutation.isPending}
													onclick={() => move(item.bookId, 'down')}
													class="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-accent disabled:opacity-25"
												>
													<ArrowDown class="h-4 w-4" />
												</button>
											</div>
										</SwipeRow>
									</li>
								{/each}
							</ol>
						{/if}
					</li>
				{/each}
			</ol>
			<p class="mt-2 px-1 text-xs text-muted-foreground">
				Swipe right when you've finished one, left to remove it; tap for more. On a closed run, both
				act on its first volume.
			</p>
		{/if}

		<a
			href={resolve('/field/queue/add')}
			class="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-xl border border-border text-base font-medium text-foreground active:bg-accent"
		>
			<ListPlus class="h-5 w-5" /> Add a book to the queue
		</a>
	</section>

	{#if pile}
		<button
			type="button"
			onclick={() => (storiesOpen = true)}
			class="mt-4 flex min-h-16 w-full items-center gap-3 rounded-xl border border-highlight px-4 py-3 text-left active:bg-accent"
		>
			<span class="flex w-4 shrink-0 flex-col gap-px" aria-hidden="true">
				<span class="h-1 bg-highlight"></span>
				<span class="h-1 bg-zinc-700"></span>
				<span class="h-1 bg-zinc-400"></span>
				<span class="h-1 bg-zinc-800"></span>
				<span class="h-1 bg-zinc-500"></span>
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-base font-semibold text-foreground tabular-nums">
					Your pile · {formatHeight(pile.cm)}
				</span>
				<span class="block text-xs text-muted-foreground tabular-nums">
					{pile.books} unread · Pile story
				</span>
			</span>
			<ChevronRight class="h-5 w-5 shrink-0 text-muted-foreground" />
		</button>
	{/if}

	<PileStories
		bind:open={storiesOpen}
		{books}
		series={seriesQuery.data ?? []}
		fair={fair ? { id: fair.id, name: fair.name } : null}
		today={settings.today}
	/>

	<VolumeReadingSheet
		bind:slot={sheetSlot}
		seriesName={openItem?.item.seriesShortName ?? ''}
		{books}
		position={openItem?.position ?? null}
		step={sheetStep}
		onmovetop={() => openItem && move(openItem.item.bookId, 'top')}
	/>
</div>
