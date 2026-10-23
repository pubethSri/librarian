<script lang="ts">
	// "Reading now" on the Field Queue tab: every Reading book with one big Finished
	// button (finished today; a recorded start is kept) — the toast then offers to
	// queue the next owned volume. ↶ puts a book back: not really started, so the
	// start is undone and it returns to the top of the queue.
	import { BookOpen, CircleCheck, LoaderCircle, Undo2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { createLogReadMutation } from '$lib/queries/reading';
	import { createBackToQueueMutation, createQueueAddMutation } from '$lib/queries/queue';
	import { nextToQueue, offerLabel, seriesBar } from '$lib/queue';
	import SeriesBar from '$lib/components/queue/SeriesBar.svelte';
	import { currentlyReading, todayLocal } from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import type { BookListItem } from '$lib/types';

	let { books, onopen }: { books: readonly BookListItem[]; onopen: (seriesId: number) => void } =
		$props();

	const logMutation = createLogReadMutation({ patch: true });
	const queueAdd = createQueueAddMutation();
	const backToQueue = createBackToQueueMutation();
	let pendingId = $state<number | null>(null);

	const reading = $derived(currentlyReading(books));

	async function putBack(book: BookListItem) {
		if (pendingId !== null) return;
		const name = `${book.seriesShortName} ${volumeText(book)}`;
		pendingId = book.id;
		try {
			await backToQueue.mutateAsync(book.id);
			toast.success(`${name}: back in the queue · #1`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to put it back');
		} finally {
			pendingId = null;
		}
	}

	async function finished(book: BookListItem) {
		if (pendingId !== null) return;
		const name = `${book.seriesShortName} ${volumeText(book)}`;
		pendingId = book.id;
		const next = nextToQueue(books, book, { reread: book.timesRead > 0 });
		try {
			await logMutation.mutateAsync({ bookId: book.id, finishedOn: todayLocal() });
			toast.success(`${name}: read today`, {
				...(next && {
					action: {
						label: offerLabel(next),
						onClick: () =>
							queueAdd.mutate(next.id, {
								onSuccess: () => toast.success('Added to the queue'),
								onError: (err) => toast.error(err.message)
							})
					},
					duration: 8000
				})
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to log the read');
		} finally {
			pendingId = null;
		}
	}
</script>

{#if reading.length > 0}
	<section class="mb-5">
		<p
			class="flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			<BookOpen class="h-3.5 w-3.5" /> Reading now
		</p>
		<ul class="space-y-2">
			{#each reading as book (book.id)}
				<li class="flex items-center gap-2 rounded-xl bg-primary p-2 pl-0 text-primary-foreground">
					<button
						type="button"
						onclick={() => onopen(book.seriesId)}
						class="flex min-h-12 min-w-0 flex-1 items-center rounded-lg px-4 text-left active:bg-white/10"
					>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">{book.seriesShortName}</span>
							<span class="block text-xs opacity-80">{volumeText(book)}</span>
							<SeriesBar model={seriesBar(books, book)} tone="dark" class="mt-1.5" />
						</span>
					</button>
					<button
						type="button"
						onclick={() => putBack(book)}
						disabled={pendingId !== null}
						aria-label="Back to the queue — {book.seriesShortName} {volumeText(book)} not started"
						title="Back to the queue"
						class="flex min-h-12 w-11 shrink-0 items-center justify-center rounded-lg text-primary-foreground/80 active:bg-white/10 disabled:opacity-50"
					>
						<Undo2 class="h-5 w-5" />
					</button>
					<button
						type="button"
						onclick={() => finished(book)}
						disabled={pendingId !== null}
						aria-label="Finished {book.seriesShortName} {volumeText(book)} today"
						class="flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-primary-foreground px-4 text-sm font-semibold text-primary active:opacity-80 disabled:opacity-50"
					>
						{#if pendingId === book.id}
							<LoaderCircle class="h-5 w-5 animate-spin" />
						{:else}
							<CircleCheck class="h-5 w-5" />
						{/if}
						Finished
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
