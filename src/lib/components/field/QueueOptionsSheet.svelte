<script lang="ts">
	// Add to queue → tap a volume: ways to queue it (`queueChoices` in $lib/queue).
	// Queue just this one (or take it out), the rest of the series you own after it,
	// or Read from the start (every volume, read or not — a re-read so the story is
	// fresh). Several books go in one request at the end of the queue, one Undo.
	import * as Sheet from '$lib/components/ui/sheet';
	import { Layers, ListMinus, ListPlus, LoaderCircle, RotateCcw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import SeriesBar from '$lib/components/queue/SeriesBar.svelte';
	import {
		createQueueAddMutation,
		createQueueBatchAddMutation,
		createQueueBatchRemoveMutation,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { queueChoices, seriesBar, spanLabel } from '$lib/queue';
	import { volumeRanges } from '$lib/field/logic';
	import { latestVolume, volumeText } from '$lib/utils/volume';
	import { BOOK_LOCATION_LABELS, type BookListItem } from '$lib/types';

	let {
		book = $bindable(),
		books,
		queueLength
	}: {
		/** The volume tapped; null = closed */
		book: BookListItem | null;
		books: readonly BookListItem[];
		/** Books in the queue now — new ones go after them */
		queueLength: number;
	} = $props();

	const addOne = createQueueAddMutation();
	const removeOne = createQueueRemoveMutation();
	const addMany = createQueueBatchAddMutation();
	const removeMany = createQueueBatchRemoveMutation();

	const busy = $derived(
		addOne.isPending || removeOne.isPending || addMany.isPending || removeMany.isPending
	);
	const choices = $derived(book ? queueChoices(books, book) : null);
	const restNew = $derived(choices ? choices.rest.filter((b) => !b.queued) : []);
	const startNew = $derived(choices ? choices.fromStart.filter((b) => !b.queued) : []);
	const seriesBooks = $derived(book ? books.filter((b) => b.seriesId === book?.seriesId) : []);
	const readSoFar = $derived(
		seriesBooks.filter((b) => !b.isExtra && b.timesRead > 0).map((b) => Number(b.volumeNumber))
	);
	const name = $derived(book ? `${book.seriesShortName} ${volumeText(book)}` : '');

	function close() {
		book = null;
	}

	async function toggleOne() {
		if (!book) return;
		const target = book;
		const label = `${target.seriesShortName} ${volumeText(target)}`;
		// Where it lands: after the books queued before this tap
		const before = queueLength;
		try {
			if (target.queued) {
				await removeOne.mutateAsync(target.id);
				toast.success(`${label}: removed from the queue`);
			} else {
				await addOne.mutateAsync(target.id);
				toast.success(`Queued ${label} · #${before + 1}`, {
					action: { label: 'Undo', onClick: () => removeOne.mutate(target.id) }
				});
			}
			close();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update the queue');
		}
	}

	async function addSeveral(list: BookListItem[], what: string) {
		if (list.length === 0 || !book) return;
		const series = book.seriesShortName;
		const before = queueLength;
		try {
			const { items } = await addMany.mutateAsync(list.map((b) => b.id));
			const ids = items.map((i) => i.bookId);
			close();
			toast.success(`Queued ${series} ${what}`, {
				description: `${items.length} books · #${before + 1}–${before + items.length}`,
				duration: 6000,
				action: {
					label: 'Undo',
					onClick: () =>
						removeMany.mutate(ids, {
							onSuccess: () => toast(`Removed ${series} ${what} from the queue`),
							onError: (err) => toast.error(err.message)
						})
				}
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add to the queue');
		}
	}

	const option =
		'flex min-h-17 w-full items-center gap-3.5 rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors active:bg-accent disabled:opacity-50';
	const icon = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg';
</script>

<Sheet.Root bind:open={() => book !== null, (v) => !v && close()}>
	<Sheet.Content side="bottom" class="max-h-[88dvh] gap-0 rounded-t-2xl p-0">
		{#if book && choices}
			<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
				<Sheet.Title class="text-base">{name}</Sheet.Title>
				<Sheet.Description class="text-xs">
					{readSoFar.length > 0 ? `Read ${volumeRanges(readSoFar)} · ` : ''}you own up to vol. {latestVolume(
						seriesBooks
					)} · {BOOK_LOCATION_LABELS[book.location]}
				</Sheet.Description>
				<SeriesBar model={seriesBar(books, book)} class="mt-2 max-w-none" />
			</Sheet.Header>
			<div
				class="space-y-2.5 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
			>
				<button type="button" class={option} disabled={busy} onclick={toggleOne}>
					<span class="{icon} bg-muted">
						{#if book.queued}<ListMinus class="h-4.5 w-4.5" />{:else}<ListPlus
								class="h-4.5 w-4.5"
							/>{/if}
					</span>
					<span>
						<span class="block text-[15px] font-semibold text-foreground">
							{book.queued ? 'Remove from the queue' : `Queue ${volumeText(book)}`}
						</span>
						<span class="block text-xs text-muted-foreground">
							{book.queued ? 'It is queued already' : 'Just this one'}
						</span>
					</span>
				</button>

				{#if choices.rest.length > 1 && restNew.length > 0}
					<button
						type="button"
						class={option}
						disabled={busy}
						onclick={() => addSeveral(restNew, spanLabel(choices.rest))}
					>
						<span class="{icon} bg-muted"><Layers class="h-4.5 w-4.5" /></span>
						<span>
							<span class="block text-[15px] font-semibold text-foreground">
								Queue {spanLabel(choices.rest)}
							</span>
							<span class="block text-xs text-muted-foreground">
								The rest you own, in order · {restNew.length} books
							</span>
						</span>
					</button>
				{/if}

				{#if choices.fromStart.length > 1 && startNew.length > 0}
					<button
						type="button"
						class={option}
						disabled={busy}
						onclick={() => addSeveral(startNew, `from the start`)}
					>
						<span class="{icon} bg-highlight-soft text-highlight-ink">
							<RotateCcw class="h-4.5 w-4.5" />
						</span>
						<span>
							<span class="block text-[15px] font-semibold text-foreground">
								Read from the start
							</span>
							<span class="block text-xs text-muted-foreground">
								{spanLabel(choices.fromStart).replace(/^./, (c) => c.toUpperCase())} · {startNew.length}
								books{choices.rereads > 0 ? ` · ${choices.rereads} as re-reads` : ''}
							</span>
						</span>
					</button>
				{/if}

				<p class="pt-1 text-center text-xs text-muted-foreground">
					{#if busy}<LoaderCircle class="mr-1 inline h-3 w-3 animate-spin" />{/if}
					Added at the end of the queue{queueLength > 0 ? ` (after #${queueLength})` : ''} · one Undo
				</p>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
