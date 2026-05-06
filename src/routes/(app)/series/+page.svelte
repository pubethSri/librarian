<script lang="ts">
	import { createSeriesListQuery, createSeriesUpdateMutation } from '$lib/queries/series';
	import { createTagsListQuery } from '$lib/queries/tags';
	import type { SeriesStatus } from '$lib/types';
	import SeriesTable from '$lib/components/SeriesTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus } from '@lucide/svelte';
	import NewSeriesDialog from '$lib/components/forms/NewSeriesDialog.svelte';
	import { toast } from 'svelte-sonner';

	const seriesQuery = createSeriesListQuery();
	const tagsQuery = createTagsListQuery();
	const updateMutation = createSeriesUpdateMutation();

	let showNewSeriesDialog = $state(false);

	function handleStatusChange(id: number, status: SeriesStatus) {
		updateMutation.mutate(
			{ id, status },
			{
				onSuccess: () => toast.success('Status updated'),
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}

	function handleWatchlistToggle(id: number, watchlist: boolean) {
		updateMutation.mutate(
			{ id, watchlist },
			{
				onSuccess: () =>
					toast.success(watchlist ? 'Added to watchlist' : 'Removed from watchlist'),
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<svelte:head>
	<title>Series — Librarian</title>
	<meta name="description" content="Manage your light novel and manga series collection." />
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Series</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Manage your light novel and manga series collection.
			</p>
		</div>
		<Button onclick={() => (showNewSeriesDialog = true)} class="gap-2">
			<Plus class="h-4 w-4" />
			Add Series
		</Button>
	</div>

	<!-- Content -->
	{#if seriesQuery.isPending}
		<div class="space-y-3">
			{#each Array(5) as _}
				<Skeleton class="h-12 w-full" />
			{/each}
		</div>
	{:else if seriesQuery.isError}
		<div class="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
			<p class="text-sm text-destructive">Failed to load series. Please try again.</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={() => seriesQuery.refetch()}>
				Retry
			</Button>
		</div>
	{:else if seriesQuery.data}
		<SeriesTable
			data={seriesQuery.data}
			allTags={tagsQuery.data ?? []}
			onStatusChange={handleStatusChange}
			onWatchlistToggle={handleWatchlistToggle}
		/>
	{/if}
</div>

<NewSeriesDialog bind:open={showNewSeriesDialog} />
