<script lang="ts">
	// "Reading now" on the Field Queue tab: every Reading book with one big Finished
	// button (finished today; a recorded start is kept) — the toast then offers to
	// queue the next owned volume.
	import { BookOpen, CircleCheck, LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { createLogReadMutation } from '$lib/queries/reading';
	import { createQueueAddMutation } from '$lib/queries/queue';
	import { nextToQueue, offerLabel } from '$lib/queue';
	import { currentlyReading, todayLocal } from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import type { BookListItem } from '$lib/types';

	let { books, onopen }: { books: readonly BookListItem[]; onopen: (seriesId: number) => void } =
		$props();

	const logMutation = createLogReadMutation({ patch: true });
	const queueAdd = createQueueAddMutation();
	let pendingId = $state<number | null>(null);

	const reading = $derived(currentlyReading(books));

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
				<li class="flex items-stretch gap-2">
					<button
						type="button"
						onclick={() => onopen(book.seriesId)}
						class="flex min-h-14 min-w-0 flex-1 items-center rounded-xl border border-border px-4 text-left active:bg-accent"
					>
						<span class="min-w-0">
							<span class="block truncate text-sm font-medium text-foreground">
								{book.seriesShortName}
							</span>
							<span class="block text-xs text-muted-foreground">{volumeText(book)}</span>
						</span>
					</button>
					<button
						type="button"
						onclick={() => finished(book)}
						disabled={pendingId !== null}
						aria-label="Finished {book.seriesShortName} {volumeText(book)} today"
						class="flex min-h-14 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
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
