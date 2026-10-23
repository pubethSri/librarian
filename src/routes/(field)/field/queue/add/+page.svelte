<script lang="ts">
	// Field Mode → Queue → Add: what to queue, in four views — Just bought (the last
	// 60 days, grouped by where: a fair, else a shop day), Continue (the next unread
	// volume of each series you're partway through), Unread (the pile, series A→Z)
	// and Everything (with Read / Dropped books, for re-reads). Filter like Find.
	// Swipe a volume left — or tap its button — to queue it; again to take it out.
	// Tap a volume for more: the rest of the series you own, Read from the start.
	import { resolve } from '$app/paths';
	import { ArrowLeft, ListOrdered, ListPlus, LoaderCircle, RotateCcw, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import SwipeRow from '$lib/components/field/SwipeRow.svelte';
	import QueueOptionsSheet from '$lib/components/field/QueueOptionsSheet.svelte';
	import SeriesBar from '$lib/components/queue/SeriesBar.svelte';
	import ExtraBadge from '$lib/components/ExtraBadge.svelte';
	import { createBooksListQuery } from '$lib/queries/books';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import {
		createQueueAddMutation,
		createQueueQuery,
		createQueueRemoveMutation
	} from '$lib/queries/queue';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		buildPile,
		chipLabel,
		justBought,
		queueChoices,
		seriesBar,
		shortDay,
		type PileGroup
	} from '$lib/queue';
	import { volumeText } from '$lib/utils/volume';
	import { BOOK_LOCATION_LABELS, type BookListItem } from '$lib/types';

	const settings = getFieldSettings();
	const booksQuery = createBooksListQuery({ fresh: true });
	const queueQuery = createQueueQuery({ fresh: true });
	const fairsQuery = createBookfairsListQuery();
	const addMutation = createQueueAddMutation();
	const removeMutation = createQueueRemoveMutation();

	type View = 'bought' | 'continue' | 'unread' | 'all';
	const VIEWS: { id: View; label: string }[] = [
		{ id: 'bought', label: 'Just bought' },
		{ id: 'continue', label: 'Continue' },
		{ id: 'unread', label: 'Unread' },
		{ id: 'all', label: 'Everything' }
	];

	let query = $state('');
	let view = $state<View | null>(null);
	/** Series opened past their first few volumes (keyed per view) */
	let expanded = $state<string[]>([]);
	let pendingId = $state<number | null>(null);
	let continueAll = $state(false);
	/** The volume whose options sheet is open */
	let optionsBook = $state<BookListItem | null>(null);

	const FIRST = 3;
	const books = $derived(booksQuery.data ?? []);
	const queueLength = $derived(queueQuery.data?.length ?? 0);
	const bought = $derived(justBought(books, fairsQuery.data ?? [], settings.today, { query }));
	const pile = $derived(buildPile(books, { includeRead: view === 'all', query }));

	// Opens on Just bought when there's something, else Continue — chosen once
	$effect(() => {
		if (view !== null || !booksQuery.data || fairsQuery.isPending) return;
		view = justBought(booksQuery.data, fairsQuery.data ?? [], settings.today).length
			? 'bought'
			: 'continue';
	});

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

	/** "+2 owned" / "last one you own" for a Continue row */
	function ownedAfter(book: BookListItem): string {
		const more = queueChoices(books, book).rest.length - 1;
		return more > 0 ? `+${more} owned` : 'last one you own';
	}

	/** "Oct 23 – 24", "Oct 12" */
	function dayRange(from: string, to: string): string {
		if (from === to) return shortDay(from);
		const [a, b] = [shortDay(from), shortDay(to)];
		return a.slice(0, 3) === b.slice(0, 3) ? `${a} – ${b.slice(4)}` : `${a} – ${b}`;
	}
</script>

<svelte:head>
	<title>Add to queue — Field Mode</title>
</svelte:head>

{#snippet queueButton(book: BookListItem)}
	<button
		type="button"
		onclick={() => toggle(book)}
		disabled={pendingId !== null}
		aria-pressed={book.queued}
		aria-label={book.queued
			? `${name(book)} is queued — remove it`
			: `Add ${name(book)} to the queue`}
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg active:bg-accent disabled:opacity-50 {book.queued
			? 'text-info-ink'
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
{/snippet}

{#snippet locationBadge(book: BookListItem)}
	<span
		class="shrink-0 rounded border border-info/45 px-1.5 text-[11px] font-semibold text-info-ink"
		title={BOOK_LOCATION_LABELS[book.location]}
	>
		{book.location === 'apartment' ? 'A' : 'H'}
	</span>
{/snippet}

{#snippet volumeRow(book: BookListItem)}
	<SwipeRow
		label={book.queued ? 'Remove' : 'Queue'}
		icon={book.queued ? X : ListPlus}
		tone={book.queued ? 'remove' : 'add'}
		disabled={pendingId !== null}
		onswipe={() => toggle(book)}
	>
		<div class="flex min-h-14 items-center gap-3 pr-1">
			<button
				type="button"
				onclick={() => (optionsBook = book)}
				aria-label="More ways to queue {name(book)}"
				class="flex min-h-14 min-w-0 flex-1 items-center pl-4 text-left active:bg-accent"
			>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-foreground">
						{#if book.isExtra}
							<ExtraBadge {book} />
						{:else}
							{volumeText(book).replace(/^./, (c) => c.toUpperCase())}
						{/if}
					</span>
					{#if hint(book)}
						<span class="flex items-center gap-1 text-xs text-muted-foreground">
							<RotateCcw class="h-3 w-3" />
							{hint(book)} — queue as a re-read
						</span>
					{/if}
				</span>
			</button>
			{@render locationBadge(book)}
			{@render queueButton(book)}
		</div>
	</SwipeRow>
{/snippet}

{#snippet seriesCards(
	groups: PileGroup<BookListItem>[],
	prefix: string,
	note: (g: PileGroup<BookListItem>) => string
)}
	<div class="space-y-3">
		{#each groups as group (group.seriesId)}
			{@const key = `${prefix}:${group.seriesId}`}
			{@const open = query.trim() !== '' || expanded.includes(key)}
			{@const shown = open ? group.books : group.books.slice(0, FIRST)}
			<section class="overflow-hidden rounded-xl border border-border">
				<div class="flex items-baseline justify-between gap-2 bg-muted/40 px-4 py-2">
					<h2 class="truncate text-sm font-semibold text-foreground">{group.name}</h2>
					<span class="shrink-0 text-xs text-muted-foreground">{note(group)}</span>
				</div>
				<ul class="divide-y divide-border border-t border-border">
					{#each shown as book (book.id)}
						<li>{@render volumeRow(book)}</li>
					{/each}
				</ul>
				{#if !open && group.books.length > FIRST}
					<button
						type="button"
						onclick={() => (expanded = [...expanded, key])}
						class="flex min-h-11 w-full items-center justify-center border-t border-border text-sm text-muted-foreground active:bg-accent"
					>
						+{group.books.length - FIRST} more
					</button>
				{/if}
			</section>
		{/each}
	</div>
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

	<div class="mt-2 flex gap-1.5 overflow-x-auto" role="group" aria-label="Which books">
		{#each VIEWS as v (v.id)}
			<button
				type="button"
				aria-pressed={view === v.id}
				onclick={() => (view = v.id)}
				class="h-9 shrink-0 rounded-full border px-2.5 text-[13px] font-medium {view === v.id
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-muted-foreground'}"
			>
				{v.label}
			</button>
		{/each}
	</div>

	{#if booksQuery.isPending || view === null}
		<div class="flex justify-center py-10 text-muted-foreground">
			<LoaderCircle class="h-6 w-6 animate-spin" />
		</div>
	{:else if view === 'bought'}
		{#if bought.length === 0}
			<p class="mt-5 px-1 text-sm text-muted-foreground">
				{query
					? `Nothing bought lately matches “${query}”.`
					: 'Nothing unread bought in the last 60 days.'}
			</p>
		{/if}
		{#each bought as where (where.key)}
			<div class="mt-5 px-1 pb-2">
				<p
					class="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase {where.key.startsWith(
						'fair:'
					)
						? 'text-highlight-ink'
						: 'text-muted-foreground'}"
				>
					{#if where.key.startsWith('fair:')}
						<span class="h-2 w-2 rotate-45 bg-highlight" aria-hidden="true"></span>
					{/if}
					<span class="truncate">{where.label}</span>
				</p>
				<p class="mt-0.5 text-xs text-muted-foreground">
					{dayRange(where.from, where.to)} · {where.unread} unread of {where.total}
				</p>
			</div>
			{@render seriesCards(where.groups, where.key, (g) => `${g.books.length} unread`)}
		{/each}
	{:else if view === 'continue'}
		<p class="mt-5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			Series you're partway through · {pile.continue.length}
		</p>
		{#if pile.continue.length === 0}
			<p class="px-1 text-sm text-muted-foreground">
				{query ? `No series matches “${query}”.` : 'No series in progress with an unread volume.'}
			</p>
		{:else}
			<ul class="divide-y divide-border overflow-hidden rounded-xl border border-border">
				{#each continueAll || query.trim() ? pile.continue : pile.continue.slice(0, 8) as book (book.id)}
					<li>
						<SwipeRow
							label={book.queued ? 'Remove' : 'Queue'}
							icon={book.queued ? X : ListPlus}
							tone={book.queued ? 'remove' : 'add'}
							disabled={pendingId !== null}
							onswipe={() => toggle(book)}
						>
							<div class="flex min-h-16 items-center gap-2 pr-1">
								<button
									type="button"
									onclick={() => (optionsBook = book)}
									aria-label="More ways to queue {name(book)}"
									class="flex min-h-16 min-w-0 flex-1 items-center pl-4 text-left active:bg-accent"
								>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium text-foreground">
											{book.seriesShortName}
										</span>
										<span class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
											<span
												class="shrink-0 rounded-md bg-highlight-soft px-1.5 text-xs leading-5 font-semibold text-highlight-ink tabular-nums"
											>
												{chipLabel(book)}
											</span>
											<SeriesBar model={seriesBar(books, book)} class="max-w-24" />
											<span class="shrink-0">{ownedAfter(book)}</span>
										</span>
									</span>
								</button>
								{@render locationBadge(book)}
								{@render queueButton(book)}
							</div>
						</SwipeRow>
					</li>
				{/each}
				{#if !continueAll && !query.trim() && pile.continue.length > 8}
					<li>
						<button
							type="button"
							onclick={() => (continueAll = true)}
							class="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground active:bg-accent"
						>
							+{pile.continue.length - 8} more
						</button>
					</li>
				{/if}
			</ul>
		{/if}
	{:else}
		<p class="mt-5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			{view === 'all' ? 'Your books' : 'Unread pile'} · {pile.count} in {pile.groups.length} series
		</p>
		{#if pile.groups.length === 0}
			<p class="px-1 text-sm text-muted-foreground">
				{query ? `No series matches “${query}”.` : 'Nothing unread — everything is read or queued.'}
			</p>
		{:else}
			{@render seriesCards(
				pile.groups,
				view,
				(g) => `${g.books.length} ${view === 'all' ? 'owned' : 'unread'}`
			)}
		{/if}
	{/if}
	<p class="mt-4 px-1 text-xs text-muted-foreground">
		Swipe a volume left (or tap <ListPlus class="inline h-3 w-3" />) to queue it; again to take it
		out. Tap a volume for the rest of the series. A = Apartment · H = Home.
	</p>
</div>

<QueueOptionsSheet bind:book={optionsBook} {books} {queueLength} />
