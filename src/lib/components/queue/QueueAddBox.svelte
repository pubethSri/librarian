<script lang="ts">
	import { Check, ListPlus, RotateCcw, Search, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { createQueueAddMutation } from '$lib/queries/queue';
	import { searchSeries } from '$lib/field/logic';
	import { buildPile, ownedSeries } from '$lib/queue';
	import { volumeLabel, volumeText } from '$lib/utils/volume';
	import type { BookListItem } from '$lib/types';

	// Desktop "Add a book to the queue": search a series (same matching as Field Mode's
	// Find), then pick a volume — the next unread one you own is preselected.

	let { books }: { books: BookListItem[] } = $props();

	const addMutation = createQueueAddMutation();

	let query = $state('');
	let seriesId = $state<number | null>(null);
	let picked = $state<number | null>(null);

	const owned = $derived(ownedSeries(books));

	const matches = $derived(seriesId === null ? searchSeries(owned, query, 6) : []);
	const chosen = $derived(owned.find((s) => s.id === seriesId) ?? null);

	/** The series' volumes you could queue (not the one being read), in order */
	const options = $derived(
		books
			.filter((b) => b.seriesId === seriesId && b.readingStatus !== 'reading')
			.sort((a, b) => Number(a.volumeNumber) - Number(b.volumeNumber))
	);

	/** Preselect: the next unread past what you've read, else the first unread, else the first */
	function suggestion(): number | null {
		const seriesBooks = books.filter((b) => b.seriesId === seriesId);
		const pile = buildPile(seriesBooks);
		const free = options.filter((b) => !b.queued);
		const next =
			pile.continue.find((b) => !b.queued) ??
			free.find((b) => b.readingStatus === 'unread') ??
			free[0];
		return next?.id ?? null;
	}

	function choose(id: number) {
		seriesId = id;
		query = '';
		picked = suggestion();
	}

	function reset() {
		seriesId = null;
		picked = null;
		query = '';
	}

	const pickedBook = $derived(options.find((b) => b.id === picked) ?? null);

	async function add() {
		if (!pickedBook || !chosen) return;
		try {
			await addMutation.mutateAsync(pickedBook.id);
			toast.success(`${chosen.shortName} ${volumeText(pickedBook)}: added to the queue`);
			reset();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add to the queue');
		}
	}
</script>

<div class="rounded-lg border border-border p-4">
	{#if chosen === null}
		<div class="relative">
			<Search
				class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				bind:value={query}
				placeholder="Add a book to the queue — type a series (name, initials, Thai…)"
				class="pl-8"
				aria-label="Search a series to queue from"
				onkeydown={(e) => {
					if (e.key === 'Enter' && matches[0]) choose(matches[0].id);
				}}
			/>
		</div>
		{#if query.trim() && matches.length === 0}
			<p class="mt-2 text-sm text-muted-foreground">No owned series matches “{query}”.</p>
		{:else if matches.length > 0}
			<ul class="mt-2 divide-y divide-border rounded-md border border-border">
				{#each matches as s (s.id)}
					<li>
						<button
							class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
							onclick={() => choose(s.id)}
						>
							<span class="font-medium">{s.shortName}</span>
							<span class="text-xs text-muted-foreground">{s.bookCount} owned</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<div class="flex items-center justify-between gap-2">
			<p class="text-sm font-medium">{chosen.shortName}</p>
			<Button variant="ghost" size="sm" onclick={reset} class="gap-1">
				<X class="h-3.5 w-3.5" />
				Other series
			</Button>
		</div>
		{#if options.length === 0}
			<p class="mt-2 text-sm text-muted-foreground">Every volume of it is being read right now.</p>
		{:else}
			<div class="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Volume">
				{#each options as b (b.id)}
					<button
						role="radio"
						aria-checked={picked === b.id}
						disabled={b.queued}
						onclick={() => (picked = b.id)}
						title={b.queued
							? 'Already in the queue'
							: b.readingStatus === 'read'
								? 'Read — queue it as a re-read'
								: volumeText(b)}
						class="inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-md border px-2 text-sm tabular-nums transition-colors disabled:opacity-50 {picked ===
						b.id
							? 'border-foreground bg-foreground text-background'
							: 'border-border hover:bg-accent'} {b.readingStatus === 'read' && picked !== b.id
							? 'text-muted-foreground'
							: ''}"
					>
						{volumeLabel(b)}
						{#if b.queued}
							<Check class="h-3 w-3" />
						{:else if b.readingStatus === 'read'}
							<RotateCcw class="h-3 w-3" />
						{/if}
					</button>
				{/each}
			</div>
			<div class="mt-3 flex items-center gap-3">
				<Button
					size="sm"
					disabled={!pickedBook || addMutation.isPending}
					onclick={add}
					class="gap-1.5"
				>
					<ListPlus class="h-3.5 w-3.5" />
					{pickedBook ? `Add ${volumeText(pickedBook)}` : 'Pick a volume'}
				</Button>
				<span class="text-xs text-muted-foreground">
					✓ already queued · ↻ read (queues a re-read)
				</span>
			</div>
		{/if}
	{/if}
</div>
