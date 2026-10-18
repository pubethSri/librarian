<script lang="ts">
	// Field Mode → Queue → Add: the unread pile grouped by series, Spotify-style.
	// Filter like Find; "Include read" adds read / dropped books (re-reads). Swipe a
	// volume left — or tap its button — to queue it; again to take it out.
	// "Continue your series" lists the next unread volume of each series you're in.
	import { resolve } from '$app/paths';
	import { ArrowLeft, ListOrdered, ListPlus, LoaderCircle, RotateCcw, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import SwipeRow from '$lib/components/field/SwipeRow.svelte';
	import { createBooksListQuery } from '$lib/queries/books';
	import {
		createQueueAddMutation,
		createQueueQuery,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { buildPile } from '$lib/queue';
	import { volumeText } from '$lib/utils/volume';
	import { BOOK_LOCATION_LABELS, type BookListItem } from '$lib/types';

	const booksQuery = createBooksListQuery({ fresh: true });
	const queueQuery = createQueueQuery({ fresh: true });
	const addMutation = createQueueAddMutation();
	const removeMutation = createQueueRemoveMutation();

	let query = $state('');
	let includeRead = $state(false);
	/** Series opened past their first few volumes */
	let expanded = $state<number[]>([]);
	let pendingId = $state<number | null>(null);
	let continueAll = $state(false);

	const FIRST = 3;
	const books = $derived(booksQuery.data ?? []);
	const pile = $derived(buildPile(books, { includeRead, query }));
	const seriesCount = $derived(pile.groups.length);

	function name(book: BookListItem) {
		return `${book.seriesShortName} ${volumeText(book)}`;
	}

	async function toggle(book: BookListItem) {
		if (pendingId !== null) return;
		pendingId = book.id;
		try {
			if (book.queued) {
				await removeMutation.mutateAsync(book.id);
				toast.success(`${name(book)}: removed from the queue`);
			} else {
				await addMutation.mutateAsync(book.id);
				const position = (queueQuery.data ?? []).findIndex((i) => i.bookId === book.id) + 1;
				toast.success(`Queued ${name(book)}${position > 0 ? ` · #${position}` : ''}`, {
					action: { label: 'Undo', onClick: () => removeMutation.mutate(book.id) }
				});
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update the queue');
		} finally {
			pendingId = null;
		}
	}

	function hint(book: BookListItem): string {
		if (book.readingStatus === 'read')
			return book.timesRead > 1 ? `read ×${book.timesRead}` : 'read';
		if (book.readingStatus === 'dropped') return 'dropped';
		return '';
	}
</script>

<svelte:head>
	<title>Add to queue — Field Mode</title>
</svelte:head>

{#snippet volumeRow(book: BookListItem, withSeries: boolean)}
	<SwipeRow
		label={book.queued ? 'Remove' : 'Queue'}
		icon={book.queued ? X : ListPlus}
		tone={book.queued ? 'remove' : 'add'}
		disabled={pendingId !== null}
		onswipe={() => toggle(book)}
	>
		<div class="flex min-h-14 items-center gap-3 pr-1 pl-4">
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-foreground">
					{withSeries ? name(book) : volumeText(book).replace(/^./, (c) => c.toUpperCase())}
				</span>
				{#if hint(book)}
					<span class="flex items-center gap-1 text-xs text-muted-foreground">
						<RotateCcw class="h-3 w-3" />
						{hint(book)} — queue as a re-read
					</span>
				{/if}
			</span>
			<span
				class="shrink-0 rounded border border-border px-1.5 text-[11px] font-semibold text-muted-foreground"
				title={BOOK_LOCATION_LABELS[book.location]}
			>
				{book.location === 'apartment' ? 'A' : 'H'}
			</span>
			<button
				type="button"
				onclick={() => toggle(book)}
				disabled={pendingId !== null}
				aria-pressed={book.queued}
				aria-label={book.queued
					? `${name(book)} is queued — remove it`
					: `Add ${name(book)} to the queue`}
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg active:bg-accent disabled:opacity-50 {book.queued
					? 'text-sky-600 dark:text-sky-400'
					: 'text-muted-foreground'}"
			>
				{#if pendingId === book.id}
					<LoaderCircle class="h-5 w-5 animate-spin" />
				{:else if book.queued}
					<ListOrdered class="h-5 w-5" />
				{:else}
					<ListPlus class="h-5 w-5" />
				{/if}
			</button>
		</div>
	</SwipeRow>
{/snippet}

<div class="mx-auto max-w-md">
	<div class="flex items-center gap-1">
		<a
			href={resolve('/field/queue')}
			class="-ml-2 flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground active:bg-accent"
		>
			<ArrowLeft class="h-4 w-4" /> Queue
		</a>
		<h1 class="ml-auto text-sm font-semibold text-foreground">Add to queue</h1>
	</div>

	<div class="relative mt-2">
		<input
			bind:value={query}
			type="search"
			enterkeyhint="search"
			autocomplete="off"
			placeholder="Filter: name, initials, Thai…"
			aria-label="Filter series"
			class="h-12 w-full rounded-xl border border-border bg-background px-4 pr-11 text-base outline-none focus:border-foreground"
		/>
		{#if query}
			<button
				type="button"
				onclick={() => (query = '')}
				aria-label="Clear"
				class="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<div class="mt-2 flex gap-2" role="group" aria-label="Which books">
		<button
			type="button"
			aria-pressed={!includeRead}
			onclick={() => (includeRead = false)}
			class="h-9 rounded-full border px-3 text-sm font-medium {!includeRead
				? 'border-foreground bg-foreground text-background'
				: 'border-border text-muted-foreground'}"
		>
			Unread
		</button>
		<button
			type="button"
			aria-pressed={includeRead}
			onclick={() => (includeRead = true)}
			class="h-9 rounded-full border px-3 text-sm font-medium {includeRead
				? 'border-foreground bg-foreground text-background'
				: 'border-border text-muted-foreground'}"
		>
			Include read
		</button>
	</div>

	{#if booksQuery.isPending}
		<div class="flex justify-center py-10 text-muted-foreground">
			<LoaderCircle class="h-6 w-6 animate-spin" />
		</div>
	{:else}
		{#if pile.continue.length > 0}
			<p class="mt-5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Continue your series
			</p>
			<ul class="divide-y divide-border overflow-hidden rounded-xl border border-border">
				{#each continueAll || query.trim() ? pile.continue : pile.continue.slice(0, 5) as book (book.id)}
					<li>{@render volumeRow(book, true)}</li>
				{/each}
				{#if !continueAll && !query.trim() && pile.continue.length > 5}
					<li>
						<button
							type="button"
							onclick={() => (continueAll = true)}
							class="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground active:bg-accent"
						>
							+{pile.continue.length - 5} more
						</button>
					</li>
				{/if}
			</ul>
		{/if}

		<p class="mt-5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			{includeRead ? 'Your books' : 'Unread pile'} · {pile.count} in {seriesCount} series
		</p>
		{#if pile.groups.length === 0}
			<p class="px-1 text-sm text-muted-foreground">
				{query ? `No series matches “${query}”.` : 'Nothing unread — everything is read or queued.'}
			</p>
		{:else}
			<div class="space-y-3">
				{#each pile.groups as group (group.seriesId)}
					{@const open = query.trim() !== '' || expanded.includes(group.seriesId)}
					{@const shown = open ? group.books : group.books.slice(0, FIRST)}
					<section class="overflow-hidden rounded-xl border border-border">
						<div class="flex items-baseline justify-between bg-muted/40 px-4 py-2">
							<h2 class="truncate text-sm font-semibold text-foreground">{group.name}</h2>
							<span class="shrink-0 pl-2 text-xs text-muted-foreground">
								{group.books.length}
								{includeRead ? 'owned' : 'unread'}
							</span>
						</div>
						<ul class="divide-y divide-border border-t border-border">
							{#each shown as book (book.id)}
								<li>{@render volumeRow(book, false)}</li>
							{/each}
						</ul>
						{#if !open && group.books.length > FIRST}
							<button
								type="button"
								onclick={() => (expanded = [...expanded, group.seriesId])}
								class="flex min-h-11 w-full items-center justify-center border-t border-border text-sm text-muted-foreground active:bg-accent"
							>
								+{group.books.length - FIRST} more
							</button>
						{/if}
					</section>
				{/each}
			</div>
		{/if}
		<p class="mt-4 px-1 text-xs text-muted-foreground">
			Swipe a volume left (or tap <ListPlus class="inline h-3 w-3" />) to queue it; again to take it
			out. A = Apartment · H = Home.
		</p>
	{/if}
</div>
