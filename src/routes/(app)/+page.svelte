<script lang="ts">
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBooksListQuery } from '$lib/queries/books';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { BookOpen, Library, BookCopy, AlertCircle, Plus } from '@lucide/svelte';
	import NewVolumeDialog from '$lib/components/forms/NewVolumeDialog.svelte';
	import NewSeriesDialog from '$lib/components/forms/NewSeriesDialog.svelte';

	const seriesQuery = createSeriesListQuery();
	const booksQuery = createBooksListQuery();

	let showAddVolume = $state(false);
	let showAddSeries = $state(false);

	const stats = $derived(() => {
		const seriesData = seriesQuery.data || [];
		const booksData = booksQuery.data || [];

		return {
			totalSeries: seriesData.length,
			totalBooks: booksData.length,
			draftCount: booksData.filter((b) => b.isDraft).length,
			watchlistCount: seriesData.filter((s) => s.watchlist).length,
			recentBooks: [...booksData]
				.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				.slice(0, 5)
		};
	});
</script>

<svelte:head>
	<title>Librarian — Personal Book Collection Tracker</title>
	<meta
		name="description"
		content="Track your light novel and manga collection, reading progress, and bookfair hauls."
	/>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Overview of your book collection.
		</p>
	</div>

	<div class="flex flex-wrap gap-3">
		<Button onclick={() => (showAddVolume = true)} class="gap-2">
			<Plus class="h-4 w-4" />
			Add Book
		</Button>
		<Button variant="outline" onclick={() => (showAddSeries = true)} class="gap-2">
			<Plus class="h-4 w-4" />
			Add Series
		</Button>
	</div>

	{#if seriesQuery.isPending || booksQuery.isPending}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each Array(4) as _}
				<Skeleton class="h-24" />
			{/each}
		</div>
	{:else}
		{@const s = stats()}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<a href="/series" class="group rounded-lg border border-border p-4 transition-colors hover:bg-accent/50">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<Library class="h-4 w-4" />
					Total Series
				</div>
				<p class="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.totalSeries}</p>
			</a>
			<a href="/books" class="group rounded-lg border border-border p-4 transition-colors hover:bg-accent/50">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<BookCopy class="h-4 w-4" />
					Total Books
				</div>
				<p class="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.totalBooks}</p>
			</a>
			<div class="rounded-lg border border-border p-4">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<AlertCircle class="h-4 w-4" />
					Drafts
				</div>
				<p class="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.draftCount}</p>
			</div>
			<div class="rounded-lg border border-border p-4">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<BookOpen class="h-4 w-4" />
					Watchlist
				</div>
				<p class="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.watchlistCount}</p>
			</div>
		</div>

		{#if s.recentBooks.length > 0}
			<div class="space-y-3">
				<h2 class="text-lg font-semibold text-foreground">Recent Additions</h2>
				<div class="space-y-2">
					{#each s.recentBooks as book}
						<a
							href="/series/{book.seriesId}"
							class="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent/50"
						>
							<div>
								<span class="text-sm font-medium text-foreground">
									{book.seriesShortName}
								</span>
								<span class="ml-2 font-mono text-sm text-muted-foreground">
									Vol. {book.volumeNumber}
								</span>
							</div>
							<span class="text-xs text-muted-foreground">
								{new Date(book.createdAt).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								})}
							</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<NewVolumeDialog bind:open={showAddVolume} />
<NewSeriesDialog bind:open={showAddSeries} />
